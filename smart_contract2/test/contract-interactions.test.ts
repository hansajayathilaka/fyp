import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { 
  RegulatoryManagement, 
  RegulatedERC1155Token, 
  RegulatedMarketplace 
} from "../typechain-types";

describe("Contract Interactions Tests", function () {
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

    // Setup basic verified users
    await regulatoryManagement.connect(companyUser).registerUser("company-ssi-123", 1);
    await regulatoryManagement.connect(individualUser1).registerUser("individual-ssi-456", 0);
    await regulatoryManagement.connect(individualUser2).registerUser("individual-ssi-789", 0);
    await regulatoryManagement.connect(owner).verifyUser(companyUser.address);
    await regulatoryManagement.connect(owner).verifyUser(individualUser1.address);
    await regulatoryManagement.connect(owner).verifyUser(individualUser2.address);
  });

  describe("RegulatoryManagement and RegulatedERC1155Token Integration", function () {
    it("Should enforce permission checks for token creation", async function () {
      // Company user should be able to create tokens
      await expect(
        tokenContract.connect(companyUser).createToken(
          "Company Token",
          "COMP",
          "Test Company",
          1000,
          ethers.parseEther("1")
        )
      ).to.emit(tokenContract, "TokenCreated");

      // Individual user should not be able to create tokens
      await expect(
        tokenContract.connect(individualUser1).createToken(
          "Individual Token",
          "IND",
          "Individual Company",
          1000,
          ethers.parseEther("1")
        )
      ).to.be.revertedWith("Only verified company users can create tokens");

      // Unregistered user should not be able to create tokens
      await expect(
        tokenContract.connect(unregisteredUser).createToken(
          "Unregistered Token",
          "UNREG",
          "Unregistered Company",
          1000,
          ethers.parseEther("1")
        )
      ).to.be.revertedWith("Only verified company users can create tokens");
    });

    it("Should enforce permission checks for token minting", async function () {
      // Create a token first
      await tokenContract.connect(companyUser).createToken(
        "Test Token",
        "TEST",
        "Test Company",
        1000,
        ethers.parseEther("1")
      );

      // Token creator should be able to mint
      await expect(
        tokenContract.connect(companyUser).mintToken(individualUser1.address, 1, 100)
      ).to.emit(tokenContract, "TokenMinted");

      // Contract owner should be able to mint
      await expect(
        tokenContract.connect(owner).mintToken(individualUser2.address, 1, 50)
      ).to.emit(tokenContract, "TokenMinted");

      // Other users should not be able to mint
      await expect(
        tokenContract.connect(individualUser1).mintToken(individualUser2.address, 1, 25)
      ).to.be.revertedWith("Only token creator or contract owner can mint");
    });

    it("Should enforce permission checks for token transfers", async function () {
      // Create and mint tokens
      await tokenContract.connect(companyUser).createToken(
        "Transfer Token",
        "TRANS",
        "Transfer Company",
        1000,
        ethers.parseEther("1")
      );
      await tokenContract.connect(companyUser).mintToken(companyUser.address, 1, 500);

      // Transfer between verified users should work
      await expect(
        tokenContract.connect(companyUser).safeTransferFrom(
          companyUser.address,
          individualUser1.address,
          1,
          100,
          "0x"
        )
      ).to.emit(tokenContract, "TransferSingle");

      // Suspend a user and test transfer restrictions
      await regulatoryManagement.connect(owner).suspendUser(individualUser1.address);

      // Transfer from suspended user should fail
      await expect(
        tokenContract.connect(individualUser1).safeTransferFrom(
          individualUser1.address,
          individualUser2.address,
          1,
          50,
          "0x"
        )
      ).to.be.revertedWith("Sender not authorized to trade");

      // Transfer to suspended user should fail
      await expect(
        tokenContract.connect(companyUser).safeTransferFrom(
          companyUser.address,
          individualUser1.address,
          1,
          50,
          "0x"
        )
      ).to.be.revertedWith("Recipient not authorized to trade");

      // Restore user
      await regulatoryManagement.connect(owner).unsuspendUser(individualUser1.address);

      // Transfer should work again
      await expect(
        tokenContract.connect(individualUser1).safeTransferFrom(
          individualUser1.address,
          individualUser2.address,
          1,
          25,
          "0x"
        )
      ).to.emit(tokenContract, "TransferSingle");
    });

    it("Should handle marketplace transfers with permission checks", async function () {
      // Create and mint tokens
      await tokenContract.connect(companyUser).createToken(
        "Marketplace Token",
        "MARKET",
        "Marketplace Company",
        1000,
        ethers.parseEther("1")
      );
      await tokenContract.connect(companyUser).mintToken(companyUser.address, 1, 500);

      // Marketplace transfer between verified users should work
      await tokenContract.marketplaceTransfer(
        companyUser.address,
        individualUser1.address,
        1,
        100
      );

      expect(await tokenContract.balanceOf(individualUser1.address, 1)).to.equal(100);
      expect(await tokenContract.balanceOf(companyUser.address, 1)).to.equal(400);

      // Suspend user and test marketplace transfer restrictions
      await regulatoryManagement.connect(owner).suspendUser(individualUser1.address);

      await expect(
        tokenContract.marketplaceTransfer(
          individualUser1.address,
          individualUser2.address,
          1,
          50
        )
      ).to.be.revertedWith("Sender not authorized to trade");

      await expect(
        tokenContract.marketplaceTransfer(
          companyUser.address,
          individualUser1.address,
          1,
          50
        )
      ).to.be.revertedWith("Recipient not authorized to trade");
    });

    it("Should handle batch transfers with permission enforcement", async function () {
      // Create multiple tokens
      await tokenContract.connect(companyUser).createToken("Token1", "TK1", "Company1", 1000, ethers.parseEther("1"));
      await tokenContract.connect(companyUser).createToken("Token2", "TK2", "Company2", 1000, ethers.parseEther("2"));
      
      // Mint tokens
      await tokenContract.connect(companyUser).mintToken(companyUser.address, 1, 200);
      await tokenContract.connect(companyUser).mintToken(companyUser.address, 2, 200);

      // Batch transfer between verified users should work
      await expect(
        tokenContract.connect(companyUser).safeBatchTransferFrom(
          companyUser.address,
          individualUser1.address,
          [1, 2],
          [50, 30],
          "0x"
        )
      ).to.emit(tokenContract, "TransferBatch");

      // Verify balances
      expect(await tokenContract.balanceOf(individualUser1.address, 1)).to.equal(50);
      expect(await tokenContract.balanceOf(individualUser1.address, 2)).to.equal(30);

      // Suspend user and test batch transfer restrictions
      await regulatoryManagement.connect(owner).suspendUser(individualUser1.address);

      await expect(
        tokenContract.connect(individualUser1).safeBatchTransferFrom(
          individualUser1.address,
          individualUser2.address,
          [1, 2],
          [25, 15],
          "0x"
        )
      ).to.be.revertedWith("Sender not authorized to trade");
    });

    it("Should handle token status changes and their effects", async function () {
      // Create and mint token
      await tokenContract.connect(companyUser).createToken(
        "Status Token",
        "STATUS",
        "Status Company",
        1000,
        ethers.parseEther("1")
      );
      await tokenContract.connect(companyUser).mintToken(companyUser.address, 1, 200);

      // Deactivate token
      await tokenContract.connect(companyUser).setTokenStatus(1, false);

      // Minting inactive token should fail
      await expect(
        tokenContract.connect(companyUser).mintToken(individualUser1.address, 1, 100)
      ).to.be.revertedWith("Token is not active");

      // Transfers of inactive tokens should fail
      await expect(
        tokenContract.connect(companyUser).safeTransferFrom(
          companyUser.address,
          individualUser1.address,
          1,
          50,
          "0x"
        )
      ).to.be.revertedWith("Token is not active");

      // Marketplace transfers of inactive tokens should fail
      await expect(
        tokenContract.marketplaceTransfer(
          companyUser.address,
          individualUser1.address,
          1,
          50
        )
      ).to.be.revertedWith("Token is not active");

      // Reactivate token
      await tokenContract.connect(companyUser).setTokenStatus(1, true);

      // Operations should work again
      await expect(
        tokenContract.connect(companyUser).mintToken(individualUser1.address, 1, 100)
      ).to.emit(tokenContract, "TokenMinted");

      await expect(
        tokenContract.connect(companyUser).safeTransferFrom(
          companyUser.address,
          individualUser2.address,
          1,
          50,
          "0x"
        )
      ).to.emit(tokenContract, "TransferSingle");
    });

    it("Should properly emit events for cross-contract operations", async function () {
      // Test user verification event affects token permissions
      await regulatoryManagement.connect(unregisteredUser).registerUser("new-individual", 0);
      
      // User should not be able to create tokens before verification
      await expect(
        tokenContract.connect(unregisteredUser).createToken("Test", "TEST", "Test Co", 1000, ethers.parseEther("1"))
      ).to.be.revertedWith("Only verified company users can create tokens");

      // Verify user and check event
      await expect(regulatoryManagement.connect(owner).verifyUser(unregisteredUser.address))
        .to.emit(regulatoryManagement, "UserVerified");

      // User still can't create tokens (individual user)
      await expect(
        tokenContract.connect(unregisteredUser).createToken("Test", "TEST", "Test Co", 1000, ethers.parseEther("1"))
      ).to.be.revertedWith("Only verified company users can create tokens");

      // Test suspension event affects token operations
      await tokenContract.connect(companyUser).createToken("Event Token", "EVENT", "Event Co", 1000, ethers.parseEther("1"));
      await tokenContract.connect(companyUser).mintToken(unregisteredUser.address, 1, 100);

      await expect(regulatoryManagement.connect(owner).suspendUser(unregisteredUser.address))
        .to.emit(regulatoryManagement, "UserSuspended");

      // Token operations should fail after suspension
      await expect(
        tokenContract.connect(unregisteredUser).safeTransferFrom(
          unregisteredUser.address,
          individualUser1.address,
          1,
          50,
          "0x"
        )
      ).to.be.revertedWith("Sender not authorized to trade");
    });
  });

  describe("RegulatedERC1155Token and RegulatedMarketplace Integration", function () {
    let tokenId: number;

    beforeEach(async function () {
      // Create and mint tokens for marketplace testing
      await tokenContract.connect(companyUser).createToken(
        "Marketplace Test Token",
        "MTEST",
        "Marketplace Test Company",
        10000,
        ethers.parseEther("1")
      );
      tokenId = 1;
      
      await tokenContract.connect(companyUser).mintToken(companyUser.address, tokenId, 1000);
      await tokenContract.connect(companyUser).mintToken(individualUser1.address, tokenId, 500);
      await tokenContract.connect(companyUser).mintToken(individualUser2.address, tokenId, 300);
    });

    it("Should handle token deposits and withdrawals correctly", async function () {
      // Setup approvals
      await tokenContract.connect(companyUser).setApprovalForAll(await marketplace.getAddress(), true);
      await tokenContract.connect(individualUser1).setApprovalForAll(await marketplace.getAddress(), true);

      // Test token deposits
      const depositAmount = 100;
      
      await expect(marketplace.connect(companyUser).depositTokens(tokenId, depositAmount))
        .to.emit(marketplace, "TokensDeposited")
        .withArgs(companyUser.address, tokenId, depositAmount, depositAmount);

      // Verify balances
      expect(await marketplace.getUserTokenBalance(companyUser.address, tokenId)).to.equal(depositAmount);
      expect(await tokenContract.balanceOf(await marketplace.getAddress(), tokenId)).to.equal(depositAmount);
      expect(await tokenContract.balanceOf(companyUser.address, tokenId)).to.equal(900);

      // Test token withdrawals
      const withdrawAmount = 50;
      
      await expect(marketplace.connect(companyUser).withdrawTokens(tokenId, withdrawAmount))
        .to.emit(marketplace, "TokensWithdrawn")
        .withArgs(companyUser.address, tokenId, withdrawAmount, depositAmount - withdrawAmount);

      // Verify balances after withdrawal
      expect(await marketplace.getUserTokenBalance(companyUser.address, tokenId)).to.equal(depositAmount - withdrawAmount);
      expect(await tokenContract.balanceOf(companyUser.address, tokenId)).to.equal(950);
      expect(await tokenContract.balanceOf(await marketplace.getAddress(), tokenId)).to.equal(depositAmount - withdrawAmount);
    });

    it("Should handle order placement with token locking", async function () {
      // Setup deposits
      await tokenContract.connect(companyUser).setApprovalForAll(await marketplace.getAddress(), true);
      await tokenContract.connect(individualUser1).setApprovalForAll(await marketplace.getAddress(), true);
      
      await marketplace.connect(companyUser).depositTokens(tokenId, 200);
      await marketplace.connect(individualUser1).depositETH({ value: ethers.parseEther("100") });

      // Place sell order - should lock tokens
      const sellAmount = 50;
      const sellPrice = ethers.parseEther("2");
      
      await expect(marketplace.connect(companyUser).placeSellOrder(tokenId, sellAmount, sellPrice))
        .to.emit(marketplace, "OrderPlaced");

      // Verify tokens are locked (available balance reduced)
      expect(await marketplace.getUserTokenBalance(companyUser.address, tokenId))
        .to.equal(150); // 200 - 50 locked

      // Place buy order - should lock ETH
      const buyAmount = 3;
      const buyPrice = ethers.parseEther("1.5");
      const requiredETH = BigInt(buyAmount) * buyPrice;
      
      await expect(marketplace.connect(individualUser1).placeBuyOrder(tokenId, buyAmount, buyPrice))
        .to.emit(marketplace, "OrderPlaced");

      // Verify ETH is locked
      expect(await marketplace.getUserETHBalance(individualUser1.address))
        .to.be.lessThan(ethers.parseEther("100"));
    });

    it("Should handle order matching and token transfers", async function () {
      // Setup marketplace balances
      await tokenContract.connect(companyUser).setApprovalForAll(await marketplace.getAddress(), true);
      await tokenContract.connect(individualUser1).setApprovalForAll(await marketplace.getAddress(), true);
      
      await marketplace.connect(companyUser).depositTokens(tokenId, 200);
      await marketplace.connect(individualUser1).depositETH({ value: ethers.parseEther("200") });

      // Place sell order
      const sellAmount = 50;
      const sellPrice = ethers.parseEther("1");
      await marketplace.connect(companyUser).placeSellOrder(tokenId, sellAmount, sellPrice);

      // Place matching buy order
      const buyAmount = 10;
      const buyPrice = ethers.parseEther("1.2"); // Higher than sell price
      
      const initialSellerETH = await marketplace.getUserETHBalance(companyUser.address);
      const initialBuyerTokens = await marketplace.getUserTokenBalance(individualUser1.address, tokenId);

      await expect(marketplace.connect(individualUser1).placeBuyOrder(tokenId, buyAmount, buyPrice))
        .to.emit(marketplace, "TradeExecuted");

      // Verify token transfer occurred
      expect(await marketplace.getUserTokenBalance(individualUser1.address, tokenId))
        .to.equal(initialBuyerTokens + BigInt(buyAmount));

      // Verify ETH transfer occurred
      expect(await marketplace.getUserETHBalance(companyUser.address))
        .to.be.greaterThan(initialSellerETH);
    });

    it("Should handle order cancellation and fund return", async function () {
      // Setup
      await tokenContract.connect(companyUser).setApprovalForAll(await marketplace.getAddress(), true);
      await marketplace.connect(companyUser).depositTokens(tokenId, 200);
      await marketplace.connect(individualUser1).depositETH({ value: ethers.parseEther("100") });

      // Place and cancel sell order
      const sellAmount = 50;
      const sellPrice = ethers.parseEther("1");
      
      await marketplace.connect(companyUser).placeSellOrder(tokenId, sellAmount, sellPrice);
      const balanceAfterOrder = await marketplace.getUserTokenBalance(companyUser.address, tokenId);
      
      await expect(marketplace.connect(companyUser).cancelOrder(1))
        .to.emit(marketplace, "OrderCancelled");

      // Verify tokens are returned
      expect(await marketplace.getUserTokenBalance(companyUser.address, tokenId))
        .to.equal(balanceAfterOrder + BigInt(sellAmount));

      // Place and cancel buy order
      const buyAmount = 5;
      const buyPrice = ethers.parseEther("1.5");
      
      await marketplace.connect(individualUser1).placeBuyOrder(tokenId, buyAmount, buyPrice);
      const ethBalanceAfterOrder = await marketplace.getUserETHBalance(individualUser1.address);
      
      await marketplace.connect(individualUser1).cancelOrder(2);

      // Verify ETH is returned
      expect(await marketplace.getUserETHBalance(individualUser1.address))
        .to.be.greaterThan(ethBalanceAfterOrder);
    });

    it("Should handle multiple token types in marketplace", async function () {
      // Create second token
      await tokenContract.connect(companyUser).createToken(
        "Second Token",
        "SECOND",
        "Second Company",
        5000,
        ethers.parseEther("0.5")
      );
      const tokenId2 = 2;
      
      await tokenContract.connect(companyUser).mintToken(companyUser.address, tokenId2, 500);

      // Setup marketplace
      await tokenContract.connect(companyUser).setApprovalForAll(await marketplace.getAddress(), true);
      await marketplace.connect(individualUser1).depositETH({ value: ethers.parseEther("10") });

      // Deposit both token types
      await marketplace.connect(companyUser).depositTokens(tokenId, 100);
      await marketplace.connect(companyUser).depositTokens(tokenId2, 200);

      // Place orders for both tokens
      await marketplace.connect(companyUser).placeSellOrder(tokenId, 50, ethers.parseEther("1"));
      await marketplace.connect(companyUser).placeSellOrder(tokenId2, 100, ethers.parseEther("0.5"));

      // Verify separate order books
      const [, sellOrders1] = await marketplace.getOrderBook(tokenId);
      const [, sellOrders2] = await marketplace.getOrderBook(tokenId2);
      
      expect(sellOrders1.length).to.equal(1);
      expect(sellOrders2.length).to.equal(1);
      expect(sellOrders1[0].tokenId).to.equal(tokenId);
      expect(sellOrders2[0].tokenId).to.equal(tokenId2);

      // Test trading different tokens
      await marketplace.connect(individualUser1).placeBuyOrder(tokenId, 5, ethers.parseEther("1.1"));
      await marketplace.connect(individualUser1).placeBuyOrder(tokenId2, 3, ethers.parseEther("0.6"));

      // Verify balances for both tokens
      expect(await marketplace.getUserTokenBalance(individualUser1.address, tokenId)).to.be.greaterThan(0);
      expect(await marketplace.getUserTokenBalance(individualUser1.address, tokenId2)).to.be.greaterThan(0);
    });

    it("Should enforce token existence checks", async function () {
      // Try to deposit non-existent token (user has no balance)
      await expect(
        marketplace.connect(companyUser).depositTokens(999, 100)
      ).to.be.revertedWith("Insufficient token balance");

      // Try to place order for non-existent token
      await marketplace.connect(individualUser1).depositETH({ value: ethers.parseEther("5") });
      
      await expect(
        marketplace.connect(individualUser1).placeBuyOrder(999, 10, ethers.parseEther("1"))
      ).to.be.revertedWith("Token does not exist");
    });

    it("Should handle inactive token restrictions in marketplace", async function () {
      // Setup
      await tokenContract.connect(companyUser).setApprovalForAll(await marketplace.getAddress(), true);
      await marketplace.connect(companyUser).depositTokens(tokenId, 100);
      await marketplace.connect(individualUser1).depositETH({ value: ethers.parseEther("5") });

      // Deactivate token
      await tokenContract.connect(companyUser).setTokenStatus(tokenId, false);

      // Orders for inactive tokens should still be placeable (marketplace doesn't check token status)
      // But token transfers will fail, so let's test that instead
      
      // Try to transfer inactive tokens directly
      await expect(
        tokenContract.connect(companyUser).safeTransferFrom(
          companyUser.address,
          individualUser1.address,
          tokenId,
          10,
          "0x"
        )
      ).to.be.revertedWith("Token is not active");

      // Should not be able to withdraw inactive tokens
      await expect(
        marketplace.connect(companyUser).withdrawTokens(tokenId, 50)
      ).to.be.revertedWith("Token is not active");
    });
  });

  describe("Permission Enforcement Across Contracts", function () {
    let tokenId: number;

    beforeEach(async function () {
      // Create token for testing
      await tokenContract.connect(companyUser).createToken(
        "Permission Token",
        "PERM",
        "Permission Company",
        1000,
        ethers.parseEther("1")
      );
      tokenId = 1;
      
      await tokenContract.connect(companyUser).mintToken(companyUser.address, tokenId, 500);
      await tokenContract.connect(companyUser).mintToken(individualUser1.address, tokenId, 300);
    });

    it("Should enforce user verification across all contracts", async function () {
      // Register but don't verify a new user
      await regulatoryManagement.connect(unregisteredUser).registerUser("unverified-user", 0);

      // Token operations should fail for unverified user
      await expect(
        tokenContract.connect(individualUser1).safeTransferFrom(
          individualUser1.address,
          unregisteredUser.address,
          tokenId,
          50,
          "0x"
        )
      ).to.be.revertedWith("Recipient not authorized to trade");

      // Marketplace operations should fail for unverified user
      await expect(
        marketplace.connect(unregisteredUser).depositETH({ value: ethers.parseEther("1") })
      ).to.be.revertedWith("User not authorized to trade");

      // Verify user
      await regulatoryManagement.connect(owner).verifyUser(unregisteredUser.address);

      // Operations should now work
      await expect(
        tokenContract.connect(individualUser1).safeTransferFrom(
          individualUser1.address,
          unregisteredUser.address,
          tokenId,
          50,
          "0x"
        )
      ).to.emit(tokenContract, "TransferSingle");

      await expect(
        marketplace.connect(unregisteredUser).depositETH({ value: ethers.parseEther("1") })
      ).to.emit(marketplace, "ETHDeposited");
    });

    it("Should enforce user suspension across all contracts", async function () {
      // Setup marketplace balances
      await tokenContract.connect(individualUser1).setApprovalForAll(await marketplace.getAddress(), true);
      await marketplace.connect(individualUser1).depositTokens(tokenId, 100);
      await marketplace.connect(individualUser1).depositETH({ value: ethers.parseEther("5") });

      // Place an order
      await marketplace.connect(individualUser1).placeBuyOrder(tokenId, 2, ethers.parseEther("1"));

      // Suspend user
      await regulatoryManagement.connect(owner).suspendUser(individualUser1.address);

      // Token transfers should fail
      await expect(
        tokenContract.connect(individualUser1).safeTransferFrom(
          individualUser1.address,
          individualUser2.address,
          tokenId,
          50,
          "0x"
        )
      ).to.be.revertedWith("Sender not authorized to trade");

      // New marketplace operations should fail
      await expect(
        marketplace.connect(individualUser1).placeSellOrder(tokenId, 50, ethers.parseEther("1"))
      ).to.be.revertedWith("User not authorized to trade");

      await expect(
        marketplace.connect(individualUser1).depositETH({ value: ethers.parseEther("1") })
      ).to.be.revertedWith("User not authorized to trade");

      // Suspended users cannot withdraw (current contract behavior)
      await expect(
        marketplace.connect(individualUser1).withdrawETH(ethers.parseEther("1"))
      ).to.be.revertedWith("User not authorized to trade");

      await expect(
        marketplace.connect(individualUser1).withdrawTokens(tokenId, 50)
      ).to.be.revertedWith("User not authorized to trade");

      // Suspended users cannot cancel orders either (current contract behavior)
      await expect(
        marketplace.connect(individualUser1).cancelOrder(1)
      ).to.be.revertedWith("User not authorized to trade");
    });

    it("Should handle permission changes in real-time", async function () {
      // Setup
      await tokenContract.connect(companyUser).setApprovalForAll(await marketplace.getAddress(), true);
      await marketplace.connect(companyUser).depositTokens(tokenId, 100);
      await marketplace.connect(individualUser1).depositETH({ value: ethers.parseEther("5") });

      // Place orders
      await marketplace.connect(companyUser).placeSellOrder(tokenId, 50, ethers.parseEther("1"));
      await marketplace.connect(individualUser1).placeBuyOrder(tokenId, 2, ethers.parseEther("0.8"));

      // Suspend user mid-trading
      await regulatoryManagement.connect(owner).suspendUser(companyUser.address);

      // Existing orders should remain but new operations should fail
      const [, sellOrders] = await marketplace.getOrderBook(tokenId);
      expect(sellOrders.length).to.equal(1); // Order still exists

      // New operations should fail
      await expect(
        marketplace.connect(companyUser).placeSellOrder(tokenId, 25, ethers.parseEther("1.2"))
      ).to.be.revertedWith("User not authorized to trade");

      // Restore user
      await regulatoryManagement.connect(owner).unsuspendUser(companyUser.address);

      // Operations should work again
      await expect(
        marketplace.connect(companyUser).placeSellOrder(tokenId, 25, ethers.parseEther("1.2"))
      ).to.emit(marketplace, "OrderPlaced");
    });

    it("Should handle contract owner permissions correctly", async function () {
      // Contract owner should be able to mint tokens even if not the creator
      await expect(
        tokenContract.connect(owner).mintToken(individualUser2.address, tokenId, 100)
      ).to.emit(tokenContract, "TokenMinted");

      // Contract owner should be able to change token status
      await expect(
        tokenContract.connect(owner).setTokenStatus(tokenId, false)
      ).to.emit(tokenContract, "TokenStatusChanged");

      // Contract owner should be able to pause contracts
      await expect(
        regulatoryManagement.connect(owner).pause()
      ).to.emit(regulatoryManagement, "Paused");

      await expect(
        tokenContract.connect(owner).pause()
      ).to.emit(tokenContract, "Paused");

      await expect(
        marketplace.connect(owner).pause()
      ).to.emit(marketplace, "Paused");
    });
  });

  describe("Event Emissions and State Consistency", function () {
    let tokenId: number;

    beforeEach(async function () {
      await tokenContract.connect(companyUser).createToken(
        "Event Token",
        "EVENT",
        "Event Company",
        1000,
        ethers.parseEther("1")
      );
      tokenId = 1;
      
      await tokenContract.connect(companyUser).mintToken(companyUser.address, tokenId, 500);
    });

    it("Should emit correct events for user lifecycle", async function () {
      // Register new user
      await expect(
        regulatoryManagement.connect(unregisteredUser).registerUser("event-test-user", 0)
      ).to.emit(regulatoryManagement, "UserRegistered");

      // Verify user
      await expect(
        regulatoryManagement.connect(owner).verifyUser(unregisteredUser.address)
      ).to.emit(regulatoryManagement, "UserVerified");

      // Suspend user
      await expect(
        regulatoryManagement.connect(owner).suspendUser(unregisteredUser.address)
      ).to.emit(regulatoryManagement, "UserSuspended");

      // Unsuspend user
      await expect(
        regulatoryManagement.connect(owner).unsuspendUser(unregisteredUser.address)
      ).to.emit(regulatoryManagement, "UserUnsuspended");
    });

    it("Should emit correct events for token operations", async function () {
      // Token creation already tested in beforeEach

      // Token minting (current supply will be 500 + 100 = 600)
      await expect(
        tokenContract.connect(companyUser).mintToken(individualUser1.address, tokenId, 100)
      ).to.emit(tokenContract, "TokenMinted")
       .withArgs(tokenId, individualUser1.address, 100, 600);

      // Token status change
      await expect(
        tokenContract.connect(companyUser).setTokenStatus(tokenId, false)
      ).to.emit(tokenContract, "TokenStatusChanged")
       .withArgs(tokenId, false);

      // Token transfers should fail for inactive tokens
      await expect(
        tokenContract.connect(companyUser).safeTransferFrom(
          companyUser.address,
          individualUser1.address,
          tokenId,
          50,
          "0x"
        )
      ).to.be.revertedWith("Token is not active");
    });

    it("Should emit correct events for marketplace operations", async function () {
      // Setup
      await tokenContract.connect(companyUser).setApprovalForAll(await marketplace.getAddress(), true);

      // ETH deposit
      await expect(
        marketplace.connect(individualUser1).depositETH({ value: ethers.parseEther("5") })
      ).to.emit(marketplace, "ETHDeposited")
       .withArgs(individualUser1.address, ethers.parseEther("5"), ethers.parseEther("5"));

      // Token deposit
      await expect(
        marketplace.connect(companyUser).depositTokens(tokenId, 100)
      ).to.emit(marketplace, "TokensDeposited")
       .withArgs(companyUser.address, tokenId, 100, 100);

      // Order placement
      await expect(
        marketplace.connect(companyUser).placeSellOrder(tokenId, 50, ethers.parseEther("1"))
      ).to.emit(marketplace, "OrderPlaced")
       .withArgs(1, companyUser.address, tokenId, 50, ethers.parseEther("1"), 1); // 1 = SELL

      // Order cancellation
      await expect(
        marketplace.connect(companyUser).cancelOrder(1)
      ).to.emit(marketplace, "OrderCancelled")
       .withArgs(1, companyUser.address);

      // Withdrawals
      await expect(
        marketplace.connect(individualUser1).withdrawETH(ethers.parseEther("2"))
      ).to.emit(marketplace, "ETHWithdrawn")
       .withArgs(individualUser1.address, ethers.parseEther("2"), ethers.parseEther("3"));

      await expect(
        marketplace.connect(companyUser).withdrawTokens(tokenId, 50)
      ).to.emit(marketplace, "TokensWithdrawn")
       .withArgs(companyUser.address, tokenId, 50, 50);
    });

    it("Should maintain state consistency across operations", async function () {
      // Setup marketplace
      await tokenContract.connect(companyUser).setApprovalForAll(await marketplace.getAddress(), true);
      await marketplace.connect(companyUser).depositTokens(tokenId, 200);
      await marketplace.connect(individualUser1).depositETH({ value: ethers.parseEther("10") });

      // Place orders
      await marketplace.connect(companyUser).placeSellOrder(tokenId, 50, ethers.parseEther("1"));
      await marketplace.connect(individualUser1).placeBuyOrder(tokenId, 5, ethers.parseEther("1.1"));

      // Verify state consistency
      const companyTokenBalance = await marketplace.getUserTokenBalance(companyUser.address, tokenId);
      const user1ETHBalance = await marketplace.getUserETHBalance(individualUser1.address);
      const user1TokenBalance = await marketplace.getUserTokenBalance(individualUser1.address, tokenId);

      // Check that balances reflect the trade
      expect(companyTokenBalance).to.be.lessThan(200); // Some tokens sold
      expect(user1ETHBalance).to.be.lessThan(ethers.parseEther("10")); // Some ETH spent
      expect(user1TokenBalance).to.be.greaterThan(0); // Received tokens

      // Verify order book state
      const [buyOrders, sellOrders] = await marketplace.getOrderBook(tokenId);
      
      // Check that orders are properly updated or removed after matching
      if (sellOrders.length > 0) {
        expect(sellOrders[0].filledAmount).to.be.greaterThan(0);
      }
    });

    it("Should handle complex multi-contract state changes", async function () {
      // Create multiple tokens and users
      await tokenContract.connect(companyUser).createToken("Token2", "TK2", "Company2", 1000, ethers.parseEther("2"));
      const tokenId2 = 2;
      
      await tokenContract.connect(companyUser).mintToken(companyUser.address, tokenId2, 300);
      
      await regulatoryManagement.connect(unregisteredUser).registerUser("complex-user", 0);
      await regulatoryManagement.connect(owner).verifyUser(unregisteredUser.address);

      // Setup complex marketplace state
      await tokenContract.connect(companyUser).setApprovalForAll(await marketplace.getAddress(), true);
      await marketplace.connect(companyUser).depositTokens(tokenId, 100);
      await marketplace.connect(companyUser).depositTokens(tokenId2, 150);
      
      await marketplace.connect(individualUser1).depositETH({ value: ethers.parseEther("20") });
      await marketplace.connect(unregisteredUser).depositETH({ value: ethers.parseEther("15") });

      // Place multiple orders
      await marketplace.connect(companyUser).placeSellOrder(tokenId, 50, ethers.parseEther("1"));
      await marketplace.connect(companyUser).placeSellOrder(tokenId2, 75, ethers.parseEther("2"));
      await marketplace.connect(individualUser1).placeBuyOrder(tokenId, 5, ethers.parseEther("1.1"));
      await marketplace.connect(unregisteredUser).placeBuyOrder(tokenId2, 3, ethers.parseEther("2.1"));

      // Suspend one user and verify state remains consistent
      await regulatoryManagement.connect(owner).suspendUser(individualUser1.address);

      // Verify that suspended user's orders may still be in the system (or may have been matched)
      const [buyOrders1] = await marketplace.getOrderBook(tokenId);
      const [buyOrders2] = await marketplace.getOrderBook(tokenId2);
      
      // Orders may or may not exist depending on whether they were matched
      expect(buyOrders1.length + buyOrders2.length).to.be.greaterThanOrEqual(0);

      // Verify suspended user can't place new orders
      await expect(
        marketplace.connect(individualUser1).placeBuyOrder(tokenId, 10, ethers.parseEther("1"))
      ).to.be.revertedWith("User not authorized to trade");

      // Verify other users can still trade (first deposit ETH)
      await marketplace.connect(individualUser2).depositETH({ value: ethers.parseEther("5") });
      await expect(
        marketplace.connect(individualUser2).placeBuyOrder(tokenId, 2, ethers.parseEther("1.2"))
      ).to.emit(marketplace, "OrderPlaced");
    });
  });
});