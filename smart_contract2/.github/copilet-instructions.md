# Blockchain Share Market Smart Contracts - GitHub Copilot Instructions

## Project Overview
This is a Hardhat-based smart contract project for a **blockchain share market** using **ERC-1155 tokens**. The system implements a regulated trading platform where only authorized and verified users can participate in token trading activities.

**Current Status**: Needs development of smart contracts with a focus on regulatory compliance, user verification, and secure trading mechanisms.

## Core Concepts & Architecture

### 1. **Regulatory-First Design**
- **All trading activities require regulatory compliance verification**
- Users must complete KYC (Know Your Customer) process through a separate SSI (Self-Sovereign Identity) platform
- After user authentication via SSI app using admin credentials, users can register to the share market platform
- The regulatory management contract stores only essential trading data and address information (no personal data)
- All personal data and KYC verification is handled externally by the SSI system


### 2. **Three-Contract Architecture**

#### **RegulatoryManagement Contract** (`contracts/RegulatoryManagement.sol`)
- **Primary Purpose**: Central authority for user verification and compliance (without storing personal data)
- **Key Features**:
  - User registration with SSI (Self-Sovereign Identity) integration
  - Trading permission management (post-KYC verification)
  - Real-time trading limit enforcement (daily/monthly)
  - Authorized verifier management
  - Marketplace authorization system

#### **RegulatedERC1155Token Contract** (`contracts/ERC1155Token.sol`)
- **Primary Purpose**: Multi-token standard for share certificates
- **Key Features**:
  - Dynamic token creation with metadata
  - Regulatory-compliant transfers (all transfers verified)
  - Supply management and minting controls
  - Token ownership tracking
  - Integration with regulatory management for transfer authorization
  - **Token Unit Handling**: Uses simple whole numbers (like traditional shares)

#### **RegulatedMarketplace Contract** (`contracts/Marketplace.sol`)
- **Primary Purpose**: Exchange-style trading platform for token trading
- **Key Features**:
  - **Order Book Design**: Separate buy and sell order books like Binance
  - **Automatic Matching**: Buy and sell orders automatically match when conditions align
  - **Decoupled Orders**: Users can place buy orders without existing sell orders
  - **Escrow System**: Tokens held in escrow only during active sell orders
  - **Partial Fulfillment**: Orders can be partially filled based on available matches
  - **Ownership Transfer**: Seller's token ownership transfers only when buy/sell orders match
  - ERC1155Receiver implementation for token handling
  - ETH-only fee structure (2.5% default)
  - Regulatory compliance integration
  - Emergency controls and pause functionality
  - **Complete Balance Tracking**: Full transparency of all funds

### 3. **Core Workflow**
```
1. User Authentication via SSI → User Registration with SSI Identifier → External KYC Verification
2. Admin Verification in Smart Contract → Trading Permission Assignment
3. Company Registration → Token Creation → Token Minting → Marketplace Orders
4. Trader Registration → Browse Order Books → Place Buy/Sell Orders → Automatic Matching → Settlement
5. Admin Oversight → User Management → Compliance Monitoring → System Controls
```

## Technical Implementation Guidelines

### Smart Contract Development
- **Language**: Solidity ^0.8.28
- **Framework**: Hardhat with TypeScript support
- **Standards**: OpenZeppelin contracts for security and standards compliance
- **Testing**: Comprehensive test suite covering all user flows
- **Security**: ReentrancyGuard, Pausable, and custom access controls
- **Token Units**: Simple whole numbers (e.g., 1000 tokens = 1000, not wei units)
- **ERC1155 Compliance**: Full IERC1155Receiver implementation for proper token handling

### Key Security Patterns
1. **Verification-First**: All critical functions require user verification
2. **Authorized Marketplaces**: Only approved marketplaces can facilitate transfers
3. **Multi-Signature Controls**: Critical admin functions require proper authorization
4. **Emergency Stops**: Pausable contracts for emergency situations
5. **Input Validation**: Comprehensive parameter validation and error handling
6. **Escrow Safety**: Tokens held securely in marketplace during sell listings only
7. **ERC1155Receiver**: Proper interface implementation for token transfers

### Order Book Implementation
- **Dual Order Books**: Separate structures for buy and sell orders
- **Order Matching Engine**: Automated system to match compatible buy/sell orders
- **Price-Time Priority**: Orders matched based on price and timestamp
- **Partial Fulfillment Logic**: Support for partial order execution
- **Order Management**: Create, cancel, and update order functionality
- **Balance Management**: Track ETH balances for buyers and token balances for sellers
- **Event Emission**: Comprehensive events for UI updates on order status

### Regulatory Compliance Features
- **External KYC Process**: KYC handled by separate SSI platform (no personal data stored on-chain)
- **SSI Integration**: Self-Sovereign Identity system for user authentication
- **Trading Limits**: Configurable daily and monthly trading limits
- **Audit Trail**: Complete transaction and verification history
- **Jurisdiction Support**: Multi-jurisdiction compliance framework
- **Privacy-First**: Only essential trading data stored on-chain
