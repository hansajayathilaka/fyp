// Shared helpers for deploy.ts / seed.ts / bench.ts — the Sui analogue of the pattern
// ../../../marketplace-bench/scripts/{deploy,seed,bench}.ts share via Hardhat's `ethers`
// object. Sui has no Hardhat-style network-config indirection, so this module plays that
// role: one place that knows the RPC/faucet URLs, the dev account pool, and the CSV
// schema every script writes to.
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { requestSuiFromFaucetV2 } from "@mysten/sui/faucet";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

export const CHAIN = "sui";
export const ARCHITECTURE = "dag";
export const LANGUAGE = "move";
export const FEE_CURRENCY = "SUI";

export const RPC_URL = process.env.SUI_RPC_URL ?? "http://127.0.0.1:9000";
export const FAUCET_URL = process.env.SUI_FAUCET_URL ?? "http://127.0.0.1:9123";
export const TIMEOUT_MS = Number(process.env.BENCH_TIMEOUT_MS ?? 60_000);

export const ACCOUNTS_FILE = path.join(ROOT, "dev-accounts.json");
export const DEPLOYMENT_FILE = path.join(ROOT, "deployment-addresses.json");
export const FIXTURES_FILE = path.join(ROOT, "seed-fixtures.sui.json");
export const OUTPUT_DIR = path.join(ROOT, "..", "bench-output");

// Fund threshold: top an account back up whenever it drops under this much SUI-in-MIST.
// One faucet request on this local devnet grants 1000 SUI (5 x 200 SUI coins, see
// docker/docker-compose.yml's faucet), comfortably above this floor.
const MIN_BALANCE_MIST = 50_000_000_000n; // 50 SUI

export function getClient(): SuiJsonRpcClient {
  return new SuiJsonRpcClient({ url: RPC_URL, network: "localnet" });
}

interface StoredAccount {
  address: string;
  secretKey: string; // Bech32 (Ed25519Keypair#getSecretKey()) — worthless devnet-only key
}

/**
 * Loads (or generates, then persists) `n` funded Ed25519 keypairs. Sui has no equivalent
 * to Hardhat's fixed public dev mnemonic (20 well-known accounts, pre-funded at genesis),
 * so this generates real keypairs on first run and funds them from the local faucet —
 * `--force-regenesis` wipes chain state on every container restart anyway, so there is no
 * "genesis alloc" to lean on the way besuLocal/confluxLocal do. Devnet-only, worthless
 * outside this container, safe to leave in `dev-accounts.json`.
 */
export async function loadOrCreateAccounts(n: number): Promise<Ed25519Keypair[]> {
  let stored: StoredAccount[] = fs.existsSync(ACCOUNTS_FILE)
    ? JSON.parse(fs.readFileSync(ACCOUNTS_FILE, "utf-8"))
    : [];

  const originalCount = stored.length;
  const keypairs: Ed25519Keypair[] = stored.map((s) => Ed25519Keypair.fromSecretKey(s.secretKey));
  while (keypairs.length < n) {
    const kp = Ed25519Keypair.generate();
    keypairs.push(kp);
    stored.push({ address: kp.getPublicKey().toSuiAddress(), secretKey: kp.getSecretKey() });
  }
  if (stored.length !== originalCount) {
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(stored, null, 2));
  }

  const client = getClient();
  for (const kp of keypairs) {
    const address = kp.getPublicKey().toSuiAddress();
    let balance = 0n;
    try {
      balance = BigInt((await client.getBalance({ owner: address })).totalBalance);
    } catch {
      // fresh address, no coins yet — fall through to faucet request
    }
    if (balance < MIN_BALANCE_MIST) {
      await requestSuiFromFaucetV2({ host: FAUCET_URL, recipient: address });
    }
  }
  return keypairs;
}

export interface TxRecord {
  runId: string;
  chain: string;
  architecture: string;
  language: string;
  operation: string;
  nodeCount?: number | string;
  priceTier?: number | string;
  warmup: boolean;
  txId: string;
  submittedAt: number;
  receivedAt?: number;
  confirmUnit?: string;
  feeUnitsUsed?: string;
  feeUnitPrice?: string;
  feePaidNative?: string;
  feeCurrency: string;
  status: "success" | "reverted" | "timeout";
}

const CSV_HEADERS = [
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
] as const;

export function writeCsv(records: TxRecord[], operation: string): string {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(OUTPUT_DIR, `sui-${operation}-${timestamp}.csv`);
  const lines = [CSV_HEADERS.join(",")];
  for (const r of records) {
    lines.push(CSV_HEADERS.map((h) => (r as unknown as Record<string, unknown>)[h] ?? "").join(","));
  }
  fs.writeFileSync(file, lines.join("\n") + "\n");
  console.log(`Wrote ${records.length} records to ${file}`);
  return file;
}

export interface DeploymentRecord {
  network: string;
  packageId: string;
  itemCounter: string;
  deployer: string;
  deployedAt: string;
  rpcUrl: string;
}

export function loadDeployment(): DeploymentRecord {
  if (!fs.existsSync(DEPLOYMENT_FILE)) {
    throw new Error(`No deployment-addresses.json found. Run \`npm run deploy\` first (${DEPLOYMENT_FILE}).`);
  }
  const deployments: Record<string, DeploymentRecord> = JSON.parse(fs.readFileSync(DEPLOYMENT_FILE, "utf-8"));
  const deployment = deployments[CHAIN];
  if (!deployment) {
    throw new Error(`No deployment recorded for "${CHAIN}". Run \`npm run deploy\` first.`);
  }
  return deployment;
}

export interface SeedFixtures {
  network: string;
  packageId: string;
  itemCounter: string;
  seededAt: string;
  // Minted but not listed — usable as fixtures for a `list` benchmark run.
  unlistedItems: { itemId: string; owner: string }[];
  // Minted and actively listed — usable as fixtures for `buy`/`cancel` benchmark runs.
  listings: { listingId: string; itemId: string; seller: string; priceMist: string }[];
}

export function loadFixtures(): SeedFixtures {
  if (!fs.existsSync(FIXTURES_FILE)) {
    throw new Error(`No seed fixtures found. Run \`npm run seed\` first (${FIXTURES_FILE}).`);
  }
  return JSON.parse(fs.readFileSync(FIXTURES_FILE, "utf-8"));
}

/**
 * Net MIST actually charged for a transaction: computation + storage cost, minus the
 * storage rebate returned for objects this transaction deletes. Deliberately NOT clamped
 * at 0 — see ../README.md's cost-accounting section. `cancel` (and to a lesser extent
 * `buy`) delete more storage than they allocate, and Sui refunds ~99% of a *prior*
 * transaction's storage deposit (paid back when `mint`/`list` created that storage) on
 * deletion. That refund can legitimately exceed this transaction's own computation+storage
 * cost, making the net MIST charged for that single transaction negative — a real property
 * of Sui's storage-rebate economics, not a measurement bug. Flooring this at 0 would look
 * exactly like the min-gas-price=0 besuLocal bug DESIGN.md warns about (cost silently
 * reads zero) when the truth here is "this operation nets a refund," which is a materially
 * different and more interesting finding — so the signed value is reported as-is.
 */
export function netMistCharged(gasUsed: {
  computationCost: string;
  storageCost: string;
  storageRebate: string;
}): bigint {
  return BigInt(gasUsed.computationCost) + BigInt(gasUsed.storageCost) - BigInt(gasUsed.storageRebate);
}
