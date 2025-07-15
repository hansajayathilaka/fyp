# Comprehensive Blockchain Share Market System Demo

## Overview
This document outlines ALL available workflows and features in the Blockchain Share Market System, demonstrating the complete functionality of the three-contract architecture.

## System Architecture

### Contracts
1. **RegulatoryManagement** - User registration, verification, and compliance
2. **RegulatedERC1155Token** - Token creation, minting, and transfers
3. **RegulatedMarketplace** - Trading, listings, and marketplace operations

### Key Features
- **SSI Integration** (Self-Sovereign Identity)
- **External KYC** verification
- **Regulatory compliance** checks
- **Multi-token support** (ERC1155)
- **Secure marketplace** with escrow
- **Trading limits** enforcement
- **Jurisdiction tracking**
- **Admin controls** and emergency functions

## Available Workflows

### 1. USER REGISTRATION & VERIFICATION WORKFLOW

#### 1.1 User Registration (Post-SSI Authentication)
```typescript
// Users register after completing SSI authentication
await regulatoryManagement.connect(user).registerUser(
  "individual", // userType: "individual" | "company"
  "low",        // riskLevel: "low" | "medium" | "high"
  "US",         // jurisdiction: "US" | "CA" | "UK" | etc.
  ssiIdentifier // bytes32: SSI platform identifier
);
```

#### 1.2 Admin Verification (Post-External KYC)
```typescript
// Admin verifies users after external KYC completion
await regulatoryManagement.connect(admin).verifyUser(userAddress);
```

#### 1.3 User Status Management
```typescript
// Check user profile
const profile = await regulatoryManagement.getUserProfile(userAddress);
const ssiId = await regulatoryManagement.getUserSSIIdentifier(userAddress);
const jurisdiction = await regulatoryManagement.getUserJurisdiction(userAddress);

// Admin can revoke/grant trading permissions
await regulatoryManagement.connect(admin).revokeTradingPermission(userAddress);
await regulatoryManagement.connect(admin).grantTradingPermission(userAddress);
```

### 2. COMPANY MANAGEMENT & TOKEN CREATION WORKFLOW

#### 2.1 Company Registration for Token Creation
```typescript
// Companies register for token creation capabilities
await tokenContract.connect(company).registerCompany(
  "TechCorp Inc",     // companyName
  "TC-2025-001",      // registrationNumber
  "Technology",       // industry
  "US"               // jurisdiction
);
```

#### 2.2 Company Verification
```typescript
// Admin verifies company for token creation
await tokenContract.connect(admin).verifyCompany(companyAddress);
```

#### 2.3 Token Creation
```typescript
// Company creates new token type
await tokenContract.connect(company).createToken(
  "TechCorp Shares",              // name
  "TECH",                         // symbol
  "Digital share certificate",    // description
  "TechCorp Inc",                // companyName
  "Technology",                   // industry
  1000000,                        // maxSupply
  "https://api.example.com/tech", // metadataURI
  500,                           // dividendYield (basis points)
  100,                           // parValue (cents)
  "Common"                       // stockClass
);
```

#### 2.4 Token Minting
```typescript
// Company mints tokens to verified addresses
await tokenContract.connect(company).mintToken(
  tokenId,        // token ID
  recipientAddress, // verified user address
  amount          // number of tokens
);
```

### 3. MARKETPLACE OPERATIONS WORKFLOW

#### 3.1 Marketplace Approvals
```typescript
// Token holders approve marketplace for trading
await tokenContract.connect(user).setApprovalForAll(marketplaceAddress, true);
```

#### 3.2 Create Fixed-Price Listings
```typescript
// Create fixed-price listing
await marketplace.connect(seller).createFixedPriceListing(
  tokenAddress,    // token contract address
  tokenId,         // token ID
  amount,          // number of tokens
  pricePerToken,   // price per token in wei
  expirationTime   // expiration timestamp
);
```

#### 3.3 Purchase Tokens
```typescript
// Purchase entire listing
await marketplace.connect(buyer).purchaseTokens(
  listingId,
  { value: totalPrice }
);
```

#### 3.4 Listing Management
```typescript
// Cancel listing
await marketplace.connect(seller).cancelListing(listingId);
```

### 4. TRADING LIMITS & COMPLIANCE WORKFLOW

#### 4.1 Trading Limit Checks
```typescript
// Check if user can trade specified amount
const canTrade = await regulatoryManagement.checkTradingLimit(
  userAddress,
  tradingAmount
);
```

#### 4.2 Update Trading Limits
```typescript
// Admin updates user trading limits
await regulatoryManagement.connect(admin).updateTradingLimits(
  userAddress,
  dailyLimit,   // daily limit in wei
  monthlyLimit  // monthly limit in wei
);
```

#### 4.3 Trading Volume Tracking
```typescript
// Check current trading volume
const profile = await regulatoryManagement.getUserProfile(userAddress);
const currentVolume = profile.currentTradingVolume;
```

### 5. ADMINISTRATIVE FUNCTIONS WORKFLOW

#### 5.1 Verifier Management
```typescript
// Authorize new verifier
await regulatoryManagement.connect(owner).authorizeVerifier(verifierAddress);

// Revoke verifier
await regulatoryManagement.connect(owner).revokeVerifier(verifierAddress);
```

#### 5.2 Marketplace Management
```typescript
// Pause marketplace
await marketplace.connect(admin).pause();

// Unpause marketplace
await marketplace.connect(admin).unpause();
```

#### 5.3 Fee Management
```typescript
// Update trading fees
await marketplace.connect(admin).updateTradingFee(newFeePercentage);

// Update fee recipient
await marketplace.connect(admin).updateFeeRecipient(newRecipientAddress);
```

### 6. JURISDICTION & COMPLIANCE WORKFLOW

#### 6.1 Jurisdiction Updates
```typescript
// Update user jurisdiction
await regulatoryManagement.connect(admin).updateJurisdiction(
  userAddress,
  newJurisdiction
);
```

#### 6.2 Compliance Checks
```typescript
// All transfers automatically check:
// - User verification status
// - Trading limits
// - Jurisdiction compliance
// - Market authorization
```

### 7. TOKEN MANAGEMENT WORKFLOW

#### 7.1 Token Information
```typescript
// Get token information
const tokenInfo = await tokenContract.getTokenInfo(tokenId);
const companyInfo = await tokenContract.getCompanyInfo(companyAddress);
```

#### 7.2 Balance Checks
```typescript
// Check token balance
const balance = await tokenContract.balanceOf(userAddress, tokenId);
```

#### 7.3 Transfer Restrictions
```typescript
// All transfers go through regulatory checks
// Direct transfers are restricted to verified users
// Marketplace transfers use escrow system
```

### 8. EMERGENCY & RECOVERY WORKFLOW

#### 8.1 Emergency Controls
```typescript
// Pause all contracts
await regulatoryManagement.connect(admin).pause();
await tokenContract.connect(admin).pause();
await marketplace.connect(admin).pause();
```

#### 8.2 Recovery Functions
```typescript
// Unpause contracts
await regulatoryManagement.connect(admin).unpause();
await tokenContract.connect(admin).unpause();
await marketplace.connect(admin).unpause();
```

## Security Features

### Access Control
- **Role-based permissions** (Owner, Admin, Verifier)
- **Multi-signature requirements** for critical functions
- **Authorized marketplace** system
- **Verified user** requirements

### Safety Mechanisms
- **ReentrancyGuard** on all state-changing functions
- **Pausable** contracts for emergency stops
- **Input validation** on all parameters
- **Overflow protection** with SafeMath patterns

### Compliance Features
- **KYC verification** requirements
- **Trading limit** enforcement
- **Jurisdiction tracking**
- **Audit trail** for all transactions

## Available Events

### RegulatoryManagement Events
- `UserRegistered(address indexed user, string userType, string riskLevel, string jurisdiction, bytes32 ssiIdentifier)`
- `UserVerified(address indexed user, address indexed verifier)`
- `TradingVolumeRecorded(address indexed user, uint256 amount, uint256 timestamp)`
- `JurisdictionUpdated(address indexed user, string newJurisdiction)`
- `TradingLimitUpdated(address indexed user, uint256 dailyLimit, uint256 monthlyLimit)`
- `TradingPermissionRevoked(address indexed user)`
- `TradingPermissionGranted(address indexed user)`
- `VerifierAuthorized(address indexed verifier)`
- `VerifierRevoked(address indexed verifier)`

### RegulatedERC1155Token Events
- `CompanyRegistered(address indexed company, string name, string registrationNumber)`
- `CompanyVerified(address indexed company, address indexed verifier)`
- `TokenCreated(uint256 indexed tokenId, address indexed company, string name, string symbol)`
- `TokenMinted(uint256 indexed tokenId, address indexed to, uint256 amount)`
- `TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)`
- `TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values)`

### RegulatedMarketplace Events
- `ListingCreated(uint256 indexed listingId, address indexed seller, address indexed tokenContract, uint256 tokenId)`
- `ListingCancelled(uint256 indexed listingId, address indexed seller)`
- `TokensPurchased(uint256 indexed listingId, address indexed buyer, address indexed seller, uint256 amount)`
- `TradingFeeUpdated(uint256 oldFee, uint256 newFee)`
- `FeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient)`

## Usage Examples

### Complete Trading Flow
```typescript
// 1. User Registration
await regulatoryManagement.connect(user).registerUser("individual", "low", "US", ssiId);
await regulatoryManagement.connect(admin).verifyUser(user.address);

// 2. Company Setup
await tokenContract.connect(company).registerCompany("TechCorp", "TC-001", "Tech", "US");
await tokenContract.connect(admin).verifyCompany(company.address);

// 3. Token Creation
await tokenContract.connect(company).createToken(...tokenParams);
await tokenContract.connect(company).mintToken(tokenId, company.address, 1000);

// 4. Marketplace Trading
await tokenContract.connect(company).setApprovalForAll(marketplace.address, true);
await marketplace.connect(company).createFixedPriceListing(...listingParams);
await marketplace.connect(user).purchaseTokens(listingId, { value: price });
```

### Compliance Workflow
```typescript
// Check before trading
const canTrade = await regulatoryManagement.checkTradingLimit(user.address, amount);
const isVerified = await regulatoryManagement.isVerifiedUser(user.address);

// Update limits
await regulatoryManagement.connect(admin).updateTradingLimits(user.address, daily, monthly);

// Monitor volume
const profile = await regulatoryManagement.getUserProfile(user.address);
```

## Error Handling

### Common Errors
- `"User not verified"` - User must complete KYC verification
- `"Trading limit exceeded"` - Transaction exceeds daily/monthly limits
- `"Insufficient payment"` - Payment amount too low for purchase
- `"Token not found"` - Token ID doesn't exist
- `"Listing not active"` - Listing expired or already sold
- `"Unauthorized"` - Caller lacks required permissions

### Best Practices
1. Always check user verification status before trading
2. Verify trading limits before large transactions
3. Use try-catch blocks for all contract calls
4. Check contract pause status before operations
5. Validate all input parameters before submission

## Testing

### Unit Tests
- All workflows have comprehensive test coverage
- Security scenarios are tested
- Error conditions are validated
- Integration tests verify cross-contract functionality

### Demo Scripts
- `npm run demo` - Basic workflow demonstration
- `npm run demo:comprehensive` - All workflows demonstration
- `npm run test` - Run full test suite

## Deployment

### Local Development
```bash
npm run node          # Start local Hardhat node
npm run deploy:localhost  # Deploy to local node
npm run demo          # Run basic demo
```

### Production Deployment
```bash
npm run deploy        # Deploy to configured network
npm run verify        # Verify contracts on block explorer
```

This comprehensive guide covers all available workflows and features in the Blockchain Share Market System. Each workflow is designed to be regulatory-compliant, secure, and user-friendly while maintaining the highest standards of blockchain development.
