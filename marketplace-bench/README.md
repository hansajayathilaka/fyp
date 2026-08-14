# marketplace-bench

DAG-based vs. linear blockchain evaluation: a single Solidity marketplace codebase
benchmarked for cost, latency/finality, and throughput across an Ethereum-family linear
chain and a DAG-structured DLT (Hedera or Conflux — see
[`docs/chain-decision.md`](docs/chain-decision.md)).

Full methodology: [`docs/plan.md`](docs/plan.md). This README tracks phase status; the
plan document has the reasoning behind every design choice.

## Phases (plan §10)

| # | Phase | Status |
|---|-------|--------|
| 1 | Contracts + harness, network-agnostic (§3 checklist, steps 1-10) | ✅ Done — 13/13 tests green, deploy/seed/bench validated end-to-end on local Hardhat |
| 2 | Resolve §2.1 (Hedera vs. Conflux) | 🟡 Config scaffolded, decision left open — see `docs/chain-decision.md` |
| 3 | Track A data collection (public testnets) | ⬜ Not started — needs the Phase 2 decision + funded testnet accounts |
| 4 | Track B environment build (matched-node local clusters) | 🟡 Docker Compose scaffolded for Besu + Conflux, documented for Hedera Solo — not yet brought up live |
| 5 | Track B data collection across node counts | ⬜ Not started — depends on Phase 4 |
| 6 | Analysis + report generation (§8, §9) | 🟡 Pipeline built and smoke-tested against Phase 1 data — real cross-chain analysis awaits Phases 3/5 |

## Quickstart (Phase 1 — works today, no chain decision needed)

```bash
npm install
npx hardhat compile
npx hardhat test                                   # 13 tests, in-memory network

npx hardhat node                                    # separate terminal — persistent local chain
npx hardhat run scripts/deploy.ts --network localhost
SEED_TOKEN_COUNT=60 SEED_LISTING_COUNT=40 \
  npx hardhat run scripts/seed.ts --network localhost

BENCH_OPERATION=buy BENCH_BATCH_SIZE=5 BENCH_REPEATS=5 \
  npx hardhat run scripts/bench.ts --network localhost
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
├── scripts/             deploy.ts, seed.ts, bench.ts (plan §6.1)
├── docker/              Track B cluster scaffolding — besu/, conflux/, hedera-solo/
├── analysis/            Python pipeline for plan §8/§9 (stats + plots)
├── docs/                plan.md (original), chain-decision.md (open §2.1 call)
└── bench-output/        gitignored — raw per-run CSVs land here
```

## What's deliberately not done yet

Phases 3 and 5 (real Track A/B data collection) require things this implementation pass
correctly stopped short of: a resolved chain choice, funded testnet accounts, and a live
multi-node cluster running for the duration of a data-collection run. Phase 1 was built
and validated precisely so that none of that blocks starting — see `docs/chain-decision.md`
for what's needed to unblock Phase 2 onward.
