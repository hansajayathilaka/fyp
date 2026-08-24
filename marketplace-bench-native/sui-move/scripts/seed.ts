// Seeds fixtures for the `list` and `buy`/`cancel` bench runs: mints SEED_TOKEN_COUNT
// items across a pool of seller accounts, lists SEED_LISTING_COUNT of them, and leaves the
// rest unlisted — same shape as ../../../marketplace-bench/scripts/seed.ts, adapted to
// Sui's object model (items and listings are tracked by object ID, not integer token ID).
// Mints/lists sequentially, one transaction at a time, same as the reference seed.ts —
// this step isn't the thing being measured, so it isn't run concurrently or timed.
import * as fs from "node:fs";
import { Transaction } from "@mysten/sui/transactions";
import {
  CHAIN,
  FIXTURES_FILE,
  SeedFixtures,
  getClient,
  loadDeployment,
  loadOrCreateAccounts,
} from "./common.js";

const TOKEN_COUNT = Number(process.env.SEED_TOKEN_COUNT ?? 40);
const LISTING_COUNT = Number(process.env.SEED_LISTING_COUNT ?? 20);
const LISTING_PRICE_SUI = process.env.SEED_LISTING_PRICE_SUI ?? "1";
const SELLER_COUNT = Number(process.env.SEED_SELLER_COUNT ?? 5);
const MIST_PER_SUI = 1_000_000_000n;

function priceInMist(): bigint {
  return BigInt(Math.round(Number(LISTING_PRICE_SUI) * 1e9));
}

async function main() {
  if (LISTING_COUNT > TOKEN_COUNT) {
    throw new Error("SEED_LISTING_COUNT cannot exceed SEED_TOKEN_COUNT");
  }

  const deployment = loadDeployment();
  const client = getClient();
  const referenceGasPrice = await client.getReferenceGasPrice();

  // Index 0 is reserved as the deploy.ts deployer/spare account (matches the reference
  // seed.ts's `signers.slice(1)` convention); the rest round-robin as sellers.
  const accounts = await loadOrCreateAccounts(SELLER_COUNT + 1);
  const sellers = accounts.slice(1);

  console.log(
    `Seeding ${TOKEN_COUNT} items (${LISTING_COUNT} listed) on "${CHAIN}" (package ${deployment.packageId}) ` +
      `across ${sellers.length} seller accounts`
  );

  const price = priceInMist();
  const items: { itemId: string; owner: string; signerIndex: number }[] = [];

  for (let i = 0; i < TOKEN_COUNT; i++) {
    const signerIndex = i % sellers.length;
    const seller = sellers[signerIndex];
    const address = seller.getPublicKey().toSuiAddress();

    const tx = new Transaction();
    tx.setSender(address);
    tx.setGasPrice(referenceGasPrice);
    tx.moveCall({
      target: `${deployment.packageId}::mpl_item::mint`,
      arguments: [tx.object(deployment.itemCounter)],
    });

    const result = await client.signAndExecuteTransaction({
      transaction: tx,
      signer: seller,
      options: { showEffects: true, showObjectChanges: true },
    });
    if (result.effects?.status.status !== "success") {
      throw new Error(`mint #${i} failed: ${JSON.stringify(result.effects?.status)}`);
    }
    const created = result.objectChanges?.find(
      (c) => c.type === "created" && c.objectType.endsWith("::mpl_item::MarketplaceItem")
    );
    if (!created || created.type !== "created") {
      throw new Error(`mint #${i}: MarketplaceItem not found in objectChanges`);
    }
    items.push({ itemId: created.objectId, owner: address, signerIndex });
    if ((i + 1) % 10 === 0 || i === TOKEN_COUNT - 1) {
      console.log(`  minted ${i + 1}/${TOKEN_COUNT}`);
    }
  }

  const listings: SeedFixtures["listings"] = [];
  const unlistedItems: SeedFixtures["unlistedItems"] = [];

  for (let i = 0; i < items.length; i++) {
    const { itemId, owner, signerIndex } = items[i];

    if (i < LISTING_COUNT) {
      const seller = sellers[signerIndex];
      const tx = new Transaction();
      tx.setSender(owner);
      tx.setGasPrice(referenceGasPrice);
      tx.moveCall({
        target: `${deployment.packageId}::mpl_market::list`,
        arguments: [tx.object(itemId), tx.pure.u64(price)],
      });
      const result = await client.signAndExecuteTransaction({
        transaction: tx,
        signer: seller,
        options: { showEffects: true, showObjectChanges: true },
      });
      if (result.effects?.status.status !== "success") {
        throw new Error(`list #${i} (item ${itemId}) failed: ${JSON.stringify(result.effects?.status)}`);
      }
      const created = result.objectChanges?.find(
        (c) => c.type === "created" && c.objectType.endsWith("::mpl_market::Listing")
      );
      if (!created || created.type !== "created") {
        throw new Error(`list #${i}: Listing not found in objectChanges`);
      }
      listings.push({ listingId: created.objectId, itemId, seller: owner, priceMist: price.toString() });
    } else {
      unlistedItems.push({ itemId, owner });
    }
  }

  const fixtures: SeedFixtures = {
    network: CHAIN,
    packageId: deployment.packageId,
    itemCounter: deployment.itemCounter,
    seededAt: new Date().toISOString(),
    unlistedItems,
    listings,
  };

  fs.writeFileSync(FIXTURES_FILE, JSON.stringify(fixtures, null, 2));
  console.log(
    `Seeded ${listings.length} active listings and ${unlistedItems.length} unlisted items. ` +
      `Fixtures written to ${FIXTURES_FILE}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
