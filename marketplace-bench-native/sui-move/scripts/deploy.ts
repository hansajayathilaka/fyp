// Publishes the `marketplace` Move package to the local Sui network.
//
// Compiling Move bytecode requires the Move compiler, which this environment only has via
// the containerized `sui` CLI (mysten/sui-tools:testnet, docker/docker-compose.yml) — there
// is no native `sui` binary for this host. So, unlike seed.ts/bench.ts (pure TS SDK), this
// script shells out to `docker run ... sui move build --dump-bytecode-as-base64` to compile,
// then does the actual publish transaction itself via @mysten/sui, signed by a local dev
// keypair — mirroring ../../../marketplace-bench/scripts/deploy.ts's role (compile via the
// chain's own toolchain, deploy via the chain's own SDK, record addresses for seed/bench).
import * as fs from "node:fs";
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { Transaction } from "@mysten/sui/transactions";
import { CHAIN, DEPLOYMENT_FILE, RPC_URL, getClient, loadOrCreateAccounts } from "./common.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTRACTS_DIR = path.join(__dirname, "..", "contracts", "marketplace");
const SUI_TOOLS_IMAGE = "mysten/sui-tools:testnet";

interface BuildResult {
  modules: string[];
  dependencies: string[];
  digest: number[];
}

function buildPackage(): BuildResult {
  console.log(`Compiling Move package via \`docker run ${SUI_TOOLS_IMAGE} sui move build\`...`);
  const out = execFileSync(
    "docker",
    [
      "run",
      "--rm",
      "-v",
      `${CONTRACTS_DIR}:/pkg`,
      "-w",
      "/pkg",
      SUI_TOOLS_IMAGE,
      "sui",
      "move",
      "build",
      "--dump-bytecode-as-base64",
      "--path",
      "/pkg",
      "--silence-warnings",
    ],
    { encoding: "utf-8", maxBuffer: 64 * 1024 * 1024 }
  );
  // The container also prints first-run keystore setup ("No sui config found...",
  // "Generated new keypair...") and compiler progress ("INCLUDING DEPENDENCY ...",
  // "BUILDING marketplace") ahead of the JSON payload — the JSON is always the last
  // non-empty line.
  const lines = out.trim().split("\n").filter((l) => l.trim().length > 0);
  const jsonLine = lines[lines.length - 1];
  return JSON.parse(jsonLine) as BuildResult;
}

async function main() {
  const client = getClient();
  const [deployer] = await loadOrCreateAccounts(1);
  const address = deployer.getPublicKey().toSuiAddress();
  console.log(`Deploying on network "${CHAIN}" (${RPC_URL}) as ${address}`);

  const build = buildPackage();
  console.log(`Compiled ${build.modules.length} module(s), ${build.dependencies.length} dependencies.`);

  const referenceGasPrice = await client.getReferenceGasPrice();
  console.log(`Reference gas price: ${referenceGasPrice} MIST/unit`);

  const tx = new Transaction();
  tx.setSender(address);
  tx.setGasPrice(referenceGasPrice);
  const [upgradeCap] = tx.publish({ modules: build.modules, dependencies: build.dependencies });
  // Nothing in this benchmark ever upgrades the package — the UpgradeCap just needs a
  // home so the publish transaction's output objects are all accounted for.
  tx.transferObjects([upgradeCap], address);

  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer: deployer,
    options: { showEffects: true, showObjectChanges: true },
  });

  if (result.effects?.status.status !== "success") {
    throw new Error(`Publish failed: ${JSON.stringify(result.effects?.status)}`);
  }

  const packageChange = result.objectChanges?.find((c) => c.type === "published");
  if (!packageChange || packageChange.type !== "published") {
    throw new Error("No published package found in objectChanges");
  }
  const packageId = packageChange.packageId;

  const counterChange = result.objectChanges?.find(
    (c) => c.type === "created" && c.objectType.endsWith("::mpl_item::ItemCounter")
  );
  if (!counterChange || counterChange.type !== "created") {
    throw new Error("ItemCounter shared object not found in objectChanges");
  }

  const record = {
    network: CHAIN,
    packageId,
    itemCounter: counterChange.objectId,
    deployer: address,
    deployedAt: new Date().toISOString(),
    rpcUrl: RPC_URL,
  };

  const existing = fs.existsSync(DEPLOYMENT_FILE)
    ? JSON.parse(fs.readFileSync(DEPLOYMENT_FILE, "utf-8"))
    : {};
  existing[CHAIN] = record;
  fs.writeFileSync(DEPLOYMENT_FILE, JSON.stringify(existing, null, 2));

  console.log(`Package published: ${packageId}`);
  console.log(`ItemCounter shared object: ${counterChange.objectId}`);
  console.log(`Persisted deployment addresses to ${DEPLOYMENT_FILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
