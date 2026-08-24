# RUNBOOK: Hedera native HTS/HCS leg

Runs a real local Hedera network (Hashgraph consensus + mirror node, via
`hashgraph/hedera-local-node`) and drives it directly with `@hashgraph/sdk` — no Solidity,
no EVM, no JSON-RPC relay. Mirrors `marketplace-bench/RUNBOOK.md`'s structure. Everything is
local: no testnet, no faucet, no API keys, no `.env` file — the well-known local operator
account `0.0.2` (see `scripts/client.ts`) is a fixed public dev credential baked into every
`hedera-local-node` install, exactly like Hardhat's public test mnemonic elsewhere in this
repo.

## Prerequisites

- Docker with Compose v2 (`docker compose version`)
- Node.js 18+ and npm
- Ports `50211`, `5600`, `5551`, `5433`, `8082`, `6379`, `9999`, `50212`, `19000`, `19001`
  free on the host (hedera-local-node's own defaults, plus this leg's port-collision
  overrides — see `README.md`'s "Why 3 of the stock compose's ports are disabled").
  `8545`/`8546`/`9000`/`9001` (owned by `besuLocal`/`confluxLocal`/`sui` respectively) are
  *not* needed and must stay free for those other legs — this leg's override config makes
  sure `hedera-local-node` never tries to bind them.

## 1. Install dependencies

```bash
cd marketplace-bench-native/hedera-native
npm install
```

`postinstall` automatically patches the installed `@hashgraph/hedera-local` CLI's port
preflight check (see `scripts/patch-hedera-local-ports.js` for exactly what and why — short
version: it hardcodes port `8545` as "necessary" even though this leg's compose override
means it's never actually bound).

## 2. Start the local Hedera network

```bash
npm run node:start
```

This runs `scripts/run-hedera-cli.js start`, a thin wrapper that calls the locally
installed, patched `hedera` CLI with an **absolute** `--composedir` (`hedera start
--composedir <abs path>/docker/overrides/`). The wrapper exists because the CLI silently
resolves a relative `--composedir` against the wrong directory — see its header comment and
`README.md`'s "Why 3 of the stock compose's ports are disabled" for the full story; don't
call `hedera start` directly unless you pass an absolute `--composedir` yourself.

First run pulls several GB of images (several minutes to tens of minutes depending on
network speed and what's already cached) and starts the consensus node, mirror node
(importer/db/grpc/rest), and supporting services, then prints the account list and the
CLI's own success banner once the node is producing consensus rounds and the mirror node
has caught up. `node:start` returns control once the network reports healthy (no need to
background it manually).

Confirm the consensus node is healthy:

```bash
docker ps --filter name=network-node --format "{{.Names}} {{.Status}}"
```

Should read `network-node   Up ... (healthy)`. If it's stuck at `(health: starting)` for
more than ~2-3 minutes, check `docker logs network-node` for a repeating `Checking for
application.properties presence ..... ERROR` line — this is a real bind-mount staleness
issue seen during validation (see `README.md`'s "Known gaps"), not a timing race. Fix it
with a targeted recreate of *just* that container (never touch the other services or the
other legs' containers):

```bash
docker compose -f node_modules/@hashgraph/hedera-local/docker-compose.yml \
  -f node_modules/@hashgraph/hedera-local/docker-compose.evm.yml \
  -f node_modules/@hashgraph/hedera-local/docker-compose.block-node.yml \
  -f docker/overrides/port-collisions.yml \
  up -d --force-recreate --no-deps network-node
```
(run from `hedera-native/`; a plain `docker restart network-node` does *not* fix this —
confirmed during validation, it reproduces the identical failure). Give it another 1-2
minutes after recreating; `mirror-node-grpc`/`web3`/`importer`/`rest-java-internal` may stay
`(unhealthy)` for a while longer catching up on backlog — that's expected and does **not**
block the next steps, since this leg's SDK calls (`getReceipt()`/`getRecord()`) talk
directly to the consensus node, never the mirror node.

## 3. Deploy: create the HTS NFT collection + marketplace account

```bash
npm run deploy
```

Creates the HTS NFT collection (treasury = operator `0.0.2`, supply key = operator's key)
and a fresh "marketplace" account (see `README.md`'s "What 'the marketplace' is, without a
contract"). Writes `deployment-addresses.json`.

## 4. Seed fixtures

```bash
SEED_UNLISTED_COUNT=30 SEED_LISTING_COUNT=60 npm run seed
```

Creates 6 participant accounts (funded 1000 HBAR each from the operator), mints 90 NFT
serials to the treasury, reassigns ownership round-robin to participants, then grants an
HTS allowance (the `approve`/`list` step) to the marketplace account for 60 of them at a
tracked off-chain price of 1 HBAR each — leaving 30 unlisted for the `approve` bench to
consume. Writes `seed-fixtures.hedera.json`. `SEED_LISTING_COUNT` needs to be at least
`2 * (BENCH_BATCH_SIZE * BENCH_REPEATS)` so `buy` and `cancel` bench runs each get their own
non-overlapping slice (see `scripts/bench.ts`'s `buy`/`cancel` job-building comments).

## 5. Run the benchmark harness

```bash
for op in mint approve buy cancel; do
  BENCH_OPERATION=$op BENCH_BATCH_SIZE=5 BENCH_REPEATS=6 npm run bench
done
```

`list` is not a selectable `BENCH_OPERATION` — see `README.md`'s operation-mapping table for
why. `BENCH_BATCH_SIZE` is concurrent submissions per repeat; `BENCH_REPEATS` includes one
warmup repeat, tagged `warmup=true` and excluded from analysis automatically, matching
`marketplace-bench`'s convention.

Each run appends a CSV to `../bench-output/hedera-{operation}-{timestamp}.csv`. The
validated run (`BATCH_SIZE=5 REPEATS=6`) produced 30 rows per operation, 120 total, all
`status=success`:

| Operation | CSV | rows | feePaidNative (tinybars, every row) |
|---|---|---|---|
| `mint` | `hedera-mint-2026-08-22T03-42-05-094Z.csv` | 30 | 17,168,083 |
| `approve` | `hedera-approve-2026-08-22T03-42-26-568Z.csv` | 30 | 68,243,991 |
| `buy` | `hedera-buy-2026-08-22T03-42-47-687Z.csv` | 30 | 1,156,637 |
| `cancel` | `hedera-cancel-2026-08-22T03-43-05-296Z.csv` | 30 | 68,357,967 |

**Cost note:** `feePaidNative` comes from each transaction's `TransactionRecord.transactionFee`.
It is **not** automatically non-zero just because you're on Hedera — see `README.md`'s "Cost
integrity" section for a real zero-fee footgun found and fixed during validation (paying with
the well-known operator account `0.0.2` is fee-*exempt* by protocol design, since it's a
system/Treasury account; every bench job now explicitly names a non-exempt payer). If you
modify `scripts/bench.ts`, keep transactions paid by a normal participant/marketplace
account, not the operator, or `feePaidNative` will silently read `0` again.

## 6. Analyze

Same as the rest of `marketplace-bench-native` — see `../analysis/README.md`. This leg's
CSVs use `chain=hedera`, `architecture=dag`, `language=native-hts-hcs`, `feeCurrency=HBAR`,
joining cleanly against the other three legs' rows on `operation`.

## 7. Tear down

```bash
npm run node:stop
```

Runs `hedera stop` (stops + removes the containers this leg started). To also wipe chain
state for a truly fresh genesis next time, add `-v`-equivalent cleanup via the CLI's own
`stop --full-reset` if you need it — check `npx hedera stop --help` for the current flag
name, since this CLI's surface has shifted across versions (see "Known gaps" in
`README.md` re: the project's deprecation).

## Troubleshooting

- **`Port 8545 is in use`** at `npm run node:start`. Either `npm install`'s postinstall
  patch didn't run (re-run `node scripts/patch-hedera-local-ports.js` manually), or you're
  invoking the CLI directly via `npx @hashgraph/hedera-local` instead of the locally
  patched copy in `node_modules/.bin/hedera` — use `npm run node:start`, not a bare `npx`
  command, so the patched, overridden copy is the one that runs.
- **`INVALID_SIGNATURE` on `approve`/`cancel`.** The owner/seller's key must co-sign these
  (it's their allowance). `scripts/bench.ts` and `scripts/seed.ts` already
  `freezeWith(client).sign(ownerKey)` before `execute()`; if you're extending this, don't
  drop that step.
- **`TOKEN_NOT_ASSOCIATED_TO_ACCOUNT` on a transfer.** The receiving account never
  associated with the token. Unlike ERC-721, HTS requires an explicit association (or
  `setMaxAutomaticTokenAssociations` set at account-creation time, which `seed.ts` already
  does with `-1` for every participant it creates) before an account can receive a token.
- **`SPENDER_DOES_NOT_HAVE_ALLOWANCE` on an approved-NFT `TransferTransaction`.** The
  transaction's *payer* must be the account that holds the allowance (the spender), not
  merely a co-signer — found empirically while building `buy` (see `README.md`'s "Known
  gaps"). Check `.setTransactionId(TransactionId.generate(<spenderId>))` is set correctly.
- **`feePaidNative` reads `0` for every row.** You're almost certainly paying with the
  well-known operator account `0.0.2` — Hedera system accounts (`0.0.1`-`0.0.100`) are
  fee-exempt by protocol design, a real zero found and fixed during this leg's own
  validation (see `README.md`'s "Cost integrity"). Name an explicit non-exempt payer via
  `.setTransactionId(TransactionId.generate(<payerId>))` before `freezeWith`.
- **`Not enough unlisted/active listings` errors from `bench.ts`.** Re-run `seed.ts` with
  larger `SEED_UNLISTED_COUNT`/`SEED_LISTING_COUNT` — see step 4's sizing note.
- **Chain state persisting across `node:start` runs.** `hedera-local-node` reuses Docker
  volumes between `start`/`stop` cycles unless you explicitly reset; re-run `deploy.ts`
  after a real reset (a new token/marketplace account won't exist in old state) or reuse
  the existing `deployment-addresses.json` if state was preserved. Since `deploy.ts`/`seed.ts`
  create a fresh token + marketplace account + fixtures every time they're run, the simplest
  fix for any fixture-pool exhaustion (`buy`/`cancel` consuming listings, `approve` consuming
  unlisted serials) is just re-running `deploy` then `seed` — cheap on a local devnet, and
  what was actually done during this leg's own validation after each bench-payer fix.
