# Design Document

## Overview

The Next.js demo UI will be a simple, clean frontend application designed specifically for university demonstrations of the blockchain share market system. The application will focus on the happy path scenarios with minimal error handling, prioritizing clear demonstration flow over production-ready features. Each transaction will provide immediate Etherscan links for transparency during presentations.

The UI will integrate with the existing smart contracts (RegulatoryManagement, RegulatedERC1155Token, and RegulatedMarketplace) deployed on the local Hardhat network, with easy configuration for other networks.

## Architecture

### Technology Stack
- **Frontend Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS for rapid UI development
- **Blockchain Integration**: ethers.js v6 for contract interactions
- **Wallet Connection**: wagmi + ConnectKit for wallet integration
- **State Management**: React Context for simple state management
- **TypeScript**: Full TypeScript support for type safety

### Project Structure
```
nextjs-demo-ui/
├── src/
│   ├── app/
│   │   ├── page.tsx                 # Landing page
│   │   ├── regulatory/
│   │   │   └── page.tsx            # Regulatory management
│   │   ├── tokens/
│   │   │   └── page.tsx            # Token management
│   │   ├── marketplace/
│   │   │   └── page.tsx            # Marketplace interface
│   │   └── layout.tsx              # Root layout
│   ├── components/
│   │   ├── Navigation.tsx          # Navigation component
│   │   ├── WalletConnect.tsx       # Wallet connection
│   │   ├── TransactionStatus.tsx   # Transaction feedback
│   │   └── EtherscanLink.tsx       # Etherscan link component
│   ├── contracts/
│   │   ├── addresses.ts            # Contract addresses
│   │   ├── abis.ts                 # Contract ABIs
│   │   └── hooks.ts                # Contract interaction hooks
│   ├── lib/
│   │   ├── wagmi.ts               # Wagmi configuration
│   │   └── utils.ts               # Utility functions
│   └── types/
│       └── contracts.ts           # Contract type definitions
├── public/
└── package.json
```

## Components and Interfaces

### Core Components

#### 1. Navigation Component
- Simple navigation bar with links to all demo sections
- Wallet connection status display
- Current network indicator
- Clean, university-presentation friendly design

#### 2. WalletConnect Component
- MetaMask connection button
- Display connected address
- Network switching functionality
- Connection status indicator

#### 3. TransactionStatus Component
- Real-time transaction status updates
- Etherscan link generation and display
- Loading states for pending transactions
- Success/failure feedback with blockchain verification links

#### 4. EtherscanLink Component
- Reusable component for generating Etherscan links
- Support for transaction hashes, addresses, and blocks
- Automatic network detection for correct explorer URL
- Opens in new tab for seamless demo flow

### Page Components

#### 1. Landing Page (`/`)
- Project overview and explanation
- Navigation to different demo sections
- System status indicators
- Clear call-to-action buttons for demo flow

#### 2. Regulatory Management Page (`/regulatory`)
- User registration interface
- User verification controls (admin functions)
- Platform statistics display
- User management interface

#### 3. Token Management Page (`/tokens`)
- Token creation form for companies
- Token listing and details view
- Token minting interface
- Token statistics and information

#### 4. Marketplace Page (`/marketplace`)
- Available tokens for trading
- Buy/sell order placement
- Order book visualization
- Balance management (deposit/withdraw)
- Trading history

## Data Models

### Contract Integration Types

```typescript
// User Profile from RegulatoryManagement
interface UserProfile {
  userAddress: string;
  ssiIdentifier: string;
  userType: 'Individual' | 'Company';
  isVerified: boolean;
  canTrade: boolean;
  canCreateTokens: boolean;
  isSuspended: boolean;
  registrationDate: bigint;
}

// Token Metadata from RegulatedERC1155Token
interface TokenMetadata {
  name: string;
  symbol: string;
  companyName: string;
  currentSupply: bigint;
  maxSupply: bigint;
  initialPrice: bigint;
  creator: string;
  createdAt: bigint;
  isActive: boolean;
}

// Order from RegulatedMarketplace
interface Order {
  orderId: bigint;
  trader: string;
  tokenId: bigint;
  amount: bigint;
  price: bigint;
  filledAmount: bigint;
  orderType: 'BUY' | 'SELL';
  status: 'ACTIVE' | 'FILLED' | 'CANCELLED';
  createdAt: bigint;
}
```

### UI State Models

```typescript
// Transaction state for UI feedback
interface TransactionState {
  hash?: string;
  status: 'idle' | 'pending' | 'success' | 'error';
  error?: string;
  etherscanUrl?: string;
}

// Demo flow state
interface DemoState {
  currentStep: string;
  completedSteps: string[];
  userRole: 'admin' | 'company' | 'individual';
}
```

## Error Handling

Since this is a demo-focused application, error handling will be minimal but sufficient for presentation purposes:

### Transaction Errors
- Simple error messages for failed transactions
- Retry buttons for common failures
- Clear indication when transactions are rejected

### Network Errors
- Basic network connectivity checks
- Wrong network warnings with switch prompts
- Contract not found errors

### User Experience Errors
- Form validation for required fields
- Balance insufficient warnings
- Permission-based feature disabling

## Testing Strategy

### Manual Testing Focus
Given the demo nature, testing will focus on manual verification:

1. **Happy Path Testing**
   - Complete user registration flow
   - Token creation and minting
   - Marketplace trading scenarios
   - Transaction confirmation and Etherscan verification

2. **Demo Scenario Testing**
   - University presentation flow
   - Multiple user role demonstrations
   - Real-time transaction tracking

3. **Integration Testing**
   - Contract interaction verification
   - Wallet connection stability
   - Network switching functionality

### Automated Testing (Minimal)
- Component rendering tests
- Contract address and ABI validation
- Basic utility function tests

## Network Configuration

### Supported Networks
1. **Local Hardhat Network** (Primary for demo)
   - Chain ID: 31337
   - RPC: http://localhost:8545
   - Explorer: Local block explorer or custom transaction viewer

2. **Hedera Testnet** (Secondary)
   - Chain ID: 296
   - RPC: https://testnet.hashio.io/api
   - Explorer: HashScan testnet

### Contract Addresses
Contract addresses will be loaded from the deployment-info.json file, allowing easy switching between networks without code changes.

## User Experience Flow

### Demo Presentation Flow
1. **Introduction** (Landing Page)
   - Explain the blockchain share market concept
   - Show system overview
   - Connect wallet for demonstration

2. **Regulatory Setup** (Regulatory Page)
   - Register users (individual and company)
   - Verify users (admin function)
   - Show compliance features

3. **Token Creation** (Tokens Page)
   - Create company share tokens
   - Mint initial token supply
   - Display token information

4. **Trading Demonstration** (Marketplace Page)
   - Deposit funds and tokens
   - Place buy and sell orders
   - Execute trades
   - Show transaction confirmations

### Transaction Feedback
Every blockchain interaction will provide:
- Immediate transaction hash display
- Etherscan link for verification
- Real-time status updates
- Clear success/failure indicators

## Security Considerations

### Demo-Specific Security
- No sensitive data storage
- Read-only contract interactions where possible
- Clear warnings for testnet usage
- No production keys or mainnet interactions

### Basic Security Measures
- Input validation for forms
- Safe contract interaction patterns
- Proper error boundary implementation
- Secure wallet connection handling

## Performance Considerations

### Optimization for Demo
- Fast loading times for smooth presentations
- Minimal bundle size
- Efficient contract calls
- Responsive design for various screen sizes

### Caching Strategy
- Contract data caching for repeated reads
- Transaction status caching
- User profile caching
- Token metadata caching

## Deployment Strategy

### Development Deployment
- Local development server for testing
- Hot reload for rapid iteration
- Easy contract address switching

### Demo Deployment
- Static export for easy hosting
- Vercel deployment for live demos
- Environment-based configuration
- Simple deployment process for university presentations