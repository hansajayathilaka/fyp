// One-time bootstrap for the local conflux-local CoreSpace account set. Unlike the eSpace
// leg (../../../marketplace-bench/scripts/fund-conflux-espace.ts), this does NOT need the
// CrossSpaceCall internal contract: CoreSpace accounts are the ones genesis_secrets funds
// *directly* (that's the whole point of genesis_secrets — it's a CoreSpace-only mechanism).
// The catch: genesis_secrets.txt in this repo lists exactly one private key
// (../../../marketplace-bench/docker/local/conflux/genesis_secrets.txt), so only
// DEV_ACCOUNTS[0] starts funded. The other 19 dev accounts still need a funding step —
// just a single plain native CoreSpace transfer each, not a cross-space call.
import { Conflux, Drip } from "js-conflux-sdk";
import { DEV_ACCOUNTS, CORESPACE_RPC_URL, CORESPACE_NETWORK_ID } from "./accounts";

// genesis_secrets gives DEV_ACCOUNTS[0] a fixed 10,000 CFX on CoreSpace at genesis (dev
// mode) — stay well under that across all 19 recipients plus this account's own gas costs
// for both this funding run and everything deploy/seed/bench will later spend from it.
const CFX_PER_ACCOUNT = 400;

async function main() {
  const conflux = new Conflux({ url: CORESPACE_RPC_URL, networkId: CORESPACE_NETWORK_ID });
  const funder = conflux.wallet.addPrivateKey(DEV_ACCOUNTS[0]);
  const recipients = DEV_ACCOUNTS.slice(1).map((pk) => conflux.wallet.addPrivateKey(pk).address);

  const funderBalance = await conflux.cfx.getBalance(funder.address);
  console.log(
    `Funder ${funder.address} balance: ${new Drip(funderBalance).toCFX()} CFX. ` +
      `Funding ${recipients.length} CoreSpace accounts with ${CFX_PER_ACCOUNT} CFX each...`
  );

  for (const address of recipients) {
    const existing = await conflux.cfx.getBalance(address);
    if (new Drip(existing).toCFX() !== "0") {
      console.log(`  ${address} already has ${new Drip(existing).toCFX()} CFX, skipping`);
      continue;
    }
    const receipt = await conflux.cfx
      .sendTransaction({ from: funder.address, to: address, value: Drip.fromCFX(CFX_PER_ACCOUNT) })
      .executed();
    if (receipt.outcomeStatus !== 0) {
      throw new Error(`funding transfer to ${address} failed: outcomeStatus=${receipt.outcomeStatus}`);
    }
    console.log(`  funded ${address} (tx ${receipt.transactionHash})`);
  }

  console.log("Done. Every CoreSpace dev account now has a spendable balance on conflux-local.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
