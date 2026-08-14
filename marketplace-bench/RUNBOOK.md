# RUNBOOK: Local DAG vs. Linear Blockchain Comparison

Runs a real Besu (linear, IBFT2.0) node and a real Conflux (DAG, Tree-Graph/GHAST) node
side by side on your machine, deploys the same marketplace contracts to both, and
benchmarks them with the same harness — so the numbers you get are an actual comparison,
not a simulation. Everything is local: no testnets, no faucets, no API keys, no `.env`
file. Every account and config file in `docker/local/` is a hardcoded, well-known,
funds-worthless dev credential (Hardhat's own public test mnemonic) — safe to commit,
never usable on a real network.

Chain choice for the DAG side: **Conflux eSpace**, not Hedera — per
[`docs/chain-decision.md`](docs/chain-decision.md), Conflux's market-based gas model
keeps the fee mechanism identical on both sides of the comparison, so the only variable
that changes is the ledger/consensus structure (DAG vs. linear chain). That's what makes
this a clean architecture comparison rather than a comparison confounded by two different
fee policies.

## Prerequisites

- Docker with Compose v2 (`docker compose version`)
- Node.js 18+ and npm

No accounts to create, no keys to generate, no faucet requests.

## 1. Install dependencies

```bash
cd marketplace-bench
npm install
```

## 2. Start both chains

```bash
npm run compare:up
```

This brings up two containers via `docker/local/docker-compose.yml`:

| Chain | Type | RPC | Chain ID | Block time |
|---|---|---|---|---|
| `besuLocal` | Linear (Besu, IBFT2.0, 1 validator) | `http://localhost:8545` | 4004 | 2s |
| `confluxLocal` | DAG (Conflux, dev mode) | `http://localhost:8546` | 1025 | 0.5s |

Both come up funded for 20 well-known dev accounts (the same ones Hardhat's in-memory
network uses) — **except** Conflux needs one extra step, because of how its account
model works (see below).

Wait ~15s for both to start producing blocks, then confirm:

```bash
curl -s -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' http://localhost:8545
curl -s -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' http://localhost:8546
```

Both should return an increasing block number on repeated calls.

## 3. Fund the Conflux eSpace accounts (one-time per fresh chain)

Conflux has two "spaces" sharing one ledger: CoreSpace (its native account model) and
eSpace (the EVM-compatible space Hardhat/ethers talk to). `genesis_secrets` — the
mechanism that pre-funds accounts in Conflux's dev mode — only funds the **CoreSpace**
side. eSpace accounts start at zero balance regardless, and have to be funded by an
explicit cross-space transfer. Run:

```bash
npm run compare:fund-conflux
```

This uses the CoreSpace genesis-funded account (`docker/local/conflux/genesis_secrets.txt`)
to call the `CrossSpaceCall.transferEVM` internal contract, moving 400 CFX into each of
the 20 eSpace dev accounts (`scripts/fund-conflux-espace.ts`). Besu doesn't need this —
its genesis `alloc` funds the eSpace-equivalent addresses directly, since Besu has no
separate account-space split.

You only need to re-run this after a **fresh** `compare:up` (fresh chain state). If you
stop and restart the containers without wiping volumes, funding persists.

## 4. Deploy the contracts to both chains

```bash
npx hardhat compile
npx hardhat run scripts/deploy.ts --network besuLocal
npx hardhat run scripts/deploy.ts --network confluxLocal
```

Addresses are recorded per-network in `deployment-addresses.json`.

## 5. Seed fixtures on both chains

```bash
SEED_TOKEN_COUNT=60 SEED_LISTING_COUNT=40 npx hardhat run scripts/seed.ts --network besuLocal
SEED_TOKEN_COUNT=60 SEED_LISTING_COUNT=40 npx hardhat run scripts/seed.ts --network confluxLocal
```

Each writes its own `seed-fixtures.<network>.json` (kept separate so seeding one chain
never clobbers the other's fixtures). This step mints/approves/lists **sequentially, one
transaction at a time**, so it's bounded by each chain's block time: measured on this
setup, `SEED_TOKEN_COUNT=60 SEED_LISTING_COUNT=40` (140 transactions) took **~8 minutes
on besuLocal** (2s block period) and well under a minute on confluxLocal (0.5s block
period). Scale expectations roughly linearly with `tokenCount` before raising it — the
plan's n≥30-per-condition floor (§8) is about *benchmark* sample size (`bench.ts`'s
`BATCH_SIZE × REPEATS`), not the seed pool, so there's rarely a reason to seed much more
than you'll actually consume as `buy`/`cancel` fixtures.

## 6. Run the benchmark harness on both chains

Run each operation you want data for, once per chain, e.g.:

```bash
for net in besuLocal confluxLocal; do
  for op in mint approve list buy cancel; do
    BENCH_OPERATION=$op BENCH_BATCH_SIZE=5 BENCH_REPEATS=6 \
      npx hardhat run scripts/bench.ts --network $net
  done
done
```

`BENCH_BATCH_SIZE` is concurrent senders per repeat; `BENCH_REPEATS` includes one warmup
repeat that gets tagged and excluded from analysis automatically. Optional:
`BENCH_PRICE_TIER_GWEI` (fee-sensitivity runs — meaningful on both chains here, since
Conflux eSpace has a real gas market, unlike Hedera), `BENCH_NODE_COUNT` (informational
tag; this setup is the 1-node baseline).

Each run appends a CSV to `bench-output/{chain}-{operation}-{timestamp}.csv`. Because
`bench.ts` reads/writes fixtures per network, you can safely alternate chains without
resetting anything between them — just don't run `buy` or `cancel` against more listings
than `seed-fixtures.<network>.json` has left unconsumed (re-seed if you run out).

## 7. Analyze

```bash
cd analysis
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python analyze.py
```

Reads every CSV in `../bench-output/`, and because both chains' rows share the same
`operation` values, the pairwise Mann-Whitney U tests in `analysis/output/mannwhitney_*.csv`
directly compare `besuLocal` vs. `confluxLocal` per operation — that's the actual DAG-vs-
linear comparison this whole setup exists to produce. See `analysis/README.md` for what
each output file means.

## 8. Tear down

```bash
npm run compare:down          # stop + remove containers, keep chain data
docker compose -f docker/local/docker-compose.yml down -v   # also wipe chain data
```

Use the `-v` form before your next `compare:up` if you want a truly fresh genesis (e.g.
to re-run the Conflux funding step cleanly) — without it, `compare:up` resumes the
previous chain state.

## Troubleshooting

- **`Invalid opcode: 0x5f` (Besu) or `Bad jump destination` (Conflux) on deploy.** EVM
  version mismatch between the Solidity compiler target (`cancun`, in
  `hardhat.config.ts` — required because OpenZeppelin 5.x uses the Cancun-only `MCOPY`
  opcode) and what the chain's genesis enables. Already fixed in the committed configs
  (`docker/local/besu/genesis.json` sets `shanghaiTime`/`cancunTime`: 0; `docker/local/conflux/conflux.toml`
  sets `cancun_opcodes_transition_number = 10`) — if you regenerate either config from
  scratch, keep these.
- **Conflux eSpace balance is 0 after `compare:up`.** Expected — see step 3, this is
  Conflux's account-space split, not a bug. Run `npm run compare:fund-conflux`.
- **`ProviderError`/`NotEnoughCash` from the funding script.** The CoreSpace funder
  account only has 10,000 CFX from `genesis_secrets`; `scripts/fund-conflux-espace.ts`'s
  `CFX_PER_ACCOUNT` must stay comfortably under `10000 / 20`. Only relevant if you add
  more accounts or increase the per-account amount.
- **Chain state carried over unexpectedly.** `docker/local/docker-compose.yml` uses named
  volumes for both chains' data, so a plain `down`/`up` resumes prior state rather than
  resetting to genesis. Use `down -v` for a clean slate.

## Beyond this baseline

This is the 1-node-per-chain baseline — matched node count, matched hardware, real
consensus on both sides. For the node-count-sensitivity variable (plan §5's "run at 3 and
4 nodes minimum"), see the multi-validator Besu cluster in `docker/besu/` and the
multi-node Conflux devnet in `docker/conflux/` — scaffolded but not yet re-validated
against this doc's tested single-node path.
