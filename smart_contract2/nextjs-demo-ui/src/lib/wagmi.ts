import { createConfig, http } from 'wagmi'
import { hardhat } from 'wagmi/chains'
import { injected, metaMask, walletConnect } from 'wagmi/connectors'
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

// Define custom Hedera testnet chain
const hederaTestnetCustom = {
  id: 296,
  name: 'Hedera Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'HBAR',
    symbol: 'HBAR',
  },
  rpcUrls: {
    default: {
      http: ['https://testnet.hashio.io/api/v1'],
    },
    public: {
      http: ['https://testnet.hashio.io/api/v1'],
    },
  },
  blockExplorers: {
    default: { 
      name: 'HashScan', 
      url: 'https://hashscan.io/testnet'
    },
  },
  testnet: true,
} as const

// Get the current deployment network
const isHardhatDeployment = DEPLOYMENT_INFO.network === 'hardhat'

export const config = createConfig({
  chains: [hardhat, hederaTestnetCustom],
  connectors: [
    injected(),
    metaMask(),
    walletConnect({ 
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id' 
    }),
  ],
  transports: {
    [hardhat.id]: createHttpTransport('http://127.0.0.1:8545'),
    [hederaTestnetCustom.id]: createHttpTransport('https://testnet.hashio.io/api/v1'),
  },

})

// Helper function to get the correct block explorer URL
export function getBlockExplorerUrl(hash: string, type: 'tx' | 'address' = 'tx'): string {
  if (isHardhatDeployment) {
    // For local development, we might not have a block explorer
    // Return a placeholder or local explorer if available
    return `#${hash}` // Placeholder for local development
  } else {
    // For Hedera testnet
    return `https://hashscan.io/testnet/${type}/${hash}`
  }
}

// Helper function to get current network info
export function getCurrentNetworkInfo() {
  return {
    network: DEPLOYMENT_INFO.network,
    chainId: DEPLOYMENT_INFO.chainId,
    isLocal: isHardhatDeployment,
    blockExplorerUrl: isHardhatDeployment ? null : 'https://hashscan.io/testnet'
  }
}

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}