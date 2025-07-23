'use client'

import { useAccount, useReadContract } from 'wagmi'
import { getContractAddress } from '../contracts/addresses'

/**
 * Hook to check if the connected user is the contract owner
 */
export function useContractOwner() {
  const { address, isConnected } = useAccount()
  
  const { data: ownerAddress, isLoading } = useReadContract({
    address: getContractAddress('REGULATORY_MANAGEMENT'),
    abi: [
      {
        inputs: [],
        name: 'owner',
        outputs: [{ internalType: 'address', name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
      },
    ],
    functionName: 'owner',
    query: {
      enabled: isConnected && !!address,
    },
  })

  const isOwner = isConnected && 
                  address && 
                  ownerAddress && 
                  address.toLowerCase() === ownerAddress.toLowerCase()

  return {
    isOwner: !!isOwner,
    ownerAddress,
    isLoading,
  }
}