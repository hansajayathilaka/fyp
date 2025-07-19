import { ethers } from 'ethers';

// Types for Web3 connection
export interface Web3State {
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  account: string | null;
  chainId: number | null;
  isConnected: boolean;
}

// Network configurations
export const NETWORKS = {
  mainnet: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY'
  },
  sepolia: {
    chainId: 11155111,
    name: 'Sepolia Testnet',
    rpcUrl: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY'
  },
  localhost: {
    chainId: 31337,
    name: 'Localhost',
    rpcUrl: 'http://127.0.0.1:8545'
  }
};

// Check if MetaMask is installed
export const isMetaMaskInstalled = (): boolean => {
  return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
};

// Connect to MetaMask
export const connectWallet = async (): Promise<Web3State> => {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask is not installed');
  }

  try {
    // Request account access
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const account = await signer.getAddress();
    const network = await provider.getNetwork();
    
    return {
      provider,
      signer,
      account,
      chainId: Number(network.chainId),
      isConnected: true
    };
  } catch (error) {
    console.error('Failed to connect wallet:', error);
    throw error;
  }
};

// Switch network
export const switchNetwork = async (chainId: number): Promise<void> => {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask is not installed');
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    });
  } catch (error: any) {
    // If network doesn't exist, add it
    if (error.code === 4902) {
      const network = Object.values(NETWORKS).find(n => n.chainId === chainId);
      if (network) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: `0x${chainId.toString(16)}`,
            chainName: network.name,
            rpcUrls: [network.rpcUrl],
          }],
        });
      }
    } else {
      throw error;
    }
  }
};

// Format address for display
export const formatAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Format ether amount
export const formatEther = (value: bigint | string): string => {
  return ethers.formatEther(value);
};

// Parse ether amount
export const parseEther = (value: string): bigint => {
  return ethers.parseEther(value);
};