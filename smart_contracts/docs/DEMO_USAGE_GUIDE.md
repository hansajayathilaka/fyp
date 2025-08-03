# Blockchain Share Market - Demo & Usage Guide

This guide provides comprehensive instructions for deploying, testing, and demonstrating the Blockchain Share Market system.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Deployment Guide](#deployment-guide)
3. [Demo Script Usage](#demo-script-usage)
4. [Manual Testing](#manual-testing)
5. [Utility Functions](#utility-functions)
6. [Troubleshooting](#troubleshooting)

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Git

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd blockchain-share-market

# Install dependencies
npm install

# Compile contracts
npm run compile
```

### Deploy and Run Demo

```bash
# Deploy contracts locally
npm run deploy:local

# Run the demo
npx hardhat run scripts/demo.ts --network hardhat
```

## Deployment Guide

### Local Deployment (Hardhat Network)

```bash
# Start local Hardhat node (optional - for persistent testing)
npm run node

# Deploy to local network
npm run deploy:local
```

### Fantom Sonic Testnet Deployment

1. **Setup Environment Variables**

Create a `.env` file in the project root:

```env
PRIVATE_KEY=your_private_key_here
```

2. **Deploy to Fantom Sonic Testnet**

```bash
npm run deploy:fantom
```

### Deployment Output

After successful deployment, you'll find:

- **deployment-info.json**: Contains all contract addresses and deployment details
- **Console output**: Shows deployment progress and contract addresses
- **Artifacts**: Compiled contract artifacts in `artifacts/` directory

### Deployment Verification

The deployment script automatically:

- ✅ Verifies contract deployment
- ✅ Checks contract initialization
- ✅ Validates contract linking
- ✅ Tests basic contract functions
- ✅ Saves deployment information

## Demo Script Usage

### Running the Full Demo

```bash
# Make sure contracts are deployed first
npm run deploy:local

# Run the complete demo
npx hardhat run scripts/demo.ts --network hardhat
```

### Demo Scenarios Covered

The demo script demonstrates:

1. **User Registration**
   - Company user registration with SSI
   - Individual user registration with SSI
   - User profile creation and validation

2. **User Verification**
   - Admin verification of users
   - Permission assignment (trading, token creation)
   - Status checking

3. **Token Creation**
   - Company users creating ERC-1155 tokens
   - Token metadata setup
   - Supply limit configuration

4. **Token Minting**
   - Minting tokens to company addresses
   - Supply tracking and validation
   - Balance verification

5. **Marketplace Operations**
   - ETH deposits and withdrawals
   - Token deposits and withdrawals
   - Balance management

6. **Trading System**
   - Buy order placement
   - Sell order placement
   - Automatic order matching
   - Trade execution

7. **Order Management**
   - Order book queries
   - Order cancellation
   - Order status tracking

8. **Compliance Features**
   - User suspension/unsuspension
   - Permission enforcement
   - Compliance monitoring

### Demo Output

The demo provides detailed console output showing:

- 📝 User registration process
- ✅ Verification confirmations
- 🪙 Token creation details
- 💰 Balance updates
- 📈 Trading activities
- 🛡️ Compliance actions

## Manual Testing

### Using Hardhat Console

```bash
# Start Hardhat console
npx hardhat console --network hardhat

# Load deployment info
const fs = require('fs');
const deploymentInfo = JSON.parse(fs.readFileSync('deployment-info.json', 'utf8'));

# Get contract instances
const RegulatoryManagement = await ethers.getContractFactory("RegulatoryManagement");
const rm = RegulatoryManagement.attach(deploymentInfo.regulatoryManagement);

# Test basic functions
const [admin, user1] = await ethers.getSigners();
await rm.connect(user1).registerUser("ssi:test:123", 0);
await rm.connect(admin).verifyUser(user1.address);
```

### Manual Test Scenarios

#### 1. User Registration Test

```javascript
// Register a company user
await regulatoryManagement.connect(companyUser).registerUser(
  "ssi:company:unique-id",
  1 // Company type
);

// Register an individual user
await regulatoryManagement.connect(individualUser).registerUser(
  "ssi:individual:unique-id",
  0 // Individual type
);
```

#### 2. Token Creation Test

```javascript
// Company creates a token
await regulatedERC1155Token.connect(companyUser).createToken(
  "Company Shares",
  "COMP",
  "My Company Ltd",
  ethers.parseUnits("1000000", 0), // 1M max supply
  ethers.parseEther("0.01") // 0.01 ETH initial price
);
```

#### 3. Trading Test

```javascript
// Deposit ETH
await regulatedMarketplace.connect(trader).depositETH({
  value: ethers.parseEther("1.0")
});

// Place buy order
await regulatedMarketplace.connect(trader).placeBuyOrder(
  1, // Token ID
  ethers.parseUnits("100", 0), // Amount
  ethers.parseEther("0.015") // Price per token
);
```

## Utility Functions

### Available Utility Functions

The demo script exports several utility functions for testing:

```javascript
import { 
  createSampleData, 
  getContractInstances, 
  resetTestEnvironment 
} from './scripts/demo.ts';

// Create sample test data
const sampleData = await createSampleData();

// Get contract instances from deployment info
const contracts = await getContractInstances(deploymentInfo);

// Reset test environment
await resetTestEnvironment();
```

### Custom Test Helpers

```javascript
// Helper to register and verify a user
async function registerAndVerifyUser(contracts, admin, user, ssiId, userType) {
  await contracts.regulatoryManagement.connect(user).registerUser(ssiId, userType);
  await contracts.regulatoryManagement.connect(admin).verifyUser(user.address);
}

// Helper to create and mint tokens
async function createAndMintToken(contracts, company, tokenData, mintAmount) {
  const tx = await contracts.regulatedERC1155Token.connect(company).createToken(
    tokenData.name,
    tokenData.symbol,
    tokenData.companyName,
    tokenData.maxSupply,
    tokenData.initialPrice
  );
  const receipt = await tx.wait();
  
  // Extract token ID from events
  const tokenId = 1; // Simplified - in practice, extract from events
  
  await contracts.regulatedERC1155Token.connect(company).mintToken(
    company.address,
    tokenId,
    mintAmount
  );
  
  return tokenId;
}
```

## Testing with Different Networks

### Local Testing

```bash
# Use Hardhat network (default)
npx hardhat run scripts/demo.ts --network hardhat
```

### Testnet Testing

```bash
# Deploy to Fantom Sonic testnet first
npm run deploy:fantom

# Run demo on testnet
npx hardhat run scripts/demo.ts --network fantomSonic
```

## Troubleshooting

### Common Issues

#### 1. "Could not load deployment info"

**Solution**: Make sure to run deployment first:
```bash
npm run deploy:local
```

#### 2. "Insufficient balance" Error

**Solution**: Ensure the deployer account has enough ETH:
- Local network: Should have 10,000 ETH by default
- Testnet: Fund your account with testnet tokens

#### 3. "User not verified for trading"

**Solution**: Make sure users are verified before trading:
```javascript
await regulatoryManagement.connect(admin).verifyUser(userAddress);
```

#### 4. Contract Connection Issues

**Solution**: Verify deployment info and network configuration:
```bash
# Check deployment info
cat deployment-info.json

# Verify network in hardhat.config.ts
```

### Debug Mode

Enable detailed logging by modifying the demo script:

```javascript
// Add at the top of demo.ts
const DEBUG = true;

// Use throughout the script
if (DEBUG) {
  console.log("Debug info:", someVariable);
}
```

### Gas Issues

If you encounter gas-related errors:

1. **Increase gas limit** in hardhat.config.ts:
```javascript
networks: {
  fantomSonic: {
    gas: 500000, // Increase from 300000
    gasPrice: 10000000000,
  }
}
```

2. **Check gas estimation**:
```javascript
const gasEstimate = await contract.estimateGas.functionName(...args);
console.log("Estimated gas:", gasEstimate.toString());
```

## Advanced Usage

### Custom Demo Scenarios

Create your own demo scenarios by extending the demo script:

```javascript
async function customDemoScenario(contracts, users) {
  console.log("\n🎯 === CUSTOM DEMO SCENARIO ===");
  
  // Your custom demo logic here
  // Example: Test edge cases, specific business logic, etc.
}
```

### Integration with Frontend

The deployed contracts can be integrated with a frontend application:

```javascript
// Frontend integration example
import { ethers } from 'ethers';
import deploymentInfo from './deployment-info.json';

const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

const regulatoryManagement = new ethers.Contract(
  deploymentInfo.regulatoryManagement,
  RegulatoryManagementABI,
  signer
);
```

### Automated Testing

Integrate the demo utilities into your test suite:

```javascript
// In your test files
import { getContractInstances, createSampleData } from '../scripts/demo';

describe("Integration Tests", function() {
  it("should run complete trading workflow", async function() {
    const contracts = await getContractInstances(deploymentInfo);
    const sampleData = await createSampleData();
    
    // Use contracts and sample data for testing
  });
});
```

## Support

For additional support:

1. Check the [API Documentation](./API_DOCUMENTATION.md)
2. Review the [Frontend Integration Guide](./FRONTEND_INTEGRATION_GUIDE.md)
3. Examine the test files in the `test/` directory
4. Review contract source code in the `contracts/` directory

---

**Note**: This is a university project demonstration system. For production use, additional security measures, testing, and optimizations would be required.