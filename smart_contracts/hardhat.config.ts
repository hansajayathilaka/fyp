import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Ensure private key is available
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const SONIC_TESTNET_RPC_URL = process.env.SONIC_TESTNET_RPC_URL || "https://rpc.blaze.soniclabs.com";
const SONICSCAN_API_KEY = process.env.SONICSCAN_API_KEY || "YOUR_SONICSCAN_TESTNET_API_KEY";

if (!PRIVATE_KEY) {
  throw new Error("Please set your PRIVATE_KEY in a .env file");
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    // Local development network
    hardhat: {
      chainId: 31337,
    },
    sonicTestnet: {
      url: SONIC_TESTNET_RPC_URL,
      chainId: 57054,
      accounts: [PRIVATE_KEY]
    }
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
  etherscan: {
    apiKey: SONICSCAN_API_KEY, // Single API key for Etherscan v2
    customChains: [
      {
        network: "sonicTestnet",
        chainId: 57054,
        urls: {
          apiURL: "https://api-testnet.sonicscan.org/api",
          browserURL: "https://testnet.sonicscan.org"
        }
      }
    ]
  }
};

export default config;
