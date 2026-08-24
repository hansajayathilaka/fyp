# RUNBOOK: Sui (Move) native-DAG leg

Runs a real local Sui network (Narwhal-Bullshark consensus DAG, object-DAG ownership),
publishes a real Move package to it, seeds fixtures, and benchmarks `mint`/`list`/`buy`/
`cancel` through the official `@mysten/sui` TypeScript SDK — no EVM shim anywhere.
Mirrors `../../marketplace-bench/RUNBOOK.md`'s structure. Everything is local: no
testnets, no faucets outside this container, no API keys, no `.env` file. Dev accounts
are freshly generated Ed25519 keypairs, funded from the local faucet — worthless outside
this container, safe to have on disk (`dev-accounts.json`).

## Prerequisites

- Docker with Compose v2 (`docker compose version`)
- Node.js 18+ and npm

No `sui` CLI needs to be installed on the host — the one build step that needs the Move
compiler (`deploy.ts`) shells out to it inside a container. No accounts to create by
hand, no keys to generate manually.

## 1. Install dependencies

```bash
cd marketplace-bench-native/sui-move
npm install
```

## 2. Start the local Sui network

```bash
npm run up
```

Brings up one container via `docker/docker-compose.yml`:

| Service | Image | Command | Ports |
|---|---|---|---|
| `sui-local` | `mysten/sui-tools:testnet` | `sui start --force-regenesis --with-faucet --epoch-duration-ms=60000` | `9000` RPC, `9123` faucet, `9184` metrics |

`sui-test-validator` (the old dedicated localnet binary some older docs reference) is
deprecated upstream — `sui start --with-faucet` is its replacement and is what's actually
inside this image. `--force-regenesis` means every fresh `npm run up` starts from a clean
genesis (fresh chain, fresh reference gas price, no carried-over state) — there's no
persistent chain data to wipe the way `docker compose down -v` matters for besu/conflux.

Wait ~10-15s, then confirm both endpoints are answering:

```bash
curl -s -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","id":1,"method":"sui_getChainIdentifier","params":[]}' \
  http://localhost:9000
curl -s http://localhost:9123     # should return "OK"
```

## 3. Compile and publish the Move package

```bash
npm run deploy
```

`scripts/deploy.ts` shells out to
`docker run --rm -v <contracts/marketplace>:/pkg -w /pkg mysten/sui-tools:testnet sui move build --dump-bytecode-as-base64`
to compile (there is no native `sui` binary on this host), then publishes the resulting
bytecode itself via `@mysten/sui`'s `Transaction.publish()`, signed by a freshly
generated local dev keypair (auto-funded from the faucet). Records the published
`packageId` and the `ItemCounter` shared object ID to `deployment-addresses.json`.

## 4. Seed fixtures

```bash
SEED_TOKEN_COUNT=100 SEED_LISTING_COUNT=70 npm run seed
```

Mints `SEED_TOKEN_COUNT` items across a rotating pool of `SEED_SELLER_COUNT` (default 5)
dev accounts, lists `SEED_LISTING_COUNT` of them, leaves the rest unlisted. Sequential,
one transaction at a time — this step isn't what's being measured. On this setup, 170
sequential transactions (100 mints + 70 lists) took **~35 seconds**. Writes
`seed-fixtures.sui.json` (item/listing object IDs + owning addresses — the Sui analogue
of the reference track's `seed-fixtures.<network>.json`).

Size the pools so `SEED_TOKEN_COUNT - SEED_LISTING_COUNT` (unlisted, for `list` bench
runs) and `SEED_LISTING_COUNT` (for `buy` **and** `cancel` bench runs, which draw from
opposite ends of the same pool — see `scripts/bench.ts`'s comments) both comfortably
exceed `BENCH_BATCH_SIZE × BENCH_REPEATS`, with headroom for both `buy` and `cancel` to
run without their slices overlapping.

## 5. Run the benchmark harness

```bash
for op in mint list buy cancel; do
  BENCH_OPERATION=$op BENCH_BATCH_SIZE=5 BENCH_REPEATS=6 npm run bench
done
```

`approve` is not a valid `BENCH_OPERATION` here — Sui's object-ownership model has no
allowance step (see `README.md`). `BENCH_BATCH_SIZE` is concurrent sends per repeat (each
job gets its own signer from the dev account pool, so concurrent sends never race on one
account's gas coin — the Sui analogue of the reference harness's per-job-signer nonce
rule). `BENCH_REPEATS` includes one warmup repeat, tagged and excluded from analysis.
`BENCH_NODE_COUNT` is an optional informational tag (this is the 1-validator baseline).
`BENCH_TIMEOUT_MS` defaults to 60000, same as the reference harness.

**Cost caveat, read before reporting `feePaidNative` numbers:** the reference gas price
on this local network is a real, non-zero `1000 MIST/unit` — not a `min-gas-price=0`
artifact the way `besuLocal`'s local genesis is (`../../marketplace-bench/RUNBOOK.md`
§6). *However*, `cancel` (and to a lesser extent `buy`) can legitimately show a very
small or even negative `feePaidNative` — Sui refunds most of a storage deposit when the
object it was paid for is deleted, and that deposit was paid by an *earlier* transaction
(the `mint`/`list` that created it), not the deleting one. This is real Sui storage-rebate
economics, not a broken-zero-price bug — see `README.md`'s
["Cost integrity"](README.md#cost-integrity--read-before-citing-feepaidnative-numbers)
section before citing these numbers in the final report.

Each run appends a CSV to `../bench-output/sui-{operation}-{timestamp}.csv`. `bench.ts`
reads fixtures but never rewrites `seed-fixtures.sui.json` — if you run out of unconsumed
fixtures (a second `list`/`buy`/`cancel` run against the same fixtures file, or batch ×
repeats bigger than what step 4 seeded), re-run `npm run seed` with larger counts before
re-running that operation.

## 6. Analyze

Same as the reference track — see `../../marketplace-bench/RUNBOOK.md` §7 and
`../analysis/` once that step is wired up to read `../bench-output/`.

## 7. Tear down

```bash
npm run down          # stop + remove the sui-local container, keep no volumes (there are none — force-regenesis)
```

There is no `-v`/volume-wipe variant needed here: `--force-regenesis` means the container
never persists chain state to a named volume in the first place, so a plain `down` +
`up` is already equivalent to a "fresh genesis" restart.

**Only ever stop/remove `sui-local` by name, scoped to this compose file.** This Docker
daemon is shared with the Conflux and Hedera subagents' containers and the orchestrator's
`besu-local` container — never run a blanket `docker system prune`,
`docker rm -f $(docker ps -aq)`, or `docker compose down -v` against a compose file this
track doesn't own.

## Troubleshooting

- **`docker: Error response from daemon: the working directory '...' is invalid` on
  Windows/Git Bash.** MSYS path-mangling rewrites Unix-style paths passed to `docker run`.
  Prefix the command with `MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL="*"` (already applied
  inside `scripts/deploy.ts`'s own `docker run` invocation via Node's `execFileSync`,
  which bypasses the shell entirely and isn't affected — this only matters if you run the
  `sui move build` command by hand from Git Bash).
- **`Not enough unlisted fixtures for list bench` / `Not enough active listings for
  buy/cancel bench`.** The seeded pool (step 4) is smaller than
  `BENCH_BATCH_SIZE × BENCH_REPEATS`, or a prior bench run already consumed it (on-chain
  state changed even though `seed-fixtures.sui.json` itself is never rewritten). Re-run
  `npm run seed` with larger `SEED_TOKEN_COUNT`/`SEED_LISTING_COUNT`.
- **`No known keypair for fixture owner/seller ... — was dev-accounts.json reset?`** The
  fixtures file references an address that isn't in the current `dev-accounts.json` —
  usually means `dev-accounts.json` was deleted/regenerated after `npm run seed` already
  ran against the old one. Re-run `npm run seed` fresh (it's idempotent/append-only, but
  a *deleted* accounts file can't be recovered — re-seed from scratch).
- **Faucet returns balance but `signAndExecuteTransaction` fails with insufficient
  gas.** Very unlikely on this local network (faucet grants 1000 SUI per request, ~50 SUI
  minimum-balance floor in `common.ts`), but if it happens, `npm run accounts` re-tops-up
  every account in the current pool.
