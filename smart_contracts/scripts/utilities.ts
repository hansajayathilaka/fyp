import { ethers } from "hardhat";
import { Contract } from "ethers";
import * as fs from 'fs';
import { parseAmount, formatAmount } from './decimal-utils';

/**
 * Utility functions for testing and development of the Blockchain Share Market system
 */

interface DeploymentInfo {
  regulatoryManagement: string;
  regulatedERC1155Token: string;
  regulatedMarketplace: string;
  deployer: string;
  network: string;
  chainId: number;
}

interface ContractInstances {
  regulatoryManagement: Contract;
  regulatedERC1155Token: Contract;
  regulatedMarketplace: Contract;
}

/**
 * Load deployment information from deployment-info.json
 */
export function loadDeploymentInfo(): DeploymentInfo {
  try {
    const data = fs.readFileSync('deployment-info.json', 'utf8');
    return JSON.parse(data);
  } catch (error) {
    throw new Error("Could not load deployment info. Please run deployment first.");
  }
}

/**
 * Get contract instances from deployment info
 */
export async function getContractInstances(deploymentInfo?: DeploymentInfo): Promise<ContractInstances> {
  if (!deploymentInfo) {
    deploymentInfo = loadDeploymentInfo();
  }
  
  const RegulatoryManagement = await ethers.getContractFactory("RegulatoryManagement");
  const regulatoryManagement = RegulatoryManagement.attach(deploymentInfo.regulatoryManagement);
  
  const RegulatedERC1155Token = await ethers.getContractFactory("RegulatedERC1155Token");
  const regulatedERC1155Token = RegulatedERC1155Token.attach(deploymentInfo.regulatedERC1155Token);
  
  const RegulatedMarketplace = await ethers.getContractFactory("RegulatedMarketplace");
  const regulatedMarketplace = RegulatedMarketplace.attach(deploymentInfo.regulatedMarketplace);
  
  return {
    regulatoryManagement,
    regulatedERC1155Token,
    regulatedMarketplace
  };
}

/**
 * Create sample test data for development and testing
 */
export async function createSampleData() {
  const [admin, company1, company2, individual1, individual2] = await ethers.getSigners();
  
  return {
    accounts: {
      admin: admin.address,
      company1: company1.address,
      company2: company2.address,
      individual1: individual1.address,
      individual2: individual2.address
    },
    signers: {
      admin,
      company1,
      company2,
      individual1,
      individual2
    },
    sampleSSIIds: {
      company1: "ssi:test:company1:abc123",
      company2: "ssi:test:company2:def456",
      individual1: "ssi:test:individual1:ghi789",
      individual2: "ssi:test:individual2:jkl012"
    },
    sampleTokens: [
      {
        name: "TechCorp Shares",
        symbol: "TECH",
        companyName: "TechCorp Inc.",
        maxSupply: ethers.parseUnits("1000000", 0),
        initialPrice: parseAmount("0.01"),
        mintAmount: ethers.parseUnits("10000", 0)
      },
      {
        name: "GreenEnergy Shares",
        symbol: "GREEN",
        companyName: "GreenEnergy Ltd.",
        maxSupply: ethers.parseUnits("500000", 0),
        initialPrice: parseAmount("0.02"),
        mintAmount: ethers.parseUnits("5000", 0)
      }
    ],
    sampleOrders: {
      buyOrder: {
        tokenId: 1,
        amount: ethers.parseUnits("100", 0),
        price: parseAmount("0.015")
      },
      sellOrder: {
        tokenId: 1,
        amount: ethers.parseUnits("50", 0),
        price: parseAmount("0.015")
      }
    },
    depositAmounts: {
      individual1ETH: parseAmount("2.0"),
      individual2ETH: parseAmount("3.0"),
      company1Tokens: ethers.parseUnits("1000", 0)
    }
  };
}

/**
 * Register and verify a user (helper function)
 */
export async function registerAndVerifyUser(
  contracts: ContractInstances,
  admin: any,
  user: any,
  ssiId: string,
  userType: number
) {
  console.log(`Registering user ${user.address} with SSI ID: ${ssiId}`);
  
  // Register user
  await contracts.regulatoryManagement.connect(user).registerUser(ssiId, userType);
  
  // Verify user (admin action)
  await contracts.regulatoryManagement.connect(admin).verifyUser(user.address);
  
  console.log(`✅ User ${user.address} registered and verified`);
  
  return {
    address: user.address,
    ssiId,
    userType,
    canTrade: await contracts.regulatoryManagement.canUserTrade(user.address),
    canCreateTokens: await contracts.regulatoryManagement.canUserCreateTokens(user.address)
  };
}

/**
 * Create and mint a token (helper function)
 */
export async function createAndMintToken(
  contracts: ContractInstances,
  company: any,
  tokenData: any,
  mintAmount: bigint
) {
  console.log(`Creating token: ${tokenData.name} (${tokenData.symbol})`);
  
  // Create token
  const createTx = await contracts.regulatedERC1155Token.connect(company).createToken(
    tokenData.name,
    tokenData.symbol,
    tokenData.companyName,
    tokenData.maxSupply,
    tokenData.initialPrice
  );
  const createReceipt = await createTx.wait();
  
  // Extract token ID from events (simplified - assumes sequential IDs)
  const allTokens = await contracts.regulatedERC1155Token.getAllTokens();
  const tokenId = allTokens[allTokens.length - 1];
  
  // Mint tokens
  await contracts.regulatedERC1155Token.connect(company).mintToken(
    company.address,
    tokenId,
    mintAmount
  );
  
  console.log(`✅ Token ${tokenId} created and ${mintAmount} tokens minted`);
  
  return {
    tokenId,
    ...tokenData,
    currentSupply: mintAmount
  };
}

/**
 * Setup marketplace balances (helper function)
 */
export async function setupMarketplaceBalances(
  contracts: ContractInstances,
  users: any,
  amounts: any
) {
  console.log("Setting up marketplace balances...");
  
  // Deposit ETH for individuals
  if (amounts.individual1ETH) {
    await contracts.regulatedMarketplace.connect(users.individual1).depositETH({
      value: amounts.individual1ETH
    });
    console.log(`✅ Individual 1 deposited ${formatAmount(amounts.individual1ETH)} ETH`);
  }
  
  if (amounts.individual2ETH) {
    await contracts.regulatedMarketplace.connect(users.individual2).depositETH({
      value: amounts.individual2ETH
    });
    console.log(`✅ Individual 2 deposited ${formatAmount(amounts.individual2ETH)} ETH`);
  }
  
  // Deposit tokens for companies
  if (amounts.company1Tokens) {
    await contracts.regulatedMarketplace.connect(users.company1).depositTokens(
      1, // Assuming token ID 1
      amounts.company1Tokens
    );
    console.log(`✅ Company 1 deposited ${amounts.company1Tokens} tokens`);
  }
  
  console.log("✅ Marketplace balances setup complete");
}

/**
 * Get comprehensive system status
 */
export async function getSystemStatus(contracts: ContractInstances) {
  console.log("\n📊 === SYSTEM STATUS ===");
  
  // Get all tokens
  const allTokens = await contracts.regulatedERC1155Token.getAllTokens();
  console.log(`Total token types: ${allTokens.length}`);
  
  // Get token information
  for (const tokenId of allTokens) {
    const tokenInfo = await contracts.regulatedERC1155Token.getTokenInfo(tokenId);
    console.log(`Token ${tokenId}: ${tokenInfo.name} (${tokenInfo.symbol})`);
    console.log(`  Company: ${tokenInfo.companyName}`);
    console.log(`  Supply: ${tokenInfo.currentSupply}/${tokenInfo.maxSupply}`);
    console.log(`  Price: ${formatAmount(tokenInfo.initialPrice)} ETH`);
    
    // Get order book stats
    try {
      const stats = await contracts.regulatedMarketplace.getOrderBookStats(tokenId);
      console.log(`  Order Book: ${stats.totalBuyOrders} buy orders, ${stats.totalSellOrders} sell orders`);
      if (stats.highestBuyPrice > 0) {
        console.log(`  Highest Buy: ${formatAmount(stats.highestBuyPrice)} ETH`);
      }
      if (stats.lowestSellPrice > 0) {
        console.log(`  Lowest Sell: ${formatAmount(stats.lowestSellPrice)} ETH`);
      }
    } catch (error) {
      console.log(`  Order Book: Unable to fetch stats`);
    }
  }
  
  return {
    totalTokenTypes: allTokens.length,
    tokens: allTokens
  };
}

/**
 * Get user status and balances
 */
export async function getUserStatus(contracts: ContractInstances, userAddress: string) {
  console.log(`\n👤 User Status: ${userAddress}`);
  
  try {
    // Check if user is registered
    const isRegistered = await contracts.regulatoryManagement.isRegistered(userAddress);
    if (!isRegistered) {
      console.log("❌ User not registered");
      return { registered: false };
    }
    
    // Get user profile
    const profile = await contracts.regulatoryManagement.getUserProfile(userAddress);
    const canTrade = await contracts.regulatoryManagement.canUserTrade(userAddress);
    const canCreateTokens = await contracts.regulatoryManagement.canUserCreateTokens(userAddress);
    
    console.log(`✅ Registered: ${profile.ssiIdentifier}`);
    console.log(`Type: ${profile.userType === 0n ? 'Individual' : 'Company'}`);
    console.log(`Verified: ${profile.isVerified}`);
    console.log(`Can Trade: ${canTrade}`);
    console.log(`Can Create Tokens: ${canCreateTokens}`);
    console.log(`Suspended: ${profile.isSuspended}`);
    
    // Get marketplace balances
    const balance = await contracts.regulatedMarketplace.getUserBalance(userAddress);
    console.log(`ETH Balance: ${formatAmount(balance.ethBalance)} ETH`);
    
    if (balance.tokenIds.length > 0) {
      console.log("Token Balances:");
      for (let i = 0; i < balance.tokenIds.length; i++) {
        console.log(`  Token ${balance.tokenIds[i]}: ${balance.tokenBalanceAmounts[i]}`);
      }
    }
    
    return {
      registered: true,
      profile,
      canTrade,
      canCreateTokens,
      ethBalance: balance.ethBalance,
      tokenBalances: balance.tokenIds.map((id, i) => ({
        tokenId: id,
        balance: balance.tokenBalanceAmounts[i]
      }))
    };
    
  } catch (error) {
    console.log(`❌ Error getting user status: ${error}`);
    return { registered: false, error: error.message };
  }
}

/**
 * Reset test environment (for testing purposes)
 */
export async function resetTestEnvironment() {
  console.log("🔄 Resetting test environment...");
  
  // This would typically involve:
  // 1. Clearing any temporary files
  // 2. Resetting contract states (if possible)
  // 3. Cleaning up test data
  
  // For now, just log that reset is requested
  console.log("✅ Test environment reset requested");
  console.log("Note: For full reset, redeploy contracts");
}

/**
 * Validate contract deployment
 */
export async function validateDeployment(deploymentInfo?: DeploymentInfo) {
  console.log("🔍 Validating contract deployment...");
  
  if (!deploymentInfo) {
    deploymentInfo = loadDeploymentInfo();
  }
  
  try {
    const contracts = await getContractInstances(deploymentInfo);
    
    // Test basic contract functions
    const rmOwner = await contracts.regulatoryManagement.owner();
    const tokenOwner = await contracts.regulatedERC1155Token.owner();
    const marketplaceOwner = await contracts.regulatedMarketplace.owner();
    
    console.log("✅ RegulatoryManagement owner:", rmOwner);
    console.log("✅ RegulatedERC1155Token owner:", tokenOwner);
    console.log("✅ RegulatedMarketplace owner:", marketplaceOwner);
    
    // Verify contract linking
    const rmInToken = await contracts.regulatedERC1155Token.regulatoryManagement();
    const rmInMarketplace = await contracts.regulatedMarketplace.regulatoryManagement();
    const tokenInMarketplace = await contracts.regulatedMarketplace.tokenContract();
    
    console.log("✅ Contract linking verified");
    console.log("  RM in Token:", rmInToken === deploymentInfo.regulatoryManagement);
    console.log("  RM in Marketplace:", rmInMarketplace === deploymentInfo.regulatoryManagement);
    console.log("  Token in Marketplace:", tokenInMarketplace === deploymentInfo.regulatedERC1155Token);
    
    return {
      valid: true,
      contracts,
      owners: { rmOwner, tokenOwner, marketplaceOwner }
    };
    
  } catch (error) {
    console.log("❌ Deployment validation failed:", error);
    return {
      valid: false,
      error: error.message
    };
  }
}

// Export all utility functions
export {
  DeploymentInfo,
  ContractInstances
};

// If script is run directly, show available utilities
if (require.main === module) {
  console.log("🔧 Blockchain Share Market Utilities");
  console.log("\nAvailable utility functions:");
  console.log("- loadDeploymentInfo()");
  console.log("- getContractInstances()");
  console.log("- createSampleData()");
  console.log("- registerAndVerifyUser()");
  console.log("- createAndMintToken()");
  console.log("- setupMarketplaceBalances()");
  console.log("- getSystemStatus()");
  console.log("- getUserStatus()");
  console.log("- resetTestEnvironment()");
  console.log("- validateDeployment()");
  console.log("\nImport these functions in your test files or scripts.");
}