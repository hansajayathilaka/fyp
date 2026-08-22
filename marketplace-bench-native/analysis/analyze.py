#!/usr/bin/env python3
"""Analysis pipeline for marketplace-bench-native — the native-language DAG-vs-linear
comparison (see ../docs/DESIGN.md). Unlike ../../marketplace-bench/analysis/analyze.py,
this reads TWO CSV schemas and normalizes them to one:

  - the native-track schema (marketplace-bench-native/bench-output/*.csv): already has
    architecture/language/feeCurrency/feePaidNative columns, see DESIGN.md.
  - besuLocal's existing schema (marketplace-bench/bench-output/*.csv), read read-only
    from the *other*, unmodified track and normalized into the same shape (architecture=
    linear, language=solidity-evm, feeCurrency=ETH, feePaidNative=gasUsed*effectiveGasPrice).

This is what makes "DAG-native vs. linear" a real single comparison instead of two
separate reports.

Usage:
    python analyze.py [--native-dir ../bench-output] [--besu-dir ../../marketplace-bench/bench-output]
                       [--output-dir ./output]
"""
from __future__ import annotations

import argparse
import glob
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from scipy import stats

MIN_SAMPLE_SIZE = 30

# Smallest-native-unit -> whole-unit decimals, per DESIGN.md's feeCurrency values.
CURRENCY_DECIMALS = {
    "ETH": 18,  # besuLocal, wei
    "CFX": 18,  # confluxCore, drip
    "SUI": 9,  # sui, MIST
    "HBAR": 8,  # hedera, tinybar
}

NATIVE_COLUMNS = [
    "runId", "chain", "architecture", "language", "operation", "nodeCount",
    "priceTier", "warmup", "txId", "submittedAt", "receivedAt", "confirmUnit",
    "feeUnitsUsed", "feeUnitPrice", "feePaidNative", "feeCurrency", "status",
]


def load_native(native_dir: Path) -> pd.DataFrame:
    files = sorted(glob.glob(str(native_dir / "*.csv")))
    if not files:
        return pd.DataFrame(columns=NATIVE_COLUMNS)
    frames = [pd.read_csv(f) for f in files]
    df = pd.concat(frames, ignore_index=True)
    df["warmup"] = df["warmup"].astype(bool)
    return df


def load_besu(besu_dir: Path) -> pd.DataFrame:
    """Reads the existing besuLocal CSVs (old schema) read-only and normalizes them
    into the native-track schema. Never writes into besu_dir."""
    files = sorted(glob.glob(str(besu_dir / "besuLocal-*.csv")))
    if not files:
        return pd.DataFrame(columns=NATIVE_COLUMNS)
    frames = [pd.read_csv(f) for f in files]
    df = pd.concat(frames, ignore_index=True)
    df["warmup"] = df["warmup"].astype(bool)

    out = pd.DataFrame()
    out["runId"] = df["runId"]
    out["chain"] = df["chain"]
    out["architecture"] = "linear"
    out["language"] = "solidity-evm"
    out["operation"] = df["operation"]
    out["nodeCount"] = df.get("nodeCount")
    out["priceTier"] = df.get("priceTier")
    out["warmup"] = df["warmup"]
    out["txId"] = df["txHash"]
    out["submittedAt"] = df["submittedAt"]
    out["receivedAt"] = df["receivedAt"]
    out["confirmUnit"] = df.get("blockNumber")
    out["feeUnitsUsed"] = df.get("gasUsed")
    out["feeUnitPrice"] = df.get("effectiveGasPrice")
    out["feePaidNative"] = df.get("gasUsed").astype("Float64") * df.get("effectiveGasPrice").astype("Float64")
    out["feeCurrency"] = "ETH"
    out["status"] = df["status"]
    return out


def add_derived_columns(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["latency_ms"] = df["receivedAt"] - df["submittedAt"]
    decimals = df["feeCurrency"].map(CURRENCY_DECIMALS)
    df["cost_native"] = df["feePaidNative"].astype("Float64") / (10 ** decimals)

    batch_size = df[df["warmup"]].groupby("runId").size().rename("concurrentSenders")
    df = df.merge(batch_size, on="runId", how="left")
    return df


def bootstrap_ci(values: np.ndarray, stat=np.median, n_resamples: int = 5000, ci: float = 0.95):
    values = values[~np.isnan(values)]
    if len(values) == 0:
        return (np.nan, np.nan)
    rng = np.random.default_rng(0)
    boot_stats = np.array(
        [stat(rng.choice(values, size=len(values), replace=True)) for _ in range(n_resamples)]
    )
    alpha = (1 - ci) / 2
    return (np.quantile(boot_stats, alpha), np.quantile(boot_stats, 1 - alpha))


def summarize(df: pd.DataFrame) -> pd.DataFrame:
    non_warmup = df[~df["warmup"]]
    rows = []
    for keys, group in non_warmup.groupby(["chain", "architecture", "operation"]):
        chain, architecture, operation = keys
        success = group[group["status"] == "success"]
        n = len(group)
        n_success = len(success)
        latency = success["latency_ms"].dropna().to_numpy(dtype=float)
        cost = success["cost_native"].dropna().to_numpy(dtype=float)
        lat_lo, lat_hi = bootstrap_ci(latency)
        cost_lo, cost_hi = bootstrap_ci(cost)
        rows.append({
            "chain": chain,
            "architecture": architecture,
            "operation": operation,
            "feeCurrency": group["feeCurrency"].iloc[0],
            "n": n,
            "n_success": n_success,
            "failure_rate": 1 - (n_success / n) if n else np.nan,
            "below_min_sample_size": n_success < MIN_SAMPLE_SIZE,
            "latency_ms_median": np.median(latency) if len(latency) else np.nan,
            "latency_ms_iqr": stats.iqr(latency) if len(latency) else np.nan,
            "latency_ms_ci95_lo": lat_lo,
            "latency_ms_ci95_hi": lat_hi,
            "cost_native_median": np.median(cost) if len(cost) else np.nan,
            "cost_native_iqr": stats.iqr(cost) if len(cost) else np.nan,
            "cost_native_ci95_lo": cost_lo,
            "cost_native_ci95_hi": cost_hi,
        })
    return pd.DataFrame(rows)


def summarize_by_architecture(df: pd.DataFrame) -> pd.DataFrame:
    """The headline table: DAG (pooled across confluxCore/sui/hedera) vs. linear
    (besuLocal), per operation, latency only (cost isn't comparable pooled across
    currencies — see per-chain cost_native_median in `summarize` instead)."""
    non_warmup = df[(~df["warmup"]) & (df["status"] == "success")]
    rows = []
    for (architecture, operation), group in non_warmup.groupby(["architecture", "operation"]):
        latency = group["latency_ms"].dropna().to_numpy(dtype=float)
        lo, hi = bootstrap_ci(latency)
        rows.append({
            "architecture": architecture,
            "operation": operation,
            "n_chains": group["chain"].nunique(),
            "n": len(group),
            "latency_ms_median": np.median(latency) if len(latency) else np.nan,
            "latency_ms_ci95_lo": lo,
            "latency_ms_ci95_hi": hi,
        })
    return pd.DataFrame(rows)


def rank_biserial(u_stat: float, n1: int, n2: int) -> float:
    return 1 - (2 * u_stat) / (n1 * n2)


def pairwise_chain_tests(df: pd.DataFrame, metric: str) -> pd.DataFrame:
    non_warmup = df[(~df["warmup"]) & (df["status"] == "success")]
    rows = []
    for operation, group in non_warmup.groupby("operation"):
        chains = sorted(group["chain"].unique())
        for i in range(len(chains)):
            for j in range(i + 1, len(chains)):
                a = group[group["chain"] == chains[i]][metric].dropna().to_numpy(dtype=float)
                b = group[group["chain"] == chains[j]][metric].dropna().to_numpy(dtype=float)
                if len(a) < 2 or len(b) < 2:
                    continue
                u_stat, p_value = stats.mannwhitneyu(a, b, alternative="two-sided")
                rows.append({
                    "operation": operation,
                    "metric": metric,
                    "chain_a": chains[i],
                    "chain_b": chains[j],
                    "n_a": len(a),
                    "n_b": len(b),
                    "u_statistic": u_stat,
                    "p_value": p_value,
                    "rank_biserial_r": rank_biserial(u_stat, len(a), len(b)),
                })
    return pd.DataFrame(rows)


def plot_latency_distribution(df: pd.DataFrame, output_dir: Path):
    non_warmup = df[(~df["warmup"]) & (df["status"] == "success")]
    if non_warmup.empty:
        return
    operations = sorted(non_warmup["operation"].unique())
    fig, axes = plt.subplots(1, len(operations), figsize=(5 * len(operations), 5), squeeze=False)
    for ax, operation in zip(axes[0], operations):
        op_data = non_warmup[non_warmup["operation"] == operation]
        chains = sorted(op_data["chain"].unique())
        data = [op_data[op_data["chain"] == c]["latency_ms"].dropna() for c in chains]
        ax.boxplot(data, tick_labels=chains, showmeans=True)
        ax.set_title(f"{operation}: time-to-confirmation")
        ax.set_ylabel("latency (ms)")
        ax.tick_params(axis="x", rotation=30)
    fig.tight_layout()
    fig.savefig(output_dir / "latency_distribution.png", dpi=150)
    plt.close(fig)


def plot_cost_bar(df: pd.DataFrame, output_dir: Path):
    non_warmup = df[(~df["warmup"]) & (df["status"] == "success")]
    if non_warmup.empty:
        return
    pivot = non_warmup.groupby(["operation", "chain"])["cost_native"].median().unstack("chain")
    fig, ax = plt.subplots(figsize=(9, 5))
    pivot.plot(kind="bar", ax=ax)
    ax.set_ylabel("median cost (native token, log scale)")
    ax.set_yscale("log")
    ax.set_title("Cost per operation (each chain's own currency — see summary.csv for feeCurrency; not directly comparable across currencies without a USD rate)")
    fig.tight_layout()
    fig.savefig(output_dir / "cost_per_operation.png", dpi=150)
    plt.close(fig)


def plot_throughput(df: pd.DataFrame, output_dir: Path):
    non_warmup = df[(~df["warmup"]) & (df["status"] == "success")]
    if non_warmup.empty or non_warmup["concurrentSenders"].isna().all():
        return
    fig, ax = plt.subplots(figsize=(8, 5))
    for run_id, run in non_warmup.groupby("runId"):
        elapsed_s = (run["receivedAt"].max() - run["submittedAt"].min()) / 1000.0
        if elapsed_s <= 0:
            continue
        tps = len(run) / elapsed_s
        run_meta = run.iloc[0]
        label = f"{run_meta['chain']}"
        ax.scatter(run_meta["concurrentSenders"], tps, label=label)
    ax.set_xlabel("concurrent senders (batch size)")
    ax.set_ylabel("throughput (tx/s)")
    ax.set_title("Throughput vs. concurrent senders")
    handles, labels = ax.get_legend_handles_labels()
    unique = dict(zip(labels, handles))
    ax.legend(unique.values(), unique.keys())
    fig.tight_layout()
    fig.savefig(output_dir / "throughput_vs_senders.png", dpi=150)
    plt.close(fig)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--native-dir", type=Path, default=Path(__file__).parent.parent / "bench-output")
    parser.add_argument(
        "--besu-dir", type=Path,
        default=Path(__file__).parent.parent.parent / "marketplace-bench" / "bench-output",
    )
    parser.add_argument("--output-dir", type=Path, default=Path(__file__).parent / "output")
    args = parser.parse_args()

    args.output_dir.mkdir(parents=True, exist_ok=True)

    native = load_native(args.native_dir)
    besu = load_besu(args.besu_dir)
    df = pd.concat([native, besu], ignore_index=True)
    if df.empty:
        raise SystemExit(
            f"No CSVs found in {args.native_dir} or besuLocal-*.csv in {args.besu_dir}. "
            "Run each chain's RUNBOOK first."
        )
    df = add_derived_columns(df)

    summary = summarize(df)
    summary.to_csv(args.output_dir / "summary.csv", index=False)
    print(summary.to_string(index=False))

    arch_summary = summarize_by_architecture(df)
    arch_summary.to_csv(args.output_dir / "summary_by_architecture.csv", index=False)
    print("\n=== DAG vs. linear, pooled latency ===")
    print(arch_summary.to_string(index=False))

    latency_tests = pairwise_chain_tests(df, "latency_ms")
    cost_tests = pairwise_chain_tests(df, "cost_native")
    latency_tests.to_csv(args.output_dir / "mannwhitney_latency.csv", index=False)
    cost_tests.to_csv(args.output_dir / "mannwhitney_cost.csv", index=False)

    plot_latency_distribution(df, args.output_dir)
    plot_cost_bar(df, args.output_dir)
    plot_throughput(df, args.output_dir)

    print(f"\nWrote summary tables and plots to {args.output_dir}")


if __name__ == "__main__":
    main()
