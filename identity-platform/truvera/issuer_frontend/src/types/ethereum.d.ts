// MetaMask Ethereum provider types
interface EthereumProvider {
  isMetaMask?: boolean;
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (event: string, callback: (...args: any[]) => void) => void;
  removeListener: (event: string, callback: (...args: any[]) => void) => void;
  selectedAddress: string | null;
  chainId: string;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export {};