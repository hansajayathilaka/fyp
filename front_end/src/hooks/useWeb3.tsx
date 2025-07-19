'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Web3State, connectWallet, isMetaMaskInstalled } from '@/lib/web3';

interface Web3ContextType extends Web3State {
  connect: () => Promise<void>;
  disconnect: () => void;
  isLoading: boolean;
  error: string | null;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

interface Web3ProviderProps {
  children: ReactNode;
}

export const Web3Provider: React.FC<Web3ProviderProps> = ({ children }) => {
  const [web3State, setWeb3State] = useState<Web3State>({
    provider: null,
    signer: null,
    account: null,
    chainId: null,
    isConnected: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const state = await connectWallet();
      setWeb3State(state);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = () => {
    setWeb3State({
      provider: null,
      signer: null,
      account: null,
      chainId: null,
      isConnected: false,
    });
  };

  // Listen for account changes
  useEffect(() => {
    if (!isMetaMaskInstalled()) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else if (accounts[0] !== web3State.account) {
        connect();
      }
    };

    const handleChainChanged = () => {
      connect();
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [web3State.account]);

  // Auto-connect if previously connected
  useEffect(() => {
    const autoConnect = async () => {
      if (!isMetaMaskInstalled()) return;

      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          await connect();
        }
      } catch (err) {
        console.error('Auto-connect failed:', err);
      }
    };

    autoConnect();
  }, []);

  const value: Web3ContextType = {
    ...web3State,
    connect,
    disconnect,
    isLoading,
    error,
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = (): Web3ContextType => {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};