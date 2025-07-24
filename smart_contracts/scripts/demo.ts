import { ethers } from "hardhat";
import { Contract } from "ethers";
import * as fs from 'fs';
import { parseAmount, formatAmount } from './decimal-utils';

interface DeploymentInfo {
  regulatoryManagement: string;
  regulatedERC1155Token: string;
  regulatedMarketplace: string;
  deployer: string;
  network: string;
  chainId: number;
}

interface DemoContracts {
  regulatoryManagement: Contract;
  regulatedERC1155Token: Contract;
  regulatedMarketplace: Contract;
}

async function main() {
  console.log("🎭 Starting Blockchain Share Market Demo...\n");

  // Check if we should deploy fresh contracts or use existing ones
  let deploymentInfo: DeploymentInfo;
  let contracts: DemoContracts;

  try {
    deploymentInfo = loadDeploymentInfo();
    console.log("📋 Found existing deployment from:", deploymentInfo.network);
    console.log("🔗 Chain ID:", deploymentInfo.chainId);

    // Try to connect to existing contracts
    contracts = await connectToContracts(deploymentInfo);

    // Test connection by calling a simple function
    await contracts.regulatoryManagement.owner();
    console.log("✅ Connected to existing contracts");

  } catch (error) {
    console.log("⚠️ Could not connect to existing contracts, deploying fresh ones...");

    // Deploy fresh contracts for demo
    const deployResult = await deployFreshContracts();
    contracts = deployResult.contracts;
    deploymentInfo = deployResult.deploymentInfo;

    console.log("✅ Fresh contracts deployed for demo");
  }

  // Get demo accounts
  const [admin, company1, company2, individual1, individual2] = await ethers.getSigners();

  console.log("\n👥 Demo Participants:");
  console.log("🔧 Admin:", admin.address);
  console.log("🏢 Company 1:", company1.address);
  console.log("🏢 Company 2:", company2.address);
  console.log("👤 Individual 1:", individual1.address);
  console.log("👤 Individual 2:", individual2.address);

  try {
    // Run demo scenarios
    await demoUserRegistration(contracts, company1, company2, individual1, individual2);
    await demoUserVerification(contracts, admin, company1, company2, individual1, individual2);
    await demoTokenCreation(contracts, company1, company2);
    await demoTokenMinting(contracts, company1, company2);
    await demoMarketplaceDeposits(contracts, company1, individual1, individual2);
    await demoTradingScenarios(contracts, company1, individual1, individual2);
    await demoOrderManagement(contracts, individual1, individual2);
    await demoComplianceFeatures(contracts, admin, individual1);

    console.log("\n🎉 Demo completed successfully!");
    console.log("✅ All main features demonstrated");

  } catch (error) {
    console.error("❌ Demo failed:", error);
    throw error;
  }
}

function loadDeploymentInfo(): DeploymentInfo {
  try {
    const data = fs.readFileSync('deployment-info.json', 'utf8');
    return JSON.parse(data);
  } catch (error) {
    throw new Error("Could not load deployment info. Please run deployment first.");
  }
}

async function connectToContracts(deploymentInfo: DeploymentInfo): Promise<DemoContracts> {
  console.log("\n🔌 Connecting to deployed contracts...");

  const RegulatoryManagement = await ethers.getContractFactory("RegulatoryManagement");
  const regulatoryManagement = RegulatoryManagement.attach(deploymentInfo.regulatoryManagement);

  const RegulatedERC1155Token = await ethers.getContractFactory("RegulatedERC1155Token");
  const regulatedERC1155Token = RegulatedERC1155Token.attach(deploymentInfo.regulatedERC1155Token);

  const RegulatedMarketplace = await ethers.getContractFactory("RegulatedMarketplace");
  const regulatedMarketplace = RegulatedMarketplace.attach(deploymentInfo.regulatedMarketplace);

  console.log("✅ Connected to all contracts");

  return {
    regulatoryManagement,
    regulatedERC1155Token,
    regulatedMarketplace
  };
}

async function deployFreshContracts(): Promise<{ contracts: DemoContracts, deploymentInfo: DeploymentInfo }> {
  console.log("\n🚀 Deploying fresh contracts for demo...");

  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  // Deploy RegulatoryManagement
  const RegulatoryManagement = await ethers.getContractFactory("RegulatoryManagement");
  const regulatoryManagement = await RegulatoryManagement.deploy();
  await regulatoryManagement.waitForDeployment();

  // Deploy RegulatedERC1155Token
  const RegulatedERC1155Token = await ethers.getContractFactory("RegulatedERC1155Token");
  const baseURI = "https://api.sharemarket.example.com/token/{id}.json";
  const regulatedERC1155Token = await RegulatedERC1155Token.deploy(
    await regulatoryManagement.getAddress(),
    baseURI
  );
  await regulatedERC1155Token.waitForDeployment();

  // Deploy RegulatedMarketplace
  const RegulatedMarketplace = await ethers.getContractFactory("RegulatedMarketplace");
  const regulatedMarketplace = await RegulatedMarketplace.deploy(
    await regulatoryManagement.getAddress(),
    await regulatedERC1155Token.getAddress()
  );
  await regulatedMarketplace.waitForDeployment();

  const contracts = {
    regulatoryManagement,
    regulatedERC1155Token,
    regulatedMarketplace
  };

  const deploymentInfo: DeploymentInfo = {
    regulatoryManagement: await regulatoryManagement.getAddress(),
    regulatedERC1155Token: await regulatedERC1155Token.getAddress(),
    regulatedMarketplace: await regulatedMarketplace.getAddress(),
    deployer: deployer.address,
    network: network.name,
    chainId: Number(network.chainId)
  };

  console.log("✅ Fresh contracts deployed");
  console.log("RegulatoryManagement:", deploymentInfo.regulatoryManagement);
  console.log("RegulatedERC1155Token:", deploymentInfo.regulatedERC1155Token);
  console.log("RegulatedMarketplace:", deploymentInfo.regulatedMarketplace);

  return { contracts, deploymentInfo };
}

async function demoUserRegistration(
  contracts: DemoContracts,
  company1: any,
  company2: any,
  individual1: any,
  individual2: any
) {
  console.log("\n📝 === USER REGISTRATION DEMO ===");

  // Register Company 1
  console.log("\n1️⃣ Registering Company 1...");
  await contracts.regulatoryManagement.connect(company1).registerUser(
    "ssi:company1:abc123",
    1 // Company type
  );
  console.log("✅ Company 1 registered with SSI ID: ssi:company1:abc123");

  // Register Company 2
  console.log("\n2️⃣ Registering Company 2...");
  await contracts.regulatoryManagement.connect(company2).registerUser(
    "ssi:company2:def456",
    1 // Company type
  );
  console.log("✅ Company 2 registered with SSI ID: ssi:company2:def456");

  // Register Individual 1
  console.log("\n3️⃣ Registering Individual 1...");
  await contracts.regulatoryManagement.connect(individual1).registerUser(
    "ssi:individual1:ghi789",
    0 // Individual type
  );
  console.log("✅ Individual 1 registered with SSI ID: ssi:individual1:ghi789");

  // Register Individual 2
  console.log("\n4️⃣ Registering Individual 2...");
  await contracts.regulatoryManagement.connect(individual2).registerUser(
    "ssi:individual2:jkl012",
    0 // Individual type
  );
  console.log("✅ Individual 2 registered with SSI ID: ssi:individual2:jkl012");

  // Verify registrations
  console.log("\n📊 Registration Status:");
  const company1Profile = await contracts.regulatoryManagement.getUserProfile(company1.address);
  const individual1Profile = await contracts.regulatoryManagement.getUserProfile(individual1.address);

  console.log("Company 1 - Type:", company1Profile.userType === 1n ? "Company" : "Individual");
  console.log("Individual 1 - Type:", individual1Profile.userType === 0n ? "Individual" : "Company");
}

async function demoUserVerification(
  contracts: DemoContracts,
  admin: any,
  company1: any,
  company2: any,
  individual1: any,
  individual2: any
) {
  console.log("\n✅ === USER VERIFICATION DEMO ===");

  console.log("\n1️⃣ Admin verifying all users...");

  // Verify all users
  await contracts.regulatoryManagement.connect(admin).verifyUser(company1.address);
  console.log("✅ Company 1 verified");

  await contracts.regulatoryManagement.connect(admin).verifyUser(company2.address);
  console.log("✅ Company 2 verified");

  await contracts.regulatoryManagement.connect(admin).verifyUser(individual1.address);
  console.log("✅ Individual 1 verified");

  await contracts.regulatoryManagement.connect(admin).verifyUser(individual2.address);
  console.log("✅ Individual 2 verified");

  // Check permissions
  console.log("\n📊 User Permissions:");
  console.log("Company 1 can trade:", await contracts.regulatoryManagement.canUserTrade(company1.address));
  console.log("Company 1 can create tokens:", await contracts.regulatoryManagement.canUserCreateTokens(company1.address));
  console.log("Individual 1 can trade:", await contracts.regulatoryManagement.canUserTrade(individual1.address));
  console.log("Individual 1 can create tokens:", await contracts.regulatoryManagement.canUserCreateTokens(individual1.address));
}

async function demoTokenCreation(contracts: DemoContracts, company1: any, company2: any) {
  console.log("\n🪙 === TOKEN CREATION DEMO ===");

  // Company 1 creates a token
  console.log("\n1️⃣ Company 1 creating TechCorp shares...");
  const tx1 = await contracts.regulatedERC1155Token.connect(company1).createToken(
    "TechCorp Shares",
    "TECH",
    "TechCorp Inc.",
    ethers.parseUnits("1000000", 0), // 1M max supply
    parseAmount("0.01") // 0.01 ETH initial price
  );
  const receipt1 = await tx1.wait();
  console.log("✅ TechCorp shares created - Token ID: 1");

  // Company 2 creates a token
  console.log("\n2️⃣ Company 2 creating GreenEnergy shares...");
  const tx2 = await contracts.regulatedERC1155Token.connect(company2).createToken(
    "GreenEnergy Shares",
    "GREEN",
    "GreenEnergy Ltd.",
    ethers.parseUnits("500000", 0), // 500K max supply
    parseAmount("0.02") // 0.02 ETH initial price
  );
  const receipt2 = await tx2.wait();
  console.log("✅ GreenEnergy shares created - Token ID: 2");

  // Display token information
  console.log("\n📊 Created Tokens:");
  const token1Info = await contracts.regulatedERC1155Token.getTokenInfo(1);
  const token2Info = await contracts.regulatedERC1155Token.getTokenInfo(2);

  console.log("Token 1 - Name:", token1Info.name, "| Symbol:", token1Info.symbol);
  console.log("Token 1 - Company:", token1Info.companyName, "| Max Supply:", token1Info.maxSupply.toString());
  console.log("Token 2 - Name:", token2Info.name, "| Symbol:", token2Info.symbol);
  console.log("Token 2 - Company:", token2Info.companyName, "| Max Supply:", token2Info.maxSupply.toString());
}

async function demoTokenMinting(contracts: DemoContracts, company1: any, company2: any) {
  console.log("\n🏭 === TOKEN MINTING DEMO ===");

  // Company 1 mints some of their tokens
  console.log("\n1️⃣ Company 1 minting 10,000 TechCorp shares...");
  await contracts.regulatedERC1155Token.connect(company1).mintToken(
    company1.address,
    1, // Token ID
    ethers.parseUnits("10000", 0) // Amount
  );
  console.log("✅ 10,000 TechCorp shares minted to Company 1");

  // Company 2 mints some of their tokens
  console.log("\n2️⃣ Company 2 minting 5,000 GreenEnergy shares...");
  await contracts.regulatedERC1155Token.connect(company2).mintToken(
    company2.address,
    2, // Token ID
    ethers.parseUnits("5000", 0) // Amount
  );
  console.log("✅ 5,000 GreenEnergy shares minted to Company 2");

  // Check balances
  console.log("\n📊 Token Balances:");
  const company1Balance1 = await contracts.regulatedERC1155Token.balanceOf(company1.address, 1);
  const company2Balance2 = await contracts.regulatedERC1155Token.balanceOf(company2.address, 2);

  console.log("Company 1 TechCorp shares:", company1Balance1.toString());
  console.log("Company 2 GreenEnergy shares:", company2Balance2.toString());

  // Check supply information
  const token1Supply = await contracts.regulatedERC1155Token.getCurrentSupply(1);
  const token2Supply = await contracts.regulatedERC1155Token.getCurrentSupply(2);

  console.log("TechCorp current supply:", token1Supply.toString());
  console.log("GreenEnergy current supply:", token2Supply.toString());
}

async function demoMarketplaceDeposits(
  contracts: DemoContracts,
  company1: any,
  individual1: any,
  individual2: any
) {
  console.log("\n💰 === MARKETPLACE DEPOSITS DEMO ===");

  // Individual 1 deposits ETH
  console.log("\n1️⃣ Individual 1 depositing 2 ETH...");
  await contracts.regulatedMarketplace.connect(individual1).depositETH({
    value: parseAmount("2.0")
  });
  console.log("✅ 2 ETH deposited by Individual 1");

  // Individual 2 deposits ETH
  console.log("\n2️⃣ Individual 2 depositing 3 ETH...");
  await contracts.regulatedMarketplace.connect(individual2).depositETH({
    value: parseAmount("3.0")
  });
  console.log("✅ 3 ETH deposited by Individual 2");

  // Company 1 deposits tokens
  console.log("\n3️⃣ Company 1 depositing 1,000 TechCorp shares...");
  await contracts.regulatedMarketplace.connect(company1).depositTokens(
    1, // Token ID
    ethers.parseUnits("1000", 0) // Amount
  );
  console.log("✅ 1,000 TechCorp shares deposited by Company 1");

  // Check marketplace balances
  console.log("\n📊 Marketplace Balances:");
  const individual1ETH = await contracts.regulatedMarketplace.getUserETHBalance(individual1.address);
  const individual2ETH = await contracts.regulatedMarketplace.getUserETHBalance(individual2.address);
  const company1Tokens = await contracts.regulatedMarketplace.getUserTokenBalance(company1.address, 1);

  console.log("Individual 1 ETH balance:", formatAmount(individual1ETH), "ETH");
  console.log("Individual 2 ETH balance:", formatAmount(individual2ETH), "ETH");
  console.log("Company 1 TechCorp shares balance:", company1Tokens.toString());
}

async function demoTradingScenarios(
  contracts: DemoContracts,
  company1: any,
  individual1: any,
  individual2: any
) {
  console.log("\n📈 === TRADING SCENARIOS DEMO ===");

  // Individual 1 places a buy order
  console.log("\n1️⃣ Individual 1 placing buy order for 100 TechCorp shares at 0.015 ETH each...");
  const buyOrderTx = await contracts.regulatedMarketplace.connect(individual1).placeBuyOrder(
    1, // Token ID
    ethers.parseUnits("100", 0), // Amount
    parseAmount("0.015") // Price per token
  );
  const buyReceipt = await buyOrderTx.wait();
  console.log("✅ Buy order placed");

  // Company 1 places a sell order
  console.log("\n2️⃣ Company 1 placing sell order for 50 TechCorp shares at 0.015 ETH each...");
  const sellOrderTx = await contracts.regulatedMarketplace.connect(company1).placeSellOrder(
    1, // Token ID
    ethers.parseUnits("50", 0), // Amount
    parseAmount("0.015") // Price per token
  );
  const sellReceipt = await sellOrderTx.wait();
  console.log("✅ Sell order placed - Should auto-match with buy order!");

  // Check order book
  console.log("\n📊 Order Book Status:");
  const orderBook = await contracts.regulatedMarketplace.getOrderBook(1);
  console.log("Active buy orders:", orderBook.buyOrders.length);
  console.log("Active sell orders:", orderBook.sellOrders.length);

  // Check updated balances
  console.log("\n💰 Updated Balances:");
  const individual1Balance = await contracts.regulatedMarketplace.getUserBalance(individual1.address);
  const company1Balance = await contracts.regulatedMarketplace.getUserBalance(company1.address);

  console.log("Individual 1 ETH balance:", formatAmount(individual1Balance.ethBalance), "ETH");
  console.log("Individual 1 token balances:", individual1Balance.tokenIds.length > 0 ?
    individual1Balance.tokenBalanceAmounts[0].toString() : "0");
  console.log("Company 1 ETH balance:", formatAmount(company1Balance.ethBalance), "ETH");
}

async function demoOrderManagement(
  contracts: DemoContracts,
  individual1: any,
  individual2: any
) {
  console.log("\n📋 === ORDER MANAGEMENT DEMO ===");

  // Individual 2 places an order
  console.log("\n1️⃣ Individual 2 placing buy order for 200 TechCorp shares at 0.012 ETH each...");
  const orderTx = await contracts.regulatedMarketplace.connect(individual2).placeBuyOrder(
    1, // Token ID
    ethers.parseUnits("200", 0), // Amount
    parseAmount("0.012") // Price per token
  );
  const orderReceipt = await orderTx.wait();

  // Get the order ID from events
  let orderId: bigint = 0n;
  for (const log of orderReceipt!.logs) {
    try {
      const parsedLog = contracts.regulatedMarketplace.interface.parseLog({
        topics: log.topics,
        data: log.data
      });
      if (parsedLog && parsedLog.name === 'OrderPlaced') {
        orderId = parsedLog.args.orderId;
        break;
      }
    } catch (e) {
      // Skip logs that can't be parsed
    }
  }

  console.log("✅ Buy order placed with ID:", orderId.toString());

  // Show order details
  console.log("\n📊 Order Details:");
  const order = await contracts.regulatedMarketplace.getOrder(orderId);
  console.log("Order ID:", order.orderId.toString());
  console.log("Trader:", order.trader);
  console.log("Token ID:", order.tokenId.toString());
  console.log("Amount:", order.amount.toString());
  console.log("Price:", formatAmount(order.price), "ETH");
  console.log("Status:", order.status === 0n ? "Active" : order.status === 1n ? "Filled" : "Cancelled");

  // Cancel the order
  console.log("\n2️⃣ Individual 2 cancelling the order...");
  await contracts.regulatedMarketplace.connect(individual2).cancelOrder(orderId);
  console.log("✅ Order cancelled");

  // Verify cancellation
  const cancelledOrder = await contracts.regulatedMarketplace.getOrder(orderId);
  console.log("Order status after cancellation:",
    cancelledOrder.status === 0n ? "Active" :
      cancelledOrder.status === 1n ? "Filled" : "Cancelled");
}

async function demoComplianceFeatures(
  contracts: DemoContracts,
  admin: any,
  individual1: any
) {
  console.log("\n🛡️ === COMPLIANCE FEATURES DEMO ===");

  // Show user verification status
  console.log("\n1️⃣ Checking user compliance status...");
  const isVerified = await contracts.regulatoryManagement.isUserVerified(individual1.address);
  const canTrade = await contracts.regulatoryManagement.canUserTrade(individual1.address);
  const isSuspended = await contracts.regulatoryManagement.isUserSuspended(individual1.address);

  console.log("Individual 1 verified:", isVerified);
  console.log("Individual 1 can trade:", canTrade);
  console.log("Individual 1 suspended:", isSuspended);

  // Demonstrate suspension (temporarily)
  console.log("\n2️⃣ Admin suspending Individual 1 (demo purposes)...");
  await contracts.regulatoryManagement.connect(admin).suspendUser(individual1.address);
  console.log("✅ Individual 1 suspended");

  // Check status after suspension
  const canTradeAfterSuspension = await contracts.regulatoryManagement.canUserTrade(individual1.address);
  const isSuspendedAfter = await contracts.regulatoryManagement.isUserSuspended(individual1.address);

  console.log("Individual 1 can trade after suspension:", canTradeAfterSuspension);
  console.log("Individual 1 suspended status:", isSuspendedAfter);

  // Unsuspend the user
  console.log("\n3️⃣ Admin unsuspending Individual 1...");
  await contracts.regulatoryManagement.connect(admin).unsuspendUser(individual1.address);
  console.log("✅ Individual 1 unsuspended");

  // Final status check
  const finalCanTrade = await contracts.regulatoryManagement.canUserTrade(individual1.address);
  console.log("Individual 1 can trade after unsuspension:", finalCanTrade);
}

// Utility functions for testing and development
export async function createSampleData() {
  console.log("🔧 Creating sample data for testing...");

  const [admin, company, individual] = await ethers.getSigners();

  // This would be used in test environments
  return {
    admin: admin.address,
    company: company.address,
    individual: individual.address,
    sampleSSIIds: [
      "ssi:test:company:123",
      "ssi:test:individual:456"
    ],
    sampleTokenData: {
      name: "Test Company Shares",
      symbol: "TEST",
      companyName: "Test Corp",
      maxSupply: ethers.parseUnits("100000", 0),
      initialPrice: parseAmount("0.01")
    }
  };
}

export async function getContractInstances(deploymentInfo: DeploymentInfo) {
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

export async function resetTestEnvironment() {
  console.log("🔄 Resetting test environment...");
  // This would reset state for testing purposes
  // Implementation would depend on specific testing needs
}

// Handle script execution
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Demo script failed:", error);
      process.exit(1);
    });
}