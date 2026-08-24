// Benchmarks mint/approve/list/buy/cancel against Conflux CoreSpace via js-conflux-sdk,
// mirroring ../../../marketplace-bench/scripts/bench.ts's structure, CLI/env-var
// conventions, and batching/warmup/timeout semantics as closely as the CoreSpace SDK
// allows. Output CSV schema matches ../../docs/DESIGN.md exactly (NOT the eSpace bench's
// own CSV shape — this is a new, independent schema shared by all four legs of the
// DAG-vs-linear comparison).
import { Conflux, Drip, address as cfxAddress } from "js-conflux-sdk";
import * as fs from "fs";
import * as path from "path";
import { DEV_ACCOUNTS, CORESPACE_RPC_URL, CORESPACE_NETWORK_ID } from "./accounts";

const NETWORK_NAME = "confluxCore";
const CHAIN = "confluxCore";
const ARCHITECTURE = "dag";
const LANGUAGE = "solidity-cvm";
const FEE_CURRENCY = "CFX";

type Operation = "mint" | "approve" | "list" | "buy" | "cancel";

interface BenchConfig {
  operation: Operation;
  batchSize: number;
  repeats: number;
  priceTierGDrip?: number;
  nodeCount?: number;
}

interface TxRecord {
  runId: string;
  chain: string;
  architecture: string;
  language: string;
  operation: string;
  nodeCount?: number;
  priceTier?: number;
  warmup: boolean;
  txId: string;
  submittedAt: number;
  receivedAt?: number;
  confirmUnit?: number;
  feeUnitsUsed?: string;
  feeUnitPrice?: string;
  feePaidNative?: string;
  feeCurrency: string;
  status: "success" | "reverted" | "timeout";
}

interface DeploymentRecord {
  network: string;
  networkId: number;
  marketplaceItem: string;
  marketplace: string;
  deployer: string;
  deployedAt: string;
}

interface SeedFixtures {
  network: string;
  marketplaceItem: string;
  marketplace: string;
  seededAt: string;
  unlistedTokenIds: number[];
  listings: { tokenId: number; seller: string; price: string }[];
}

const ADDRESSES_FILE = path.join(__dirname, "..", "deployment-addresses.json");
const FIXTURES_FILE = path.join(__dirname, "..", `seed-fixtures.${NETWORK_NAME}.json`);
// Shared sibling output directory for all four legs of the comparison — see
// ../../docs/DESIGN.md "Directory layout" / "CSV schema".
const OUTPUT_DIR = path.join(__dirname, "..", "..", "bench-output");
const TIMEOUT_MS = Number(process.env.BENCH_TIMEOUT_MS ?? 60_000);
const POLL_INTERVAL_MS = 300;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readConfig(): BenchConfig {
  const operation = process.env.BENCH_OPERATION as Operation | undefined;
  if (!operation || !["mint", "approve", "list", "buy", "cancel"].includes(operation)) {
    throw new Error(`BENCH_OPERATION must be one of mint|approve|list|buy|cancel (got "${operation}")`);
  }
  return {
    operation,
    batchSize: Number(process.env.BENCH_BATCH_SIZE ?? 5),
    repeats: Number(process.env.BENCH_REPEATS ?? 5),
    // GDrip (10^9 Drip), Conflux's analogue of eSpace's BENCH_PRICE_TIER_GWEI (both are
    // 10^9-scaled subunits of the native coin used to express a gas price tier).
    priceTierGDrip: process.env.BENCH_PRICE_TIER_GDRIP ? Number(process.env.BENCH_PRICE_TIER_GDRIP) : undefined,
    nodeCount: process.env.BENCH_NODE_COUNT ? Number(process.env.BENCH_NODE_COUNT) : undefined,
  };
}

function gasPriceOverride(priceTierGDrip?: number) {
  if (priceTierGDrip === undefined) return {};
  return { gasPrice: Drip.fromGDrip(priceTierGDrip) };
}

// js-conflux-sdk's own `populateTransaction` (src/rpc/cfx.js) sets `gas`/`storageLimit`
// to the RAW `cfx_estimateGasAndCollateral` output with zero safety margin whenever
// either is left unset — confirmed by reading the SDK source while diagnosing a batch of
// real `buy` reverts in this leg's first full run, all failing with
// `VmError(ExceedStorageLimit)` (visible via `cfx_getTransactionReceipt`'s
// `txExecErrorMsg`). `buy` is the most storage-heavy call here (NFT ownership transfer +
// two ERC-721 balance updates + a native-CFX payment call), and the tight, unpadded
// estimate — taken from a static call against a state snapshot that can have moved on by
// the time the real transaction executes — occasionally undershoots the account's actual
// requirement. This is a documented Conflux integration gotcha, not a chain bug: padding
// the estimate before sending is standard practice (Conflux's own wallet/portal tooling
// does the same). Estimating explicitly and passing the padded `gas`/`storageLimit`
// through also *skips* the SDK's own internal (unpadded) estimate call in
// `sendTransaction`, so this isn't a second RPC round trip — same total call count either
// way, just used for a padded pair instead of a bare one. This runs as part of untimed job
// setup (same phase as `list`'s untimed pre-approval), so it doesn't affect measured
// latency.
async function padLimits(methodTx: any, from: string, value?: bigint) {
  const { gasUsed, storageCollateralized } = await methodTx.estimateGasAndCollateral({
    from,
    ...(value !== undefined ? { value } : {}),
  });
  return {
    gas: (BigInt(gasUsed) * 130n) / 100n,
    // +64-byte floor so a near-zero real estimate (approve/cancel: no new storage) still
    // gets a little headroom rather than 1.3x-of-basically-nothing.
    storageLimit: (BigInt(storageCollateralized) * 200n) / 100n + 64n,
  };
}

function loadArtifact(name: string) {
  const file = path.join(__dirname, "..", "artifacts", "contracts", `${name}.sol`, `${name}.json`);
  return JSON.parse(fs.readFileSync(file, "utf-8")).abi;
}

function loadFixtures(): SeedFixtures {
  if (!fs.existsSync(FIXTURES_FILE)) {
    throw new Error(`No seed fixtures found for this network. Run seed.ts first (${FIXTURES_FILE}).`);
  }
  return JSON.parse(fs.readFileSync(FIXTURES_FILE, "utf-8"));
}

function loadDeployment(): DeploymentRecord {
  if (!fs.existsSync(ADDRESSES_FILE)) {
    throw new Error(`No deployment-addresses.json found. Run deploy.ts first (${ADDRESSES_FILE}).`);
  }
  const deployments: Record<string, DeploymentRecord> = JSON.parse(fs.readFileSync(ADDRESSES_FILE, "utf-8"));
  const deployment = deployments[NETWORK_NAME];
  if (!deployment) {
    throw new Error(`No deployment recorded for network "${NETWORK_NAME}". Run deploy.ts first.`);
  }
  return deployment;
}

function sameAddress(a: string, b: string): boolean {
  return cfxAddress.simplifyCfxAddress(a).toLowerCase() === cfxAddress.simplifyCfxAddress(b).toLowerCase();
}

/** Times a single submitted transaction: send -> poll for receipt (bounded by TIMEOUT_MS). */
async function timeTx(
  runId: string,
  operation: Operation,
  warmup: boolean,
  nodeCount: number | undefined,
  priceTier: number | undefined,
  conflux: Conflux,
  // A thunk that, when awaited, submits the tx and resolves to its hash (mirrors the
  // eSpace bench.ts's `send()` job shape, adapted to js-conflux-sdk's lazy
  // PendingTransaction, which doesn't actually hit the RPC until awaited/`.then()`d).
  send: () => Promise<string>
): Promise<TxRecord> {
  const submittedAt = Date.now();
  let txId = "";
  try {
    txId = await send();

    const deadline = Date.now() + TIMEOUT_MS;
    let receipt: any = null;
    while (Date.now() < deadline) {
      receipt = await conflux.getTransactionReceipt(txId);
      if (receipt) break;
      await sleep(POLL_INTERVAL_MS);
    }

    if (!receipt) {
      return {
        runId,
        chain: CHAIN,
        architecture: ARCHITECTURE,
        language: LANGUAGE,
        operation,
        nodeCount,
        priceTier,
        warmup,
        txId,
        submittedAt,
        feeCurrency: FEE_CURRENCY,
        status: "timeout",
      };
    }

    const receivedAt = Date.now();
    return {
      runId,
      chain: CHAIN,
      architecture: ARCHITECTURE,
      language: LANGUAGE,
      operation,
      nodeCount,
      priceTier,
      warmup,
      txId,
      submittedAt,
      receivedAt,
      confirmUnit: receipt.epochNumber,
      feeUnitsUsed: receipt.gasUsed?.toString(),
      feeUnitPrice: receipt.effectiveGasPrice?.toString(),
      // gasFee = the actual, non-refundable amount debited from the sender for gas (see
      // js-conflux-sdk's TransactionReceipt docs: "gas charged to the sender's account").
      // storageCollateralized is deliberately NOT added here — that CFX is locked
      // collateral, refunded when the storage is released, not a spent fee; folding it in
      // would overstate the real cost the same way DESIGN.md warns against a silent zero.
      feePaidNative: receipt.gasFee?.toString(),
      feeCurrency: FEE_CURRENCY,
      status: receipt.outcomeStatus === 0 ? "success" : "reverted",
    };
  } catch (error) {
    return {
      runId,
      chain: CHAIN,
      architecture: ARCHITECTURE,
      language: LANGUAGE,
      operation,
      nodeCount,
      priceTier,
      warmup,
      txId,
      submittedAt,
      receivedAt: Date.now(),
      feeCurrency: FEE_CURRENCY,
      status: "reverted",
    };
  }
}

function writeCsv(records: TxRecord[], config: BenchConfig) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(OUTPUT_DIR, `${CHAIN}-${config.operation}-${timestamp}.csv`);

  const headers: (keyof TxRecord)[] = [
    "runId",
    "chain",
    "architecture",
    "language",
    "operation",
    "nodeCount",
    "priceTier",
    "warmup",
    "txId",
    "submittedAt",
    "receivedAt",
    "confirmUnit",
    "feeUnitsUsed",
    "feeUnitPrice",
    "feePaidNative",
    "feeCurrency",
    "status",
  ];
  const lines = [headers.join(",")];
  for (const record of records) {
    lines.push(headers.map((h) => (record[h] ?? "")).join(","));
  }
  fs.writeFileSync(file, lines.join("\n") + "\n");
  console.log(`Wrote ${records.length} records to ${file}`);
  return file;
}

async function main() {
  const config = readConfig();
  console.log(
    `Benchmarking "${config.operation}" on "${NETWORK_NAME}" (CoreSpace): ` +
      `batchSize=${config.batchSize} repeats=${config.repeats}` +
      (config.priceTierGDrip !== undefined ? ` priceTier=${config.priceTierGDrip}Gdrip` : "") +
      (config.nodeCount !== undefined ? ` nodeCount=${config.nodeCount}` : "")
  );

  const deployment = loadDeployment();
  const conflux = new Conflux({ url: CORESPACE_RPC_URL, networkId: CORESPACE_NETWORK_ID });
  const allSigners = DEV_ACCOUNTS.map((pk) => conflux.wallet.addPrivateKey(pk));

  const item = conflux.Contract({ abi: loadArtifact("MarketplaceItem"), address: deployment.marketplaceItem });
  const marketplace = conflux.Contract({ abi: loadArtifact("Marketplace"), address: deployment.marketplace });

  const totalNeeded = config.batchSize * config.repeats;
  const overrides = gasPriceOverride(config.priceTierGDrip);
  const runId = `${NETWORK_NAME}-${config.operation}-${Date.now()}`;

  // Build the ordered list of jobs to run, one per transaction slot. Each job carries its
  // own signer (its own nonce sequence) so concurrent sends never collide — same
  // BATCH_SIZE <= signer-pool-size discipline as the eSpace bench.ts (plan §6.1).
  type Job = () => Promise<string>;
  const jobs: Job[] = [];

  if (config.operation === "mint") {
    for (let i = 0; i < totalNeeded; i++) {
      const signer = allSigners[i % allSigners.length];
      const methodTx = item.mint(signer.address);
      const limits = await padLimits(methodTx, signer.address);
      jobs.push(() => methodTx.sendTransaction({ from: signer.address, ...limits, ...overrides }));
    }
  } else if (config.operation === "approve") {
    const fixtures = loadFixtures();
    const pool = [...fixtures.unlistedTokenIds];
    if (pool.length < totalNeeded) {
      throw new Error(
        `Not enough unlisted fixtures for approve bench: need ${totalNeeded}, have ${pool.length}. ` +
          `Re-run seed.ts with a larger SEED_TOKEN_COUNT / SEED_LISTING_COUNT gap.`
      );
    }
    for (let i = 0; i < totalNeeded; i++) {
      const tokenId = pool[i];
      const owner: string = await item.ownerOf(tokenId);
      const signer = allSigners.find((s) => sameAddress(s.address, owner))!;
      const methodTx = item.approve(deployment.marketplace, tokenId);
      const limits = await padLimits(methodTx, signer.address);
      jobs.push(() => methodTx.sendTransaction({ from: signer.address, ...limits, ...overrides }));
    }
  } else if (config.operation === "list") {
    const fixtures = loadFixtures();
    const pool = [...fixtures.unlistedTokenIds];
    if (pool.length < totalNeeded) {
      throw new Error(`Not enough unlisted fixtures for list bench: need ${totalNeeded}, have ${pool.length}.`);
    }
    const price = Drip.fromCFX("1");
    for (let i = 0; i < totalNeeded; i++) {
      const tokenId = pool[i];
      const owner: string = await item.ownerOf(tokenId);
      const signer = allSigners.find((s) => sameAddress(s.address, owner))!;
      // Approval is a prerequisite, not the thing being timed — done untimed, up front,
      // same as the eSpace bench.ts.
      const approveReceipt = await item
        .approve(deployment.marketplace, tokenId)
        .sendTransaction({ from: signer.address })
        .executed();
      if (approveReceipt.outcomeStatus !== 0) {
        throw new Error(`approve for token ${tokenId} failed before list bench: outcomeStatus=${approveReceipt.outcomeStatus}`);
      }
      const methodTx = marketplace.listItem(tokenId, price);
      const limits = await padLimits(methodTx, signer.address);
      jobs.push(() => methodTx.sendTransaction({ from: signer.address, ...limits, ...overrides }));
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
      const { tokenId, seller, price } = pool[i];
      // Round-robin the buyer per job — same nonce-collision avoidance as eSpace bench.ts.
      let buyerIndex = i % allSigners.length;
      if (sameAddress(allSigners[buyerIndex].address, seller)) {
        buyerIndex = (buyerIndex + 1) % allSigners.length;
      }
      const buyer = allSigners[buyerIndex];
      const methodTx = marketplace.buyItem(tokenId);
      const limits = await padLimits(methodTx, buyer.address, BigInt(price));
      jobs.push(() =>
        methodTx.sendTransaction({ from: buyer.address, value: BigInt(price), ...limits, ...overrides })
      );
    }
  } else {
    // cancel
    const fixtures = loadFixtures();
    const pool = [...fixtures.listings];
    if (pool.length < totalNeeded) {
      throw new Error(`Not enough active listings for cancel bench: need ${totalNeeded}, have ${pool.length}.`);
    }
    // Draw from the tail, not the head: a `buy` run against these same fixtures consumes
    // listings from the front, and reusing that range here would make every cancel
    // spuriously revert with NotActive instead of measuring a real cancel.
    const slice = pool.slice(pool.length - totalNeeded);
    for (const { tokenId, seller } of slice) {
      const signer = allSigners.find((s) => sameAddress(s.address, seller))!;
      const methodTx = marketplace.cancelListing(tokenId);
      const limits = await padLimits(methodTx, signer.address);
      jobs.push(() => methodTx.sendTransaction({ from: signer.address, ...limits, ...overrides }));
    }
  }

  const records: TxRecord[] = [];
  for (let repeat = 0; repeat < config.repeats; repeat++) {
    const warmup = repeat === 0;
    const batch = jobs.slice(repeat * config.batchSize, (repeat + 1) * config.batchSize);
    const batchResults = await Promise.all(
      batch.map((job) => timeTx(runId, config.operation, warmup, config.nodeCount, config.priceTierGDrip, conflux, job))
    );
    records.push(...batchResults);
    console.log(
      `Repeat ${repeat + 1}/${config.repeats}${warmup ? " (warmup)" : ""}: ` +
        `${batchResults.filter((r) => r.status === "success").length}/${batchResults.length} succeeded`
    );
  }

  writeCsv(records, config);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
