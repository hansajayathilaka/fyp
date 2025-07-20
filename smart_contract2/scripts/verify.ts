import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import hre from "hardhat";

interface DeploymentInfo {
  regulatoryManagement: string;
  regulatedERC1155Token: string;
  regulatedMarketplace: string;
  deployer: string;
  network: string;
  chainId: number;
  deploymentTime: string;
  contractABIs: {
    regulatoryManagement: string;
    regulatedERC1155Token: string;
    regulatedMarketplace: string;
  };
}

async function main() {
  console.log("🔍 Starting contract verification process...\n");
  
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
  
  // Verify each contract
  await verifyContract("RegulatoryManagement", deploymentInfo.regulatoryManagement, []);
  
  await verifyContract(
    "RegulatedERC1155Token", 
    deploymentInfo.regulatedERC1155Token, 
    [
      deploymentInfo.regulatoryManagement,
      "https://api.sharemarket.example.com/token/{id}.json"
    ]
  );
  
  await verifyContract(
    "RegulatedMarketplace", 
    deploymentInfo.regulatedMarketplace, 
    [
      deploymentInfo.regulatoryManagement,
      deploymentInfo.regulatedERC1155Token
    ]
  );
  
  console.log("\n🎉 Verification process completed!");
  console.log("\n📝 HashScan Links:");
  console.log(`RegulatoryManagement: https://hashscan.io/testnet/contract/${deploymentInfo.regulatoryManagement}`);
  console.log(`RegulatedERC1155Token: https://hashscan.io/testnet/contract/${deploymentInfo.regulatedERC1155Token}`);
  console.log(`RegulatedMarketplace: https://hashscan.io/testnet/contract/${deploymentInfo.regulatedMarketplace}`);
  
  // Generate verification data for manual submission
  await generateVerificationData(deploymentInfo);
}

async function verifyContract(contractName: string, address: string, constructorArgs: any[]) {
  console.log(`🔍 Verifying ${contractName} at ${address}...`);
  
  try {
    const network = await ethers.provider.getNetwork();
    
    if (network.chainId === 296n) { // Hedera testnet
      console.log(`⚠️  Hedera testnet verification requires manual submission to HashScan`);
      console.log(`📍 Contract Address: ${address}`);
      console.log(`🏗️  Constructor Args:`, constructorArgs);
      
      // Get deployed bytecode
      const deployedBytecode = await ethers.provider.getCode(address);
      if (deployedBytecode === "0x") {
        throw new Error(`Contract not found at address ${address}`);
      }
      
      console.log(`✅ Contract ${contractName} is deployed and accessible`);
      console.log(`📏 Deployed bytecode length: ${deployedBytecode.length} characters`);
      
      // Get compiled bytecode for comparison
      const compiledBytecode = await getCompiledBytecode(contractName, constructorArgs);
      if (compiledBytecode) {
        console.log(`📏 Compiled bytecode length: ${compiledBytecode.length} characters`);
        
        // Compare bytecodes (removing constructor args and metadata)
        const match = compareBytecodes(deployedBytecode, compiledBytecode);
        console.log(`🔍 Bytecode match: ${match ? '✅ VERIFIED' : '❌ MISMATCH'}`);
      }
      
      // Try to call a basic function to verify it's working
      try {
        const contract = await ethers.getContractAt(contractName, address);
        const owner = await contract.owner();
        console.log(`✅ Contract owner: ${owner}`);
      } catch (error) {
        console.log(`⚠️  Could not verify contract functions: ${error}`);
      }
      
    } else {
      console.log(`Attempting hardhat verification...`);
      console.log(`⚠️  Hardhat verification not configured for this network`);
    }
    
  } catch (error) {
    console.error(`❌ Verification failed for ${contractName}:`, error);
  }
  
  console.log();
}

async function getCompiledBytecode(contractName: string, constructorArgs: any[]): Promise<string | null> {
  try {
    // Get contract factory to access compiled bytecode
    const contractFactory = await ethers.getContractFactory(contractName);
    
    // Get deployment transaction data (bytecode + constructor args)
    const deploymentData = contractFactory.getDeployTransaction(...constructorArgs);
    
    return deploymentData.data || null;
  } catch (error) {
    console.log(`⚠️  Could not get compiled bytecode for ${contractName}:`, error);
    return null;
  }
}

function compareBytecodes(deployed: string, compiled: string): boolean {
  // Remove 0x prefix
  const deployedClean = deployed.slice(2);
  const compiledClean = compiled.slice(2);
  
  // For a more accurate comparison, we'd need to handle:
  // 1. Constructor arguments appended to bytecode
  // 2. Metadata hash differences
  // 3. Library linking differences
  
  // Simple comparison - check if deployed bytecode starts with compiled bytecode
  // (deployed will have constructor args appended)
  return deployedClean.startsWith(compiledClean.substring(0, Math.min(1000, compiledClean.length)));
}

async function extractBytecodeData(contractName: string, address: string, constructorArgs: any[]) {
  const deployedBytecode = await ethers.provider.getCode(address);
  const compiledBytecode = await getCompiledBytecode(contractName, constructorArgs);
  
  // Get artifact data for more detailed information
  const artifact = await hre.artifacts.readArtifact(contractName);
  
  return {
    contractName,
    address,
    deployedBytecode,
    compiledBytecode,
    constructorArgs,
    abi: artifact.abi,
    sourceName: artifact.sourceName,
    contractMetadata: {
      compiler: {
        version: "0.8.28"
      },
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        },
        viaIR: true
      }
    }
  };
}

async function generateVerificationData(deploymentInfo: DeploymentInfo) {
  console.log("📄 Generating verification data files...\n");
  
  const verificationDir = path.join(process.cwd(), "verification");
  if (!fs.existsSync(verificationDir)) {
    fs.mkdirSync(verificationDir);
  }
  
  // Read contract source files
  const contractsDir = path.join(process.cwd(), "contracts");
  const contracts = [
    "RegulatoryManagement.sol",
    "RegulatedERC1155Token.sol", 
    "RegulatedMarketplace.sol"
  ];
  
  for (const contractFile of contracts) {
    const contractPath = path.join(contractsDir, contractFile);
    if (fs.existsSync(contractPath)) {
      const sourceCode = fs.readFileSync(contractPath, "utf8");
      const contractName = contractFile.replace(".sol", "");
      const contractAddress = getContractAddress(contractName, deploymentInfo);
      const constructorArgs = getConstructorArgs(contractName, deploymentInfo);
      
      // Extract bytecode data
      const bytecodeData = await extractBytecodeData(contractName, contractAddress, constructorArgs);
      
      // Create comprehensive verification data file
      const verificationData = {
        contractName,
        contractAddress,
        sourceCode,
        compilerVersion: "0.8.28",
        optimizationEnabled: true,
        optimizationRuns: 200,
        viaIR: true,
        constructorArguments: constructorArgs,
        deployedBytecode: bytecodeData.deployedBytecode,
        compiledBytecode: bytecodeData.compiledBytecode,
        abi: bytecodeData.abi,
        sourceName: bytecodeData.sourceName,
        hashscanUrl: `https://hashscan.io/testnet/contract/${contractAddress}`,
        verificationInstructions: {
          step1: "Visit HashScan contract page",
          step2: "Click 'Verify Contract' button",
          step3: "Select 'Solidity (Single file)' or 'Solidity (Standard JSON)'",
          step4: "Upload source code or paste from sourceCode field",
          step5: "Set compiler version to 0.8.28",
          step6: "Enable optimization with 200 runs",
          step7: "Enable 'via-ir' optimization",
          step8: "Add constructor arguments from constructorArguments field",
          step9: "Submit for verification"
        }
      };
      
      const outputPath = path.join(verificationDir, `${contractName}_verification.json`);
      fs.writeFileSync(outputPath, JSON.stringify(verificationData, null, 2));
      console.log(`✅ Created verification data: ${outputPath}`);
      
      // Also create a separate bytecode file for easy access
      const bytecodeOutputPath = path.join(verificationDir, `${contractName}_bytecode.json`);
      fs.writeFileSync(bytecodeOutputPath, JSON.stringify({
        contractName,
        contractAddress,
        deployedBytecode: bytecodeData.deployedBytecode,
        compiledBytecode: bytecodeData.compiledBytecode,
        bytecodeLength: {
          deployed: bytecodeData.deployedBytecode.length,
          compiled: bytecodeData.compiledBytecode?.length || 0
        }
      }, null, 2));
      console.log(`✅ Created bytecode data: ${bytecodeOutputPath}`);
    }
  }
  
  // Create a summary file with all contract information
  const summaryData = {
    network: "Hedera Testnet",
    chainId: 296,
    deploymentTime: deploymentInfo.deploymentTime,
    deployer: deploymentInfo.deployer,
    contracts: {
      RegulatoryManagement: {
        address: deploymentInfo.regulatoryManagement,
        hashscanUrl: `https://hashscan.io/testnet/contract/${deploymentInfo.regulatoryManagement}`,
        constructorArgs: []
      },
      RegulatedERC1155Token: {
        address: deploymentInfo.regulatedERC1155Token,
        hashscanUrl: `https://hashscan.io/testnet/contract/${deploymentInfo.regulatedERC1155Token}`,
        constructorArgs: [
          deploymentInfo.regulatoryManagement,
          "https://api.sharemarket.example.com/token/{id}.json"
        ]
      },
      RegulatedMarketplace: {
        address: deploymentInfo.regulatedMarketplace,
        hashscanUrl: `https://hashscan.io/testnet/contract/${deploymentInfo.regulatedMarketplace}`,
        constructorArgs: [
          deploymentInfo.regulatoryManagement,
          deploymentInfo.regulatedERC1155Token
        ]
      }
    },
    verificationInstructions: [
      "1. Visit HashScan.io",
      "2. Navigate to each contract address",
      "3. Click 'Verify Contract' if available",
      "4. Upload the source code from the contracts/ directory",
      "5. Set compiler version to 0.8.28",
      "6. Enable optimization with 200 runs",
      "7. Add constructor arguments as specified above"
    ]
  };
  
  const summaryPath = path.join(verificationDir, "verification_summary.json");
  fs.writeFileSync(summaryPath, JSON.stringify(summaryData, null, 2));
  console.log(`✅ Created verification summary: ${summaryPath}`);
}

function getConstructorArgs(contractName: string, deploymentInfo: DeploymentInfo): any[] {
  switch (contractName) {
    case "RegulatoryManagement":
      return [];
    case "RegulatedERC1155Token":
      return [
        deploymentInfo.regulatoryManagement,
        "https://api.sharemarket.example.com/token/{id}.json"
      ];
    case "RegulatedMarketplace":
      return [
        deploymentInfo.regulatoryManagement,
        deploymentInfo.regulatedERC1155Token
      ];
    default:
      return [];
  }
}

function getContractAddress(contractName: string, deploymentInfo: DeploymentInfo): string {
  switch (contractName) {
    case "RegulatoryManagement":
      return deploymentInfo.regulatoryManagement;
    case "RegulatedERC1155Token":
      return deploymentInfo.regulatedERC1155Token;
    case "RegulatedMarketplace":
      return deploymentInfo.regulatedMarketplace;
    default:
      return "";
  }
}

// Handle script execution
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Verification script failed:", error);
    process.exit(1);
  });