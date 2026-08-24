import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
const DAG_CHAIN_RPC_URL = process.env.DAG_CHAIN_RPC_URL;
const DAG_CHAIN_ID = process.env.DAG_CHAIN_ID ? Number(process.env.DAG_CHAIN_ID) : undefined;

// Hardhat's own well-known test mnemonic accounts ("test test test ... junk") — public,
// funds-worthless, safe to hardcode. Used as-is for the in-memory "hardhat"/"localhost"
// networks; docker/local/ pre-funds the same 20 addresses on both besuLocal and
// confluxLocal (genesis alloc for Besu, a cross-space transfer for Conflux — see
// scripts/fund-conflux-espace.ts) so every network in this repo shares one account set
// and nothing here needs a .env file. See RUNBOOK.md.
const DEV_ACCOUNTS = [
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
  "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
  "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",
  "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e",
  "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356",
  "0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97",
  "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6",
  "0xf214f2b2cd398c806f84e317254e0f0b801d0643303237d97a22a48e01628897",
  "0x701b615bbdfb9de65240bc28bd21bbc0d996645a3dd57e7b12bc2bdf6f192c82",
  "0xa267530f49f8280200edf313ee7af6b827f2a8bce2897751d06a843f644967b1",
  "0x47c99abed3324a2707c28affff1267e45918ec8c3f20b8aa892e8b065d2942dd",
  "0xc526ee95bf44d8fc405a158bb884d9d1238d99f0612e9f33d006bb0789009aaa",
  "0x8166f546bab6da521a8369cab06c5d2b9e46670292d85c875ee9ec20e84ffb61",
  "0xea6c44ac03bff858b476bba40716402b03e41b8e97e276d1baec7c37d42484a0",
  "0x689af8efa8c651a91ad287602527f3af2fe9f6501a7ac4b061667b5a93e037fd",
  "0xde9be858da4a475276426320d5e9262ecfc3ba460bfac56360bfa6c4c28b4ee0",
  "0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e",
];

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
    // Local DAG-vs-linear comparison (docker/local/, see RUNBOOK.md). No .env needed —
    // both networks and every account are hardcoded, since everything here is throwaway
    // and runs only on localhost.
    besuLocal: {
      url: "http://127.0.0.1:8545",
      chainId: 4004,
      accounts: DEV_ACCOUNTS,
    },
    confluxLocal: {
      url: "http://127.0.0.1:8546",
      chainId: 1025,
      accounts: DEV_ACCOUNTS,
    },
    // Second linear-chain data point, different client than besuLocal (Geth/Go,
    // single-sealer PoA dev-mode vs Besu/Java, IBFT2.0) — see docker/local/docker-compose.yml.
    gethLocal: {
      url: "http://127.0.0.1:8549",
      chainId: 4005,
      accounts: DEV_ACCOUNTS,
    },
    // Node-count-sensitivity variable (RUNBOOK.md "Beyond this baseline", plan §5/§10
    // phase 5): 4-validator Besu IBFT2.0 cluster, docker/besu/. Same chainId as besuLocal
    // (generate-genesis.sh hardcodes 4004) — a different network/port, so no collision.
    besuCluster: {
      url: "http://127.0.0.1:8547",
      chainId: 4004,
      accounts: DEV_ACCOUNTS,
    },
    // Node-count-sensitivity variable, DAG side: conflux-rust bootnode + peers,
    // docker/conflux/. Same chain_id/evm_chain_id as confluxLocal (1024/1025) — see
    // docker/conflux/conf/bootnode.toml. RPC talks to the bootnode; see RUNBOOK.md /
    // docker/conflux/README.md for the peer topology and its node-count caveat.
    confluxCluster: {
      url: "http://127.0.0.1:8548",
      chainId: 1025,
      accounts: DEV_ACCOUNTS,
    },
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
