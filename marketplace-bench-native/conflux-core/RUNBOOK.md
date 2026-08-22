# RUNBOOK: Conflux Core Space (native CVM) leg

Runs the same marketplace contracts as `../../marketplace-bench`, this time deployed and
exercised through Conflux's **native Core Space** — `js-conflux-sdk`, CoreSpace RPC
(`12537`), no EVM-compatibility shim — against the *same physical* `conflux-rust` node the
eSpace leg uses. Mirrors `../../marketplace-bench/RUNBOOK.md`'s structure; read that file
first if you haven't, this one only calls out what's different for Core Space.

## Prerequisites

- Docker with Compose v2 (`docker compose version`)
- Node.js 18+ and npm

No accounts to create, no keys to generate, no faucet requests — same as the eSpace leg,
same well-known throwaway dev keys (`scripts/accounts.ts`).

## 1. Install dependencies

```bash
cd marketplace-bench-native/conflux-core
npm install
```

## 2. Start the node

Reuses the existing `conflux-local` service from the eSpace leg's compose file —
**nothing here forks or edits it** (see `docker/README.md`):

```bash
docker compose -f ../../marketplace-bench/docker/local/docker-compose.yml up -d conflux-local
```

Wait ~15s, then confirm CoreSpace RPC is up and mining epochs:

```bash
curl -s -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"cfx_epochNumber","params":[],"id":1}' http://127.0.0.1:12537
```

Should return an increasing epoch number on repeated calls.

**If you're running this leg fresh against a chain the eSpace leg already used**, that's
fine — the two legs use different account spaces (CoreSpace vs. eSpace) on the same
ledger, so nothing here disturbs eSpace's funded balances or deployed contracts, and vice
versa.

## 3. Compile contracts

```bash
npx hardhat compile
```

Plain Hardhat, used only as a Solidity compiler front end — see `README.md` "Why plain
Hardhat + js-conflux-sdk" for why no Conflux-specific compiler plugin is used (none current
and maintained exists on npm).

## 4. Fund the CoreSpace dev accounts (one-time per fresh chain)

```bash
npx ts-node scripts/fund-conflux-core.ts
```

Unlike eSpace's funding step, this is a **plain native CoreSpace transfer**, not a
cross-space call — see `README.md` "Funding" for why. Uses the one CoreSpace account
`genesis_secrets` funds directly (10,000 CFX at genesis, confirmed via `cfx_getBalance`) to
send 400 CFX each to the other 19 well-known dev accounts. Safely re-runnable — it checks
each recipient's balance first and skips already-funded accounts.

You only need to re-run this after a **fresh** `conflux-local` (i.e., after wiping just the
`local_conflux-local-data` volume — see "9. Tear down" for the scoped command; never a bare
`down -v`). If you stop/restart the container without wiping its volume, funding persists.

## 5. Deploy the contracts

```bash
npx ts-node scripts/deploy.ts
```

Deploys `MarketplaceItem` then `Marketplace`, sanity-checks `Marketplace.item()` matches
(normalizing Core Space's two address verbosity forms — see `README.md`), and records both
addresses to `deployment-addresses.json` under the `"confluxCore"` key.

## 6. Seed fixtures

```bash
SEED_TOKEN_COUNT=100 SEED_LISTING_COUNT=65 npx ts-node scripts/seed.ts
```

Note the counts here are larger than the eSpace leg's `RUNBOOK.md` example
(`SEED_TOKEN_COUNT=60 SEED_LISTING_COUNT=40`). Reason: `bench.ts` doesn't mutate
`seed-fixtures.confluxCore.json` after reading it (same as the eSpace `bench.ts`), so
`buy` and `cancel` benches both draw from the *same* `listings` array without removing
consumed entries — `buy` takes the pool's head, `cancel` takes its tail (see the comment in
`bench.ts`), and if `BATCH_SIZE × REPEATS` for each exceeds half the pool, their ranges
overlap and `cancel` spuriously reverts against listings `buy` already deactivated. At
`BATCH_SIZE=5 REPEATS=6` (30 tx each), that needs **≥60 listings** to stay non-overlapping,
plus **≥30 unlisted tokens** for `approve`/`list` to each have enough fixtures — hence
`SEED_TOKEN_COUNT=100 SEED_LISTING_COUNT=65` (65 listings, 35 unlisted), comfortably over
both floors. Writes `seed-fixtures.confluxCore.json`.

This step is sequential (one tx at a time, same as eSpace's `seed.ts`) — 100 mints + 65×
(approve+list) = 230 transactions. Measured on this setup: **~12 minutes** (scales
roughly linearly with the eSpace leg's own measured ~5-6 min for 140 transactions — Core
Space's 0.5s block interval doesn't dominate here either, same receipt-polling-interval
bottleneck the eSpace RUNBOOK notes).

## 7. Run the benchmark harness

```bash
for op in mint approve list buy cancel; do
  BENCH_OPERATION=$op BENCH_BATCH_SIZE=5 BENCH_REPEATS=6 \
    npx ts-node scripts/bench.ts
done
```

`BENCH_BATCH_SIZE` is concurrent senders per repeat (each job gets its own signer, so
concurrent sends never share a nonce sequence — see `bench.ts`'s comment); `BENCH_REPEATS`
includes one warmup repeat, tagged `warmup=true` and excluded from analysis. Optional:
`BENCH_PRICE_TIER_GDRIP` (this leg's analogue of the eSpace harness's
`BENCH_PRICE_TIER_GWEI` — a gas-price-tier override, in GDrip instead of gwei),
`BENCH_NODE_COUNT` (informational tag; this setup is the 1-node baseline),
`BENCH_TIMEOUT_MS` (default 60000, same as the eSpace leg).

**Cost integrity — verified non-zero, unlike besuLocal's genesis:** `cfx_gasPrice` on this
devnet returns `0x3b9aca00` = 1 Gdrip, confirmed via a direct RPC call before any script
touched the connection (not a client-side fallback) — see `README.md` "Cost integrity" for
the full verification. Every row in this leg's CSVs carries a real, non-zero
`feeUnitPrice`/`feePaidNative`. Contrast with `../../marketplace-bench/RUNBOOK.md` §6: that
leg's besuLocal genesis sets `--min-gas-price=0`, so besuLocal's cost numbers need that
caveat when compared against confluxCore's — confluxCore's numbers don't need a caveat, but
the *comparison* does, since only one side of it has a broken cost floor.

Each run appends a CSV to `../bench-output/confluxCore-{operation}-{timestamp}.csv` (schema
in `../docs/DESIGN.md`, not the eSpace leg's own CSV shape — see `README.md` "CSV schema
mapping").

**If `buy` (or any operation) comes back with `reverted` rows**, check
`cfx_getTransactionReceipt`'s `txExecErrorMsg` for that tx hash before assuming it's fixture
exhaustion — `VmError(ExceedStorageLimit)` specifically means `js-conflux-sdk`'s unpadded
gas/storage estimate undershot, not a real contract-logic failure. `bench.ts` already pads
both via `padLimits()` (see `README.md` "Account model differences worth knowing" for why),
so this shouldn't recur, but if it does after modifying `bench.ts`, that's the first thing
to check.

## 8. Analyze

Same `../analysis/analyze.py` the other three legs feed into — see
`../analysis/README.md` (owned by the orchestrator, not this leg) once all legs have run.

## 9. Tear down

**Always name `conflux-local` explicitly. Never run a bare `docker compose ... down` or
`down -v` against this compose file** — it also defines `besu-local` and `geth-local`
(other legs/agents' containers, sharing this Docker daemon), and a scopeless `down`/`down
-v` stops/wipes all three, not just this one. See `docker/README.md` for the full
explanation and the safe, scoped commands:

```bash
docker compose -f ../../marketplace-bench/docker/local/docker-compose.yml stop conflux-local        # stop, keep data
docker compose -f ../../marketplace-bench/docker/local/docker-compose.yml rm -f -v conflux-local     # remove container, keep the named data volume
docker volume rm local_conflux-local-data                                                             # only if you deliberately want a fresh genesis
```

## Troubleshooting

- **`Not enough unlisted fixtures for approve/list bench` / `Not enough active listings for
  buy/cancel bench`.** The fixture pool in `seed-fixtures.confluxCore.json` is smaller than
  `BENCH_BATCH_SIZE × BENCH_REPEATS` needs — re-run step 6 with larger
  `SEED_TOKEN_COUNT`/`SEED_LISTING_COUNT`, or lower the bench's batch/repeat count. See
  step 6's note on why `buy` + `cancel` specifically need ≥2× the per-run count in the
  shared `listings` pool.
- **`RPCError: ... is discarded due to out of balance` from `fund-conflux-core.ts`.** The
  CoreSpace genesis account only has 10,000 CFX; `CFX_PER_ACCOUNT × 19` must stay
  comfortably under that, accounting for gas. Only relevant if you raise
  `CFX_PER_ACCOUNT` or add more accounts. (Hit this once during development against a
  *stale, already-partially-spent* `conflux-local-data` volume left over from a prior
  session — not a fresh-genesis problem; a scoped `docker volume rm local_conflux-local-data`
  + `up -d conflux-local` confirmed genesis really does start at 10,000 CFX. Do **not** use
  a bare `down -v` to get here — see "9. Tear down" above.)
- **Deploy sanity check fails (`Marketplace.item() does not match...`) on what looks like a
  correct deployment.** Core Space renders the same address at two different verbosity
  levels depending on where it comes from (`contractCreated` vs. a contract call return
  value) — make sure both sides of any address comparison go through
  `address.simplifyCfxAddress()` first (already done in `deploy.ts`/`bench.ts`; a trap if
  you add new address comparisons).
- **Chain state carried over unexpectedly.** `conflux-local` uses a named volume, so a
  plain `stop`/`up` resumes prior state. Use the scoped `docker volume rm
  local_conflux-local-data` from "9. Tear down" for a clean slate (and re-run steps 4-6
  after) — not a bare `down -v`, which would also wipe `besu-local`/`geth-local`.

## Beyond this baseline

Same caveat as `../../marketplace-bench/RUNBOOK.md`: this is the 1-node/1-validator local
baseline. No multi-node Core Space cluster was stood up for this leg — see `README.md`
"Known gaps".
