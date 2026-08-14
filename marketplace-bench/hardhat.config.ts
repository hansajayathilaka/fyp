import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
const DAG_CHAIN_RPC_URL = process.env.DAG_CHAIN_RPC_URL;
const DAG_CHAIN_ID = process.env.DAG_CHAIN_ID ? Number(process.env.DAG_CHAIN_ID) : undefined;

// Pinned per plan §3/§4.3 — confirm this is still <= the max Solidity/EVM version
// supported by whichever DAG chain is chosen in §2.1 before deploying to it.
const SOLC_VERSION = "0.8.28";

const config: HardhatUserConfig = {
  solidity: {
    version: SOLC_VERSION,
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      // Explicit rather than solc-default: some DAG-chain EVM implementations lag the
      // latest hardfork, so pin to a version known-supported and revisit per plan §4.3
      // once the chain in §2.1 is decided.
      evmVersion: "cancun",
    },
  },
  networks: {
    // In-memory network — used for all of Phase 1 (repo checklist §3 steps 1-10).
    hardhat: {},
    // Track A: public linear-chain testnet. Requires PRIVATE_KEY + SEPOLIA_RPC_URL in .env.
    ...(PRIVATE_KEY && SEPOLIA_RPC_URL
      ? {
          sepolia: {
            url: SEPOLIA_RPC_URL,
            accounts: [PRIVATE_KEY],
          },
        }
      : {}),
    // Track A: public DAG-chain testnet (Hedera or Conflux — see §2.1). Placeholder until
    // the chain decision is resolved and DAG_CHAIN_RPC_URL / DAG_CHAIN_ID are set in .env.
    ...(PRIVATE_KEY && DAG_CHAIN_RPC_URL
      ? {
          dagChain: {
            url: DAG_CHAIN_RPC_URL,
            chainId: DAG_CHAIN_ID,
            accounts: [PRIVATE_KEY],
          },
        }
      : {}),
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 40000,
  },
};

export default config;
