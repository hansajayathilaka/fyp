import * as fs from "fs";
import * as path from "path";
import {
  AccountCreateTransaction,
  Hbar,
  PrivateKey,
  TokenCreateTransaction,
  TokenSupplyType,
  TokenType,
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

const ADDRESSES_FILE = path.join(__dirname, "..", "deployment-addresses.json");
const MARKETPLACE_INITIAL_BALANCE_HBAR = Number(
  process.env.DEPLOY_MARKETPLACE_BALANCE_HBAR ?? 200
);

async function main() {
  const client = getClient();
  console.log(`Deploying on "${CHAIN_NAME}" (hedera-local-node) as operator ${LOCAL_OPERATOR_ID}`);

  // --- 1. Create the HTS NFT collection ------------------------------------------------
  // This is the *entire* replacement for MarketplaceItem.sol: no contract, no bytecode --
  // just a chain-level token type. treasury = operator, supplyKey = operator's key, so the
  // operator can call TokenMintTransaction directly (mirrors MarketplaceItem's owner-mints
  // pattern, except "owner" here is a native account, not a contract's onlyOwner modifier).
  const tokenCreateTx = await new TokenCreateTransaction()
    .setTokenName("MarketplaceItem")
    .setTokenSymbol("MPI")
    .setTokenType(TokenType.NonFungibleUnique)
    .setSupplyType(TokenSupplyType.Infinite)
    .setTreasuryAccountId(LOCAL_OPERATOR_ID)
    .setSupplyKey(client.operatorPublicKey!)
    .freezeWith(client)
    .execute(client);
  const tokenCreateReceipt = await tokenCreateTx.getReceipt(client);
  const tokenId = tokenCreateReceipt.tokenId!;
  console.log(`HTS NFT collection created: ${tokenId.toString()}`);

  // --- 2. Create the "marketplace" account ----------------------------------------------
  // Hedera has no smart-contract VM in this track, so there is no Marketplace.sol to deploy.
  // Instead the marketplace is modeled as a native Hedera account that plays the *role* the
  // contract used to play: it's the account sellers grant an HTS NFT allowance to (the
  // approve/list step) and the account that co-signs the atomic buy TransferTransaction as
  // the approved spender. It never holds custody of the NFT or the sale proceeds -- the
  // atomic TransferTransaction in `buy` moves both legs directly between seller and buyer.
  const marketplaceKey = PrivateKey.generateED25519();
  const marketplaceCreateTx = await new AccountCreateTransaction()
    .setKeyWithoutAlias(marketplaceKey.publicKey)
    .setInitialBalance(new Hbar(MARKETPLACE_INITIAL_BALANCE_HBAR))
    // Not strictly required -- the marketplace only ever holds an *allowance*, never
    // custody of the NFT itself, so it never needs to receive one into its own balance --
    // but harmless to set and future-proofs against any extension that would.
    .setMaxAutomaticTokenAssociations(-1)
    .freezeWith(client)
    .execute(client);
  const marketplaceReceipt = await marketplaceCreateTx.getReceipt(client);
  const marketplaceAccountId = marketplaceReceipt.accountId!;
  console.log(`Marketplace account created: ${marketplaceAccountId.toString()}`);

  const record: DeploymentRecord = {
    network: CHAIN_NAME,
    tokenId: tokenId.toString(),
    operatorAccountId: LOCAL_OPERATOR_ID.toString(),
    marketplaceAccountId: marketplaceAccountId.toString(),
    marketplacePrivateKey: marketplaceKey.toStringDer(),
    deployedAt: new Date().toISOString(),
  };

  const existing: Record<string, DeploymentRecord> = fs.existsSync(ADDRESSES_FILE)
    ? JSON.parse(fs.readFileSync(ADDRESSES_FILE, "utf-8"))
    : {};
  existing[CHAIN_NAME] = record;
  fs.writeFileSync(ADDRESSES_FILE, JSON.stringify(existing, null, 2));
  console.log(`Persisted deployment addresses to ${ADDRESSES_FILE}`);

  client.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
