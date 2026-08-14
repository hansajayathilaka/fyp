import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { Marketplace, MarketplaceItem } from "../typechain-types";

type Operation = "mint" | "approve" | "list" | "buy" | "cancel";

interface BenchConfig {
  network: string;
  operation: Operation;
  batchSize: number;
  repeats: number;
  priceTierGwei?: number;
  nodeCount?: number;
}

interface TxRecord {
  runId: string;
  chain: string;
  operation: string;
  nodeCount?: number;
  priceTier?: number;
  warmup: boolean;
  txHash: string;
  submittedAt: number;
  receivedAt?: number;
  blockNumber?: number;
  gasUsed?: string;
  effectiveGasPrice?: string;
  status: "success" | "reverted" | "timeout";
}

interface DeploymentRecord {
  network: string;
  chainId: string;
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
const FIXTURES_FILE = path.join(__dirname, "..", `seed-fixtures.${network.name}.json`);
const OUTPUT_DIR = path.join(__dirname, "..", "bench-output");
const TIMEOUT_MS = Number(process.env.BENCH_TIMEOUT_MS ?? 60_000);

function readConfig(): BenchConfig {
  const operation = process.env.BENCH_OPERATION as Operation | undefined;
  if (!operation || !["mint", "approve", "list", "buy", "cancel"].includes(operation)) {
    throw new Error(
      `BENCH_OPERATION must be one of mint|approve|list|buy|cancel (got "${operation}")`
    );
  }
  return {
    network: network.name,
    operation,
    batchSize: Number(process.env.BENCH_BATCH_SIZE ?? 5),
    repeats: Number(process.env.BENCH_REPEATS ?? 5),
    priceTierGwei: process.env.BENCH_PRICE_TIER_GWEI
      ? Number(process.env.BENCH_PRICE_TIER_GWEI)
      : undefined,
    nodeCount: process.env.BENCH_NODE_COUNT ? Number(process.env.BENCH_NODE_COUNT) : undefined,
  };
}

function gasOverrides(priceTierGwei?: number) {
  if (priceTierGwei === undefined) return {};
  const fee = ethers.parseUnits(priceTierGwei.toString(), "gwei");
  // maxPriorityFeePerGas <= maxFeePerGas; use the same tier for both to keep the
  // experiment a single scalar "price paid" per plan §7.
  return { maxFeePerGas: fee, maxPriorityFeePerGas: fee };
}

/** Times a single submitted transaction: send -> await receipt (bounded by TIMEOUT_MS). */
async function timeTx(
  runId: string,
  chain: string,
  operation: Operation,
  warmup: boolean,
  nodeCount: number | undefined,
  priceTier: number | undefined,
  send: () => Promise<{ hash: string; wait: () => Promise<any> }>
): Promise<TxRecord> {
  const submittedAt = Date.now();
  let txHash = "";
  try {
    const tx = await send();
    txHash = tx.hash;

    let timer: NodeJS.Timeout;
    const receipt = await Promise.race([
      tx.wait().finally(() => clearTimeout(timer)),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), TIMEOUT_MS);
      }),
    ]);

    if (receipt === null) {
      return {
        runId,
        chain,
        operation,
        nodeCount,
        priceTier,
        warmup,
        txHash,
        submittedAt,
        status: "timeout",
      };
    }

    const receivedAt = Date.now();
    return {
      runId,
      chain,
      operation,
      nodeCount,
      priceTier,
      warmup,
      txHash,
      submittedAt,
      receivedAt,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed?.toString(),
      effectiveGasPrice: receipt.gasPrice?.toString() ?? receipt.effectiveGasPrice?.toString(),
      status: receipt.status === 1 ? "success" : "reverted",
    };
  } catch (error) {
    return {
      runId,
      chain,
      operation,
      nodeCount,
      priceTier,
      warmup,
      txHash,
      submittedAt,
      receivedAt: Date.now(),
      status: "reverted",
    };
  }
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
  const deployments: Record<string, DeploymentRecord> = JSON.parse(
    fs.readFileSync(ADDRESSES_FILE, "utf-8")
  );
  const deployment = deployments[network.name];
  if (!deployment) {
    throw new Error(`No deployment recorded for network "${network.name}". Run deploy.ts first.`);
  }
  return deployment;
}

function writeCsv(records: TxRecord[], config: BenchConfig) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(OUTPUT_DIR, `${config.network}-${config.operation}-${timestamp}.csv`);

  const headers: (keyof TxRecord)[] = [
    "runId",
    "chain",
    "operation",
    "nodeCount",
    "priceTier",
    "warmup",
    "txHash",
    "submittedAt",
    "receivedAt",
    "blockNumber",
    "gasUsed",
    "effectiveGasPrice",
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
    `Benchmarking "${config.operation}" on "${config.network}": ` +
      `batchSize=${config.batchSize} repeats=${config.repeats}` +
      (config.priceTierGwei !== undefined ? ` priceTier=${config.priceTierGwei}gwei` : "") +
      (config.nodeCount !== undefined ? ` nodeCount=${config.nodeCount}` : "")
  );

  const deployment = loadDeployment();
  const item = (await ethers.getContractAt(
    "MarketplaceItem",
    deployment.marketplaceItem
  )) as unknown as MarketplaceItem;
  const marketplace = (await ethers.getContractAt(
    "Marketplace",
    deployment.marketplace
  )) as unknown as Marketplace;
  const marketplaceAddress = await marketplace.getAddress();

  const allSigners = await ethers.getSigners();
  const totalNeeded = config.batchSize * config.repeats;
  const overrides = gasOverrides(config.priceTierGwei);
  const runId = `${config.network}-${config.operation}-${Date.now()}`;

  // Build the ordered list of jobs to run, one per transaction slot. Each job carries
  // its own signer (its own nonce sequence) so concurrent sends never collide (plan §6.1).
  type Job = () => Promise<{ hash: string; wait: () => Promise<any> }>;
  const jobs: Job[] = [];

  if (config.operation === "mint") {
    for (let i = 0; i < totalNeeded; i++) {
      const signer = allSigners[i % allSigners.length];
      jobs.push(() => item.connect(signer).mint(signer.address, overrides));
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
      const owner = await item.ownerOf(tokenId);
      const signer = allSigners.find((s) => s.address.toLowerCase() === owner.toLowerCase())!;
      jobs.push(() => item.connect(signer).approve(marketplaceAddress, tokenId, overrides));
    }
  } else if (config.operation === "list") {
    const fixtures = loadFixtures();
    const pool = [...fixtures.unlistedTokenIds];
    if (pool.length < totalNeeded) {
      throw new Error(
        `Not enough unlisted fixtures for list bench: need ${totalNeeded}, have ${pool.length}.`
      );
    }
    const price = ethers.parseEther("1");
    for (let i = 0; i < totalNeeded; i++) {
      const tokenId = pool[i];
      const owner = await item.ownerOf(tokenId);
      const signer = allSigners.find((s) => s.address.toLowerCase() === owner.toLowerCase())!;
      // Approval is a prerequisite, not the thing being timed — done untimed, up front.
      await (await item.connect(signer).approve(marketplaceAddress, tokenId)).wait();
      jobs.push(() => marketplace.connect(signer).listItem(tokenId, price, overrides));
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
      // Round-robin the buyer per job — picking the same account for every buy would
      // serialize concurrent sends onto one nonce sequence (plan §6.1's explicit warning).
      let buyerIndex = i % allSigners.length;
      if (allSigners[buyerIndex].address.toLowerCase() === seller.toLowerCase()) {
        buyerIndex = (buyerIndex + 1) % allSigners.length;
      }
      const buyer = allSigners[buyerIndex];
      jobs.push(() =>
        marketplace.connect(buyer).buyItem(tokenId, { value: BigInt(price), ...overrides })
      );
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
    // Draw from the tail, not the head: a `buy` run against these same fixtures consumes
    // listings from the front, and reusing that range here would make every cancel
    // spuriously revert with NotActive instead of measuring a real cancel.
    const slice = pool.slice(pool.length - totalNeeded);
    for (const { tokenId, seller } of slice) {
      const signer = allSigners.find((s) => s.address.toLowerCase() === seller.toLowerCase())!;
      jobs.push(() => marketplace.connect(signer).cancelListing(tokenId, overrides));
    }
  }

  const records: TxRecord[] = [];
  for (let repeat = 0; repeat < config.repeats; repeat++) {
    const warmup = repeat === 0;
    const batch = jobs.slice(repeat * config.batchSize, (repeat + 1) * config.batchSize);
    const batchResults = await Promise.all(
      batch.map((job) =>
        timeTx(runId, config.network, config.operation, warmup, config.nodeCount, config.priceTierGwei, job)
      )
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
