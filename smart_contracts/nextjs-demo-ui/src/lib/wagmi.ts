import { createConfig, http } from 'wagmi'
import { hardhat } from 'wagmi/chains'
import { injected, metaMask } from 'wagmi/connectors'
import { DEPLOYMENT_INFO } from '../contracts/addresses'

// HTTP transport with rate limiting and batching
function createHttpTransport(url: string) {
  return http(url, {
    batch: {
      batchSize: 10, // Batch up to 10 requests together
      wait: 100, // Wait 100ms before sending batch
    },
    retryCount: 3,
    retryDelay: 1000,
  })
}

// Get environment variables
const SONIC_RPC_URL = process.env.NEXT_PUBLIC_SONIC_RPC_URL || 'https://rpc.blaze.soniclabs.com'
const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '57054')
const BLOCK_EXPLORER_URL = process.env.NEXT_PUBLIC_BLOCK_EXPLORER_URL || 'https://testnet.sonicscan.org'

// Define Sonic testnet chain
const sonicTestnet = {
  id: CHAIN_ID,
  name: 'Sonic Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'ETH',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: [SONIC_RPC_URL],
    },
    public: {
      http: [SONIC_RPC_URL],
    },
  },
  blockExplorers: {
    default: { 
      name: 'Sonic Explorer', 
      url: BLOCK_EXPLORER_URL
    },
  },
  testnet: true,
} as const

// Get the current deployment network
const isHardhatDeployment = DEPLOYMENT_INFO.network === 'hardhat'

export const config = createConfig({
  chains: [hardhat, sonicTestnet],
  connectors: [
    injected(),
    metaMask(),
  ],
  transports: {
    [hardhat.id]: createHttpTransport('http://127.0.0.1:8545'),
    [sonicTestnet.id]: createHttpTransport(SONIC_RPC_URL),
  },
})

// Helper function to get the correct block explorer URL
export function getBlockExplorerUrl(hash: string, type: 'tx' | 'address' = 'tx'): string {
  if (isHardhatDeployment) {
    // For local development, we might not have a block explorer
    // Return a placeholder or local explorer if available
    return `#${hash}` // Placeholder for local development
  } else {
    // For Sonic testnet
    return `${BLOCK_EXPLORER_URL}/${type}/${hash}`
  }
}

// Helper function to get current network info
export function getCurrentNetworkInfo() {
  return {
    network: DEPLOYMENT_INFO.network,
    chainId: DEPLOYMENT_INFO.chainId,
    isLocal: isHardhatDeployment,
    blockExplorerUrl: isHardhatDeployment ? null : BLOCK_EXPLORER_URL
  }
}

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}