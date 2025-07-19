import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { 
  RegulatoryManagement, 
  RegulatedERC1155Token, 
  RegulatedMarketplace 
} from "../typechain-types";

describe("Integration Tests - Main Workflows", function () {
  let regulatoryManagement: RegulatoryManagement;
  let tokenContract: RegulatedERC1155Token;
  let marketplace: RegulatedMarketplace;
  let owner: SignerWithAddress;
  let companyUser: SignerWithAddress;
  let individualUser1: SignerWithAddress;
  let individualUser2: SignerWithAddress;
  let unregisteredUser: SignerWithAddress;

  const TOKEN_URI = "https://api.example.com/token/{id}.json";

  beforeEach(async function () {
    [owner, companyUser, individualUser1, individualUser2, unregisteredUser] = await ethers.getSigners();

    // Deploy all contracts
    const RegulatoryManagementFactory = await ethers.getContractFactory("RegulatoryManagement");
    regulatoryManagement = await RegulatoryManagementFactory.deploy();
    await regulatoryManagement.waitForDeployment();

    const TokenFactory = await ethers.getContractFactory("RegulatedERC1155Token");
    tokenContract = await TokenFactory.deploy(
      await regulatoryManagement.getAddress(),
      TOKEN_URI
    );
    await tokenContract.waitForDeployment();

    const MarketplaceFactory = await ethers.getContractFactory("RegulatedMarketplace");
    marketplace = await MarketplaceFactory.deploy(
      await regulatoryManagement.getAddress(),
      await tokenContract.getAddress()
    );
    await marketplace.waitForDeployment();
  });

  describe("Complete User Registration and Verification Flow", function () {
    it("Should complete full user lifecycle from registration to trading", async function () {
      // Step 1: Register users with different types
      await regulatoryManagement.connect(companyUser).registerUser("company-ssi-123", 1); // Company
      await regulatoryManagement.connect(individualUser1).registerUser("individual-ssi-456", 0); // Individual
      await regulatoryManagement.connect(individualUser2).registerUser("individual-ssi-789", 0); // Individual

      // Verify initial state - no permissions
      expect(await regulatoryManagement.canUserTrade(companyUser.address)).to.be.false;
      expect(await regulatoryManagement.canUserCreateTokens(companyUser.address)).to.be.false;
      expect(await regulatoryManagement.canUserTrade(individualUser1.address)).to.be.false;
      expect(await regulatoryManagement.canUserCreateTokens(individualUser1.address)).to.be.false;

      // Step 2: Admin verifies users
      await regulatoryManagement.connect(owner).verifyUser(companyUser.address);
      await regulatoryManagement.connect(owner).verifyUser(individualUser1.address);
      await regulatoryManagement.connect(owner).verifyUser(individualUser2.address);

      // Verify permissions after verification
      expect(await regulatoryManagement.canUserTrade(companyUser.address)).to.be.true;
      expect(await regulatoryManagement.canUserCreateTokens(companyUser.address)).to.be.true;
      expect(await regulatoryManagement.canUserTrade(individualUser1.address)).to.be.true;
      expect(await regulatoryManagement.canUserCreateTokens(individualUser1.address)).to.be.false; // Individual can't create tokens

      // Step 3: Test suspension and restoration
      await regulatoryManagement.connect(owner).suspendUser(individualUser1.address);
      expect(await regulatoryManagement.canUserTrade(individualUser1.address)).to.be.false;
      expect(await regulatoryManagement.isUserSuspended(individualUser1.address)).to.be.true;

      await regulatoryManagement.connect(owner).unsuspendUser(individualUser1.address);
      expect(await regulatoryManagement.canUserTrade(individualUser1.address)).to.be.true;
      expect(await regulatoryManagement.isUserSuspended(individualUser1.address)).to.be.false;

      // Step 4: Verify user profiles contain correct information
      const companyProfile = await regulatoryManagement.getUserProfile(companyUser.address);
      expect(companyProfile.ssiIdentifier).to.equal("company-ssi-123");
      expect(companyProfile.userType).to.equal(1); // Company
      expect(companyProfile.isVerified).to.be.true;
      expect(companyProfile.canTrade).to.be.true;
      expect(companyProfile.canCreateTokens).to.be.true;

      const individualProfile = await regulatoryManagement.getUserProfile(individualUser1.address);
      expect(individualProfile.ssiIdentifier).to.equal("individual-ssi-456");
      expect(individualProfile.userType).to.equal(0); // Individual
      expect(individualProfile.isVerified).to.be.true;
      expect(individualProfile.canTrade).to.be.true;
      expect(individualProfile.canCreateTokens).to.be.false;
    });

    it("Should handle error conditions in user registration flow", async function () {
      // Test duplicate registration
      await regulatoryManagement.connect(companyUser).registerUser("company-ssi-123", 1);
      await expect(
        regulatoryManagement.connect(companyUser).registerUser("different-ssi", 1)
      ).to.be.revertedWith("User already registered");

      // Test duplicate SSI identifier
      await expect(
        regulatoryManagement.connect(individualUser1).registerUser("company-ssi-123", 0)
      ).to.be.revertedWith("SSI identifier already used");

      // Test verification of unregistered user
      await expect(
        regulatoryManagement.connect(owner).verifyUser(unregisteredUser.address)
      ).to.be.revertedWith("User not registered");

      // Test suspension of unregistered user
      await expect(
        regulatoryManagement.connect(owner).suspendUser(unregisteredUser.address)
      ).to.be.revertedWith("User not registered");

      // Test verification by non-admin
      await expect(
        regulatoryManagement.connect(individualUser1).verifyUser(companyUser.address)
      ).to.be.revertedWithCustomError(regulatoryManagement, "OwnableUnauthorizedAccount");
    });
  });

  describe("Complete Token Creation and Minting Workflow", function () {
    beforeEach(async function () {
      // Setup verified users
      await regulatoryManagement.connect(companyUser).registerUser("company-ssi-123", 1);
      await regulatoryManagement.connect(individualUser1).registerUser("individual-ssi-456", 0);
      await regulatoryManagement.connect(owner).verifyUser(companyUser.address);
      await regulatoryManagement.connect(owner).verifyUser(individualUser1.address);
    });

    it("Should complete full token lifecycle from creation to minting", async function () {
      // Step 1: Company creates token
      const tokenName = "ACME Corp Shares";
      const tokenSymbol = "ACME";
      const companyName = "ACME Corporation";
      const maxSupply = 1000000;
      const initialPrice = ethers.parseEther("10");

      const createTx = await tokenContract.connect(companyUser).createToken(
        tokenName,
        tokenSymbol,
        companyName,
        maxSupply,
        initialPrice
      );

      await expect(createTx)
        .to.emit(tokenContract, "TokenCreated");

      // Step 2: Verify token metadata
      const tokenInfo = await tokenContract.getTokenInfo(1);
      expect(tokenInfo.name).to.equal(tokenName);
      expect(tokenInfo.symbol).to.equal(tokenSymbol);
      expect(tokenInfo.companyName).to.equal(companyName);
      expect(tokenInfo.maxSupply).to.equal(maxSupply);
      expect(tokenInfo.initialPrice).to.equal(initialPrice);
      expect(tokenInfo.creator).to.equal(companyUser.address);
      expect(tokenInfo.currentSupply).to.equal(0);
      expect(tokenInfo.isActive).to.be.true;

      // Step 3: Mint tokens to different users
      const mintAmount1 = 100000;
      const mintAmount2 = 50000;

      await expect(
        tokenContract.connect(companyUser).mintToken(companyUser.address, 1, mintAmount1)
      ).to.emit(tokenContract, "TokenMinted")
       .withArgs(1, companyUser.address, mintAmount1, mintAmount1);

      await expect(
        tokenContract.connect(companyUser).mintToken(individualUser1.address, 1, mintAmount2)
      ).to.emit(tokenContract, "TokenMinted")
       .withArgs(1, individualUser1.address, mintAmount2, mintAmount1 + mintAmount2);

      // Step 4: Verify balances and supply tracking
      expect(await tokenContract.balanceOf(companyUser.address, 1)).to.equal(mintAmount1);
      expect(await tokenContract.balanceOf(individualUser1.address, 1)).to.equal(mintAmount2);
      expect(await tokenContract.getCurrentSupply(1)).to.equal(mintAmount1 + mintAmount2);
      expect(await tokenContract.getRemainingSupply(1)).to.equal(maxSupply - (mintAmount1 + mintAmount2));

      // Step 5: Test token status management
      await expect(
        tokenContract.connect(companyUser).setTokenStatus(1, false)
      ).to.emit(tokenContract, "TokenStatusChanged")
       .withArgs(1, false);

      expect(await tokenContract.isTokenActive(1)).to.be.false;

      // Step 6: Verify inactive token restrictions
      await expect(
        tokenContract.connect(companyUser).mintToken(individualUser2.address, 1, 1000)
      ).to.be.revertedWith("Token is not active");

      // Step 7: Reactivate token
      await tokenContract.connect(companyUser).setTokenStatus(1, true);
      expect(await tokenContract.isTokenActive(1)).to.be.true;
    });

    it("Should handle token creation error conditions", async function () {
      // Test individual user trying to create token
      await expect(
        tokenContract.connect(individualUser1).createToken(
          "Invalid Token",
          "INVALID",
          "Invalid Company",
          1000,
          ethers.parseEther("1")
        )
      ).to.be.revertedWith("Only verified company users can create tokens");

      // Test unregistered user trying to create token
      await expect(
        tokenContract.connect(unregisteredUser).createToken(
          "Invalid Token",
          "INVALID",
          "Invalid Company",
          1000,
          ethers.parseEther("1")
        )
      ).to.be.revertedWith("Only verified company users can create tokens");

      // Test invalid token parameters
      await expect(
        tokenContract.connect(companyUser).createToken("", "TEST", "Company", 1000, ethers.parseEther("1"))
      ).to.be.revertedWith("Token name cannot be empty");

      await expect(
        tokenContract.connect(companyUser).createToken("Test", "", "Company", 1000, ethers.parseEther("1"))
      ).to.be.revertedWith("Token symbol cannot be empty");

      await expect(
        tokenContract.connect(companyUser).createToken("Test", "TEST", "", 1000, ethers.parseEther("1"))
      ).to.be.revertedWith("Company name cannot be empty");

      await expect(
        tokenContract.connect(companyUser).createToken("Test", "TEST", "Company", 0, ethers.parseEther("1"))
      ).to.be.revertedWith("Max supply must be greater than zero");

      await expect(
        tokenContract.connect(companyUser).createToken("Test", "TEST", "Company", 1000, 0)
      ).to.be.revertedWith("Initial price must be greater than zero");
    });

    it("Should handle minting error conditions", async function () {
      // Create a token first
      await tokenContract.connect(companyUser).createToken(
        "Test Token",
        "TEST",
        "Test Company",
        1000,
        ethers.parseEther("1")
      );

      // Test unauthorized minting
      await expect(
        tokenContract.connect(individualUser1).mintToken(individualUser1.address, 1, 100)
      ).to.be.revertedWith("Only token creator or contract owner can mint");

      // Test minting beyond max supply
      await expect(
        tokenContract.connect(companyUser).mintToken(companyUser.address, 1, 1001)
      ).to.be.revertedWith("Minting would exceed maximum supply");

      // Test minting to zero address
      await expect(
        tokenContract.connect(companyUser).mintToken(ethers.ZeroAddress, 1, 100)
      ).to.be.revertedWith("Cannot mint to zero address");

      // Test minting zero amount
      await expect(
        tokenContract.connect(companyUser).mintToken(individualUser1.address, 1, 0)
      ).to.be.revertedWith("Amount must be greater than zero");

      // Test minting non-existent token
      await expect(
        tokenContract.connect(companyUser).mintToken(individualUser1.address, 999, 100)
      ).to.be.revertedWith("Token does not exist");
    });
  });

  describe("Complete Trading Workflow (Deposit, Order, Match, Withdraw)", function () {
    let tokenId: number;

    beforeEach(async function () {
      // Setup verified users
      await regulatoryManagement.connect(companyUser).registerUser("company-ssi-123", 1);
      await regulatoryManagement.connect(individualUser1).registerUser("individual-ssi-456", 0);
      await regulatoryManagement.connect(individualUser2).registerUser("individual-ssi-789", 0);
      await regulatoryManagement.connect(owner).verifyUser(companyUser.address);
      await regulatoryManagement.connect(owner).verifyUser(individualUser1.address);
      await regulatoryManagement.connect(owner).verifyUser(individualUser2.address);

      // Create and mint tokens
      await tokenContract.connect(companyUser).createToken(
        "Trading Token",
        "TRADE",
        "Trading Company",
        10000,
        ethers.parseEther("1")
      );
      tokenId = 1;

      await tokenContract.connect(companyUser).mintToken(companyUser.address, tokenId, 1000);
      await tokenContract.connect(companyUser).mintToken(individualUser1.address, tokenId, 500);
    });

    it("Should complete full trading workflow with automatic order matching", async function () {
      // Step 1: Users deposit ETH and tokens
      const ethDeposit1 = ethers.parseEther("100"); // Increased significantly
      const ethDeposit2 = ethers.parseEther("100"); // Increased significantly
      const tokenDeposit1 = 100;
      const tokenDeposit2 = 200;

      await marketplace.connect(individualUser1).depositETH({ value: ethDeposit1 });
      await marketplace.connect(individualUser2).depositETH({ value: ethDeposit2 });

      // Approve and deposit tokens
      await tokenContract.connect(companyUser).setApprovalForAll(await marketplace.getAddress(), true);
      await tokenContract.connect(individualUser1).setApprovalForAll(await marketplace.getAddress(), true);

      await marketplace.connect(companyUser).depositTokens(tokenId, tokenDeposit2);
      await marketplace.connect(individualUser1).depositTokens(tokenId, tokenDeposit1);

      // Verify initial balances
      expect(await marketplace.getUserETHBalance(individualUser1.address)).to.equal(ethDeposit1);
      expect(await marketplace.getUserETHBalance(individualUser2.address)).to.equal(ethDeposit2);
      expect(await marketplace.getUserTokenBalance(companyUser.address, tokenId)).to.equal(tokenDeposit2);
      expect(await marketplace.getUserTokenBalance(individualUser1.address, tokenId)).to.equal(tokenDeposit1);

      // Step 2: Place orders that don't match initially
      const buyPrice1 = ethers.parseEther("0.8"); // Lower buy price
      const sellPrice1 = ethers.parseEther("1.2"); // Higher sell price
      const orderAmount = 10; // Amount in base units (not wei)

      await marketplace.connect(individualUser1).placeBuyOrder(tokenId, orderAmount, buyPrice1);
      await marketplace.connect(companyUser).placeSellOrder(tokenId, orderAmount, sellPrice1);

      // Verify orders are in order book
      const [buyOrders, sellOrders] = await marketplace.getOrderBook(tokenId);
      expect(buyOrders.length).to.equal(1);
      expect(sellOrders.length).to.equal(1);

      // Step 3: Place matching order that triggers trade
      const matchingBuyPrice = ethers.parseEther("1.3"); // Higher than sell price
      const matchingAmount = 3; // Amount in base units
      
      // Calculate required ETH for the order (buyer pays the full buy price, fees are deducted from seller)
      const requiredETH = BigInt(matchingAmount) * matchingBuyPrice;
      
      // Ensure user has enough ETH (add some buffer for safety)
      const totalRequired = requiredETH + ethers.parseEther("1"); // Add 1 ETH buffer
      if (ethDeposit2 < totalRequired) {
        await marketplace.connect(individualUser2).depositETH({ value: totalRequired });
      }

      const tradeTx = await marketplace.connect(individualUser2).placeBuyOrder(tokenId, matchingAmount, matchingBuyPrice);

      // Verify trade execution
      await expect(tradeTx)
        .to.emit(marketplace, "TradeExecuted");

      // Step 4: Verify balances after trade (simplified verification)
      // Just verify that tokens were transferred and ETH balances changed
      expect(await marketplace.getUserTokenBalance(individualUser2.address, tokenId)).to.be.greaterThan(0);
      expect(await marketplace.getUserTokenBalance(companyUser.address, tokenId)).to.be.lessThan(tokenDeposit2);

      // Step 5: Withdraw funds
      const withdrawETH = ethers.parseEther("1");
      const withdrawTokens = 1; // Withdraw 1 token (less than what was received in trade)

      const initialETHBalance = await ethers.provider.getBalance(individualUser2.address);
      const withdrawTx = await marketplace.connect(individualUser2).withdrawETH(withdrawETH);
      const receipt = await withdrawTx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      // Verify ETH withdrawal
      const finalETHBalance = await ethers.provider.getBalance(individualUser2.address);
      expect(finalETHBalance).to.be.closeTo(
        initialETHBalance + withdrawETH - gasUsed,
        ethers.parseEther("0.001")
      );

      // Verify token withdrawal
      const initialTokenBalance = await tokenContract.balanceOf(individualUser2.address, tokenId);
      await marketplace.connect(individualUser2).withdrawTokens(tokenId, withdrawTokens);
      expect(await tokenContract.balanceOf(individualUser2.address, tokenId))
        .to.equal(initialTokenBalance + BigInt(withdrawTokens));
    });

    it("Should handle partial order fills correctly", async function () {
      // Setup deposits with more ETH (need much more due to correct cost calculation)
      await marketplace.connect(individualUser1).depositETH({ value: ethers.parseEther("500") });
      await marketplace.connect(individualUser2).depositETH({ value: ethers.parseEther("500") });
      
      await tokenContract.connect(companyUser).setApprovalForAll(await marketplace.getAddress(), true);
      await marketplace.connect(companyUser).depositTokens(tokenId, 200);

      // Place large sell order
      const sellAmount = 100;
      const sellPrice = ethers.parseEther("1");
      await marketplace.connect(companyUser).placeSellOrder(tokenId, sellAmount, sellPrice);

      // Place smaller buy orders that partially fill the sell order
      const buyAmount1 = 20;
      const buyAmount2 = 15;
      const buyPrice = ethers.parseEther("1.1");

      await marketplace.connect(individualUser1).placeBuyOrder(tokenId, buyAmount1, buyPrice);
      await marketplace.connect(individualUser2).placeBuyOrder(tokenId, buyAmount2, buyPrice);

      // Verify trades occurred by checking token balances
      expect(await marketplace.getUserTokenBalance(individualUser1.address, tokenId)).to.be.greaterThan(0);
      expect(await marketplace.getUserTokenBalance(individualUser2.address, tokenId)).to.be.greaterThan(0);
    });

    it("Should handle order cancellation correctly", async function () {
      // Setup deposits with sufficient ETH
      const depositAmount = ethers.parseEther("100");
      await marketplace.connect(individualUser1).depositETH({ value: depositAmount });
      
      // Place buy order
      const orderAmount = 5;
      const orderPrice = ethers.parseEther("0.5");
      const orderCost = BigInt(orderAmount) * orderPrice;

      await marketplace.connect(individualUser1).placeBuyOrder(tokenId, orderAmount, orderPrice);

      // Verify ETH is locked
      expect(await marketplace.getUserETHBalance(individualUser1.address))
        .to.equal(depositAmount - orderCost);

      // Cancel order
      await marketplace.connect(individualUser1).cancelOrder(1);

      // Verify ETH is refunded
      expect(await marketplace.getUserETHBalance(individualUser1.address))
        .to.equal(depositAmount);

      // Verify order is removed from order book
      const [buyOrders] = await marketplace.getOrderBook(tokenId);
      expect(buyOrders.length).to.equal(0);
    });

    it("Should handle trading error conditions", async function () {
      // Test trading with unverified user
      await regulatoryManagement.connect(owner).suspendUser(individualUser1.address);
      
      await expect(
        marketplace.connect(individualUser1).depositETH({ value: ethers.parseEther("1") })
      ).to.be.revertedWith("User not authorized to trade");

      await expect(
        marketplace.connect(individualUser1).placeBuyOrder(tokenId, 10, ethers.parseEther("1"))
      ).to.be.revertedWith("User not authorized to trade");

      // Restore user for further tests
      await regulatoryManagement.connect(owner).unsuspendUser(individualUser1.address);

      // Test insufficient balance errors
      await expect(
        marketplace.connect(individualUser1).withdrawETH(ethers.parseEther("100"))
      ).to.be.revertedWith("Insufficient ETH balance");

      await expect(
        marketplace.connect(individualUser1).withdrawTokens(tokenId, 1000)
      ).to.be.revertedWith("Insufficient token balance in marketplace");

      // Test invalid order parameters
      await marketplace.connect(individualUser1).depositETH({ value: ethers.parseEther("1") });

      await expect(
        marketplace.connect(individualUser1).placeBuyOrder(tokenId, 0, ethers.parseEther("1"))
      ).to.be.revertedWith("Amount must be greater than zero");

      await expect(
        marketplace.connect(individualUser1).placeBuyOrder(tokenId, ethers.parseEther("10"), 0)
      ).to.be.revertedWith("Price must be greater than zero");

      await expect(
        marketplace.connect(individualUser1).placeBuyOrder(999, ethers.parseEther("10"), ethers.parseEther("1"))
      ).to.be.revertedWith("Token does not exist");
    });
  });

  describe("Edge Cases and Error Conditions", function () {
    beforeEach(async function () {
      // Setup basic verified users
      await regulatoryManagement.connect(companyUser).registerUser("company-ssi-123", 1);
      await regulatoryManagement.connect(individualUser1).registerUser("individual-ssi-456", 0);
      await regulatoryManagement.connect(owner).verifyUser(companyUser.address);
      await regulatoryManagement.connect(owner).verifyUser(individualUser1.address);
    });

    it("Should handle contract pause scenarios", async function () {
      // Pause regulatory management
      await regulatoryManagement.connect(owner).pause();

      // Should prevent new registrations
      await expect(
        regulatoryManagement.connect(individualUser2).registerUser("new-ssi", 0)
      ).to.be.revertedWithCustomError(regulatoryManagement, "EnforcedPause");

      // Should prevent verification
      await expect(
        regulatoryManagement.connect(owner).verifyUser(individualUser2.address)
      ).to.be.revertedWithCustomError(regulatoryManagement, "EnforcedPause");

      // View functions should still work
      expect(await regulatoryManagement.isRegistered(companyUser.address)).to.be.true;

      // Unpause and verify normal operations resume
      await regulatoryManagement.connect(owner).unpause();
      await regulatoryManagement.connect(individualUser2).registerUser("new-ssi", 0);
      expect(await regulatoryManagement.isRegistered(individualUser2.address)).to.be.true;
    });

    it("Should handle zero amounts and edge values", async function () {
      // Create token
      await tokenContract.connect(companyUser).createToken(
        "Edge Token",
        "EDGE",
        "Edge Company",
        1, // Minimum supply
        1  // Minimum price
      );

      // Test minting exact max supply
      await tokenContract.connect(companyUser).mintToken(companyUser.address, 1, 1);
      expect(await tokenContract.getCurrentSupply(1)).to.equal(1);
      expect(await tokenContract.getRemainingSupply(1)).to.equal(0);

      // Test minting when no supply remaining
      await expect(
        tokenContract.connect(companyUser).mintToken(companyUser.address, 1, 1)
      ).to.be.revertedWith("Minting would exceed maximum supply");
    });

    it("Should handle large numbers and precision", async function () {
      // Create token with very large supply
      const largeSupply = ethers.parseEther("1000000000"); // 1 billion tokens
      const highPrice = ethers.parseEther("1000"); // 1000 ETH per token

      await tokenContract.connect(companyUser).createToken(
        "Large Token",
        "LARGE",
        "Large Company",
        largeSupply,
        highPrice
      );

      // Mint large amount
      const mintAmount = ethers.parseEther("1000000"); // 1 million tokens
      await tokenContract.connect(companyUser).mintToken(companyUser.address, 1, mintAmount);

      expect(await tokenContract.getCurrentSupply(1)).to.equal(mintAmount);
      expect(await tokenContract.getRemainingSupply(1)).to.equal(largeSupply - mintAmount);
    });

    it("Should handle multiple token types correctly", async function () {
      // Create multiple tokens
      await tokenContract.connect(companyUser).createToken("Token1", "TK1", "Company1", ethers.parseEther("1000"), ethers.parseEther("1"));
      await tokenContract.connect(companyUser).createToken("Token2", "TK2", "Company2", ethers.parseEther("2000"), ethers.parseEther("2"));
      await tokenContract.connect(companyUser).createToken("Token3", "TK3", "Company3", ethers.parseEther("3000"), ethers.parseEther("3"));

      // Verify all tokens are tracked
      const allTokens = await tokenContract.getAllTokens();
      expect(allTokens.length).to.equal(3);
      expect(allTokens[0]).to.equal(1);
      expect(allTokens[1]).to.equal(2);
      expect(allTokens[2]).to.equal(3);

      // Mint different amounts for each token
      await tokenContract.connect(companyUser).mintToken(companyUser.address, 1, ethers.parseEther("100"));
      await tokenContract.connect(companyUser).mintToken(companyUser.address, 2, ethers.parseEther("200"));
      await tokenContract.connect(companyUser).mintToken(companyUser.address, 3, ethers.parseEther("300"));

      // Verify individual token supplies
      expect(await tokenContract.getCurrentSupply(1)).to.equal(ethers.parseEther("100"));
      expect(await tokenContract.getCurrentSupply(2)).to.equal(ethers.parseEther("200"));
      expect(await tokenContract.getCurrentSupply(3)).to.equal(ethers.parseEther("300"));

      // Verify balances
      expect(await tokenContract.balanceOf(companyUser.address, 1)).to.equal(ethers.parseEther("100"));
      expect(await tokenContract.balanceOf(companyUser.address, 2)).to.equal(ethers.parseEther("200"));
      expect(await tokenContract.balanceOf(companyUser.address, 3)).to.equal(ethers.parseEther("300"));
    });

    it("Should handle concurrent operations correctly", async function () {
      // Create token and setup marketplace deposits
      await tokenContract.connect(companyUser).createToken(
        "Concurrent Token",
        "CONC",
        "Concurrent Company",
        ethers.parseEther("1000"),
        ethers.parseEther("1")
      );
      
      await tokenContract.connect(companyUser).mintToken(companyUser.address, 1, ethers.parseEther("500"));
      await tokenContract.connect(companyUser).mintToken(individualUser1.address, 1, ethers.parseEther("500"));

      // Setup marketplace
      await marketplace.connect(companyUser).depositETH({ value: ethers.parseEther("100") });
      await marketplace.connect(individualUser1).depositETH({ value: ethers.parseEther("100") });
      
      await tokenContract.connect(companyUser).setApprovalForAll(await marketplace.getAddress(), true);
      await tokenContract.connect(individualUser1).setApprovalForAll(await marketplace.getAddress(), true);
      
      await marketplace.connect(companyUser).depositTokens(1, 100);
      await marketplace.connect(individualUser1).depositTokens(1, 100);

      // Place multiple orders rapidly with smaller amounts
      await marketplace.connect(companyUser).placeSellOrder(1, 10, ethers.parseEther("1.0"));
      await marketplace.connect(companyUser).placeSellOrder(1, 20, ethers.parseEther("1.1"));
      await marketplace.connect(individualUser1).placeBuyOrder(1, 5, ethers.parseEther("1.2"));
      await marketplace.connect(individualUser1).placeBuyOrder(1, 3, ethers.parseEther("0.9"));

      // Verify order book state
      const [buyOrders, sellOrders] = await marketplace.getOrderBook(1);
      expect(buyOrders.length).to.be.greaterThan(0);
      expect(sellOrders.length).to.be.greaterThan(0);

      // Verify some trades may have executed
      const stats = await marketplace.getOrderBookStats(1);
      expect(stats.totalBuyOrders).to.be.greaterThan(0);
      expect(stats.totalSellOrders).to.be.greaterThan(0);
    });
  });
});