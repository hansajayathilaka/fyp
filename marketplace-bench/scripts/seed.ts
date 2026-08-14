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

interface SeedFixtures {
  network: string;
  marketplaceItem: string;
  marketplace: string;
  seededAt: string;
  // Minted but not listed — usable as fixtures for a `list` benchmark run.
  unlistedTokenIds: number[];
  // Minted, approved, and actively listed — usable as fixtures for a `buy` benchmark run.
  listings: { tokenId: number; seller: string; price: string }[];
}

const ADDRESSES_FILE = path.join(__dirname, "..", "deployment-addresses.json");
const FIXTURES_FILE = path.join(__dirname, "..", "seed-fixtures.json");

const TOKEN_COUNT = Number(process.env.SEED_TOKEN_COUNT ?? 40);
const LISTING_COUNT = Number(process.env.SEED_LISTING_COUNT ?? 20);
const LISTING_PRICE_ETH = process.env.SEED_LISTING_PRICE_ETH ?? "1";

async function main() {
  if (LISTING_COUNT > TOKEN_COUNT) {
    throw new Error("SEED_LISTING_COUNT cannot exceed SEED_TOKEN_COUNT");
  }

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

  const item = await ethers.getContractAt("MarketplaceItem", deployment.marketplaceItem);
  const marketplace = await ethers.getContractAt("Marketplace", deployment.marketplace);
  const marketplaceAddress = await marketplace.getAddress();

  const signers = await ethers.getSigners();
  if (signers.length < 2) {
    throw new Error("Seeding needs at least 2 funded signers (one seller pool + a buyer for later bench runs)");
  }
  // Reserve signers[0] as the deployer/spare account; round-robin the rest as sellers so
  // fixtures aren't all owned by a single address.
  const sellers = signers.slice(1);

  console.log(
    `Seeding ${TOKEN_COUNT} tokens (${LISTING_COUNT} listed) on network "${network.name}" ` +
      `across ${sellers.length} seller accounts`
  );

  const price = ethers.parseEther(LISTING_PRICE_ETH);
  const tokenIds: number[] = [];

  for (let i = 0; i < TOKEN_COUNT; i++) {
    const seller = sellers[i % sellers.length];
    // Read the tokenId mint() will return via a static call before sending the real tx.
    const tokenId = Number(await item.connect(seller).mint.staticCall(seller.address));
    await (await item.connect(seller).mint(seller.address)).wait();
    tokenIds.push(tokenId);
  }

  const listings: SeedFixtures["listings"] = [];
  const unlistedTokenIds: number[] = [];

  for (let i = 0; i < tokenIds.length; i++) {
    const tokenId = tokenIds[i];
    const seller = sellers[i % sellers.length];

    if (i < LISTING_COUNT) {
      await (await item.connect(seller).approve(marketplaceAddress, tokenId)).wait();
      await (await marketplace.connect(seller).listItem(tokenId, price)).wait();
      listings.push({ tokenId, seller: seller.address, price: price.toString() });
    } else {
      unlistedTokenIds.push(tokenId);
    }
  }

  const fixtures: SeedFixtures = {
    network: network.name,
    marketplaceItem: deployment.marketplaceItem,
    marketplace: deployment.marketplace,
    seededAt: new Date().toISOString(),
    unlistedTokenIds,
    listings,
  };

  fs.writeFileSync(FIXTURES_FILE, JSON.stringify(fixtures, null, 2));
  console.log(
    `Seeded ${listings.length} active listings and ${unlistedTokenIds.length} unlisted tokens. ` +
      `Fixtures written to ${FIXTURES_FILE}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
