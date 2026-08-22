import * as fs from "fs";
import * as path from "path";
import {
  AccountAllowanceApproveTransaction,
  AccountCreateTransaction,
  AccountId,
  Hbar,
  NftId,
  PrivateKey,
  TokenId,
  TokenMintTransaction,
  TransferTransaction,
} from "@hashgraph/sdk";
import { CHAIN_NAME, getClient, LOCAL_OPERATOR_ID } from "./client";

interface DeploymentRecord {
  network: string;
  tokenId: string;
  operatorAccountId: string;
  marketplaceAccountId: string;
  marketplacePrivateKey: string;
  deployedAt: string;
}

interface Participant {
  accountId: string;
  privateKey: string;
}

interface SeedFixtures {
  network: string;
  tokenId: string;
  marketplaceAccountId: string;
  seededAt: string;
  participants: Participant[];
  // Minted + owned by a participant, no allowance yet -- fixtures for the `approve` bench.
  unlistedSerials: { serial: string; owner: string }[];
  // Minted + owned + allowance granted to the marketplace account, with an off-chain-tracked
  // price -- fixtures for `buy` (front slice) and `cancel` (tail slice); see bench.ts.
  listings: { serial: string; seller: string; price: string }[];
}

const ADDRESSES_FILE = path.join(__dirname, "..", "deployment-addresses.json");
// Namespaced per chain, mirroring marketplace-bench/scripts/seed.ts's
// seed-fixtures.<network>.json convention.
const FIXTURES_FILE = path.join(__dirname, "..", `seed-fixtures.${CHAIN_NAME}.json`);

const PARTICIPANT_COUNT = Number(process.env.SEED_PARTICIPANT_COUNT ?? 6);
const PARTICIPANT_BALANCE_HBAR = Number(process.env.SEED_PARTICIPANT_BALANCE_HBAR ?? 1000);
const UNLISTED_COUNT = Number(process.env.SEED_UNLISTED_COUNT ?? 30);
const LISTING_COUNT = Number(process.env.SEED_LISTING_COUNT ?? 60);
const LISTING_PRICE_HBAR = process.env.SEED_LISTING_PRICE_HBAR ?? "1";
// HTS caps metadata entries per TokenMintTransaction at 10.
const MINT_CHUNK_SIZE = 10;

function loadDeployment(): DeploymentRecord {
  if (!fs.existsSync(ADDRESSES_FILE)) {
    throw new Error(`No deployment-addresses.json found. Run deploy.ts first (${ADDRESSES_FILE}).`);
  }
  const deployments: Record<string, DeploymentRecord> = JSON.parse(
    fs.readFileSync(ADDRESSES_FILE, "utf-8")
  );
  const deployment = deployments[CHAIN_NAME];
  if (!deployment) {
    throw new Error(`No deployment recorded for "${CHAIN_NAME}". Run deploy.ts first.`);
  }
  return deployment;
}

async function main() {
  const totalToMint = UNLISTED_COUNT + LISTING_COUNT;
  const deployment = loadDeployment();
  const client = getClient();
  const tokenId = TokenId.fromString(deployment.tokenId);
  const marketplaceId = AccountId.fromString(deployment.marketplaceAccountId);

  console.log(
    `Seeding ${totalToMint} NFT serials on "${CHAIN_NAME}" ` +
      `(${UNLISTED_COUNT} unlisted for approve-bench, ${LISTING_COUNT} listed for buy/cancel-bench) ` +
      `across ${PARTICIPANT_COUNT} participant accounts`
  );

  // --- 1. Create participant accounts (sellers + buyers pool) --------------------------
  const participants: Participant[] = [];
  for (let i = 0; i < PARTICIPANT_COUNT; i++) {
    const key = PrivateKey.generateED25519();
    const resp = await new AccountCreateTransaction()
      .setKeyWithoutAlias(key.publicKey)
      .setInitialBalance(new Hbar(PARTICIPANT_BALANCE_HBAR))
      // Hedera requires an account to explicitly "associate" with an HTS token before it
      // can receive one (TOKEN_NOT_ASSOCIATED_TO_ACCOUNT otherwise) -- unlike ERC-721, where
      // any address can receive a token with no setup. -1 = unlimited auto-association slots,
      // so the treasury->participant transfers below (and the marketplace's NFT leg in
      // bench.ts's `buy`) don't need a separate TokenAssociateTransaction per account.
      .setMaxAutomaticTokenAssociations(-1)
      .execute(client);
    const receipt = await resp.getReceipt(client);
    const accountId = receipt.accountId!.toString();
    participants.push({ accountId, privateKey: key.toStringDer() });
    console.log(`  participant[${i}] = ${accountId}`);
  }
  const participantKeys = new Map(participants.map((p) => [p.accountId, PrivateKey.fromStringDer(p.privateKey)]));

  // --- 2. Mint NFT serials to the treasury (operator), chunked <=10 per tx -------------
  const serials: string[] = [];
  for (let minted = 0; minted < totalToMint; minted += MINT_CHUNK_SIZE) {
    const chunk = Math.min(MINT_CHUNK_SIZE, totalToMint - minted);
    const metadata = Array.from({ length: chunk }, (_, i) =>
      Buffer.from(`mpi-${minted + i}`)
    );
    const resp = await new TokenMintTransaction()
      .setTokenId(tokenId)
      .setMetadata(metadata)
      .execute(client);
    const receipt = await resp.getReceipt(client);
    for (const serial of receipt.serials) serials.push(serial.toString());
  }
  console.log(`Minted ${serials.length} serials to treasury (${deployment.operatorAccountId})`);

  // --- 3. Transfer ownership from treasury to participants, round-robin ----------------
  // Untimed setup, same rationale as marketplace-bench/scripts/seed.ts: ownership assignment
  // is a prerequisite for approve/list/buy/cancel fixtures, not the thing bench.ts measures.
  const owners: string[] = [];
  for (let i = 0; i < serials.length; i++) {
    const owner = participants[i % participants.length].accountId;
    const nftId = new NftId(tokenId, Long_fromString(serials[i]));
    await (
      await new TransferTransaction()
        .addNftTransfer(nftId, LOCAL_OPERATOR_ID, AccountId.fromString(owner))
        .execute(client)
    ).getReceipt(client);
    owners.push(owner);
  }
  console.log(`Transferred ${serials.length} serials from treasury to participants`);

  // --- 4. Split into unlisted (approve-bench fixtures) and listed (buy/cancel fixtures) -
  const unlistedSerials: SeedFixtures["unlistedSerials"] = [];
  const listings: SeedFixtures["listings"] = [];
  const priceTinybars = Hbar.fromString(LISTING_PRICE_HBAR).toTinybars().toString();

  for (let i = 0; i < serials.length; i++) {
    const serial = serials[i];
    const owner = owners[i];
    if (i < UNLISTED_COUNT) {
      unlistedSerials.push({ serial, owner });
    } else {
      // The "list" step for Hedera *is* this allowance grant -- see README's operation
      // mapping. Price has no on-ledger representation (HTS allowances are quantity-only,
      // not priced), so it's tracked here in the fixtures file and read back by bench.ts's
      // `buy` job to build the HBAR leg of the atomic TransferTransaction.
      const ownerKey = participantKeys.get(owner)!;
      const frozen = await new AccountAllowanceApproveTransaction()
        .approveTokenNftAllowance(new NftId(tokenId, Long_fromString(serial)), owner, marketplaceId)
        .freezeWith(client)
        .sign(ownerKey);
      await (await frozen.execute(client)).getReceipt(client);
      listings.push({ serial, seller: owner, price: priceTinybars });
    }
  }
  console.log(
    `Seeded ${unlistedSerials.length} unlisted serials and ${listings.length} active listings ` +
      `(price ${LISTING_PRICE_HBAR} HBAR each)`
  );

  const fixtures: SeedFixtures = {
    network: CHAIN_NAME,
    tokenId: deployment.tokenId,
    marketplaceAccountId: deployment.marketplaceAccountId,
    seededAt: new Date().toISOString(),
    participants,
    unlistedSerials,
    listings,
  };
  fs.writeFileSync(FIXTURES_FILE, JSON.stringify(fixtures, null, 2));
  console.log(`Fixtures written to ${FIXTURES_FILE}`);

  client.close();
}

// Long is re-exported transitively by the SDK's dependency graph but not as a named export
// of @hashgraph/sdk itself; NftId's constructor accepts a plain number too, and every serial
// here is well within the safe-integer range for this benchmark's scale, so a plain Number
// parse is simplest and avoids pulling in the `long` package as a direct dependency.
function Long_fromString(s: string): number {
  return Number(s);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
