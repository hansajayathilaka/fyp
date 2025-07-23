// Export all contract-related functionality
export * from './addresses'
export * from './abis'
export * from './hooks'

// Re-export types for convenience
export type {
  UserProfile,
  RawUserProfile,
  PlatformStats,
  TokenMetadata,
  TokenStats,
  Order,
  RawOrder,
  OrderBook,
  MarketplaceStats,
  ComprehensiveUserData,
  RawComprehensiveUserData,
  MarketDepth,
  TransactionState,
  DemoState,
  NetworkConfig,
  ContractAddresses,
  UserType,
  OrderType,
  OrderStatus
} from '../types/contracts'

// Re-export utility functions
export {
  convertRawUserProfile,
  convertRawOrder,
  convertRawComprehensiveUserData
} from '../types/contracts'