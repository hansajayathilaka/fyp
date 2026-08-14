#!/usr/bin/env python3
"""Analysis pipeline for marketplace-bench CSV output — implements plan §8 (statistical
methodology) and §9 (reporting). Reads every CSV in bench-output/, produces a summary
table and the plots described in §9.

Usage:
    python analyze.py [--input-dir ../bench-output] [--output-dir ./output]
                       [--usd-rates rates.csv]

`rates.csv` (optional) has columns chain,timestamp_ms,usd_per_native — a price history
per chain, joined to each transaction by nearest prior timestamp, so cost-in-USD uses
the rate at execution time rather than one static conversion (plan §6/§8).
"""
from __future__ import annotations

import argparse
import glob
import os
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from scipy import stats

MIN_SAMPLE_SIZE = 30  # plan §8 floor for asymptotic-normality assumptions


def load_records(input_dir: Path) -> pd.DataFrame:
    files = sorted(glob.glob(str(input_dir / "*.csv")))
    if not files:
        raise SystemExit(f"No CSV files found in {input_dir}")
    frames = [pd.read_csv(f) for f in files]
    df = pd.concat(frames, ignore_index=True)
    df["warmup"] = df["warmup"].astype(bool)
    return df


def add_derived_columns(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["latency_ms"] = df["receivedAt"] - df["submittedAt"]
    df["cost_native"] = (df["gasUsed"].astype("Float64") * df["effectiveGasPrice"].astype("Float64")) / 1e18

    # bench.ts doesn't stamp a repeat index in TxRecord (plan §6.1's schema is fixed);
    # recover it here — the first repeat of every run is exactly one full batch tagged
    # warmup=True, so its size is that run's concurrency (batchSize).
    batch_size = df[df["warmup"]].groupby("runId").size().rename("concurrentSenders")
    df = df.merge(batch_size, on="runId", how="left")
    return df


def load_usd_rates(path: Path | None) -> pd.DataFrame | None:
    if path is None:
        return None
    rates = pd.read_csv(path)
    return rates.sort_values("timestamp_ms")


def join_usd(df: pd.DataFrame, rates: pd.DataFrame | None) -> pd.DataFrame:
    if rates is None:
        df["cost_usd"] = pd.NA
        return df
    df = df.sort_values("submittedAt")
    joined = []
    for chain, group in df.groupby("chain"):
        chain_rates = rates[rates["chain"] == chain]
        if chain_rates.empty:
            group = group.copy()
            group["usd_per_native"] = pd.NA
        else:
            group = pd.merge_asof(
                group.sort_values("submittedAt"),
                chain_rates.sort_values("timestamp_ms"),
                left_on="submittedAt",
                right_on="timestamp_ms",
                direction="backward",
            )
        joined.append(group)
    df = pd.concat(joined, ignore_index=True)
    df["cost_usd"] = df["cost_native"].astype("Float64") * df["usd_per_native"].astype("Float64")
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
    group_cols = ["chain", "operation"]
    for keys, group in non_warmup.groupby(group_cols):
        chain, operation = keys
        success = group[group["status"] == "success"]
        n = len(group)
        n_success = len(success)
        latency = success["latency_ms"].dropna().to_numpy(dtype=float)
        cost = success["cost_native"].dropna().to_numpy(dtype=float)

        lat_lo, lat_hi = bootstrap_ci(latency)
        cost_lo, cost_hi = bootstrap_ci(cost)

        rows.append(
            {
                "chain": chain,
                "operation": operation,
                "n": n,
                "n_success": n_success,
                "failure_rate": 1 - (n_success / n) if n else np.nan,
                "below_min_sample_size": n_success < MIN_SAMPLE_SIZE,
                "latency_ms_median": np.median(latency) if len(latency) else np.nan,
                "latency_ms_iqr": stats.iqr(latency) if len(latency) else np.nan,
                "latency_ms_mean": np.mean(latency) if len(latency) else np.nan,
                "latency_ms_ci95_lo": lat_lo,
                "latency_ms_ci95_hi": lat_hi,
                "cost_native_median": np.median(cost) if len(cost) else np.nan,
                "cost_native_iqr": stats.iqr(cost) if len(cost) else np.nan,
                "cost_native_ci95_lo": cost_lo,
                "cost_native_ci95_hi": cost_hi,
            }
        )
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
                rows.append(
                    {
                        "operation": operation,
                        "metric": metric,
                        "chain_a": chains[i],
                        "chain_b": chains[j],
                        "n_a": len(a),
                        "n_b": len(b),
                        "u_statistic": u_stat,
                        "p_value": p_value,
                        "rank_biserial_r": rank_biserial(u_stat, len(a), len(b)),
                    }
                )
    return pd.DataFrame(rows)


def kruskal_by_node_count(df: pd.DataFrame, metric: str) -> pd.DataFrame:
    non_warmup = df[(~df["warmup"]) & (df["status"] == "success") & df["nodeCount"].notna()]
    rows = []
    for (chain, operation), group in non_warmup.groupby(["chain", "operation"]):
        samples = [
            g[metric].dropna().to_numpy(dtype=float)
            for _, g in group.groupby("nodeCount")
            if len(g[metric].dropna()) >= 2
        ]
        if len(samples) < 3:
            continue
        h_stat, p_value = stats.kruskal(*samples)
        rows.append(
            {
                "chain": chain,
                "operation": operation,
                "metric": metric,
                "n_groups": len(samples),
                "h_statistic": h_stat,
                "p_value": p_value,
            }
        )
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
        ax.set_title(f"{operation}: time-to-receipt")
        ax.set_ylabel("latency (ms)")
    fig.tight_layout()
    fig.savefig(output_dir / "latency_distribution.png", dpi=150)
    plt.close(fig)


def plot_cost_bar(df: pd.DataFrame, output_dir: Path):
    non_warmup = df[(~df["warmup"]) & (df["status"] == "success")]
    if non_warmup.empty:
        return
    metric = "cost_usd" if non_warmup["cost_usd"].notna().any() else "cost_native"
    pivot = non_warmup.groupby(["operation", "chain"])[metric].median().unstack("chain")
    fig, ax = plt.subplots(figsize=(8, 5))
    pivot.plot(kind="bar", ax=ax)
    ax.set_ylabel(f"median cost ({'USD' if metric == 'cost_usd' else 'native token'})")
    ax.set_title("Cost per operation")
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
        label = f"{run_meta['chain']}" + (
            f" (nodes={int(run_meta['nodeCount'])})" if pd.notna(run_meta.get("nodeCount")) else ""
        )
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


def plot_price_sensitivity(df: pd.DataFrame, output_dir: Path):
    non_warmup = df[(~df["warmup"]) & (df["status"] == "success") & df["priceTier"].notna()]
    if non_warmup.empty:
        return
    fig, ax = plt.subplots(figsize=(8, 5))
    for chain, group in non_warmup.groupby("chain"):
        ax.scatter(group["priceTier"], group["latency_ms"], alpha=0.5, label=chain)
    ax.set_xlabel("price tier (gwei)")
    ax.set_ylabel("latency (ms)")
    ax.set_title("Latency vs. gas price tier")
    ax.legend()
    fig.tight_layout()
    fig.savefig(output_dir / "price_sensitivity.png", dpi=150)
    plt.close(fig)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input-dir", type=Path, default=Path(__file__).parent.parent / "bench-output")
    parser.add_argument("--output-dir", type=Path, default=Path(__file__).parent / "output")
    parser.add_argument("--usd-rates", type=Path, default=None)
    args = parser.parse_args()

    args.output_dir.mkdir(parents=True, exist_ok=True)

    df = load_records(args.input_dir)
    df = add_derived_columns(df)
    df = join_usd(df, load_usd_rates(args.usd_rates))

    summary = summarize(df)
    summary.to_csv(args.output_dir / "summary.csv", index=False)
    print(summary.to_string(index=False))

    latency_tests = pairwise_chain_tests(df, "latency_ms")
    cost_tests = pairwise_chain_tests(df, "cost_native")
    latency_tests.to_csv(args.output_dir / "mannwhitney_latency.csv", index=False)
    cost_tests.to_csv(args.output_dir / "mannwhitney_cost.csv", index=False)

    kruskal_latency = kruskal_by_node_count(df, "latency_ms")
    kruskal_latency.to_csv(args.output_dir / "kruskal_latency_by_nodecount.csv", index=False)

    plot_latency_distribution(df, args.output_dir)
    plot_cost_bar(df, args.output_dir)
    plot_throughput(df, args.output_dir)
    plot_price_sensitivity(df, args.output_dir)

    print(f"\nWrote summary tables and plots to {args.output_dir}")


if __name__ == "__main__":
    main()
