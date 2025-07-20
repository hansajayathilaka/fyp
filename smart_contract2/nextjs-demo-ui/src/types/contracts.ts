// Contract type definitions based on the smart contracts

// User Profile from RegulatoryManagement
export interface UserProfile {
  userAddress: `0x${string}`;
  ssiIdentifier: string;
  userType: 'Individual' | 'Company';
  isVerified: boolean;
  canTrade: boolean;
  canCreateTokens: boolean;
  isSuspended: boolean;
  registrationDate: bigint;
}

// Raw user profile from contract (with numeric userType)
export interface RawUserProfile {
  userAddress: `0x${string}`;
  ssiIdentifier: string;
  userType: 0 | 1; // 0 = Individual, 1 = Company
  isVerified: boolean;
  canTrade: boolean;
  canCreateTokens: boolean;
  isSuspended: boolean;
  registrationDate: bigint;
}

// Platform statistics
export interface PlatformStats {
  totalUsers: bigint;
  verifiedUsers: bigint;
  companyUsers: bigint;
  individualUsers: bigint;
  suspendedUsers: bigint;
}

// Token Metadata from RegulatedERC1155Token
export interface TokenMetadata {
  name: string;
  symbol: string;
  companyName: string;
  currentSupply: bigint;
  maxSupply: bigint;
  initialPrice: bigint;
  creator: `0x${string}`;
  createdAt: bigint;
  isActive: boolean;
}

// Token statistics
export interface TokenStats {
  totalTokens: bigint;
  activeTokens: bigint;
  totalSupplyAll: bigint;
  totalMaxSupplyAll: bigint;
}

// Order from RegulatedMarketplace
export interface Order {
  orderId: bigint;
  trader: `0x${string}`;
  tokenId: bigint;
  amount: bigint;
  price: bigint;
  filledAmount: bigint;
  orderType: 'BUY' | 'SELL';
  status: 'ACTIVE' | 'FILLED' | 'CANCELLED';
  createdAt: bigint;
}

// Raw order from contract (with numeric enums)
export interface RawOrder {
  orderId: bigint;
  trader: `0x${string}`;
  tokenId: bigint;
  amount: bigint;
  price: bigint;
  filledAmount: bigint;
  orderType: 0 | 1; // 0 = BUY, 1 = SELL
  status: 0 | 1 | 2; // 0 = ACTIVE, 1 = FILLED, 2 = CANCELLED
  createdAt: bigint;
}

// Order book structure
export interface OrderBook {
  buyOrders: Order[];
  sellOrders: Order[];
}

// Marketplace statistics
export interface MarketplaceStats {
  totalOrders: bigint;
  activeOrders: bigint;
  totalTrades: bigint;
  totalVolume: bigint;
  totalFeesCollected: bigint;
}

// Raw comprehensive user data tuple from marketplace contract (updated structure)
export type RawComprehensiveUserData = readonly [
  bigint, // ethBalance
  readonly bigint[], // tokenIds
  readonly bigint[], // walletBalances
  readonly bigint[], // marketplaceBalances
  bigint, // activeOrdersCount
  bigint, // totalTradesCount
  bigint  // totalVolumeTraded
]

// Comprehensive user data from marketplace (structured interface)
export interface ComprehensiveUserData {
  ethBalance: bigint;
  tokenIds: readonly bigint[];
  walletBalances: readonly bigint[];
  marketplaceBalances: readonly bigint[];
  activeOrdersCount: bigint;
  totalTradesCount: bigint;
  totalVolumeTraded: bigint;
}

// Market depth data
export interface MarketDepth {
  buyPrices: bigint[];
  buyVolumes: bigint[];
  sellPrices: bigint[];
  sellVolumes: bigint[];
}

// Transaction state for UI feedback
export interface TransactionState {
  hash?: `0x${string}`;
  status: 'idle' | 'pending' | 'success' | 'error';
  error?: string;
  etherscanUrl?: string;
}

// Demo flow state
export interface DemoState {
  currentStep: string;
  completedSteps: string[];
  userRole: 'admin' | 'company' | 'individual';
}

// Network configuration
export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  blockExplorer: string;
}

// Contract addresses type
export interface ContractAddresses {
  REGULATORY_MANAGEMENT: `0x${string}`;
  REGULATED_ERC1155_TOKEN: `0x${string}`;
  REGULATED_MARKETPLACE: `0x${string}`;
}

// Utility type helpers
export type UserType = 'Individual' | 'Company';
export type OrderType = 'BUY' | 'SELL';
export type OrderStatus = 'ACTIVE' | 'FILLED' | 'CANCELLED';

// Helper functions for type conversion
export function convertRawUserProfile(raw: RawUserProfile): UserProfile {
  return {
    ...raw,
    userType: raw.userType === 0 ? 'Individual' : 'Company'
  };
}

export function convertRawOrder(raw: RawOrder): Order {
  return {
    ...raw,
    orderType: raw.orderType === 0 ? 'BUY' : 'SELL',
    status: raw.status === 0 ? 'ACTIVE' : raw.status === 1 ? 'FILLED' : 'CANCELLED'
  };
}

export function convertRawComprehensiveUserData(raw: RawComprehensiveUserData): ComprehensiveUserData {
  const [ethBalance, tokenIds, walletBalances, marketplaceBalances, activeOrdersCount, totalTradesCount, totalVolumeTraded] = raw;
  return {
    ethBalance,
    tokenIds,
    walletBalances,
    marketplaceBalances,
    activeOrdersCount,
    totalTradesCount,
    totalVolumeTraded
  };
}

// Event types for contract events
export interface UserRegisteredEvent {
  userAddress: `0x${string}`;
  ssiIdentifier: string;
  userType: 0 | 1;
  registrationDate: bigint;
}

export interface TokenCreatedEvent {
  tokenId: bigint;
  creator: `0x${string}`;
  name: string;
  symbol: string;
  companyName: string;
  maxSupply: bigint;
  initialPrice: bigint;
  createdAt: bigint;
}

export interface OrderPlacedEvent {
  orderId: bigint;
  trader: `0x${string}`;
  tokenId: bigint;
  amount: bigint;
  price: bigint;
  orderType: 0 | 1;
}

export interface TradeExecutedEvent {
  buyOrderId: bigint;
  sellOrderId: bigint;
  buyer: `0x${string}`;
  seller: `0x${string}`;
  tokenId: bigint;
  amount: bigint;
  price: bigint;
  timestamp: bigint;
}