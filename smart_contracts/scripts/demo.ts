import { ethers } from "hardhat";

async function main() {
  console.log("🎯 Blockchain Share Market System - Updated Workflow Demo");
  console.log("=" .repeat(60));
  
  // Get signers
  const [deployer, company, trader1, trader2] = await ethers.getSigners();
  
  // Get contract addresses (you would replace these with actual deployed addresses)
  const regulatoryAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const tokenAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  const marketplaceAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
  
  // Get contract instances
  const regulatoryManagement = await ethers.getContractAt("RegulatoryManagement", regulatoryAddress);
  const tokenContract = await ethers.getContractAt("RegulatedERC1155Token", tokenAddress);
  const marketplace = await ethers.getContractAt("RegulatedMarketplace", marketplaceAddress);
  
  console.log("📋 Contract Addresses:");
  console.log("  🏛️  RegulatoryManagement:", regulatoryAddress);
  console.log("  🪙  RegulatedERC1155Token:", tokenAddress);
  console.log("  🏪  RegulatedMarketplace:", marketplaceAddress);
  
  console.log("\n👥 Participants:");
  console.log("  📱 Deployer/Admin:", deployer.address);
  console.log("  🏢 Company:", company.address);
  console.log("  👤 Trader 1:", trader1.address);
  console.log("  👤 Trader 2:", trader2.address);
  
  console.log("\n🔧 Step 1: User Registration (Post-SSI Authentication)");
  console.log("-".repeat(50));
  
  // Generate SSI identifiers (in real system, these would come from SSI platform)
  const ssiIdentifier1 = ethers.keccak256(ethers.toUtf8Bytes("trader1_ssi_" + Date.now()));
  const ssiIdentifier2 = ethers.keccak256(ethers.toUtf8Bytes("trader2_ssi_" + Date.now()));
  const companySsiId = ethers.keccak256(ethers.toUtf8Bytes("company_ssi_" + Date.now()));
  
  // Register users (this happens after SSI authentication)
  console.log("📝 Registering Trader 1 with SSI integration...");
  try {
    await regulatoryManagement.connect(trader1).registerUser("individual", "low", "US", ssiIdentifier1);
  } catch (error: any) {
    if (error.message.includes("already registered")) {
      console.log("ℹ️  Trader 1 already registered");
    } else {
      throw error;
    }
  }
  
  console.log("📝 Registering Trader 2 with SSI integration...");
  try {
    await regulatoryManagement.connect(trader2).registerUser("individual", "medium", "CA", ssiIdentifier2);
  } catch (error: any) {
    if (error.message.includes("already registered")) {
      console.log("ℹ️  Trader 2 already registered");
    } else {
      throw error;
    }
  }
  
  console.log("📝 Registering Company with SSI integration...");
  try {
    await regulatoryManagement.connect(company).registerUser("company", "low", "US", companySsiId);
  } catch (error: any) {
    if (error.message.includes("already registered")) {
      console.log("ℹ️  Company already registered");
    } else {
      throw error;
    }
  }
  
  console.log("\n✅ Step 2: Admin Verification (Post-External KYC)");
  console.log("-".repeat(50));
  
  // Verify users (this happens after external KYC through SSI system)
  console.log("🔍 Verifying Trader 1 (post-SSI KYC)...");
  try {
    await regulatoryManagement.connect(deployer).verifyUser(trader1.address);
  } catch (error: any) {
    if (error.message.includes("already verified")) {
      console.log("ℹ️  Trader 1 already verified");
    } else {
      throw error;
    }
  }
  
  console.log("🔍 Verifying Trader 2 (post-SSI KYC)...");
  try {
    await regulatoryManagement.connect(deployer).verifyUser(trader2.address);
  } catch (error: any) {
    if (error.message.includes("already verified")) {
      console.log("ℹ️  Trader 2 already verified");
    } else {
      throw error;
    }
  }
  
  console.log("🔍 Verifying Company (post-SSI KYC)...");
  try {
    await regulatoryManagement.connect(deployer).verifyUser(company.address);
  } catch (error: any) {
    if (error.message.includes("already verified")) {
      console.log("ℹ️  Company already verified");
    } else {
      throw error;
    }
  }
  
  console.log("\n🏢 Step 3: Company Registration & Token Creation");
  console.log("-".repeat(50));
  
  // Company registers for token creation
  console.log("🏗️  Company registering for token creation...");
  try {
    await tokenContract.connect(company).registerCompany(
      "TechCorp Inc",
      "TC-2025-001",
      "Technology",
      "US"
    );
  } catch (error: any) {
    if (error.message.includes("already registered")) {
      console.log("ℹ️  Company already registered for token creation");
    } else {
      throw error;
    }
  }
  
  // Admin verifies company
  console.log("✅ Admin verifying company...");
  try {
    await tokenContract.connect(deployer).verifyCompany(company.address);
  } catch (error: any) {
    if (error.message.includes("already verified")) {
      console.log("ℹ️  Company already verified for token creation");
    } else {
      throw error;
    }
  }
  
  // Company creates token
  console.log("🪙 Company creating token...");
  const tokenTx = await tokenContract.connect(company).createToken(
    "TechCorp Shares",
    "TCS",
    "Common shares of TechCorp Inc",
    "TechCorp Inc",
    "Technology",
    1000000, // max supply
    "https://api.techcorp.com/token/1",
    500, // 5% dividend yield
    ethers.parseEther("0.1"), // $0.10 par value
    "common"
  );
  
  const tokenId = 1; // First token ID
  console.log("📄 Token created with ID:", tokenId);
  
  // Mint some tokens to company
  console.log("🔨 Minting tokens to company...");
  await tokenContract.connect(deployer).mintToken(tokenId, company.address, 10000);
  
  console.log("\n🏪 Step 4: Marketplace Trading");
  console.log("-".repeat(50));
  
  // Company approves marketplace to handle tokens
  console.log("🔑 Company approving marketplace...");
  await tokenContract.connect(company).setApprovalForAll(marketplaceAddress, true);
   // Create a fixed-price listing
  console.log("📋 Creating fixed-price listing...");
  const pricePerToken = ethers.parseEther("0.15"); // $0.15 per token
  const amount = 100; // List 100 tokens for demo
  const expirationTime = Math.floor(Date.now() / 1000) + 86400; // 24 hours

  await marketplace.connect(company).createFixedPriceListing(
    tokenAddress,
    tokenId,
    amount,
    pricePerToken,
    expirationTime
  );
  
  console.log("💰 Listing created: 100 tokens at 0.15 ETH each");
  
  // Trader 1 purchases the entire listing
  console.log("🛒 Trader 1 purchasing the entire listing (100 tokens)...");
  const totalCost = pricePerToken * BigInt(amount);

  await marketplace.connect(trader1).purchaseTokens(1, { value: totalCost });
  
  console.log("✅ Purchase completed!");
  
  console.log("\n📊 Step 5: System Status Check");
  console.log("-".repeat(50));
  
  // Check balances and statuses
  const trader1Balance = await tokenContract.balanceOf(trader1.address, tokenId);
  const trader1Profile = await regulatoryManagement.getUserProfile(trader1.address);
  const trader1SSI = await regulatoryManagement.getUserSSIIdentifier(trader1.address);
  const trader1Jurisdiction = await regulatoryManagement.getUserJurisdiction(trader1.address);
  
  console.log("👤 Trader 1 Status:");
  console.log("  🪙 Token Balance:", trader1Balance.toString());
  console.log("  ✅ Verified:", trader1Profile.isVerified);
  console.log("  🔄 Can Trade:", trader1Profile.canTrade);
  console.log("  🌍 Jurisdiction:", trader1Jurisdiction);
  console.log("  🔐 SSI ID:", trader1SSI);
  
  const activeListings = await marketplace.getActiveListings();
  console.log("\n🏪 Active Listings:", activeListings.length);
  
  if (activeListings.length > 0) {
    const listing = await marketplace.getListing(activeListings[0]);
    console.log("  📋 Listing ID:", listing.listingId.toString());
    console.log("  🪙 Remaining Amount:", listing.amount.toString());
    console.log("  💰 Price per Token:", ethers.formatEther(listing.pricePerToken), "ETH");
  }
  
  console.log("\n🎉 Workflow Demo Completed Successfully!");
  console.log("🔒 Key Features Demonstrated:");
  console.log("  ✅ SSI Integration (no personal data stored on-chain)");
  console.log("  ✅ External KYC verification workflow");
  console.log("  ✅ Regulatory compliance checks");
  console.log("  ✅ Token creation and trading");
  console.log("  ✅ Secure marketplace operations");
  console.log("  ✅ Jurisdiction tracking");
  console.log("  ✅ Trading limit enforcement");
}

main().catch((error) => {
  console.error("❌ Demo failed:", error);
  process.exitCode = 1;
});
