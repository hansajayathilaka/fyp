import { AccountId, Client, PrivateKey } from "@hashgraph/sdk";

/**
 * hedera-local-node's well-known local operator account. This is *not* a secret: it's a
 * fixed, publicly documented dev credential baked into every hedera-local-node install
 * (see hashgraph/hedera-local-node's docker-compose.yml, OPERATOR_ID_MAIN/OPERATOR_KEY_MAIN),
 * exactly analogous to Hardhat's public test mnemonic that marketplace-bench already commits
 * for besuLocal/confluxLocal. It only ever holds fake, locally-genesis'd HBAR and is useless
 * off this machine's local network.
 */
export const LOCAL_OPERATOR_ID = AccountId.fromString("0.0.2");
export const LOCAL_OPERATOR_KEY = PrivateKey.fromStringDer(
  "302e020100300506032b65700422042091132178e72057a1d7528025956fe39b0b847f200ab59b2fdd367017f3087137"
);

/** Hedera "chain" name used throughout this leg's CSVs, matching DESIGN.md's chain table. */
export const CHAIN_NAME = "hedera";

/**
 * Client pre-wired for hedera-local-node: consensus gRPC at 127.0.0.1:50211 (node 0.0.3),
 * mirror gRPC at 127.0.0.1:5600. Never touches the JSON-RPC relay (8545/7546) -- this whole
 * track talks to the consensus/mirror nodes directly via the native SDK.
 */
export function getClient(): Client {
  const client = Client.forLocalNode();
  client.setOperator(LOCAL_OPERATOR_ID, LOCAL_OPERATOR_KEY);
  return client;
}
