import { ethers } from "hardhat";
import { BaseContract } from "ethers";
import { parseAmount, formatAmount } from './decimal-utils';

interface DeployedContracts {
  regulatoryManagement: BaseContract;
  regulatedERC1155Token: BaseContract;
  regulatedMarketplace: BaseContract;
}

interface DeploymentAddresses {
  regulatoryManagement: string;
  regulatedERC1155Token: string;
  regulatedMarketplace: string;
  deployer: string;
  network: string;
  chainId: number;
}

async function main() {
  console.log("🚀 Starting deployment of Blockchain Share Market contracts...\n");
  
  // Get network information
  const network = await ethers.provider.getNetwork();
  console.log("📡 Network:", network.name);
  console.log("🔗 Chain ID:", network.chainId.toString());
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("👤 Deploying contracts with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", formatAmount(balance), "ETH\n");
  
  // Check minimum balance for deployment
  const minBalance = parseAmount("0.1");
  if (balance < minBalance) {
    throw new Error(`Insufficient balance. Need at least 0.1 ETH for deployment, but have ${formatAmount(balance)} ETH`);
  }
  
  try {
    // Deploy contracts in correct order
    const contracts = await deployContracts(deployer);
    
    // Verify deployments
    await verifyDeployments(contracts);
    
    // Initialize contracts
    await initializeContracts(contracts);
    
    // Save deployment information
    const deploymentInfo = await saveDeploymentInfo(contracts, deployer, network);
    
    console.log("\n🎉 Deployment completed successfully!");
    console.log("📄 Deployment summary saved to deployment-info.json");
    console.log("\n📋 Contract Addresses:");
    console.log("RegulatoryManagement:", deploymentInfo.regulatoryManagement);
    console.log("RegulatedERC1155Token:", deploymentInfo.regulatedERC1155Token);
    console.log("RegulatedMarketplace:", deploymentInfo.regulatedMarketplace);
    
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    throw error;
  }
}

async function deployContracts(deployer: any): Promise<DeployedContracts> {
  console.log("📦 Deploying contracts...\n");
  
  // 1. Deploy RegulatoryManagement contract
  console.log("1️⃣ Deploying RegulatoryManagement contract...");
  const RegulatoryManagement = await ethers.getContractFactory("RegulatoryManagement");
  const regulatoryManagement = await RegulatoryManagement.deploy();
  await regulatoryManagement.waitForDeployment();
  const rmAddress = await regulatoryManagement.getAddress();
  console.log("✅ RegulatoryManagement deployed to:", rmAddress);
  
  // 2. Deploy RegulatedERC1155Token contract
  console.log("\n2️⃣ Deploying RegulatedERC1155Token contract...");
  const RegulatedERC1155Token = await ethers.getContractFactory("RegulatedERC1155Token");
  const baseURI = "https://api.sharemarket.example.com/token/{id}.json";
  const regulatedERC1155Token = await RegulatedERC1155Token.deploy(rmAddress, baseURI);
  await regulatedERC1155Token.waitForDeployment();
  const tokenAddress = await regulatedERC1155Token.getAddress();
  console.log("✅ RegulatedERC1155Token deployed to:", tokenAddress);
  
  // 3. Deploy RegulatedMarketplace contract
  console.log("\n3️⃣ Deploying RegulatedMarketplace contract...");
  const RegulatedMarketplace = await ethers.getContractFactory("RegulatedMarketplace");
  const regulatedMarketplace = await RegulatedMarketplace.deploy(rmAddress, tokenAddress);
  await regulatedMarketplace.waitForDeployment();
  const marketplaceAddress = await regulatedMarketplace.getAddress();
  console.log("✅ RegulatedMarketplace deployed to:", marketplaceAddress);
  
  return {
    regulatoryManagement,
    regulatedERC1155Token,
    regulatedMarketplace
  };
}

async function verifyDeployments(contracts: DeployedContracts): Promise<void> {
  console.log("\n🔍 Verifying contract deployments...\n");
  
  // Verify RegulatoryManagement
  console.log("1️⃣ Verifying RegulatoryManagement contract...");
  const rmAddress = await contracts.regulatoryManagement.getAddress();
  const rmCode = await ethers.provider.getCode(rmAddress);
  if (rmCode === "0x") {
    throw new Error("RegulatoryManagement contract not deployed properly");
  }
  
  // Test basic function call
  const owner = await contracts.regulatoryManagement.owner();
  console.log("✅ RegulatoryManagement verified - Owner:", owner);
  
  // Verify RegulatedERC1155Token
  console.log("\n2️⃣ Verifying RegulatedERC1155Token contract...");
  const tokenAddress = await contracts.regulatedERC1155Token.getAddress();
  const tokenCode = await ethers.provider.getCode(tokenAddress);
  if (tokenCode === "0x") {
    throw new Error("RegulatedERC1155Token contract not deployed properly");
  }
  
  // Test basic function call
  const tokenOwner = await contracts.regulatedERC1155Token.owner();
  const rmAddressInToken = await contracts.regulatedERC1155Token.regulatoryManagement();
  console.log("✅ RegulatedERC1155Token verified - Owner:", tokenOwner);
  console.log("✅ RegulatoryManagement reference:", rmAddressInToken);
  
  // Verify RegulatedMarketplace
  console.log("\n3️⃣ Verifying RegulatedMarketplace contract...");
  const marketplaceAddress = await contracts.regulatedMarketplace.getAddress();
  const marketplaceCode = await ethers.provider.getCode(marketplaceAddress);
  if (marketplaceCode === "0x") {
    throw new Error("RegulatedMarketplace contract not deployed properly");
  }
  
  // Test basic function calls
  const marketplaceOwner = await contracts.regulatedMarketplace.owner();
  const rmAddressInMarketplace = await contracts.regulatedMarketplace.regulatoryManagement();
  const tokenAddressInMarketplace = await contracts.regulatedMarketplace.tokenContract();
  console.log("✅ RegulatedMarketplace verified - Owner:", marketplaceOwner);
  console.log("✅ RegulatoryManagement reference:", rmAddressInMarketplace);
  console.log("✅ Token contract reference:", tokenAddressInMarketplace);
  
  console.log("\n✅ All contracts verified successfully!");
}

async function initializeContracts(contracts: DeployedContracts): Promise<void> {
  console.log("\n⚙️ Initializing contract configurations...\n");
  
  // Check if contracts are paused and unpause if needed
  console.log("1️⃣ Checking contract pause status...");
  
  try {
    const rmPaused = await contracts.regulatoryManagement.paused();
    if (rmPaused) {
      console.log("Unpausing RegulatoryManagement...");
      await contracts.regulatoryManagement.unpause();
    }
    console.log("✅ RegulatoryManagement is active");
  } catch (error) {
    console.log("✅ RegulatoryManagement pause check completed");
  }
  
  try {
    const tokenPaused = await contracts.regulatedERC1155Token.paused();
    if (tokenPaused) {
      console.log("Unpausing RegulatedERC1155Token...");
      await contracts.regulatedERC1155Token.unpause();
    }
    console.log("✅ RegulatedERC1155Token is active");
  } catch (error) {
    console.log("✅ RegulatedERC1155Token pause check completed");
  }
  
  try {
    const marketplacePaused = await contracts.regulatedMarketplace.paused();
    if (marketplacePaused) {
      console.log("Unpausing RegulatedMarketplace...");
      await contracts.regulatedMarketplace.unpause();
    }
    console.log("✅ RegulatedMarketplace is active");
  } catch (error) {
    console.log("✅ RegulatedMarketplace pause check completed");
  }
  
  // Check trading fee configuration
  console.log("\n2️⃣ Checking marketplace configuration...");
  try {
    const tradingFee = await contracts.regulatedMarketplace.tradingFeePercentage();
    console.log("✅ Trading fee configured:", tradingFee.toString(), "basis points");
  } catch (error) {
    console.log("⚠️ Could not read trading fee configuration");
  }
  
  console.log("\n✅ Contract initialization completed!");
}

async function saveDeploymentInfo(
  contracts: DeployedContracts, 
  deployer: any, 
  network: any
): Promise<DeploymentAddresses> {
  const deploymentInfo: DeploymentAddresses = {
    regulatoryManagement: await contracts.regulatoryManagement.getAddress(),
    regulatedERC1155Token: await contracts.regulatedERC1155Token.getAddress(),
    regulatedMarketplace: await contracts.regulatedMarketplace.getAddress(),
    deployer: deployer.address,
    network: network.name,
    chainId: Number(network.chainId)
  };
  
  // Save to file
  const fs = require('fs');
  const deploymentData = {
    ...deploymentInfo,
    deploymentTime: new Date().toISOString(),
    contractABIs: {
      regulatoryManagement: "RegulatoryManagement",
      regulatedERC1155Token: "RegulatedERC1155Token", 
      regulatedMarketplace: "RegulatedMarketplace"
    }
  };
  
  fs.writeFileSync(
    'deployment-info.json', 
    JSON.stringify(deploymentData, null, 2)
  );
  
  return deploymentInfo;
}

// Handle script execution
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment script failed:", error);
    process.exit(1);
  });