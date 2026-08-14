# Analysis pipeline (plan §8, §9)

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python analyze.py                      # reads ../bench-output/*.csv by default
```

Outputs land in `./output/`:

- `summary.csv` — per (chain, operation): n, failure rate, median/IQR/mean latency and
  cost, bootstrap 95% CIs on the medians. Flags any cell below the n≥30 floor from §8.
- `mannwhitney_latency.csv` / `mannwhitney_cost.csv` — pairwise chain comparisons per
  operation, with the rank-biserial effect size alongside the p-value (§8: "effect size,
  not just p-value").
- `kruskal_latency_by_nodecount.csv` — cross-node-count comparison within a chain, for
  the Track B node-count variable (§5).
- `latency_distribution.png`, `cost_per_operation.png`, `throughput_vs_senders.png`,
  `price_sensitivity.png` — the four plots in §9.

## Known simplifications vs. the plan

- **USD conversion**: `--usd-rates rates.csv` (columns `chain,timestamp_ms,usd_per_native`)
  joins each transaction to the nearest prior price point, rather than bench.ts fetching
  a live rate per transaction — same effect (rate varies over the run, not a single
  static number) without adding a network dependency to the benchmark harness itself.
  Without `--usd-rates`, cost is reported in native token units only.
- **Concurrency (`concurrentSenders`)**: `TxRecord` (plan §6.1) has no repeat/batch index,
  so it's recovered here as the size of each run's warmup batch (repeat 0 is always
  exactly one full batch). This assumes `BENCH_BATCH_SIZE` was constant within a single
  `bench.ts` invocation, which the harness guarantees.
- **Sample sizes**: this pipeline has only been smoke-tested against Phase 1's local
  Hardhat validation runs, which are far below the n≥30 floor from §8 by design (they're
  there to prove the harness works, not to produce a reportable result). Real Track A/B
  data collection (plan §10 phases 3-5) is follow-up work — see
  `../docs/chain-decision.md`.
