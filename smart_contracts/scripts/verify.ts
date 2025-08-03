import { ethers } from "hardhat";
import hre from "hardhat";
import * as fs from "fs";
import * as path from "path";

interface DeploymentInfo {
  regulatoryManagement: string;
  regulatedERC1155Token: string;
  regulatedMarketplace: string;
  deployer: string;
  network: string;
  chainId: number;
  deploymentTime: string;
}

async function main() {
  console.log("🔍 Starting programmatic contract verification...\n");
  
  // Read deployment info
  const deploymentInfoPath = path.join(process.cwd(), "deployment-info.json");
  if (!fs.existsSync(deploymentInfoPath)) {
    throw new Error("deployment-info.json not found. Please deploy contracts first.");
  }
  
  const deploymentInfo: DeploymentInfo = JSON.parse(
    fs.readFileSync(deploymentInfoPath, "utf8")
  );
  
  console.log("📋 Deployment Information:");
  console.log("Network:", deploymentInfo.network);
  console.log("Chain ID:", deploymentInfo.chainId);
  console.log("Deployment Time:", deploymentInfo.deploymentTime);
  console.log("Deployer:", deploymentInfo.deployer);
  console.log();
  
  // Get network information
  const network = await ethers.provider.getNetwork();
  console.log("🌐 Current Network:", network.name);
  console.log("🔗 Chain ID:", network.chainId.toString());
  
  if (network.chainId === 31337n) {
    console.log("⚠️ Skipping verification for local hardhat network");
    return;
  }
  
  // Wait for some block confirmations before verification
  console.log("\n⏳ Waiting for block confirmations...");
  await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
  
  const contracts = [
    {
      name: "RegulatoryManagement",
      address: deploymentInfo.regulatoryManagement,
      constructorArgs: []
    },
    {
      name: "RegulatedERC1155Token", 
      address: deploymentInfo.regulatedERC1155Token,
      constructorArgs: [
        deploymentInfo.regulatoryManagement,
        "https://api.sharemarket.example.com/token/{id}.json"
      ]
    },
    {
      name: "RegulatedMarketplace",
      address: deploymentInfo.regulatedMarketplace,
      constructorArgs: [
        deploymentInfo.regulatoryManagement,
        deploymentInfo.regulatedERC1155Token
      ]
    }
  ];
  
  let successCount = 0;
  let failureCount = 0;
  
  for (let i = 0; i < contracts.length; i++) {
    const contract = contracts[i];
    console.log(`\n${i + 1}️⃣ Verifying ${contract.name} contract...`);
    console.log(`📍 Address: ${contract.address}`);
    console.log(`🏗️ Constructor Args:`, contract.constructorArgs);
    
    try {
      // Verify contract using Hardhat's verify task
      await hre.run("verify:verify", {
        address: contract.address,
        constructorArguments: contract.constructorArgs
      });
      
      console.log(`✅ ${contract.name} verified successfully`);
      successCount++;
      
      // Additional verification - check if contract is accessible
      try {
        const contractInstance = await ethers.getContractAt(contract.name, contract.address);
        const owner = await contractInstance.owner();
        console.log(`✅ Contract owner confirmed: ${owner}`);
      } catch (error) {
        console.log(`⚠️ Could not verify contract functions: ${error.message}`);
      }
      
    } catch (error) {
      console.log(`❌ ${contract.name} verification failed:`, error.message);
      failureCount++;
      
      // Check if it's already verified
      if (error.message.includes("already verified") || error.message.includes("Already Verified")) {
        console.log(`✅ ${contract.name} was already verified`);
        successCount++;
        failureCount--;
      }
    }
  }
  
  console.log("\n📊 Verification Summary:");
  console.log(`✅ Successfully verified: ${successCount}/${contracts.length}`);
  console.log(`❌ Failed to verify: ${failureCount}/${contracts.length}`);
  
  if (successCount === contracts.length) {
    console.log("\n🎉 All contracts verified successfully!");
    console.log("\n🌐 Block Explorer Links:");
    contracts.forEach(contract => {
      console.log(`${contract.name}: https://testnet.sonicscan.org/address/${contract.address}`);
    });
  } else {
    console.log("\n⚠️ Some contracts failed verification. Check the logs above for details.");
  }
}

// Handle script execution
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Programmatic verification failed:", error);
    process.exit(1);
  });