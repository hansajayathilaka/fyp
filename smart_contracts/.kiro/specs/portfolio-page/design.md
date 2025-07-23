# Design Document

## Overview

The Portfolio page will be a comprehensive dashboard that provides users with a complete view of their digital assets across both their wallet and marketplace deposits. The page will integrate with existing contract hooks to fetch real-time data and provide quick actions for asset management. The design follows the established patterns from the existing marketplace and tokens pages while focusing on clear data presentation and user-friendly asset management.

## Architecture

### Component Structure
```
PortfolioPage (Main Container)
├── PortfolioHeader (Title and summary stats)
├── ETHBalanceSection (Wallet + Marketplace ETH)
├── TokenHoldingsSection (All token balances)
│   ├── TokenHoldingCard (Individual token display)
│   └── QuickTransferModal (Deposit/Withdraw actions)
├── PortfolioSummary (Overall statistics)
└── TransactionFeedback (Real-time transaction status)
```

### Data Flow
1. **Data Fetching**: Use existing contract hooks to fetch user balances and token information
2. **State Management**: Local React state for UI interactions, contract hooks for blockchain data
3. **Real-time Updates**: Event listeners and automatic refetching after transactions
4. **Transaction Handling**: Reuse existing transaction feedback system

### Integration Points
- **Navigation**: Add "Portfolio" link to existing navigation menu
- **Contract Hooks**: Leverage existing `useContracts()` hook and individual contract hooks
- **Transaction System**: Use existing `TransactionFeedback` and `useEnhancedTransactionState`
- **Styling**: Follow existing Tailwind CSS patterns and component styling

## Components and Interfaces

### PortfolioPage Component
**Purpose**: Main container component that orchestrates data fetching and layout
**Props**: None (uses wallet connection from context)
**State**:
- `selectedTokenForTransfer: bigint | null` - Token selected for quick transfer
- `transferModalOpen: boolean` - Modal visibility state
- `refreshTrigger: number` - Force refresh after transactions

### ETHBalanceSection Component
**Purpose**: Display ETH balances from wallet and marketplace with quick actions
**Props**: 
- `walletBalance: bigint` - ETH balance in user's wallet
- `marketplaceBalance: bigint` - ETH balance in marketplace
- `onTransfer: (amount: string, direction: 'deposit' | 'withdraw') => void`

**Features**:
- Combined total ETH display
- Separate wallet vs marketplace breakdown
- Quick deposit/withdraw actions
- Visual indicators for balance distribution

### TokenHoldingsSection Component
**Purpose**: Display all token holdings with detailed information
**Props**:
- `tokenHoldings: TokenHolding[]` - Array of user's token holdings
- `onQuickTransfer: (tokenId: bigint) => void`

**Data Structure**:
```typescript
interface TokenHolding {
  tokenId: bigint;
  tokenInfo: TokenMetadata;
  walletBalance: bigint;
  marketplaceBalance: bigint;
  totalBalance: bigint;
}
```

### TokenHoldingCard Component
**Purpose**: Individual token display with balance breakdown and actions
**Props**:
- `holding: TokenHolding`
- `onTransfer: () => void`

**Features**:
- Token metadata display (name, symbol, company)
- Balance breakdown (wallet vs marketplace)
- Quick transfer button
- Visual balance indicators
- Token status and pricing information

### QuickTransferModal Component
**Purpose**: Modal for quick token transfers between wallet and marketplace
**Props**:
- `isOpen: boolean`
- `tokenId: bigint | null`
- `tokenInfo: TokenMetadata | null`
- `walletBalance: bigint`
- `marketplaceBalance: bigint`
- `onClose: () => void`
- `onTransfer: (direction: 'deposit' | 'withdraw', amount: string) => void`

### PortfolioSummary Component
**Purpose**: Display portfolio statistics and insights
**Props**:
- `totalTokenTypes: number`
- `totalPortfolioValue: bigint`
- `walletValue: bigint`
- `marketplaceValue: bigint`

## Data Models

### Portfolio Data Structure
```typescript
interface PortfolioData {
  ethBalances: {
    wallet: bigint;
    marketplace: bigint;
    total: bigint;
  };
  tokenHoldings: TokenHolding[];
  summary: {
    totalTokenTypes: number;
    totalEstimatedValue: bigint;
    walletValue: bigint;
    marketplaceValue: bigint;
  };
}
```

### Data Fetching Strategy
1. **ETH Balances**: 
   - Wallet: Use wagmi's `useBalance` hook
   - Marketplace: Use `marketplace.useEthBalance(address)`

2. **Token Holdings**:
   - Get all active tokens: `token.useGetAllTokens()`
   - For each token, check user balance: `token.useBalanceOf(address, tokenId)`
   - Get marketplace balances from: `marketplace.useGetComprehensiveUserData(address)`
   - Filter out zero balances

3. **Token Metadata**:
   - Use `token.useGetTokenInfo(tokenId)` for each held token
   - Cache results to avoid redundant calls

## Error Handling

### Error States
1. **Wallet Not Connected**: Show connection prompt
2. **Network Issues**: Display retry options with error messages
3. **Contract Call Failures**: Show specific error messages
4. **Transaction Failures**: Use existing transaction feedback system

### Loading States
1. **Initial Load**: Skeleton components for all sections
2. **Balance Updates**: Shimmer effects on specific balance displays
3. **Transaction Processing**: Existing transaction feedback system
4. **Partial Data**: Show available data while loading remaining

### Retry Mechanisms
- Automatic retry for failed contract calls
- Manual refresh button for user-initiated retries
- Real-time updates after successful transactions

## Testing Strategy

### Unit Tests
1. **Component Rendering**: Test all components render correctly with mock data
2. **Data Transformation**: Test portfolio data aggregation logic
3. **Balance Calculations**: Test ETH and token balance calculations
4. **Error Handling**: Test error states and fallbacks

### Integration Tests
1. **Contract Integration**: Test contract hook integration
2. **Transaction Flow**: Test deposit/withdraw functionality
3. **Real-time Updates**: Test balance updates after transactions
4. **Navigation Integration**: Test portfolio page navigation

### User Acceptance Tests
1. **Portfolio Overview**: User can see complete asset overview
2. **Balance Management**: User can transfer assets between wallet and marketplace
3. **Real-time Updates**: Balances update after transactions
4. **Error Recovery**: User can recover from errors and retry actions

### Test Data Requirements
- Mock wallet with ETH balance
- Mock tokens with various balances
- Mock marketplace deposits
- Mock transaction states (pending, success, error)

## Implementation Notes

### Performance Considerations
1. **Data Caching**: Cache token metadata to reduce contract calls
2. **Lazy Loading**: Load token details only when needed
3. **Debounced Updates**: Debounce balance refreshes to avoid excessive calls
4. **Memoization**: Memoize expensive calculations

### Accessibility
1. **Screen Reader Support**: Proper ARIA labels for balance information
2. **Keyboard Navigation**: Full keyboard support for all interactions
3. **Color Contrast**: Ensure sufficient contrast for all text and indicators
4. **Focus Management**: Proper focus handling in modals and forms

### Mobile Responsiveness
1. **Responsive Grid**: Adapt layout for mobile screens
2. **Touch Targets**: Ensure buttons are appropriately sized for touch
3. **Horizontal Scrolling**: Handle token lists on narrow screens
4. **Modal Optimization**: Optimize modals for mobile interaction

### Security Considerations
1. **Input Validation**: Validate all transfer amounts
2. **Balance Checks**: Verify sufficient balances before transactions
3. **Transaction Confirmation**: Clear confirmation for all transfers
4. **Error Disclosure**: Avoid exposing sensitive error details