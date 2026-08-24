// One-time bootstrap for the local confluxLocal network (docker/local/). Conflux's
// genesis_secrets config only funds the CoreSpace side of an account; the eSpace (EVM)
// side that ethers/hardhat actually talks to has to be funded separately via the
// CrossSpaceCall internal contract's transferEVM (plan-adjacent §4.3's "account-model
// divergences" note — this is exactly that, for Conflux specifically).
//
// Everything here is a hardcoded, local-only, well-known dev key (Hardhat's standard
// test mnemonic accounts) — safe to commit, never used on a real network.
import { Conflux, Drip } from "js-conflux-sdk";

// Overridable via env so this same script can fund a fresh chain other than
// confluxLocal — e.g. the confluxCluster bootnode (docker/conflux/), whose CoreSpace RPC
// is published on host port 12547, not 12537, to avoid colliding with confluxLocal's own
// mapping. CORESPACE_CHAIN_ID defaults to 1024 since docker/conflux/conf/bootnode.toml
// deliberately reuses confluxLocal's chain_id.
const CORESPACE_RPC_URL = process.env.CORESPACE_RPC_URL ?? "http://127.0.0.1:12537";
const CORESPACE_CHAIN_ID = process.env.CORESPACE_CHAIN_ID
  ? Number(process.env.CORESPACE_CHAIN_ID)
  : 1024;

// The CoreSpace account genesis_secrets.txt funds (docker/local/conflux/genesis_secrets.txt).
const FUNDER_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

// Every eSpace (EVM) address the marketplace-bench scripts will sign with — the same
// well-known Hardhat test accounts used by the in-memory "hardhat" and "localhost"
// networks, so account behavior is identical across every network in this repo.
const ESPACE_ACCOUNTS = [
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
  "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
  "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
  "0x976EA74026E726554dB657fA54763abd0C3a0aa9",
  "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955",
  "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f",
  "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720",
  "0xBcd4042DE499D14e55001CcbB24a551F3b954096",
  "0x71bE63f3384f5fb98995898A86B02Fb2426c5788",
  "0xFABB0ac9d68B0B445fB7357272Ff202C5651694a",
  "0x1CBd3b2770909D4e10f157cABC84C7264073C9Ec",
  "0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097",
  "0xcd3B766CCDd6AE721141F452C550Ca635964ce71",
  "0x2546BcD3c84621e976D8185a91A922aE77ECEc30",
  "0xbDA5747bFD65F08deb54cb465eB87D40e51B197E",
  "0xdD2FD4581271e230360230F9337D5c0430Bf44C0",
  "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199",
];

// genesis_secrets gives the funder account a fixed 10000 CFX on CoreSpace — stay well
// under that across all 20 accounts plus CoreSpace gas fees for the transfers themselves.
const CFX_PER_ACCOUNT = 400;

async function main() {
  const conflux = new Conflux({ url: CORESPACE_RPC_URL, networkId: CORESPACE_CHAIN_ID });
  const funder = conflux.wallet.addPrivateKey(FUNDER_PRIVATE_KEY);
  const crossSpaceCall = conflux.InternalContract("CrossSpaceCall");

  console.log(`Funding ${ESPACE_ACCOUNTS.length} eSpace accounts with ${CFX_PER_ACCOUNT} CFX each...`);

  for (const address of ESPACE_ACCOUNTS) {
    const receipt = await crossSpaceCall
      .transferEVM(address)
      .sendTransaction({ from: funder.address, value: Drip.fromCFX(CFX_PER_ACCOUNT) })
      .executed();

    if (receipt.outcomeStatus !== 0) {
      throw new Error(`transferEVM to ${address} failed: outcomeStatus=${receipt.outcomeStatus}`);
    }
    console.log(`  funded ${address} (tx ${receipt.transactionHash})`);
  }

  console.log("Done. Every eSpace dev account now has a spendable balance on confluxLocal.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
