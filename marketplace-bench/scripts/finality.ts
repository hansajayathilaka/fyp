import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { MarketplaceItem } from "../typechain-types";

const ADDRESSES_FILE = path.join(__dirname, "..", "deployment-addresses.json");
const OUTPUT_DIR = path.join(__dirname, "..", "bench-output");
const DEPTHS = [1, 3, 6, 12];
const SAMPLE_COUNT = Number(process.env.FINALITY_SAMPLES ?? 10);
const POLL_MS = 250;
const POLL_TIMEOUT_MS = 60_000;

interface DeploymentRecord {
  network: string;
  chainId: string;
  marketplaceItem: string;
  marketplace: string;
  deployer: string;
  deployedAt: string;
}

interface FinalityRecord {
  txHash: string;
  chain: string;
  submittedAt: number;
  receivedAt: number;
  blockNumber: number;
  confirmedAt_depth1?: number;
  confirmedAt_depth3?: number;
  confirmedAt_depth6?: number;
  confirmedAt_depth12?: number;
}

function loadDeployment(): DeploymentRecord {
  const deployments: Record<string, DeploymentRecord> = JSON.parse(
    fs.readFileSync(ADDRESSES_FILE, "utf-8")
  );
  const deployment = deployments[network.name];
  if (!deployment) {
    throw new Error(`No deployment recorded for network "${network.name}". Run deploy.ts first.`);
  }
  return deployment;
}

async function waitForDepth(targetBlockNumber: number, depth: number): Promise<number> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const current = await ethers.provider.getBlockNumber();
    if (current >= targetBlockNumber + depth) {
      return Date.now();
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
  throw new Error(`Timed out waiting for depth ${depth} past block ${targetBlockNumber}`);
}

async function main() {
  console.log(`Measuring finality/confirmation-depth on "${network.name}": ${SAMPLE_COUNT} samples, depths=${DEPTHS.join(",")}`);

  const deployment = loadDeployment();
  const item = (await ethers.getContractAt(
    "MarketplaceItem",
    deployment.marketplaceItem
  )) as unknown as MarketplaceItem;

  const signers = await ethers.getSigners();
  const records: FinalityRecord[] = [];

  for (let i = 0; i < SAMPLE_COUNT; i++) {
    const signer = signers[i % signers.length];
    const submittedAt = Date.now();
    const tx = await item.connect(signer).mint(signer.address);
    const receipt = await tx.wait();
    const receivedAt = Date.now();
    const blockNumber = receipt!.blockNumber;

    const record: FinalityRecord = {
      txHash: tx.hash,
      chain: network.name,
      submittedAt,
      receivedAt,
      blockNumber,
    };

    for (const depth of DEPTHS) {
      const confirmedAt = await waitForDepth(blockNumber, depth);
      (record as any)[`confirmedAt_depth${depth}`] = confirmedAt;
    }

    records.push(record);
    console.log(
      `Sample ${i + 1}/${SAMPLE_COUNT}: block ${blockNumber}, ` +
        `receipt +${receivedAt - submittedAt}ms, ` +
        DEPTHS.map((d) => `depth${d} +${(record as any)[`confirmedAt_depth${d}`] - submittedAt}ms`).join(", ")
    );
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const file = path.join(OUTPUT_DIR, `finality-${network.name}.csv`);
  const headers: (keyof FinalityRecord)[] = [
    "txHash",
    "chain",
    "submittedAt",
    "receivedAt",
    "blockNumber",
    "confirmedAt_depth1",
    "confirmedAt_depth3",
    "confirmedAt_depth6",
    "confirmedAt_depth12",
  ];
  const lines = [headers.join(",")];
  for (const record of records) {
    lines.push(headers.map((h) => (record as any)[h] ?? "").join(","));
  }
  fs.writeFileSync(file, lines.join("\n") + "\n");
  console.log(`Wrote ${records.length} records to ${file}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
