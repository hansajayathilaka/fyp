import { useReadContract, useWriteContract, useWatchContractEvent } from 'wagmi'
import { CONTRACT_ADDRESSES, getContractAddress } from './addresses'
import { getContractABI } from './abis'

// Regulatory Management Hooks
export function useRegulatoryManagement() {
  const address = getContractAddress('REGULATORY_MANAGEMENT')
  const abi = getContractABI('REGULATORY_MANAGEMENT')

  // Read hooks
  const useGetUserProfile = (userAddress?: `0x${string}`) =>
    useReadContract({
      address,
      abi,
      functionName: 'getUserProfile',
      args: userAddress ? [userAddress] : undefined,
      query: { enabled: !!userAddress }
    })

  const useGetPlatformStats = () =>
    useReadContract({
      address,
      abi,
      functionName: 'getPlatformStats'
    })

  const useIsUserRegistered = (userAddress?: `0x${string}`) =>
    useReadContract({
      address,
      abi,
      functionName: 'isRegistered',
      args: userAddress ? [userAddress] : undefined,
      query: { enabled: !!userAddress }
    })

  const useCanUserTrade = (userAddress?: `0x${string}`) =>
    useReadContract({
      address,
      abi,
      functionName: 'canUserTrade',
      args: userAddress ? [userAddress] : undefined,
      query: { enabled: !!userAddress }
    })

  const useCanUserCreateTokens = (userAddress?: `0x${string}`) =>
    useReadContract({
      address,
      abi,
      functionName: 'canUserCreateTokens',
      args: userAddress ? [userAddress] : undefined,
      query: { enabled: !!userAddress }
    })

  const useGetAllUsers = () =>
    useReadContract({
      address,
      abi,
      functionName: 'getAllUsers'
    })

  const useGetUsersByType = (userType?: 0 | 1) =>
    useReadContract({
      address,
      abi,
      functionName: 'getUsersByType',
      args: userType !== undefined ? [userType] : undefined,
      query: { enabled: userType !== undefined }
    })

  const useGetVerifiedUsers = () =>
    useReadContract({
      address,
      abi,
      functionName: 'getVerifiedUsers'
    })

  const useGetTotalUsers = () =>
    useReadContract({
      address,
      abi,
      functionName: 'getTotalUsers'
    })

  // Write hooks
  const { writeContract: writeRegulatoryContract, ...writeRegulatoryRest } = useWriteContract()

  const registerUser = (ssiIdentifier: string, userType: 0 | 1) => {
    writeRegulatoryContract({
      address,
      abi,
      functionName: 'registerUser',
      args: [ssiIdentifier, userType]
    })
  }

  const verifyUser = (userAddress: `0x${string}`) => {
    writeRegulatoryContract({
      address,
      abi,
      functionName: 'verifyUser',
      args: [userAddress]
    })
  }

  const suspendUser = (userAddress: `0x${string}`) => {
    writeRegulatoryContract({
      address,
      abi,
      functionName: 'suspendUser',
      args: [userAddress]
    })
  }

  const unsuspendUser = (userAddress: `0x${string}`) => {
    writeRegulatoryContract({
      address,
      abi,
      functionName: 'unsuspendUser',
      args: [userAddress]
    })
  }

  // Event watching
  const useWatchUserRegistered = (onLogs: (logs: unknown[]) => void) =>
    useWatchContractEvent({
      address,
      abi,
      eventName: 'UserRegistered',
      onLogs
    })

  return {
    // Read functions
    useGetUserProfile,
    useGetPlatformStats,
    useIsUserRegistered,
    useCanUserTrade,
    useCanUserCreateTokens,
    useGetAllUsers,
    useGetUsersByType,
    useGetVerifiedUsers,
    useGetTotalUsers,
    // Write functions
    registerUser,
    verifyUser,
    suspendUser,
    unsuspendUser,
    // Event watching
    useWatchUserRegistered,
    // Write contract state
    ...writeRegulatoryRest
  }
}

// Token Contract Hooks
export function useRegulatedToken() {
  const address = getContractAddress('REGULATED_ERC1155_TOKEN')
  const abi = getContractABI('REGULATED_ERC1155_TOKEN')

  // Read hooks
  const useGetTokenInfo = (tokenId?: bigint) =>
    useReadContract({
      address,
      abi,
      functionName: 'getTokenInfo',
      args: tokenId !== undefined ? [tokenId] : undefined,
      query: { enabled: tokenId !== undefined }
    })

  const useGetAllTokens = () =>
    useReadContract({
      address,
      abi,
      functionName: 'getAllTokens'
    })

  const useGetActiveTokens = () =>
    useReadContract({
      address,
      abi,
      functionName: 'getActiveTokens'
    })

  const useBalanceOf = (account?: `0x${string}`, tokenId?: bigint) =>
    useReadContract({
      address,
      abi,
      functionName: 'balanceOf',
      args: account && tokenId !== undefined ? [account, tokenId] : undefined,
      query: { enabled: !!account && tokenId !== undefined }
    })

  const useGetTokenStats = () =>
    useReadContract({
      address,
      abi,
      functionName: 'getTokenStats'
    })

  const useGetTokensByCreator = (creator?: `0x${string}`) =>
    useReadContract({
      address,
      abi,
      functionName: 'getTokensByCreator',
      args: creator ? [creator] : undefined,
      query: { enabled: !!creator }
    })

  const useGetUserTokenBalances = (user?: `0x${string}`, tokenIds?: bigint[]) =>
    useReadContract({
      address,
      abi,
      functionName: 'getUserTokenBalances',
      args: user && tokenIds ? [user, tokenIds] : undefined,
      query: { enabled: !!user && !!tokenIds && tokenIds.length > 0 }
    })

  const useGetMultipleTokenInfo = (tokenIds?: bigint[]) =>
    useReadContract({
      address,
      abi,
      functionName: 'getMultipleTokenInfo',
      args: tokenIds && tokenIds.length > 0 ? [tokenIds] : undefined,
      query: { enabled: !!tokenIds && tokenIds.length > 0 }
    })

  // Write hooks
  const { writeContract: writeTokenContract, ...writeTokenRest } = useWriteContract()

  const createToken = (
    name: string,
    symbol: string,
    companyName: string,
    maxSupply: bigint,
    initialPrice: bigint
  ) => {
    writeTokenContract({
      address,
      abi,
      functionName: 'createToken',
      args: [name, symbol, companyName, maxSupply, initialPrice]
    })
  }

  const mintToken = (to: `0x${string}`, tokenId: bigint, amount: bigint) => {
    writeTokenContract({
      address,
      abi,
      functionName: 'mintToken',
      args: [to, tokenId, amount]
    })
  }

  const setTokenStatus = (tokenId: bigint, isActive: boolean) => {
    writeTokenContract({
      address,
      abi,
      functionName: 'setTokenStatus',
      args: [tokenId, isActive]
    })
  }

  // Event watching
  const useWatchTokenCreated = (onLogs: (logs: unknown[]) => void) =>
    useWatchContractEvent({
      address,
      abi,
      eventName: 'TokenCreated',
      onLogs
    })

  const useWatchTokenMinted = (onLogs: (logs: unknown[]) => void) =>
    useWatchContractEvent({
      address,
      abi,
      eventName: 'TokenMinted',
      onLogs
    })

  return {
    // Read functions
    useGetTokenInfo,
    useGetAllTokens,
    useGetActiveTokens,
    useBalanceOf,
    useGetTokenStats,
    useGetTokensByCreator,
    useGetUserTokenBalances,
    useGetMultipleTokenInfo,
    // Write functions
    createToken,
    mintToken,
    setTokenStatus,
    // Event watching
    useWatchTokenCreated,
    useWatchTokenMinted,
    // Write contract state
    ...writeTokenRest
  }
}

// Marketplace Contract Hooks
export function useRegulatedMarketplace() {
  const address = getContractAddress('REGULATED_MARKETPLACE')
  const abi = getContractABI('REGULATED_MARKETPLACE')

  // Read hooks
  const useGetOrderBook = (tokenId?: bigint) =>
    useReadContract({
      address,
      abi,
      functionName: 'getOrderBook',
      args: tokenId !== undefined ? [tokenId] : undefined,
      query: { enabled: tokenId !== undefined }
    })

  const useGetOrder = (orderId?: bigint) =>
    useReadContract({
      address,
      abi,
      functionName: 'getOrder',
      args: orderId !== undefined ? [orderId] : undefined,
      query: { enabled: orderId !== undefined }
    })

  const useGetMarketplaceStats = () =>
    useReadContract({
      address,
      abi,
      functionName: 'getMarketplaceStats'
    })

  const useGetUserBalance = (user?: `0x${string}`) =>
    useReadContract({
      address,
      abi,
      functionName: 'getUserBalance',
      args: user ? [user] : undefined,
      query: { enabled: !!user }
    })

  const useGetUserETHBalance = (user?: `0x${string}`) =>
    useReadContract({
      address,
      abi,
      functionName: 'getUserETHBalance',
      args: user ? [user] : undefined,
      query: { enabled: !!user }
    })

  // Keep the old ethBalances function for backward compatibility if it exists
  const useEthBalance = (user?: `0x${string}`) =>
    useReadContract({
      address,
      abi,
      functionName: 'ethBalances',
      args: user ? [user] : undefined,
      query: { enabled: !!user }
    })

  const useCalculateTradingFee = (tradeValue?: bigint) =>
    useReadContract({
      address,
      abi,
      functionName: 'calculateTradingFee',
      args: tradeValue !== undefined ? [tradeValue] : undefined,
      query: { enabled: tradeValue !== undefined }
    })

  const useGetUserTokenBalance = (user?: `0x${string}`, tokenId?: bigint) =>
    useReadContract({
      address,
      abi,
      functionName: 'getUserTokenBalance',
      args: user && tokenId !== undefined ? [user, tokenId] : undefined,
      query: { enabled: !!user && tokenId !== undefined }
    })

  const useGetComprehensiveUserData = (user?: `0x${string}`) =>
    useReadContract({
      address,
      abi,
      functionName: 'getComprehensiveUserData',
      args: user ? [user] : undefined,
      query: { enabled: !!user }
    })
    
  const useGetUserOrders = (user?: `0x${string}`) =>
    useReadContract({
      address,
      abi,
      functionName: 'getUserOrders',
      args: user ? [user] : undefined,
      query: { enabled: !!user }
    })

  // Write hooks
  const { writeContract: writeMarketplaceContract, ...writeMarketplaceRest } = useWriteContract()

  const depositETH = (value: bigint) => {
    writeMarketplaceContract({
      address,
      abi,
      functionName: 'depositETH',
      value
    })
  }

  const withdrawETH = (amount: bigint) => {
    writeMarketplaceContract({
      address,
      abi,
      functionName: 'withdrawETH',
      args: [amount]
    })
  }

  const depositTokens = (tokenId: bigint, amount: bigint) => {
    writeMarketplaceContract({
      address,
      abi,
      functionName: 'depositTokens',
      args: [tokenId, amount]
    })
  }

  const withdrawTokens = (tokenId: bigint, amount: bigint) => {
    writeMarketplaceContract({
      address,
      abi,
      functionName: 'withdrawTokens',
      args: [tokenId, amount]
    })
  }

  const placeBuyOrder = (tokenId: bigint, amount: bigint, price: bigint) => {
    writeMarketplaceContract({
      address,
      abi,
      functionName: 'placeBuyOrder',
      args: [tokenId, amount, price]
    })
  }

  const placeSellOrder = (tokenId: bigint, amount: bigint, price: bigint) => {
    writeMarketplaceContract({
      address,
      abi,
      functionName: 'placeSellOrder',
      args: [tokenId, amount, price]
    })
  }

  const cancelOrder = (orderId: bigint) => {
    writeMarketplaceContract({
      address,
      abi,
      functionName: 'cancelOrder',
      args: [orderId]
    })
  }

  // Event watching
  const useWatchOrderPlaced = (onLogs: (logs: unknown[]) => void) =>
    useWatchContractEvent({
      address,
      abi,
      eventName: 'OrderPlaced',
      onLogs
    })

  const useWatchTradeExecuted = (onLogs: (logs: unknown[]) => void) =>
    useWatchContractEvent({
      address,
      abi,
      eventName: 'TradeExecuted',
      onLogs
    })

  const useWatchETHDeposited = (onLogs: (logs: unknown[]) => void) =>
    useWatchContractEvent({
      address,
      abi,
      eventName: 'ETHDeposited',
      onLogs
    })

  return {
    // Read functions
    useGetOrderBook,
    useGetOrder,
    useGetMarketplaceStats,
    useGetUserBalance,
    useGetUserETHBalance,
    useEthBalance,
    useCalculateTradingFee,
    useGetUserTokenBalance,
    useGetComprehensiveUserData,
    useGetUserOrders,
    // Write functions
    depositETH,
    withdrawETH,
    depositTokens,
    withdrawTokens,
    placeBuyOrder,
    placeSellOrder,
    cancelOrder,
    // Event watching
    useWatchOrderPlaced,
    useWatchTradeExecuted,
    useWatchETHDeposited,
    // Write contract state
    ...writeMarketplaceRest
  }
}

// Combined hook for easy access to all contracts
export function useContracts() {
  const regulatory = useRegulatoryManagement()
  const token = useRegulatedToken()
  const marketplace = useRegulatedMarketplace()

  return {
    regulatory,
    token,
    marketplace,
    addresses: CONTRACT_ADDRESSES
  }
}