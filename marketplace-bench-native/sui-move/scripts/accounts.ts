// Standalone helper: generate/fund the local dev account pool without running deploy/seed.
// Useful to warm up faucet funding ahead of time, or to inspect balances.
import { getClient, loadOrCreateAccounts } from "./common.js";

const COUNT = Number(process.env.SEED_SELLER_COUNT ?? 5) + 1;

async function main() {
  const client = getClient();
  const accounts = await loadOrCreateAccounts(COUNT);
  console.log(`${accounts.length} account(s) ready:`);
  for (const kp of accounts) {
    const address = kp.getPublicKey().toSuiAddress();
    const balance = await client.getBalance({ owner: address });
    console.log(`  ${address}  ${(BigInt(balance.totalBalance) / 1_000_000_000n).toString()} SUI`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
