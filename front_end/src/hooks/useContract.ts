import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from './useWeb3';

export interface ContractConfig {
  address: string;
  abi: any[];
}

export const useContract = (config: ContractConfig) => {
  const { provider, signer, isConnected } = useWeb3();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get contract instance
  const getContract = useCallback(() => {
    if (!provider || !config.address || !config.abi) {
      throw new Error('Provider, address, and ABI are required');
    }
    
    return new ethers.Contract(
      config.address,
      config.abi,
      signer || provider
    );
  }, [provider, signer, config.address, config.abi]);

  // Read from contract (view functions)
  const read = useCallback(async (methodName: string, ...args: any[]) => {
    setIsLoading(true);
    setError(null);

    try {
      const contract = getContract();
      const result = await contract[methodName](...args);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Contract read failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [getContract]);

  // Write to contract (state-changing functions)
  const write = useCallback(async (
    methodName: string,
    args: any[] = [],
    options: { value?: bigint; gasLimit?: bigint } = {}
  ) => {
    if (!isConnected || !signer) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      const contract = getContract();
      const tx = await contract[methodName](...args, options);
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      return { transaction: tx, receipt };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Contract write failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [getContract, isConnected, signer]);

  // Estimate gas for a transaction
  const estimateGas = useCallback(async (
    methodName: string,
    args: any[] = [],
    options: { value?: bigint } = {}
  ) => {
    try {
      const contract = getContract();
      const gasEstimate = await contract[methodName].estimateGas(...args, options);
      return gasEstimate;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Gas estimation failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [getContract]);

  // Listen to contract events
  const listen = useCallback((
    eventName: string,
    callback: (...args: any[]) => void,
    filter?: any[]
  ) => {
    try {
      const contract = getContract();
      
      if (filter) {
        contract.on(contract.filters[eventName](...filter), callback);
      } else {
        contract.on(eventName, callback);
      }

      // Return cleanup function
      return () => {
        contract.removeAllListeners(eventName);
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Event listener setup failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [getContract]);

  return {
    read,
    write,
    estimateGas,
    listen,
    isLoading,
    error,
    contract: isConnected ? getContract() : null,
  };
};