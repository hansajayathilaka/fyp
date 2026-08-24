// Seeds mint/approve/list fixtures on Conflux CoreSpace, mirroring
// ../../../marketplace-bench/scripts/seed.ts's structure and env-var conventions
// (SEED_TOKEN_COUNT, SEED_LISTING_COUNT, SEED_LISTING_PRICE_ETH) as closely as the
// CoreSpace SDK allows. Sequential, one transaction at a time, same as the eSpace version
// (plan-adjacent: concurrency is exercised by bench.ts, not seed.ts).
import { Conflux, Drip } from "js-conflux-sdk";
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

const TOKEN_COUNT = Number(process.env.SEED_TOKEN_COUNT ?? 40);
const LISTING_COUNT = Number(process.env.SEED_LISTING_COUNT ?? 20);
const LISTING_PRICE_CFX = process.env.SEED_LISTING_PRICE_ETH ?? process.env.SEED_LISTING_PRICE_CFX ?? "1";

function loadArtifact(name: string) {
  const file = path.join(__dirname, "..", "artifacts", "contracts", `${name}.sol`, `${name}.json`);
  const json = JSON.parse(fs.readFileSync(file, "utf-8"));
  return json.abi;
}

async function main() {
  if (LISTING_COUNT > TOKEN_COUNT) {
    throw new Error("SEED_LISTING_COUNT cannot exceed SEED_TOKEN_COUNT");
  }
  if (!fs.existsSync(ADDRESSES_FILE)) {
    throw new Error(`No deployment-addresses.json found. Run deploy.ts first (${ADDRESSES_FILE}).`);
  }
  const deployments: Record<string, DeploymentRecord> = JSON.parse(fs.readFileSync(ADDRESSES_FILE, "utf-8"));
  const deployment = deployments[NETWORK_NAME];
  if (!deployment) {
    throw new Error(`No deployment recorded for network "${NETWORK_NAME}". Run deploy.ts first.`);
  }

  const conflux = new Conflux({ url: CORESPACE_RPC_URL, networkId: CORESPACE_NETWORK_ID });
  const signers = DEV_ACCOUNTS.map((pk) => conflux.wallet.addPrivateKey(pk));
  if (signers.length < 2) {
    throw new Error("Seeding needs at least 2 funded signers (one seller pool + a buyer for later bench runs)");
  }
  // Reserve signers[0] as the deployer/spare account (also the CoreSpace genesis-funded
  // account, see scripts/accounts.ts) — round-robin the rest as sellers, same as the
  // eSpace seed.ts.
  const sellers = signers.slice(1);

  const item = conflux.Contract({ abi: loadArtifact("MarketplaceItem"), address: deployment.marketplaceItem });
  const marketplace = conflux.Contract({ abi: loadArtifact("Marketplace"), address: deployment.marketplace });

  console.log(
    `Seeding ${TOKEN_COUNT} tokens (${LISTING_COUNT} listed) on network "${NETWORK_NAME}" ` +
      `across ${sellers.length} seller accounts`
  );

  const price = Drip.fromCFX(LISTING_PRICE_CFX);
  const tokenIds: number[] = [];

  for (let i = 0; i < TOKEN_COUNT; i++) {
    const seller = sellers[i % sellers.length];
    // js-conflux-sdk contract methods don't expose a separate staticCall helper the way
    // ethers does; `.call()` performs a read-only simulation (eth_call-equivalent), which
    // is exactly what we need to read the tokenId mint() will return before sending the
    // real tx — same two-step pattern as the eSpace seed.ts.
    const tokenId = Number(await item.mint(seller.address).call({ from: seller.address }));
    const receipt = await item
      .mint(seller.address)
      .sendTransaction({ from: seller.address })
      .executed();
    if (receipt.outcomeStatus !== 0) {
      throw new Error(`mint for seller ${seller.address} failed: outcomeStatus=${receipt.outcomeStatus}`);
    }
    tokenIds.push(tokenId);
  }

  const listings: SeedFixtures["listings"] = [];
  const unlistedTokenIds: number[] = [];

  for (let i = 0; i < tokenIds.length; i++) {
    const tokenId = tokenIds[i];
    const seller = sellers[i % sellers.length];

    if (i < LISTING_COUNT) {
      const approveReceipt = await item
        .approve(deployment.marketplace, tokenId)
        .sendTransaction({ from: seller.address })
        .executed();
      if (approveReceipt.outcomeStatus !== 0) {
        throw new Error(`approve for token ${tokenId} failed: outcomeStatus=${approveReceipt.outcomeStatus}`);
      }
      const listReceipt = await marketplace
        .listItem(tokenId, price)
        .sendTransaction({ from: seller.address })
        .executed();
      if (listReceipt.outcomeStatus !== 0) {
        throw new Error(`listItem for token ${tokenId} failed: outcomeStatus=${listReceipt.outcomeStatus}`);
      }
      listings.push({ tokenId, seller: seller.address, price: price.toString() });
    } else {
      unlistedTokenIds.push(tokenId);
    }
  }

  const fixtures: SeedFixtures = {
    network: NETWORK_NAME,
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
