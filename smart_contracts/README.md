# Blockchain Share Market Smart Contracts

## 🎓 Final Year Project - University Implementation

This repository contains the smart contract implementation for a **regulated blockchain share market system** using **ERC-1155 tokens**. The system provides a comprehensive trading platform with regulatory compliance, KYC verification, and secure marketplace functionality.

## 🏗️ System Architecture

### Core Components

1. **RegulatoryManagement Contract** (`contracts/RegulatoryManagement.sol`)
   - Central authority for user verification and compliance
   - KYC submission and verification workflow
   - Trading limit enforcement
   - Authorized verifier and marketplace management

2. **RegulatedERC1155Token Contract** (`contracts/RegulatedERC1155Token.sol`)
   - Multi-token standard for share certificates
   - Company registration and verification
   - Token creation and minting with regulatory compliance
   - Automated transfer restrictions

3. **RegulatedMarketplace Contract** (`contracts/RegulatedMarketplace.sol`)
   - Secure trading platform with escrow system
   - Fixed-price and auction-style listings
   - ETH-based fee structure
   - Complete trading history tracking

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Git

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd fyp_smart_contract
```

2. Install dependencies:
```bash
npm install
```

3. Compile contracts:
```bash
npm run compile
```

### Running Tests

```bash
npm test
```

### Local Development

1. Start a local Hardhat node:
```bash
npm run node
```

2. Deploy contracts to local network:
```bash
npm run deploy:localhost
```

## 📋 Contract Workflow

### 1. User Registration & SSI Integration

```solidity
// 1. User registers with SSI identifier after external KYC
regulatoryManagement.registerUser(
    "US",
    "did:example:123456789abcdefghi"
);

// 2. Authorized verifier approves user (after external KYC verification)
regulatoryManagement.verifyUser(userAddress);
```

### 2. Company Registration & Token Creation

```solidity
// 1. Company registers
tokenContract.registerCompany(
    "Tech Corp",
    "TC001",
    "Technology",
    "US"
);

// 2. Admin verifies company
tokenContract.verifyCompany(companyAddress);

// 3. Company creates token
tokenContract.createToken(
    "Tech Corp Shares",
    "TCS",
    "Common shares of Tech Corp",
    "Tech Corp",
    "Technology",
    1000000, // max supply
    "https://api.example.com/token/1",
    500, // 5% dividend yield
    ethers.parseEther("0.01"), // $0.01 par value
    "common"
);
```

### 3. Trading Process

```solidity
// 1. Create a listing
marketplace.createFixedPriceListing(
    tokenContractAddress,
    tokenId,
    amount,
    pricePerToken,
    expirationTime
);

// 2. Purchase tokens
marketplace.purchaseTokens(listingId, { value: totalPrice });

// 3. Create auction listing
marketplace.createAuctionListing(
    tokenContractAddress,
    tokenId,
    amount,
    minBidAmount,
    expirationTime
);

// 4. Place bid
marketplace.placeBid(listingId, { value: bidAmount });

// 5. End auction
marketplace.endAuction(listingId);
```

## 🔐 Security Features

### Regulatory Compliance
- **KYC Verification**: All users must complete KYC before trading
- **Trading Limits**: Configurable daily and monthly trading limits
- **Authorized Marketplaces**: Only approved marketplaces can facilitate transfers
- **Audit Trail**: Complete transaction and verification history

### Smart Contract Security
- **ReentrancyGuard**: Protection against reentrancy attacks
- **Pausable**: Emergency stop functionality
- **Access Control**: Role-based permissions
- **Input Validation**: Comprehensive parameter validation

### Escrow System
- **Token Escrow**: Tokens held safely during listings
- **Bid Management**: Secure bid placement and withdrawal
- **Automated Settlement**: Trustless trade execution

## 🏛️ Contract Details

### RegulatoryManagement.sol

**Key Functions:**
- `registerUser()`: Register new users with SSI identifier
- `verifyUser()`: Verify user (authorized verifiers only, post-external KYC)
- `checkTradingLimit()`: Check if user can trade specified amount
- `recordTradingVolume()`: Record trading activity (marketplace only)
- `updateJurisdiction()`: Update user jurisdiction
- `updateTradingLimit()`: Update user trading limits

**Events:**
- `UserRegistered`
- `UserVerified`
- `TradingVolumeRecorded`
- `JurisdictionUpdated`
- `TradingLimitUpdated`

### RegulatedERC1155Token.sol

**Key Functions:**
- `registerCompany()`: Register company information
- `createToken()`: Create new token type
- `mintToken()`: Mint tokens to verified users
- `_update()`: Override with regulatory checks

**Events:**
- `CompanyRegistered`
- `TokenCreated`
- `TokenMinted`

### RegulatedMarketplace.sol

**Key Functions:**
- `createFixedPriceListing()`: Create fixed-price listing
- `createAuctionListing()`: Create auction listing
- `purchaseTokens()`: Buy tokens at fixed price
- `placeBid()`: Place bid on auction
- `endAuction()`: End auction and settle

**Events:**
- `ListingCreated`
- `TokensPurchased`
- `BidPlaced`
- `AuctionEnded`

## 📊 Testing

The test suite covers:
- Contract deployment and initialization
- User registration and KYC workflow
- Token creation and minting
- Marketplace listing and trading
- Regulatory compliance checks
- Security features

Run tests with:
```bash
npm test
```

## 🔧 Configuration

### Network Configuration
Update `hardhat.config.ts` for different networks:

```typescript
networks: {
  localhost: {
    url: "http://127.0.0.1:8545"
  },
  sepolia: {
    url: process.env.SEPOLIA_URL || "",
    accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
  }
}
```

### Environment Variables
Create `.env` file:
```env
ETHERSCAN_API_KEY=your_etherscan_api_key
SEPOLIA_URL=https://sepolia.infura.io/v3/your_infura_key
PRIVATE_KEY=your_private_key
```

## 📁 Project Structure

```
fyp_smart_contract/
├── contracts/
│   ├── RegulatoryManagement.sol
│   ├── RegulatedERC1155Token.sol
│   └── RegulatedMarketplace.sol
├── scripts/
│   └── deploy.ts
├── test/
│   ├── RegulatoryManagement.test.ts
│   └── System.test.ts
├── hardhat.config.ts
├── package.json
└── README.md
```

## 🎯 Key Features

### For Regulators
- **KYC Management**: Streamlined verification process
- **Trading Oversight**: Real-time monitoring and limits
- **Compliance Reports**: Comprehensive audit trails
- **Emergency Controls**: Pause and emergency functions

### For Companies
- **Token Issuance**: Easy share tokenization
- **Investor Management**: Automated compliance checks
- **Trading Analytics**: Complete trading history
- **Dividend Management**: Built-in yield tracking

### For Traders
- **Secure Trading**: Escrow-based transactions
- **Multiple Order Types**: Fixed-price and auction listings
- **Real-time Settlements**: Instant trade execution
- **Transparent Fees**: Clear fee structure

## 🚨 Important Notes

⚠️ **This is a university final year project and should not be used in production without proper security audits.**

### Security Considerations
- All contracts should be audited before mainnet deployment
- Private keys should never be committed to version control
- Use multi-signature wallets for admin functions
- Implement proper access controls for production

### Academic Purpose
This project demonstrates:
- Smart contract development with Solidity
- Regulatory compliance in blockchain systems
- ERC-1155 token implementation
- Marketplace and escrow systems
- Comprehensive testing strategies

## 📚 Additional Resources

- [Solidity Documentation](https://docs.soliditylang.org/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Hardhat Documentation](https://hardhat.org/docs)
- [ERC-1155 Standard](https://eips.ethereum.org/EIPS/eip-1155)

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🎓 Academic Acknowledgment

This project was developed as part of a Final Year Project (FYP) for university studies. It demonstrates the practical application of blockchain technology in financial markets with a focus on regulatory compliance and security.

---

**Note**: This is an academic implementation and should not be used in production environments without proper security audits and legal compliance reviews.
