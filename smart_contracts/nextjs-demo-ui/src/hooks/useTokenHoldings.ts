import { useMemo, useCallback, useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useContracts } from '@/contracts/hooks'
import type { TokenMetadata } from '@/types/contracts'

// Token holding interface for portfolio display
export interface TokenHolding {
  tokenId: bigint
  tokenInfo: TokenMetadata | null
  walletBalance: bigint
  marketplaceBalance: bigint
  totalBalance: bigint
}

// Portfolio data structure
export interface PortfolioTokenData {
  tokenHoldings: TokenHolding[]
  totalTokenTypes: number
  isLoading: boolean
  error: string | null
  refetch: () => void
}

// Remove unused interface - now using direct contract calls

/**
 * Custom hook to fetch and aggregate user token holdings from both wallet and marketplace
 * Implements data transformation logic to combine wallet balances with marketplace balances
 * Includes filtering logic to show only tokens with non-zero balances
 * Implements token metadata fetching and caching for performance
 */
export function useTokenHoldings(): PortfolioTokenData {
  const { address } = useAccount()
  const { token, marketplace } = useContracts()
  
  // Remove unused state - now using direct contract calls

  // Get all active tokens with caching and reduced refetch frequency
  const { 
    isLoading: allTokensLoading, 
    error: allTokensError 
  } = token.useGetActiveTokens()

  // Debounce address changes to prevent excessive requests
  const [debouncedAddress, setDebouncedAddress] = useState(address)
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedAddress(address)
    }, 300) // 300ms debounce
    
    return () => clearTimeout(timer)
  }, [address])

  // Fetch comprehensive user data from marketplace (includes both wallet and marketplace balances)
  const { 
    data: comprehensiveUserData, 
    isLoading: comprehensiveDataLoading, 
    error: comprehensiveDataError,
    refetch: refetchComprehensiveData
  } = marketplace.useGetComprehensiveUserData(debouncedAddress)

  // Get list of token IDs from comprehensive user data
  const userTokenIds = useMemo(() => {
    if (comprehensiveUserData && Array.isArray(comprehensiveUserData)) {
      const [, tokenIds] = comprehensiveUserData as [bigint, bigint[], bigint[], bigint[], bigint, bigint, bigint]
      if (tokenIds && Array.isArray(tokenIds)) {
        return tokenIds
      }
    }
    return []
  }, [comprehensiveUserData])

  // Fetch token metadata using the contract's getMultipleTokenInfo function
  const { 
    data: tokenMetadataArray, 
    isLoading: isTokenMetadataLoading, 
    error: tokenMetadataError 
  } = token.useGetMultipleTokenInfo(userTokenIds)

  // Process token metadata into a cache object
  const tokenMetadataCache = useMemo(() => {
    const cache: { [tokenId: string]: TokenMetadata | null } = {}
    
    if (tokenMetadataArray && Array.isArray(tokenMetadataArray) && userTokenIds.length > 0) {
      userTokenIds.forEach((tokenId, index) => {
        if (index < tokenMetadataArray.length) {
          cache[tokenId.toString()] = tokenMetadataArray[index] as TokenMetadata
        } else {
          cache[tokenId.toString()] = null
        }
      })
    }
    
    return cache
  }, [tokenMetadataArray, userTokenIds])

  // Create a refetch function that refetches all data
  const refetch = useCallback(() => {
    console.log('Refetching token holdings data...')
    refetchComprehensiveData()
    // Token metadata will automatically refetch when userTokenIds change
  }, [refetchComprehensiveData])

  // Process and aggregate token holdings data
  const tokenHoldings = useMemo(() => {
    if (!address || userTokenIds.length === 0 || !comprehensiveUserData) {
      return []
    }

    const holdings: TokenHolding[] = []

    try {
      // Extract data from comprehensive user data
      const [, tokenIds, walletBalances, marketplaceBalances] = comprehensiveUserData as [
        bigint, 
        bigint[], 
        bigint[], 
        bigint[], 
        bigint, 
        bigint, 
        bigint
      ]

      if (!tokenIds || !walletBalances || !marketplaceBalances) {
        return []
      }

      tokenIds.forEach((tokenId, index) => {
        const walletBalance = walletBalances[index] || BigInt(0)
        const marketplaceBalance = marketplaceBalances[index] || BigInt(0)
        const totalBalance = walletBalance + marketplaceBalance

        // Token balances are whole numbers (not in wei format)

        // Only include tokens with non-zero balances (filtering logic)
        if (totalBalance > BigInt(0)) {
          const tokenInfo = tokenMetadataCache[tokenId.toString()] || null

          holdings.push({
            tokenId,
            tokenInfo,
            walletBalance,
            marketplaceBalance,
            totalBalance
          })
        }
      })

      // Sort by total balance descending for better UX
      return holdings.sort((a, b) => {
        if (a.totalBalance > b.totalBalance) return -1
        if (a.totalBalance < b.totalBalance) return 1
        return 0
      })
    } catch (error) {
      console.warn('Error processing comprehensive user data:', error)
      return []
    }
  }, [address, userTokenIds, comprehensiveUserData, tokenMetadataCache])

  // Calculate loading state
  const isLoading = allTokensLoading || comprehensiveDataLoading || isTokenMetadataLoading

  // Handle errors
  const error = useMemo(() => {
    if (allTokensError) return `Error loading tokens: ${allTokensError.message}`
    if (comprehensiveDataError) return `Error loading user data: ${comprehensiveDataError.message}`
    if (tokenMetadataError) return `Error loading token metadata: ${tokenMetadataError.message}`
    return null
  }, [allTokensError, comprehensiveDataError, tokenMetadataError])

  return {
    tokenHoldings,
    totalTokenTypes: tokenHoldings.length,
    isLoading,
    error,
    refetch
  }
}

/**
 * Hook to calculate portfolio statistics based on token holdings
 * Provides aggregated data for portfolio summary display
 */
export function usePortfolioStats(): {
  totalTokenTypes: number
  totalEstimatedValue: bigint
  walletValue: bigint
  marketplaceValue: bigint
  activeOrdersCount: bigint
  totalTradesCount: bigint
  totalVolumeTraded: bigint
  isLoading: boolean
  error: string | null
} {
  const { tokenHoldings, isLoading, error } = useTokenHoldings()
  const { address } = useAccount()
  const { marketplace } = useContracts()
  
  // Get comprehensive user data for additional stats
  const { 
    data: comprehensiveUserData,
    isLoading: comprehensiveDataLoading,
    error: comprehensiveDataError
  } = marketplace.useGetComprehensiveUserData(address)

  const stats = useMemo(() => {
    let totalEstimatedValue = BigInt(0)
    let walletValue = BigInt(0)
    let marketplaceValue = BigInt(0)

    tokenHoldings.forEach(holding => {
      if (holding.tokenInfo) {
        // Calculate estimated value: (price in wei) × (balance as whole number) = value in wei
        // Token price is in wei (ETH's smallest unit)
        // Token balance is a whole number (not in wei format)
        const tokenValue = holding.tokenInfo.initialPrice * holding.totalBalance
        totalEstimatedValue += tokenValue

        // Calculate wallet value
        const walletTokenValue = holding.tokenInfo.initialPrice * holding.walletBalance
        walletValue += walletTokenValue

        // Calculate marketplace value
        const marketplaceTokenValue = holding.tokenInfo.initialPrice * holding.marketplaceBalance
        marketplaceValue += marketplaceTokenValue

        // Debug log to understand the values
        console.log('Token Value Calculation:', {
          tokenId: holding.tokenId.toString(),
          tokenName: holding.tokenInfo.name,
          initialPrice: holding.tokenInfo.initialPrice.toString(),
          initialPriceInEth: Number(holding.tokenInfo.initialPrice) / 1e18,
          totalBalance: holding.totalBalance.toString(),
          tokenValue: tokenValue.toString(),
          tokenValueInEth: Number(tokenValue) / 1e18,
          runningTotal: totalEstimatedValue.toString(),
          runningTotalInEth: Number(totalEstimatedValue) / 1e18
        });
      }
    })

    // Extract additional stats from comprehensive data
    let activeOrdersCount = BigInt(0)
    let totalTradesCount = BigInt(0)
    let totalVolumeTraded = BigInt(0)

    if (comprehensiveUserData && Array.isArray(comprehensiveUserData)) {
      try {
        const [, , , , orders, trades, volume] = comprehensiveUserData as [
          bigint, bigint[], bigint[], bigint[], bigint, bigint, bigint
        ]
        activeOrdersCount = orders || BigInt(0)
        totalTradesCount = trades || BigInt(0)
        totalVolumeTraded = volume || BigInt(0)
      } catch (error) {
        console.warn('Error extracting trading stats:', error)
      }
    }

    return {
      totalTokenTypes: tokenHoldings.length,
      totalEstimatedValue,
      walletValue,
      marketplaceValue,
      activeOrdersCount,
      totalTradesCount,
      totalVolumeTraded
    }
  }, [tokenHoldings, comprehensiveUserData])

  const combinedLoading = isLoading || comprehensiveDataLoading
  const combinedError = error || (comprehensiveDataError ? comprehensiveDataError.message : null)

  return {
    ...stats,
    isLoading: combinedLoading,
    error: combinedError
  }
}

/**
 * Hook to get individual token holding data for a specific token
 * Useful for components that need data for a single token
 */
export function useTokenHolding(tokenId: bigint | undefined): {
  holding: TokenHolding | null
  isLoading: boolean
  error: string | null
} {
  const { address } = useAccount()
  const { token, marketplace } = useContracts()

  // Get token metadata
  const { 
    data: tokenInfo, 
    isLoading: metadataLoading, 
    error: metadataError 
  } = token.useGetTokenInfo(tokenId || undefined)

  // Note: Wallet balance is now included in comprehensive data, no separate call needed

  // Get comprehensive user data to find marketplace balance
  const { 
    data: comprehensiveUserData, 
    isLoading: comprehensiveDataLoading, 
    error: comprehensiveDataError 
  } = marketplace.useGetComprehensiveUserData(address)

  // Process the data
  const holding = useMemo(() => {
    if (!tokenId || !address || !tokenInfo || !comprehensiveUserData) {
      return null
    }

    try {
      // Extract data from comprehensive user data
      const [, tokenIds, walletBalances, marketplaceBalances] = comprehensiveUserData as [
        bigint, 
        bigint[], 
        bigint[], 
        bigint[], 
        bigint, 
        bigint, 
        bigint
      ]

      // Find balances for this specific token
      let walletBalance = BigInt(0)
      let marketplaceBalance = BigInt(0)
      
      if (tokenIds && walletBalances && marketplaceBalances) {
        const tokenIndex = tokenIds.findIndex((id: bigint) => id === tokenId)
        if (tokenIndex !== -1) {
          walletBalance = walletBalances[tokenIndex] || BigInt(0)
          marketplaceBalance = marketplaceBalances[tokenIndex] || BigInt(0)
        }
      }

      const totalBalance = walletBalance + marketplaceBalance

      return {
        tokenId,
        tokenInfo: tokenInfo as TokenMetadata,
        walletBalance,
        marketplaceBalance,
        totalBalance
      }
    } catch (error) {
      console.warn('Error processing comprehensive user data for single token:', error)
      return null
    }
  }, [tokenId, address, tokenInfo, comprehensiveUserData])

  const isLoading = metadataLoading || comprehensiveDataLoading
  
  const error = useMemo(() => {
    if (metadataError) return metadataError.message
    if (comprehensiveDataError) return comprehensiveDataError.message
    return null
  }, [metadataError, comprehensiveDataError])

  return {
    holding,
    isLoading,
    error
  }
}