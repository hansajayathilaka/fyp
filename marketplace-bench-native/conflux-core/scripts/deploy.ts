// Deploys MarketplaceItem + Marketplace to Conflux CoreSpace via js-conflux-sdk (native
// account model / RPC, not ethers/eSpace). Mirrors
// ../../../marketplace-bench/scripts/deploy.ts's structure and output shape
// (deployment-addresses.json, keyed by "network" name) as closely as CoreSpace's SDK
// allows — there's no Hardhat network provider/signer abstraction here, so this is a plain
// Node script, not a `hardhat run` task.
import { Conflux, address as cfxAddress } from "js-conflux-sdk";
import * as fs from "fs";
import * as path from "path";
import { DEV_ACCOUNTS, CORESPACE_RPC_URL, CORESPACE_NETWORK_ID } from "./accounts";

const NETWORK_NAME = "confluxCore";

interface DeploymentRecord {
  network: string;
  networkId: number;
  marketplaceItem: string;
  marketplace: string;
  deployer: string;
  deployedAt: string;
}

const ADDRESSES_FILE = path.join(__dirname, "..", "deployment-addresses.json");

function loadArtifact(name: string) {
  const file = path.join(__dirname, "..", "artifacts", "contracts", `${name}.sol`, `${name}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(`No compiled artifact at ${file}. Run "npx hardhat compile" first.`);
  }
  const json = JSON.parse(fs.readFileSync(file, "utf-8"));
  return { abi: json.abi, bytecode: json.bytecode as string };
}

async function main() {
  const conflux = new Conflux({ url: CORESPACE_RPC_URL, networkId: CORESPACE_NETWORK_ID });
  const deployer = conflux.wallet.addPrivateKey(DEV_ACCOUNTS[0]);
  console.log(`Deploying on network "${NETWORK_NAME}" (CoreSpace) as ${deployer.address}`);

  const itemArtifact = loadArtifact("MarketplaceItem");
  const itemContract = conflux.Contract({ abi: itemArtifact.abi, bytecode: itemArtifact.bytecode });
  const itemReceipt = await itemContract
    .constructor("MarketplaceItem", "MPI")
    .sendTransaction({ from: deployer.address })
    .executed();
  const itemAddress = itemReceipt.contractCreated;
  if (!itemAddress) throw new Error("MarketplaceItem deployment receipt has no contractCreated address");
  console.log(`MarketplaceItem deployed to: ${itemAddress} (tx ${itemReceipt.transactionHash})`);

  const marketplaceArtifact = loadArtifact("Marketplace");
  const marketplaceContract = conflux.Contract({
    abi: marketplaceArtifact.abi,
    bytecode: marketplaceArtifact.bytecode,
  });
  const marketplaceReceipt = await marketplaceContract
    .constructor(itemAddress)
    .sendTransaction({ from: deployer.address })
    .executed();
  const marketplaceAddress = marketplaceReceipt.contractCreated;
  if (!marketplaceAddress) {
    throw new Error("Marketplace deployment receipt has no contractCreated address");
  }
  console.log(`Marketplace deployed to: ${marketplaceAddress} (tx ${marketplaceReceipt.transactionHash})`);

  // Sanity-check the Marketplace was constructed with the right MarketplaceItem address,
  // same check as the eSpace deploy.ts.
  const deployedMarketplace = conflux.Contract({ abi: marketplaceArtifact.abi, address: marketplaceAddress });
  const wiredItemAddress: string = await deployedMarketplace.item();
  // Core Space addresses have a verbose form (receipt.contractCreated, e.g.
  // "NET1024:TYPE.CONTRACT:ACEN...") and a simplified form (contract call return values,
  // e.g. "net1024:acen..."), both encoding the same underlying 20-byte address —
  // `simplifyCfxAddress` normalizes both to the same lowercase form for comparison.
  if (
    cfxAddress.simplifyCfxAddress(wiredItemAddress).toLowerCase() !==
    cfxAddress.simplifyCfxAddress(itemAddress).toLowerCase()
  ) {
    throw new Error(
      `Marketplace.item() (${wiredItemAddress}) does not match deployed MarketplaceItem (${itemAddress})`
    );
  }
  console.log("Sanity check passed: Marketplace.item() matches deployed MarketplaceItem.");

  const record: DeploymentRecord = {
    network: NETWORK_NAME,
    networkId: CORESPACE_NETWORK_ID,
    marketplaceItem: itemAddress,
    marketplace: marketplaceAddress,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
  };

  const existing: Record<string, DeploymentRecord> = fs.existsSync(ADDRESSES_FILE)
    ? JSON.parse(fs.readFileSync(ADDRESSES_FILE, "utf-8"))
    : {};
  existing[NETWORK_NAME] = record;
  fs.writeFileSync(ADDRESSES_FILE, JSON.stringify(existing, null, 2));
  console.log(`Persisted deployment addresses to ${ADDRESSES_FILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
