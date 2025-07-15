import { ethers } from "hardhat";
import { Contract } from "ethers";

async function main() {
  console.log("🚀 Starting deployment of Blockchain Share Market Smart Contracts...");
  
  // Get the contract factories
  const RegulatoryManagement = await ethers.getContractFactory("RegulatoryManagement");
  const RegulatedERC1155Token = await ethers.getContractFactory("RegulatedERC1155Token");
  const RegulatedMarketplace = await ethers.getContractFactory("RegulatedMarketplace");
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)));
  
  // Deploy RegulatoryManagement first
  console.log("\n📋 Deploying RegulatoryManagement contract...");
  const regulatoryManagement = await RegulatoryManagement.deploy();
  await regulatoryManagement.waitForDeployment();
  const regulatoryAddress = await regulatoryManagement.getAddress();
  console.log("✅ RegulatoryManagement deployed to:", regulatoryAddress);
  
  // Deploy RegulatedERC1155Token
  console.log("\n🪙 Deploying RegulatedERC1155Token contract...");
  const baseURI = "https://api.sharemarket.example.com/token/{id}";
  const tokenContract = await RegulatedERC1155Token.deploy(regulatoryAddress, baseURI);
  await tokenContract.waitForDeployment();
  const tokenAddress = await tokenContract.getAddress();
  console.log("✅ RegulatedERC1155Token deployed to:", tokenAddress);
  
  // Deploy RegulatedMarketplace
  console.log("\n🏪 Deploying RegulatedMarketplace contract...");
  const feeRecipient = deployer.address; // Use deployer as initial fee recipient
  const marketplace = await RegulatedMarketplace.deploy(regulatoryAddress, feeRecipient);
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("✅ RegulatedMarketplace deployed to:", marketplaceAddress);
  
  // Setup initial configuration
  console.log("\n⚙️  Setting up initial configuration...");
  
  // Authorize the marketplace in the regulatory contract
  console.log("🔐 Authorizing marketplace in regulatory contract...");
  const authorizeTx = await regulatoryManagement.authorizeMarketplace(marketplaceAddress);
  await authorizeTx.wait();
  console.log("✅ Marketplace authorized");
  
  // Authorize the marketplace as a minter in the token contract
  console.log("🔐 Authorizing marketplace as minter in token contract...");
  const authorizeMinterTx = await tokenContract.authorizeMinter(marketplaceAddress);
  await authorizeMinterTx.wait();
  console.log("✅ Marketplace authorized as minter");
  
  // Summary
  console.log("\n📊 DEPLOYMENT SUMMARY");
  console.log("=".repeat(50));
  console.log("🏛️  RegulatoryManagement:", regulatoryAddress);
  console.log("🪙  RegulatedERC1155Token:", tokenAddress);
  console.log("🏪  RegulatedMarketplace:", marketplaceAddress);
  console.log("👤  Deployer:", deployer.address);
  console.log("💸  Fee Recipient:", feeRecipient);
  console.log("🔗  Base URI:", baseURI);
  console.log("=".repeat(50));
  
  // Create a deployment info file
  const deploymentInfo = {
    network: {
      name: "localhost", // Update this based on your network
      chainId: 31337 // Update this based on your network
    },
    contracts: {
      RegulatoryManagement: {
        address: regulatoryAddress,
        deployer: deployer.address
      },
      RegulatedERC1155Token: {
        address: tokenAddress,
        deployer: deployer.address,
        baseURI: baseURI
      },
      RegulatedMarketplace: {
        address: marketplaceAddress,
        deployer: deployer.address,
        feeRecipient: feeRecipient
      }
    },
    deploymentTime: new Date().toISOString(),
    deployerAddress: deployer.address
  };
  
  console.log("\n📄 Deployment information saved to deployment.json");
  console.log("🎉 Deployment completed successfully!");
  
  // Return the deployed contracts for testing
  return {
    regulatoryManagement,
    tokenContract,
    marketplace,
    deploymentInfo
  };
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});
