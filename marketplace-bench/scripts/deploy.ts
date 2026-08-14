import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

interface DeploymentRecord {
  network: string;
  chainId: string;
  marketplaceItem: string;
  marketplace: string;
  deployer: string;
  deployedAt: string;
}

const ADDRESSES_FILE = path.join(__dirname, "..", "deployment-addresses.json");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying on network "${network.name}" as ${deployer.address}`);

  const itemFactory = await ethers.getContractFactory("MarketplaceItem");
  const item = await itemFactory.deploy("MarketplaceItem", "MPI");
  await item.waitForDeployment();
  const itemAddress = await item.getAddress();
  console.log(`MarketplaceItem deployed to: ${itemAddress}`);

  const marketplaceFactory = await ethers.getContractFactory("Marketplace");
  const marketplace = await marketplaceFactory.deploy(itemAddress);
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log(`Marketplace deployed to: ${marketplaceAddress}`);

  // Sanity-check the Marketplace was constructed with the right MarketplaceItem address.
  const wiredItemAddress = await marketplace.item();
  if (wiredItemAddress.toLowerCase() !== itemAddress.toLowerCase()) {
    throw new Error(
      `Marketplace.item() (${wiredItemAddress}) does not match deployed MarketplaceItem (${itemAddress})`
    );
  }
  console.log("Sanity check passed: Marketplace.item() matches deployed MarketplaceItem.");

  const { chainId } = await ethers.provider.getNetwork();

  const record: DeploymentRecord = {
    network: network.name,
    chainId: chainId.toString(),
    marketplaceItem: itemAddress,
    marketplace: marketplaceAddress,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
  };

  const existing: Record<string, DeploymentRecord> = fs.existsSync(ADDRESSES_FILE)
    ? JSON.parse(fs.readFileSync(ADDRESSES_FILE, "utf-8"))
    : {};
  existing[network.name] = record;
  fs.writeFileSync(ADDRESSES_FILE, JSON.stringify(existing, null, 2));
  console.log(`Persisted deployment addresses to ${ADDRESSES_FILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
