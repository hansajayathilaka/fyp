# marketplace-bench

DAG-based vs. linear blockchain evaluation: a single Solidity marketplace codebase
benchmarked for cost, latency/finality, and throughput across a Besu (linear, IBFT2.0)
node and a Conflux (DAG, Tree-Graph/GHAST) node — both running locally, no testnets, no
secrets. **See [`RUNBOOK.md`](RUNBOOK.md) to run the comparison end to end.**

Full methodology: [`docs/plan.md`](docs/plan.md). This README tracks phase status; the
plan document has the reasoning behind every design choice, and
[`docs/chain-decision.md`](docs/chain-decision.md) has the DAG-chain-pick reasoning
(§2.1: Conflux over Hedera, for the local comparison).

## Phases (plan §10)

| # | Phase | Status |
|---|-------|--------|
| 1 | Contracts + harness, network-agnostic (§3 checklist, steps 1-10) | ✅ Done — 13/13 tests green, deploy/seed/bench validated end-to-end |
| 2 | Resolve §2.1 (Hedera vs. Conflux) | ✅ Conflux, for the local comparison — see `docs/chain-decision.md` |
| local comparison | Real Besu + Conflux, both local, 1 node each | ✅ Done — see `RUNBOOK.md`, `docker/local/` |
| 3 | Track A data collection (public testnets) | ⬜ Not started — optional; the local comparison doesn't need it |
| 4 | Track B environment build (matched-node local clusters, node-count variable) | 🟡 Docker Compose scaffolded for 4-validator Besu + multi-node Conflux — not yet re-validated the way the 1-node setup was |
| 5 | Track B data collection across node counts | ⬜ Not started — depends on Phase 4 |
| 6 | Analysis + report generation (§8, §9) | ✅ Pipeline built; run it against real `besuLocal` vs. `confluxLocal` data per `RUNBOOK.md` |

## Quickstart

Two ways to run this, depending on what you need:

- **Real DAG-vs-linear comparison (recommended):** `RUNBOOK.md` — brings up a real Besu
  node and a real Conflux node in Docker, deploys/seeds/benchmarks both, and produces an
  actual pairwise comparison via `analysis/analyze.py`. No `.env`, no external services.
- **Fastest possible harness smoke test:** the in-memory Hardhat network, no Docker
  needed — useful for iterating on the contracts/scripts themselves, not for comparison
  data (there's only one "chain" and it isn't Besu or Conflux):

  ```bash
  npm install
  npx hardhat compile
  npx hardhat test
  npx hardhat node   # separate terminal
  npx hardhat run scripts/deploy.ts --network localhost
  SEED_TOKEN_COUNT=60 SEED_LISTING_COUNT=40 npx hardhat run scripts/seed.ts --network localhost
  BENCH_OPERATION=buy BENCH_BATCH_SIZE=5 BENCH_REPEATS=5 npx hardhat run scripts/bench.ts --network localhost
  ```

`bench.ts` reads its config from environment variables (`BENCH_OPERATION`,
`BENCH_BATCH_SIZE`, `BENCH_REPEATS`, `BENCH_PRICE_TIER_GWEI`, `BENCH_NODE_COUNT`,
`BENCH_TIMEOUT_MS`), matching the `BenchConfig` shape in plan §6.1. Output CSVs land in
`bench-output/`.

## Repo layout

```
marketplace-bench/
├── contracts/           MarketplaceItem.sol (ERC-721), Marketplace.sol (list/buy/cancel)
├── test/                Full happy-path + revert-path matrix (plan §4.4)
├── scripts/              deploy.ts, seed.ts, bench.ts (plan §6.1), fund-conflux-espace.ts
├── docker/
│   ├── local/            Real 1-node-each Besu + Conflux — the tested, documented comparison
│   ├── besu/              4-validator Besu cluster — Track B node-count scaffolding
│   ├── conflux/            Multi-node Conflux devnet — Track B node-count scaffolding
│   └── hedera-solo/        Docs only — Kubernetes/Solo path if Hedera is chosen for Track A
├── analysis/             Python pipeline for plan §8/§9 (stats + plots)
├── docs/                 plan.md (original), chain-decision.md (§2.1 resolution)
├── RUNBOOK.md            How to run the local DAG-vs-linear comparison — start here
└── bench-output/         gitignored — raw per-run CSVs land here
```

## What's deliberately not done yet

The local comparison (`docker/local/`) is real and tested — that's the primary
deliverable. Two things remain genuinely open, both optional extensions rather than
blockers: Track A (public testnets, only useful if you want "what a real user sees
today" numbers alongside the controlled local ones) and Track B's node-count variable
(the multi-validator/multi-node clusters under `docker/besu/` and `docker/conflux/`,
scaffolded from the original plan but not re-validated with the same rigor as the 1-node
setup — see each directory's README for status).
