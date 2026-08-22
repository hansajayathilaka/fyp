// Benchmark harness — Sui analogue of ../../../marketplace-bench/scripts/bench.ts. Same
// env-var contract (BENCH_OPERATION, BENCH_BATCH_SIZE, BENCH_REPEATS, BENCH_TIMEOUT_MS,
// BENCH_NODE_COUNT), same timing semantics (submit -> await confirmation, bounded by a
// timeout, first repeat tagged as warmup and excluded from analysis), same output
// contract (one CSV per run under ../../bench-output/, DESIGN.md's exact column set).
//
// `approve` is not implemented — DESIGN.md and ../README.md explain why: Sui's object
// ownership model has no allowance/approval step, so there is nothing to benchmark there.
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import {
  ARCHITECTURE,
  CHAIN,
  FEE_CURRENCY,
  LANGUAGE,
  TIMEOUT_MS,
  TxRecord,
  getClient,
  loadDeployment,
  loadFixtures,
  loadOrCreateAccounts,
  netMistCharged,
  writeCsv,
} from "./common.js";

type Operation = "mint" | "list" | "buy" | "cancel";

interface BenchConfig {
  operation: Operation;
  batchSize: number;
  repeats: number;
  nodeCount?: number;
  listPriceSui: string;
}

function readConfig(): BenchConfig {
  const operation = process.env.BENCH_OPERATION as Operation | undefined;
  if (!operation || !["mint", "list", "buy", "cancel"].includes(operation)) {
    throw new Error(
      `BENCH_OPERATION must be one of mint|list|buy|cancel (got "${operation}"). ` +
        `"approve" is not applicable on Sui — see ../README.md.`
    );
  }
  return {
    operation,
    batchSize: Number(process.env.BENCH_BATCH_SIZE ?? 5),
    repeats: Number(process.env.BENCH_REPEATS ?? 5),
    nodeCount: process.env.BENCH_NODE_COUNT ? Number(process.env.BENCH_NODE_COUNT) : undefined,
    listPriceSui: process.env.BENCH_LIST_PRICE_SUI ?? "1",
  };
}

interface Job {
  signer: Ed25519Keypair;
  build: (gasPrice: bigint) => Transaction;
}

/** Times a single submitted transaction: send -> await execution (bounded by TIMEOUT_MS). */
async function timeTx(
  client: SuiJsonRpcClient,
  runId: string,
  operation: Operation,
  warmup: boolean,
  nodeCount: number | undefined,
  gasPrice: bigint,
  job: Job
): Promise<TxRecord> {
  const base = {
    runId,
    chain: CHAIN,
    architecture: ARCHITECTURE,
    language: LANGUAGE,
    operation,
    nodeCount,
    warmup,
    feeCurrency: FEE_CURRENCY,
  };
  const submittedAt = Date.now();
  try {
    const tx = job.build(gasPrice);
    const execPromise = client.signAndExecuteTransaction({
      transaction: tx,
      signer: job.signer,
      options: { showEffects: true },
    });
    const result = await Promise.race([
      execPromise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), TIMEOUT_MS)),
    ]);

    if (result === null) {
      return { ...base, txId: "", submittedAt, status: "timeout" };
    }

    const txId = result.digest;
    const receivedAt = Date.now();

    if (result.effects?.status.status !== "success") {
      return { ...base, txId, submittedAt, receivedAt, status: "reverted" };
    }

    // Best-effort follow-up for confirmUnit (checkpoint sequence number). Checkpoint
    // assignment happens asynchronously from execution on Sui, so it's routinely still
    // null in the response above — this poll is informational only and, deliberately,
    // does NOT extend the submittedAt/receivedAt timing window (see ../README.md).
    let confirmUnit = "";
    for (let attempt = 0; attempt < 5 && !confirmUnit; attempt++) {
      try {
        const check = await client.getTransactionBlock({ digest: txId, options: {} });
        if (check.checkpoint) confirmUnit = check.checkpoint;
      } catch {
        // not yet indexed by the fullnode — retry
      }
      if (!confirmUnit) await new Promise((r) => setTimeout(r, 200));
    }

    const gasUsed = result.effects.gasUsed;
    const netMist = netMistCharged(gasUsed);
    const feeUnitsUsed = gasPrice > 0n ? (netMist / gasPrice).toString() : "";

    return {
      ...base,
      txId,
      submittedAt,
      receivedAt,
      confirmUnit,
      feeUnitsUsed,
      feeUnitPrice: gasPrice.toString(),
      feePaidNative: netMist.toString(),
      status: "success",
    };
  } catch (error) {
    return { ...base, txId: "", submittedAt, receivedAt: Date.now(), status: "reverted" };
  }
}

async function main() {
  const config = readConfig();
  console.log(
    `Benchmarking "${config.operation}" on "${CHAIN}": ` +
      `batchSize=${config.batchSize} repeats=${config.repeats}` +
      (config.nodeCount !== undefined ? ` nodeCount=${config.nodeCount}` : "")
  );

  const client = getClient();
  const deployment = loadDeployment();
  const referenceGasPrice = await client.getReferenceGasPrice();
  console.log(`Reference gas price: ${referenceGasPrice} MIST/unit`);

  const totalNeeded = config.batchSize * config.repeats;
  // Account pool must be at least batchSize so every job in a batch gets its own signer
  // (own gas-object version chain) — concurrent sends from the same account would race
  // on that account's gas coin, same warning ../../../marketplace-bench/scripts/bench.ts
  // documents for EVM nonces. loadOrCreateAccounts is idempotent/append-only, so this
  // reuses the exact accounts seed.ts created (dev-accounts.json), extending the pool
  // only if BENCH_BATCH_SIZE exceeds what seed.ts provisioned.
  const poolSize = Math.max(config.batchSize, Number(process.env.SEED_SELLER_COUNT ?? 5) + 1);
  const accounts = await loadOrCreateAccounts(poolSize);
  const addressOf = (kp: Ed25519Keypair) => kp.getPublicKey().toSuiAddress();
  const byAddress = new Map(accounts.map((kp) => [addressOf(kp), kp]));

  const runId = `${CHAIN}-${config.operation}-${Date.now()}`;
  const jobs: Job[] = [];

  if (config.operation === "mint") {
    for (let i = 0; i < totalNeeded; i++) {
      const signer = accounts[i % accounts.length];
      const address = addressOf(signer);
      jobs.push({
        signer,
        build: (gasPrice) => {
          const tx = new Transaction();
          tx.setSender(address);
          tx.setGasPrice(gasPrice);
          tx.moveCall({
            target: `${deployment.packageId}::mpl_item::mint`,
            arguments: [tx.object(deployment.itemCounter)],
          });
          return tx;
        },
      });
    }
  } else if (config.operation === "list") {
    const fixtures = loadFixtures();
    const pool = [...fixtures.unlistedItems];
    if (pool.length < totalNeeded) {
      throw new Error(
        `Not enough unlisted fixtures for list bench: need ${totalNeeded}, have ${pool.length}. ` +
          `Re-run seed.ts with a larger SEED_TOKEN_COUNT / SEED_LISTING_COUNT gap.`
      );
    }
    const priceMist = BigInt(Math.round(Number(config.listPriceSui) * 1e9));
    for (let i = 0; i < totalNeeded; i++) {
      const { itemId, owner } = pool[i];
      const signer = byAddress.get(owner);
      if (!signer) throw new Error(`No known keypair for fixture owner ${owner} — was dev-accounts.json reset?`);
      jobs.push({
        signer,
        build: (gasPrice) => {
          const tx = new Transaction();
          tx.setSender(owner);
          tx.setGasPrice(gasPrice);
          tx.moveCall({
            target: `${deployment.packageId}::mpl_market::list`,
            arguments: [tx.object(itemId), tx.pure.u64(priceMist)],
          });
          return tx;
        },
      });
    }
  } else if (config.operation === "buy") {
    const fixtures = loadFixtures();
    const pool = [...fixtures.listings];
    if (pool.length < totalNeeded) {
      throw new Error(
        `Not enough active listings for buy bench: need ${totalNeeded}, have ${pool.length}. ` +
          `Re-run seed.ts with a larger SEED_LISTING_COUNT.`
      );
    }
    for (let i = 0; i < totalNeeded; i++) {
      const { listingId, seller, priceMist } = pool[i];
      // Round-robin the buyer per job — same rationale as bench.ts's buyer rotation:
      // reusing one account for every buy would serialize concurrent sends onto one
      // account's gas coin. Skip the seller's own address (mpl_market::buy forbids
      // self-purchase, mirroring Marketplace.sol's SelfPurchase check).
      let buyerIndex = i % accounts.length;
      if (addressOf(accounts[buyerIndex]) === seller) {
        buyerIndex = (buyerIndex + 1) % accounts.length;
      }
      const buyer = accounts[buyerIndex];
      const buyerAddress = addressOf(buyer);
      jobs.push({
        signer: buyer,
        build: (gasPrice) => {
          const tx = new Transaction();
          tx.setSender(buyerAddress);
          tx.setGasPrice(gasPrice);
          const [coin] = tx.splitCoins(tx.gas, [BigInt(priceMist)]);
          tx.moveCall({
            target: `${deployment.packageId}::mpl_market::buy`,
            arguments: [tx.object(listingId), coin],
          });
          return tx;
        },
      });
    }
  } else {
    // cancel
    const fixtures = loadFixtures();
    const pool = [...fixtures.listings];
    if (pool.length < totalNeeded) {
      throw new Error(
        `Not enough active listings for cancel bench: need ${totalNeeded}, have ${pool.length}.`
      );
    }
    // Draw from the tail, not the head — same reasoning as the reference bench.ts: a
    // `buy` run against these same fixtures consumes listings from the front, and
    // reusing that range here would make every cancel spuriously fail (the Listing
    // object would already be deleted) instead of measuring a real cancel.
    const slice = pool.slice(pool.length - totalNeeded);
    for (const { listingId, seller } of slice) {
      const signer = byAddress.get(seller);
      if (!signer) throw new Error(`No known keypair for fixture seller ${seller} — was dev-accounts.json reset?`);
      jobs.push({
        signer,
        build: (gasPrice) => {
          const tx = new Transaction();
          tx.setSender(seller);
          tx.setGasPrice(gasPrice);
          tx.moveCall({
            target: `${deployment.packageId}::mpl_market::cancel`,
            arguments: [tx.object(listingId)],
          });
          return tx;
        },
      });
    }
  }

  const records: TxRecord[] = [];
  for (let repeat = 0; repeat < config.repeats; repeat++) {
    const warmup = repeat === 0;
    const batch = jobs.slice(repeat * config.batchSize, (repeat + 1) * config.batchSize);
    const batchResults = await Promise.all(
      batch.map((job) =>
        timeTx(client, runId, config.operation, warmup, config.nodeCount, referenceGasPrice, job)
      )
    );
    records.push(...batchResults);
    console.log(
      `Repeat ${repeat + 1}/${config.repeats}${warmup ? " (warmup)" : ""}: ` +
        `${batchResults.filter((r) => r.status === "success").length}/${batchResults.length} succeeded`
    );
  }

  writeCsv(records, config.operation);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
