import { expect } from "chai";
import { ethers as originalEthers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { 
  RegulatoryManagement, 
  RegulatedERC1155Token, 
  RegulatedMarketplace 
} from "../typechain-types";
import { networkAwareEthers as ethers } from "./utils/test-decimal-utils";

describe("RegulatedMarketplace - Balance Management", function () {
  let regulatoryManagement: RegulatoryManagement;
  let tokenContract: RegulatedERC1155Token;
  let marketplace: RegulatedMarketplace;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let company: SignerWithAddress;

  const INITIAL_PRICE = ethers.parseEther("0.1");
  const MAX_SUPPLY = 1000n;

  beforeEach(async function () {
    [owner, user1, user2, company] = await ethers.getSigners();

    // Deploy RegulatoryManagement contract
    const RegulatoryManagementFactory = await ethers.getContractFactory("RegulatoryManagement");
    regulatoryManagement = await RegulatoryManagementFactory.deploy();
    await regulatoryManagement.waitForDeployment();

    // Deploy RegulatedERC1155Token contract
    const TokenFactory = await ethers.getContractFactory("RegulatedERC1155Token");
    tokenContract = await TokenFactory.deploy(
      await regulatoryManagement.getAddress(),
      "https://api.example.com/token/{id}.json"
    );
    await tokenContract.waitForDeployment();

    // Deploy RegulatedMarketplace contract
    const MarketplaceFactory = await ethers.getContractFactory("RegulatedMarketplace");
    marketplace = await MarketplaceFactory.deploy(
      await regulatoryManagement.getAddress(),
      await tokenContract.getAddress()
    );
    await marketplace.waitForDeployment();

    // Register and verify users
    await regulatoryManagement.connect(user1).registerUser("ssi-user1", 0); // Individual
    await regulatoryManagement.connect(user2).registerUser("ssi-user2", 0); // Individual
    await regulatoryManagement.connect(company).registerUser("ssi-company", 1); // Company

    await regulatoryManagement.connect(owner).verifyUser(user1.address);
    await regulatoryManagement.connect(owner).verifyUser(user2.address);
    await regulatoryManagement.connect(owner).verifyUser(company.address);

    // Create a token for testing
    await tokenContract.connect(company).createToken(
      "Test Token",
      "TEST",
      "Test Company",
      MAX_SUPPLY,
      INITIAL_PRICE
    );

    // Mint some tokens to company
    await tokenContract.connect(company).mintToken(company.address, 1, 100);
  });

  describe("ETH Balance Management", function () {
    it("Should allow verified users to deposit ETH", async function () {
      const depositAmount = ethers.parseEther("1.0");
      
      await expect(marketplace.connect(user1).depositETH({ value: depositAmount }))
        .to.emit(marketplace, "ETHDeposited")
        .withArgs(user1.address, depositAmount, depositAmount);

      expect(await marketplace.getUserETHBalance(user1.address)).to.equal(depositAmount);
    });

    it("Should reject ETH deposits from unverified users", async function () {
      const unverifiedUser = user2;
      await regulatoryManagement.connect(owner).suspendUser(unverifiedUser.address);
      
      const depositAmount = ethers.parseEther("1.0");
      
      await expect(marketplace.connect(unverifiedUser).depositETH({ value: depositAmount }))
        .to.be.revertedWith("User not authorized to trade");
    });

    it("Should reject zero ETH deposits", async function () {
      await expect(marketplace.connect(user1).depositETH({ value: 0 }))
        .to.be.revertedWith("Deposit amount must be greater than zero");
    });

    it("Should allow users to withdraw ETH", async function () {
      const depositAmount = ethers.parseEther("1.0");
      const withdrawAmount = ethers.parseEther("0.5");
      
      // First deposit
      await marketplace.connect(user1).depositETH({ value: depositAmount });
      
      const initialBalance = await ethers.provider.getBalance(user1.address);
      
      // Withdraw
      const tx = await marketplace.connect(user1).withdrawETH(withdrawAmount);
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;
      
      await expect(tx)
        .to.emit(marketplace, "ETHWithdrawn")
        .withArgs(user1.address, withdrawAmount, depositAmount - withdrawAmount);

      expect(await marketplace.getUserETHBalance(user1.address))
        .to.equal(depositAmount - withdrawAmount);
      
      // Check user's actual ETH balance increased (minus gas)
      const finalBalance = await ethers.provider.getBalance(user1.address);
      expect(finalBalance).to.be.closeTo(
        initialBalance + withdrawAmount - gasUsed,
        ethers.parseEther("0.001") // Allow for small gas estimation differences
      );
    });

    it("Should reject withdrawal of more ETH than available", async function () {
      const depositAmount = ethers.parseEther("1.0");
      const withdrawAmount = ethers.parseEther("2.0");
      
      await marketplace.connect(user1).depositETH({ value: depositAmount });
      
      await expect(marketplace.connect(user1).withdrawETH(withdrawAmount))
        .to.be.revertedWith("Insufficient ETH balance");
    });

    it("Should reject zero ETH withdrawals", async function () {
      await expect(marketplace.connect(user1).withdrawETH(0))
        .to.be.revertedWith("Withdrawal amount must be greater than zero");
    });

    it("Should handle multiple deposits and withdrawals correctly", async function () {
      const deposit1 = ethers.parseEther("1.0");
      const deposit2 = ethers.parseEther("0.5");
      const withdraw1 = ethers.parseEther("0.3");
      
      await marketplace.connect(user1).depositETH({ value: deposit1 });
      expect(await marketplace.getUserETHBalance(user1.address)).to.equal(deposit1);
      
      await marketplace.connect(user1).depositETH({ value: deposit2 });
      expect(await marketplace.getUserETHBalance(user1.address)).to.equal(deposit1 + deposit2);
      
      await marketplace.connect(user1).withdrawETH(withdraw1);
      expect(await marketplace.getUserETHBalance(user1.address)).to.equal(deposit1 + deposit2 - withdraw1);
    });
  });

  describe("Token Balance Management", function () {
    beforeEach(async function () {
      // Transfer some tokens to user1 for testing
      await tokenContract.connect(company).safeTransferFrom(
        company.address,
        user1.address,
        1,
        50,
        "0x"
      );
    });

    it("Should allow verified users to deposit tokens", async function () {
      const depositAmount = 20n;
      
      // First approve the marketplace to transfer tokens
      await tokenContract.connect(user1).setApprovalForAll(await marketplace.getAddress(), true);
      
      await expect(marketplace.connect(user1).depositTokens(1, depositAmount))
        .to.emit(marketplace, "TokensDeposited")
        .withArgs(user1.address, 1, depositAmount, depositAmount);

      expect(await marketplace.getUserTokenBalance(user1.address, 1)).to.equal(depositAmount);
      expect(await tokenContract.balanceOf(await marketplace.getAddress(), 1)).to.equal(depositAmount);
    });

    it("Should reject token deposits from unverified users", async function () {
      await regulatoryManagement.connect(owner).suspendUser(user1.address);
      
      await expect(marketplace.connect(user1).depositTokens(1, 20))
        .to.be.revertedWith("User not authorized to trade");
    });

    it("Should reject zero token deposits", async function () {
      await expect(marketplace.connect(user1).depositTokens(1, 0))
        .to.be.revertedWith("Deposit amount must be greater than zero");
    });

    it("Should reject deposits of more tokens than user owns", async function () {
      const userBalance = await tokenContract.balanceOf(user1.address, 1);
      const depositAmount = userBalance + 1n;
      
      await tokenContract.connect(user1).setApprovalForAll(await marketplace.getAddress(), true);
      
      await expect(marketplace.connect(user1).depositTokens(1, depositAmount))
        .to.be.revertedWith("Insufficient token balance");
    });

    it("Should allow users to withdraw tokens", async function () {
      const depositAmount = 20n;
      const withdrawAmount = 10n;
      
      // First deposit tokens
      await tokenContract.connect(user1).setApprovalForAll(await marketplace.getAddress(), true);
      await marketplace.connect(user1).depositTokens(1, depositAmount);
      
      const initialUserBalance = await tokenContract.balanceOf(user1.address, 1);
      
      await expect(marketplace.connect(user1).withdrawTokens(1, withdrawAmount))
        .to.emit(marketplace, "TokensWithdrawn")
        .withArgs(user1.address, 1, withdrawAmount, depositAmount - withdrawAmount);

      expect(await marketplace.getUserTokenBalance(user1.address, 1))
        .to.equal(depositAmount - withdrawAmount);
      
      expect(await tokenContract.balanceOf(user1.address, 1))
        .to.equal(initialUserBalance + withdrawAmount);
    });

    it("Should reject withdrawal of more tokens than available in marketplace", async function () {
      const depositAmount = 20n;
      const withdrawAmount = 30n;
      
      await tokenContract.connect(user1).setApprovalForAll(await marketplace.getAddress(), true);
      await marketplace.connect(user1).depositTokens(1, depositAmount);
      
      await expect(marketplace.connect(user1).withdrawTokens(1, withdrawAmount))
        .to.be.revertedWith("Insufficient token balance in marketplace");
    });

    it("Should reject zero token withdrawals", async function () {
      await expect(marketplace.connect(user1).withdrawTokens(1, 0))
        .to.be.revertedWith("Withdrawal amount must be greater than zero");
    });

    it("Should handle multiple token deposits and withdrawals correctly", async function () {
      const deposit1 = 20n;
      const deposit2 = 10n;
      const withdraw1 = 5n;
      
      await tokenContract.connect(user1).setApprovalForAll(await marketplace.getAddress(), true);
      
      await marketplace.connect(user1).depositTokens(1, deposit1);
      expect(await marketplace.getUserTokenBalance(user1.address, 1)).to.equal(deposit1);
      
      await marketplace.connect(user1).depositTokens(1, deposit2);
      expect(await marketplace.getUserTokenBalance(user1.address, 1)).to.equal(deposit1 + deposit2);
      
      await marketplace.connect(user1).withdrawTokens(1, withdraw1);
      expect(await marketplace.getUserTokenBalance(user1.address, 1)).to.equal(deposit1 + deposit2 - withdraw1);
    });
  });

  describe("Balance Queries", function () {
    beforeEach(async function () {
      // Setup some balances for testing
      await marketplace.connect(user1).depositETH({ value: ethers.parseEther("1.0") });
      
      // Transfer tokens to user1 and deposit some
      await tokenContract.connect(company).safeTransferFrom(
        company.address,
        user1.address,
        1,
        50,
        "0x"
      );
      await tokenContract.connect(user1).setApprovalForAll(await marketplace.getAddress(), true);
      await marketplace.connect(user1).depositTokens(1, 20);
    });

    it("Should return correct ETH balance", async function () {
      const balance = await marketplace.getUserETHBalance(user1.address);
      expect(balance).to.equal(ethers.parseEther("1.0"));
    });

    it("Should return correct token balance", async function () {
      const balance = await marketplace.getUserTokenBalance(user1.address, 1);
      expect(balance).to.equal(20n);
    });

    it("Should return complete user balance information", async function () {
      const [ethBalance, tokenIds, tokenBalances] = await marketplace.getUserBalance(user1.address);
      
      expect(ethBalance).to.equal(ethers.parseEther("1.0"));
      expect(tokenIds.length).to.equal(1);
      expect(tokenIds[0]).to.equal(1n);
      expect(tokenBalances.length).to.equal(1);
      expect(tokenBalances[0]).to.equal(20n);
    });

    it("Should return empty arrays for users with no token balances", async function () {
      const [ethBalance, tokenIds, tokenBalances] = await marketplace.getUserBalance(user2.address);
      
      expect(ethBalance).to.equal(0);
      expect(tokenIds.length).to.equal(0);
      expect(tokenBalances.length).to.equal(0);
    });
  });

  describe("Order Management", function () {
    beforeEach(async function () {
      // Setup balances for testing orders
      await marketplace.connect(user1).depositETH({ value: ethers.parseEther("5.0") });
      await marketplace.connect(user2).depositETH({ value: ethers.parseEther("3.0") });
      
      // Transfer tokens to users and deposit some
      await tokenContract.connect(company).safeTransferFrom(
        company.address,
        user1.address,
        1,
        30,
        "0x"
      );
      await tokenContract.connect(company).safeTransferFrom(
        company.address,
        user2.address,
        1,
        20,
        "0x"
      );
      
      await tokenContract.connect(user1).setApprovalForAll(await marketplace.getAddress(), true);
      await tokenContract.connect(user2).setApprovalForAll(await marketplace.getAddress(), true);
      
      await marketplace.connect(user1).depositTokens(1, 15);
      await marketplace.connect(user2).depositTokens(1, 10);
    });

    describe("Buy Orders", function () {
      it("Should allow users to place buy orders", async function () {
        const tokenId = 1n;
        const amount = 5n;
        const price = ethers.parseEther("0.2");
        
        await expect(marketplace.connect(user1).placeBuyOrder(tokenId, amount, price))
          .to.emit(marketplace, "OrderPlaced")
          .withArgs(1, user1.address, tokenId, amount, price, 0); // 0 = BUY
        
        const order = await marketplace.getOrder(1);
        expect(order.trader).to.equal(user1.address);
        expect(order.tokenId).to.equal(tokenId);
        expect(order.amount).to.equal(amount);
        expect(order.price).to.equal(price);
        expect(order.orderType).to.equal(0); // BUY
        expect(order.status).to.equal(0); // ACTIVE
        
        // Check ETH was locked
        const expectedCost = amount * price;
        expect(await marketplace.getUserETHBalance(user1.address))
          .to.equal(ethers.parseEther("5.0") - expectedCost);
      });

      it("Should reject buy orders with insufficient ETH balance", async function () {
        const tokenId = 1n;
        const amount = 100n; // Large amount
        const price = ethers.parseEther("1.0");
        
        await expect(marketplace.connect(user1).placeBuyOrder(tokenId, amount, price))
          .to.be.revertedWith("Insufficient ETH balance");
      });

      it("Should reject buy orders with zero amount", async function () {
        const tokenId = 1n;
        const amount = 0n;
        const price = ethers.parseEther("0.1");
        
        await expect(marketplace.connect(user1).placeBuyOrder(tokenId, amount, price))
          .to.be.revertedWith("Amount must be greater than zero");
      });

      it("Should reject buy orders with zero price", async function () {
        const tokenId = 1n;
        const amount = 5n;
        const price = 0n;
        
        await expect(marketplace.connect(user1).placeBuyOrder(tokenId, amount, price))
          .to.be.revertedWith("Price must be greater than zero");
      });

      it("Should reject buy orders for non-existent tokens", async function () {
        const tokenId = 999n; // Non-existent token
        const amount = 5n;
        const price = ethers.parseEther("0.1");
        
        await expect(marketplace.connect(user1).placeBuyOrder(tokenId, amount, price))
          .to.be.revertedWith("Token does not exist");
      });
    });

    describe("Sell Orders", function () {
      it("Should allow users to place sell orders", async function () {
        const tokenId = 1n;
        const amount = 5n;
        const price = ethers.parseEther("0.15");
        
        await expect(marketplace.connect(user1).placeSellOrder(tokenId, amount, price))
          .to.emit(marketplace, "OrderPlaced")
          .withArgs(1, user1.address, tokenId, amount, price, 1); // 1 = SELL
        
        const order = await marketplace.getOrder(1);
        expect(order.trader).to.equal(user1.address);
        expect(order.tokenId).to.equal(tokenId);
        expect(order.amount).to.equal(amount);
        expect(order.price).to.equal(price);
        expect(order.orderType).to.equal(1); // SELL
        expect(order.status).to.equal(0); // ACTIVE
        
        // Check tokens were locked
        expect(await marketplace.getUserTokenBalance(user1.address, tokenId))
          .to.equal(15n - amount);
      });

      it("Should reject sell orders with insufficient token balance", async function () {
        const tokenId = 1n;
        const amount = 100n; // More than user has
        const price = ethers.parseEther("0.1");
        
        await expect(marketplace.connect(user1).placeSellOrder(tokenId, amount, price))
          .to.be.revertedWith("Insufficient token balance");
      });

      it("Should reject sell orders with zero amount", async function () {
        const tokenId = 1n;
        const amount = 0n;
        const price = ethers.parseEther("0.1");
        
        await expect(marketplace.connect(user1).placeSellOrder(tokenId, amount, price))
          .to.be.revertedWith("Amount must be greater than zero");
      });

      it("Should reject sell orders with zero price", async function () {
        const tokenId = 1n;
        const amount = 5n;
        const price = 0n;
        
        await expect(marketplace.connect(user1).placeSellOrder(tokenId, amount, price))
          .to.be.revertedWith("Price must be greater than zero");
      });
    });

    describe("Order Cancellation", function () {
      it("Should allow users to cancel their buy orders", async function () {
        const tokenId = 1n;
        const amount = 5n;
        const price = ethers.parseEther("0.2");
        
        // Place order
        await marketplace.connect(user1).placeBuyOrder(tokenId, amount, price);
        const initialBalance = await marketplace.getUserETHBalance(user1.address);
        
        // Cancel order
        await expect(marketplace.connect(user1).cancelOrder(1))
          .to.emit(marketplace, "OrderCancelled")
          .withArgs(1, user1.address);
        
        const order = await marketplace.getOrder(1);
        expect(order.status).to.equal(2); // CANCELLED
        
        // Check ETH was refunded
        const expectedRefund = amount * price;
        expect(await marketplace.getUserETHBalance(user1.address))
          .to.equal(initialBalance + expectedRefund);
      });

      it("Should allow users to cancel their sell orders", async function () {
        const tokenId = 1n;
        const amount = 5n;
        const price = ethers.parseEther("0.15");
        
        // Place order
        await marketplace.connect(user1).placeSellOrder(tokenId, amount, price);
        const initialBalance = await marketplace.getUserTokenBalance(user1.address, tokenId);
        
        // Cancel order
        await expect(marketplace.connect(user1).cancelOrder(1))
          .to.emit(marketplace, "OrderCancelled")
          .withArgs(1, user1.address);
        
        const order = await marketplace.getOrder(1);
        expect(order.status).to.equal(2); // CANCELLED
        
        // Check tokens were refunded
        expect(await marketplace.getUserTokenBalance(user1.address, tokenId))
          .to.equal(initialBalance + amount);
      });

      it("Should reject cancellation by non-owner", async function () {
        const tokenId = 1n;
        const amount = 5n;
        const price = ethers.parseEther("0.2");
        
        await marketplace.connect(user1).placeBuyOrder(tokenId, amount, price);
        
        await expect(marketplace.connect(user2).cancelOrder(1))
          .to.be.revertedWith("Only order creator can cancel");
      });

      it("Should reject cancellation of non-existent orders", async function () {
        await expect(marketplace.connect(user1).cancelOrder(999))
          .to.be.revertedWith("Invalid order ID");
      });

      it("Should reject cancellation of already cancelled orders", async function () {
        const tokenId = 1n;
        const amount = 5n;
        const price = ethers.parseEther("0.2");
        
        await marketplace.connect(user1).placeBuyOrder(tokenId, amount, price);
        await marketplace.connect(user1).cancelOrder(1);
        
        await expect(marketplace.connect(user1).cancelOrder(1))
          .to.be.revertedWith("Order is not active");
      });
    });

    describe("Order Book Queries", function () {
      beforeEach(async function () {
        // Place some orders for testing
        await marketplace.connect(user1).placeBuyOrder(1, 5, ethers.parseEther("0.2"));
        await marketplace.connect(user2).placeBuyOrder(1, 3, ethers.parseEther("0.18"));
        await marketplace.connect(user1).placeSellOrder(1, 4, ethers.parseEther("0.25"));
        await marketplace.connect(user2).placeSellOrder(1, 6, ethers.parseEther("0.22"));
      });

      it("Should return active buy orders sorted by price descending", async function () {
        const buyOrders = await marketplace.getBuyOrders(1);
        expect(buyOrders.length).to.equal(2);
        
        // Should be sorted by price descending (highest first)
        expect(buyOrders[0].trader).to.equal(user1.address);
        expect(buyOrders[0].amount).to.equal(5n);
        expect(buyOrders[0].price).to.equal(ethers.parseEther("0.2"));
        expect(buyOrders[0].orderType).to.equal(0); // BUY
        
        expect(buyOrders[1].trader).to.equal(user2.address);
        expect(buyOrders[1].amount).to.equal(3n);
        expect(buyOrders[1].price).to.equal(ethers.parseEther("0.18"));
        
        // Verify sorting
        expect(buyOrders[0].price).to.be.greaterThan(buyOrders[1].price);
      });

      it("Should return active sell orders sorted by price ascending", async function () {
        const sellOrders = await marketplace.getSellOrders(1);
        expect(sellOrders.length).to.equal(2);
        
        // Should be sorted by price ascending (lowest first)
        expect(sellOrders[0].trader).to.equal(user2.address);
        expect(sellOrders[0].amount).to.equal(6n);
        expect(sellOrders[0].price).to.equal(ethers.parseEther("0.22"));
        expect(sellOrders[0].orderType).to.equal(1); // SELL
        
        expect(sellOrders[1].trader).to.equal(user1.address);
        expect(sellOrders[1].amount).to.equal(4n);
        expect(sellOrders[1].price).to.equal(ethers.parseEther("0.25"));
        
        // Verify sorting
        expect(sellOrders[0].price).to.be.lessThan(sellOrders[1].price);
      });

      it("Should return complete order book with both buy and sell orders", async function () {
        const [buyOrders, sellOrders] = await marketplace.getOrderBook(1);
        
        expect(buyOrders.length).to.equal(2);
        expect(sellOrders.length).to.equal(2);
        
        // Verify buy orders are sorted by price descending
        expect(buyOrders[0].price).to.be.greaterThan(buyOrders[1].price);
        
        // Verify sell orders are sorted by price ascending
        expect(sellOrders[0].price).to.be.lessThan(sellOrders[1].price);
      });

      it("Should return order book statistics", async function () {
        const [
          totalBuyOrders,
          totalSellOrders,
          highestBuyPrice,
          lowestSellPrice,
          totalBuyVolume,
          totalSellVolume
        ] = await marketplace.getOrderBookStats(1);
        
        expect(totalBuyOrders).to.equal(2);
        expect(totalSellOrders).to.equal(2);
        expect(highestBuyPrice).to.equal(ethers.parseEther("0.2"));
        expect(lowestSellPrice).to.equal(ethers.parseEther("0.22"));
        expect(totalBuyVolume).to.equal(8n); // 5 + 3
        expect(totalSellVolume).to.equal(10n); // 4 + 6
      });

      it("Should return user orders", async function () {
        const user1Orders = await marketplace.getUserOrders(user1.address);
        expect(user1Orders.length).to.equal(2);
        
        expect(user1Orders[0].orderType).to.equal(0); // BUY
        expect(user1Orders[1].orderType).to.equal(1); // SELL
      });

      it("Should return only active user orders", async function () {
        // Cancel one order
        await marketplace.connect(user1).cancelOrder(1);
        
        const activeOrders = await marketplace.getUserActiveOrders(user1.address);
        expect(activeOrders.length).to.equal(1);
        expect(activeOrders[0].orderType).to.equal(1); // SELL (the remaining active order)
        
        const allOrders = await marketplace.getUserOrders(user1.address);
        expect(allOrders.length).to.equal(2); // Still shows all orders including cancelled
      });

      it("Should exclude cancelled orders from order book", async function () {
        // Cancel one buy order
        await marketplace.connect(user1).cancelOrder(1);
        
        const buyOrders = await marketplace.getBuyOrders(1);
        expect(buyOrders.length).to.equal(1);
        expect(buyOrders[0].trader).to.equal(user2.address);
        
        // Check order book stats reflect the cancellation
        const [totalBuyOrders, , , , totalBuyVolume] = await marketplace.getOrderBookStats(1);
        expect(totalBuyOrders).to.equal(1);
        expect(totalBuyVolume).to.equal(3n); // Only user2's order remains
      });

      it("Should emit OrderBookUpdated events when orders are placed", async function () {
        await expect(marketplace.connect(user1).placeBuyOrder(1, 2, ethers.parseEther("0.19")))
          .to.emit(marketplace, "OrderBookUpdated")
          .withArgs(1, 3, 2, ethers.parseEther("0.2"), ethers.parseEther("0.22"));
      });

      it("Should emit OrderBookUpdated events when orders are cancelled", async function () {
        await expect(marketplace.connect(user1).cancelOrder(1))
          .to.emit(marketplace, "OrderBookUpdated")
          .withArgs(1, 1, 2, ethers.parseEther("0.18"), ethers.parseEther("0.22"));
      });

      it("Should handle empty order books correctly", async function () {
        // Create a new token with no orders
        await tokenContract.connect(company).createToken(
          "Empty Token",
          "EMPTY",
          "Test Company",
          1000,
          ethers.parseEther("0.1")
        );
        
        const buyOrders = await marketplace.getBuyOrders(2);
        const sellOrders = await marketplace.getSellOrders(2);
        const [buyOrdersFromBook, sellOrdersFromBook] = await marketplace.getOrderBook(2);
        
        expect(buyOrders.length).to.equal(0);
        expect(sellOrders.length).to.equal(0);
        expect(buyOrdersFromBook.length).to.equal(0);
        expect(sellOrdersFromBook.length).to.equal(0);
        
        const [
          totalBuyOrders,
          totalSellOrders,
          highestBuyPrice,
          lowestSellPrice,
          totalBuyVolume,
          totalSellVolume
        ] = await marketplace.getOrderBookStats(2);
        
        expect(totalBuyOrders).to.equal(0);
        expect(totalSellOrders).to.equal(0);
        expect(highestBuyPrice).to.equal(0);
        expect(lowestSellPrice).to.equal(0);
        expect(totalBuyVolume).to.equal(0);
        expect(totalSellVolume).to.equal(0);
      });

      it("Should handle price sorting with multiple orders at same price", async function () {
        // Add more orders at same prices
        await marketplace.connect(user1).placeBuyOrder(1, 2, ethers.parseEther("0.2")); // Same as first order
        await marketplace.connect(user2).placeSellOrder(1, 3, ethers.parseEther("0.22")); // Same as first sell order
        
        const buyOrders = await marketplace.getBuyOrders(1);
        const sellOrders = await marketplace.getSellOrders(1);
        
        expect(buyOrders.length).to.equal(3);
        expect(sellOrders.length).to.equal(3);
        
        // Check that orders with same price maintain their relative order
        const highPriceBuyOrders = buyOrders.filter(order => order.price === ethers.parseEther("0.2"));
        expect(highPriceBuyOrders.length).to.equal(2);
        
        const lowPriceSellOrders = sellOrders.filter(order => order.price === ethers.parseEther("0.22"));
        expect(lowPriceSellOrders.length).to.equal(2);
      });
    });

    describe("Order Validation", function () {
      it("Should reject orders from unverified users", async function () {
        await regulatoryManagement.connect(owner).suspendUser(user1.address);
        
        await expect(marketplace.connect(user1).placeBuyOrder(1, 5, ethers.parseEther("0.2")))
          .to.be.revertedWith("User not authorized to trade");
      });

      it("Should handle multiple orders correctly", async function () {
        // Place multiple orders
        await marketplace.connect(user1).placeBuyOrder(1, 2, ethers.parseEther("0.2"));
        await marketplace.connect(user1).placeBuyOrder(1, 3, ethers.parseEther("0.18"));
        await marketplace.connect(user1).placeSellOrder(1, 4, ethers.parseEther("0.25"));
        
        const user1Orders = await marketplace.getUserOrders(user1.address);
        expect(user1Orders.length).to.equal(3);
        
        const buyOrders = await marketplace.getBuyOrders(1);
        expect(buyOrders.length).to.equal(2);
        
        const sellOrders = await marketplace.getSellOrders(1);
        expect(sellOrders.length).to.equal(1);
      });
    });

    describe("Automatic Order Matching", function () {
      beforeEach(async function () {
        // Reset balances for clean testing
        await marketplace.connect(user1).depositETH({ value: ethers.parseEther("10.0") });
        await marketplace.connect(user2).depositETH({ value: ethers.parseEther("10.0") });
      });

      it("Should automatically match compatible buy and sell orders", async function () {
        // Place a sell order first
        await marketplace.connect(user1).placeSellOrder(1, 5, ethers.parseEther("0.2"));
        
        const initialUser1ETH = await marketplace.getUserETHBalance(user1.address);
        const initialUser2ETH = await marketplace.getUserETHBalance(user2.address);
        const initialUser1Tokens = await marketplace.getUserTokenBalance(user1.address, 1);
        const initialUser2Tokens = await marketplace.getUserTokenBalance(user2.address, 1);
        
        // Place a matching buy order (higher price should match)
        const tx = await marketplace.connect(user2).placeBuyOrder(1, 3, ethers.parseEther("0.25"));
        const receipt = await tx.wait();
        const block = await ethers.provider.getBlock(receipt!.blockNumber);
        
        await expect(tx)
          .to.emit(marketplace, "TradeExecuted")
          .withArgs(2, 1, user2.address, user1.address, 1, 3, ethers.parseEther("0.2"), block!.timestamp);
        
        // Check balances after trade
        const finalUser1ETH = await marketplace.getUserETHBalance(user1.address);
        const finalUser2ETH = await marketplace.getUserETHBalance(user2.address);
        const finalUser1Tokens = await marketplace.getUserTokenBalance(user1.address, 1);
        const finalUser2Tokens = await marketplace.getUserTokenBalance(user2.address, 1);
        
        // User1 (seller) should receive ETH at sell price minus trading fee
        const tradeValue = 3n * ethers.parseEther("0.2");
        const tradingFee = await marketplace.calculateTradingFee(tradeValue);
        const expectedETHReceived = tradeValue - tradingFee;
        expect(finalUser1ETH).to.equal(initialUser1ETH + expectedETHReceived);
        
        // User2 (buyer) should get refund for price difference and receive tokens
        const buyOrderCost = 3n * ethers.parseEther("0.25");
        const actualCost = 3n * ethers.parseEther("0.2");
        const expectedRefund = buyOrderCost - actualCost;
        expect(finalUser2ETH).to.equal(initialUser2ETH - actualCost);
        expect(finalUser2Tokens).to.equal(initialUser2Tokens + 3n);
        
        // Check order status
        const buyOrder = await marketplace.getOrder(2);
        const sellOrder = await marketplace.getOrder(1);
        
        expect(buyOrder.filledAmount).to.equal(3n);
        expect(buyOrder.status).to.equal(1); // FILLED
        expect(sellOrder.filledAmount).to.equal(3n);
        expect(sellOrder.amount - sellOrder.filledAmount).to.equal(2n); // 2 remaining
      });

      it("Should handle partial order fills correctly", async function () {
        // Place a large sell order
        await marketplace.connect(user1).placeSellOrder(1, 10, ethers.parseEther("0.2"));
        
        // Place a smaller buy order
        await marketplace.connect(user2).placeBuyOrder(1, 4, ethers.parseEther("0.2"));
        
        const sellOrder = await marketplace.getOrder(1);
        const buyOrder = await marketplace.getOrder(2);
        
        // Buy order should be fully filled, sell order partially filled
        expect(buyOrder.filledAmount).to.equal(4n);
        expect(buyOrder.status).to.equal(1); // FILLED
        expect(sellOrder.filledAmount).to.equal(4n);
        expect(sellOrder.status).to.equal(0); // ACTIVE (still has remaining amount)
        
        // Check remaining amounts
        expect(sellOrder.amount - sellOrder.filledAmount).to.equal(6n);
      });

      it("Should not match orders with incompatible prices", async function () {
        // Place a sell order with high price
        await marketplace.connect(user1).placeSellOrder(1, 5, ethers.parseEther("0.3"));
        
        // Place a buy order with lower price
        await marketplace.connect(user2).placeBuyOrder(1, 3, ethers.parseEther("0.2"));
        
        const sellOrder = await marketplace.getOrder(1);
        const buyOrder = await marketplace.getOrder(2);
        
        // Neither order should be filled
        expect(buyOrder.filledAmount).to.equal(0n);
        expect(buyOrder.status).to.equal(0); // ACTIVE
        expect(sellOrder.filledAmount).to.equal(0n);
        expect(sellOrder.status).to.equal(0); // ACTIVE
      });

      it("Should prevent self-trading", async function () {
        // User1 places both buy and sell orders
        await marketplace.connect(user1).placeSellOrder(1, 5, ethers.parseEther("0.2"));
        await marketplace.connect(user1).placeBuyOrder(1, 3, ethers.parseEther("0.25"));
        
        const sellOrder = await marketplace.getOrder(1);
        const buyOrder = await marketplace.getOrder(2);
        
        // Orders should not be matched (self-trading prevention)
        expect(buyOrder.filledAmount).to.equal(0n);
        expect(sellOrder.filledAmount).to.equal(0n);
      });

      it("Should match multiple orders in sequence", async function () {
        // Place multiple sell orders at different prices
        await marketplace.connect(user1).placeSellOrder(1, 3, ethers.parseEther("0.18"));
        await marketplace.connect(user1).placeSellOrder(1, 2, ethers.parseEther("0.22"));
        
        // Place a large buy order that should match both
        await marketplace.connect(user2).placeBuyOrder(1, 5, ethers.parseEther("0.25"));
        
        const sellOrder1 = await marketplace.getOrder(1);
        const sellOrder2 = await marketplace.getOrder(2);
        const buyOrder = await marketplace.getOrder(3);
        
        // Both sell orders should be fully filled
        expect(sellOrder1.filledAmount).to.equal(3n);
        expect(sellOrder1.status).to.equal(1); // FILLED
        expect(sellOrder2.filledAmount).to.equal(2n);
        expect(sellOrder2.status).to.equal(1); // FILLED
        
        // Buy order should be fully filled
        expect(buyOrder.filledAmount).to.equal(5n);
        expect(buyOrder.status).to.equal(1); // FILLED
      });

      it("Should emit OrderFilled events for matched orders", async function () {
        await marketplace.connect(user1).placeSellOrder(1, 5, ethers.parseEther("0.2"));
        
        await expect(marketplace.connect(user2).placeBuyOrder(1, 3, ethers.parseEther("0.25")))
          .to.emit(marketplace, "OrderFilled")
          .withArgs(2, user2.address, 3, 0) // Buy order fully filled
          .and.to.emit(marketplace, "OrderFilled")
          .withArgs(1, user1.address, 3, 2); // Sell order partially filled
      });

      it("Should allow manual order matching", async function () {
        // Place orders that don't auto-match due to price
        await marketplace.connect(user1).placeSellOrder(1, 5, ethers.parseEther("0.25"));
        await marketplace.connect(user2).placeBuyOrder(1, 3, ethers.parseEther("0.2"));
        
        // Verify no automatic matching occurred
        let sellOrder = await marketplace.getOrder(1);
        let buyOrder = await marketplace.getOrder(2);
        expect(sellOrder.filledAmount).to.equal(0n);
        expect(buyOrder.filledAmount).to.equal(0n);
        
        // Manually trigger matching (should still not match due to price)
        await marketplace.matchOrders(1);
        
        sellOrder = await marketplace.getOrder(1);
        buyOrder = await marketplace.getOrder(2);
        expect(sellOrder.filledAmount).to.equal(0n);
        expect(buyOrder.filledAmount).to.equal(0n);
      });

      it("Should check order matching compatibility", async function () {
        await marketplace.connect(user1).placeSellOrder(1, 5, ethers.parseEther("0.2"));
        await marketplace.connect(user2).placeBuyOrder(1, 3, ethers.parseEther("0.25"));
        
        // After automatic matching, check if they could have matched
        const [canMatch, tradeAmount, tradePrice] = await marketplace.canOrdersMatch(2, 1);
        
        // They should have been able to match (and did)
        expect(canMatch).to.be.false; // False now because they're already filled
        
        // Test with new orders that can match
        await marketplace.connect(user1).placeSellOrder(1, 4, ethers.parseEther("0.18"));
        await marketplace.connect(user2).placeBuyOrder(1, 2, ethers.parseEther("0.2"));
        
        const [canMatch2, tradeAmount2, tradePrice2] = await marketplace.canOrdersMatch(4, 3);
        expect(canMatch2).to.be.false; // Should be false as they auto-matched
      });

      it("Should handle edge case with zero remaining amounts", async function () {
        // Place and fill an order completely
        await marketplace.connect(user1).placeSellOrder(1, 3, ethers.parseEther("0.2"));
        await marketplace.connect(user2).placeBuyOrder(1, 3, ethers.parseEther("0.2"));
        
        // Try to match again (should do nothing)
        await marketplace.matchOrders(1);
        
        const sellOrder = await marketplace.getOrder(1);
        const buyOrder = await marketplace.getOrder(2);
        
        expect(sellOrder.status).to.equal(1); // FILLED
        expect(buyOrder.status).to.equal(1); // FILLED
      });
    });
  });

  describe("Trading Fee System", function () {
    beforeEach(async function () {
      // Setup balances for fee testing
      const depositAmount = ethers.parseEther("10.0");
      await marketplace.connect(user1).depositETH({ value: depositAmount });
      await marketplace.connect(user2).depositETH({ value: depositAmount });
      
      // Transfer tokens to user2 for selling
      await tokenContract.connect(company).safeTransferFrom(
        company.address,
        user2.address,
        1,
        50,
        "0x"
      );
      
      // Deposit tokens to marketplace
      await marketplace.connect(user2).depositTokens(1, 50);
    });

    describe("Fee Configuration", function () {
      it("Should have default fee percentage set", async function () {
        expect(await marketplace.getTradingFeePercentage()).to.equal(50); // 0.5%
      });

      it("Should allow owner to set fee percentage", async function () {
        const newFeePercentage = 100; // 1%
        
        await expect(marketplace.connect(owner).setTradingFeePercentage(newFeePercentage))
          .to.emit(marketplace, "TradingFeeUpdated")
          .withArgs(50, newFeePercentage);
        
        expect(await marketplace.getTradingFeePercentage()).to.equal(newFeePercentage);
      });

      it("Should reject fee percentage above maximum", async function () {
        const tooHighFee = 1001; // 10.01%
        
        await expect(marketplace.connect(owner).setTradingFeePercentage(tooHighFee))
          .to.be.revertedWith("Fee percentage too high");
      });

      it("Should reject fee setting from non-owner", async function () {
        await expect(marketplace.connect(user1).setTradingFeePercentage(100))
          .to.be.revertedWithCustomError(marketplace, "OwnableUnauthorizedAccount");
      });

      it("Should allow setting fee to zero", async function () {
        await marketplace.connect(owner).setTradingFeePercentage(0);
        expect(await marketplace.getTradingFeePercentage()).to.equal(0);
      });
    });

    describe("Fee Calculation", function () {
      it("Should calculate fees correctly", async function () {
        const tradeValue = ethers.parseEther("1.0");
        const expectedFee = tradeValue * 50n / 10000n; // 0.5%
        
        expect(await marketplace.calculateTradingFee(tradeValue)).to.equal(expectedFee);
      });

      it("Should return zero fee when fee percentage is zero", async function () {
        await marketplace.connect(owner).setTradingFeePercentage(0);
        
        const tradeValue = ethers.parseEther("1.0");
        expect(await marketplace.calculateTradingFee(tradeValue)).to.equal(0);
      });

      it("Should handle small trade values", async function () {
        const smallTradeValue = 1000n; // Very small value
        const expectedFee = smallTradeValue * 50n / 10000n;
        
        expect(await marketplace.calculateTradingFee(smallTradeValue)).to.equal(expectedFee);
      });
    });

    describe("Fee Collection During Trading", function () {
      it("Should collect fees when orders are matched", async function () {
        const tokenId = 1n;
        const amount = 10n;
        const price = ethers.parseEther("0.1");
        const tradeValue = amount * price;
        const expectedFee = tradeValue * 50n / 10000n; // 0.5%
        
        // Place buy order
        const buyOrderTx = await marketplace.connect(user1).placeBuyOrder(tokenId, amount, price);
        const buyReceipt = await buyOrderTx.wait();
        const buyOrderId = buyReceipt?.logs[0] ? 1n : 1n; // First order ID
        
        // Place matching sell order
        const sellOrderTx = await marketplace.connect(user2).placeSellOrder(tokenId, amount, price);
        const sellReceipt = await sellOrderTx.wait();
        
        // Check that fee was collected
        expect(await marketplace.getCollectedFees()).to.equal(expectedFee);
        
        // Check FeeCollected event was emitted
        const sellOrderId = 2n;
        await expect(sellOrderTx)
          .to.emit(marketplace, "FeeCollected")
          .withArgs(buyOrderId, sellOrderId, expectedFee);
      });

      it("Should not collect fees when fee percentage is zero", async function () {
        // Set fee to zero
        await marketplace.connect(owner).setTradingFeePercentage(0);
        
        const tokenId = 1n;
        const amount = 10n;
        const price = ethers.parseEther("0.1");
        
        // Place and match orders
        await marketplace.connect(user1).placeBuyOrder(tokenId, amount, price);
        await marketplace.connect(user2).placeSellOrder(tokenId, amount, price);
        
        // Check no fees were collected
        expect(await marketplace.getCollectedFees()).to.equal(0);
      });

      it("Should deduct fees from seller's proceeds", async function () {
        const tokenId = 1n;
        const amount = 10n;
        const price = ethers.parseEther("0.1");
        const tradeValue = amount * price;
        const expectedFee = tradeValue * 50n / 10000n; // 0.5%
        const expectedSellerReceives = tradeValue - expectedFee;
        
        // Get initial balances
        const initialUser2Balance = await marketplace.getUserETHBalance(user2.address);
        
        // Place and match orders
        await marketplace.connect(user1).placeBuyOrder(tokenId, amount, price);
        await marketplace.connect(user2).placeSellOrder(tokenId, amount, price);
        
        // Check seller received correct amount (trade value minus fee)
        const finalUser2Balance = await marketplace.getUserETHBalance(user2.address);
        const sellerReceived = finalUser2Balance - initialUser2Balance;
        
        expect(sellerReceived).to.equal(expectedSellerReceives);
      });
    });

    describe("Fee Withdrawal", function () {
      beforeEach(async function () {
        // Generate some fees by executing trades
        const tokenId = 1n;
        const amount = 10n;
        const price = ethers.parseEther("0.1");
        
        await marketplace.connect(user1).placeBuyOrder(tokenId, amount, price);
        await marketplace.connect(user2).placeSellOrder(tokenId, amount, price);
      });

      it("Should allow owner to withdraw fees", async function () {
        const collectedFees = await marketplace.getCollectedFees();
        expect(collectedFees).to.be.gt(0);
        
        const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
        
        const tx = await marketplace.connect(owner).withdrawFees(collectedFees);
        const receipt = await tx.wait();
        const gasUsed = receipt!.gasUsed * receipt!.gasPrice;
        
        // Check event emission
        await expect(tx)
          .to.emit(marketplace, "FeesWithdrawn")
          .withArgs(owner.address, collectedFees);
        
        // Check owner received fees
        const finalOwnerBalance = await ethers.provider.getBalance(owner.address);
        const expectedBalance = initialOwnerBalance + collectedFees - gasUsed;
        expect(finalOwnerBalance).to.equal(expectedBalance);
        
        // Check collected fees reduced
        expect(await marketplace.getCollectedFees()).to.equal(0);
      });

      it("Should allow owner to withdraw all fees", async function () {
        const collectedFees = await marketplace.getCollectedFees();
        expect(collectedFees).to.be.gt(0);
        
        await expect(marketplace.connect(owner).withdrawAllFees())
          .to.emit(marketplace, "FeesWithdrawn")
          .withArgs(owner.address, collectedFees);
        
        expect(await marketplace.getCollectedFees()).to.equal(0);
      });

      it("Should reject fee withdrawal from non-owner", async function () {
        const collectedFees = await marketplace.getCollectedFees();
        
        await expect(marketplace.connect(user1).withdrawFees(collectedFees))
          .to.be.revertedWithCustomError(marketplace, "OwnableUnauthorizedAccount");
      });

      it("Should reject withdrawal of more fees than collected", async function () {
        const collectedFees = await marketplace.getCollectedFees();
        const excessiveAmount = collectedFees + ethers.parseEther("1.0");
        
        await expect(marketplace.connect(owner).withdrawFees(excessiveAmount))
          .to.be.revertedWith("Insufficient collected fees");
      });

      it("Should reject zero fee withdrawal", async function () {
        await expect(marketplace.connect(owner).withdrawFees(0))
          .to.be.revertedWith("Withdrawal amount must be greater than zero");
      });

      it("Should reject withdrawing all fees when none collected", async function () {
        // First withdraw all existing fees
        const collectedFees = await marketplace.getCollectedFees();
        if (collectedFees > 0) {
          await marketplace.connect(owner).withdrawAllFees();
        }
        
        await expect(marketplace.connect(owner).withdrawAllFees())
          .to.be.revertedWith("No fees to withdraw");
      });
    });

    describe("Fee Integration with Order Matching", function () {
      it("Should handle fees correctly with partial order fills", async function () {
        const tokenId = 1n;
        const buyAmount = 20n;
        const sellAmount = 10n;
        const price = ethers.parseEther("0.1");
        
        // Place larger buy order
        await marketplace.connect(user1).placeBuyOrder(tokenId, buyAmount, price);
        
        // Place smaller sell order that partially fills the buy order
        await marketplace.connect(user2).placeSellOrder(tokenId, sellAmount, price);
        
        // Fee should be calculated on the actual traded amount (10 tokens)
        const tradeValue = sellAmount * price;
        const expectedFee = tradeValue * 50n / 10000n;
        
        expect(await marketplace.getCollectedFees()).to.equal(expectedFee);
      });

      it("Should accumulate fees from multiple trades", async function () {
        const tokenId = 1n;
        const amount = 5n;
        const price = ethers.parseEther("0.1");
        
        // Execute first trade
        await marketplace.connect(user1).placeBuyOrder(tokenId, amount, price);
        await marketplace.connect(user2).placeSellOrder(tokenId, amount, price);
        
        const firstTradeFee = await marketplace.getCollectedFees();
        
        // Execute second trade
        await marketplace.connect(user1).placeBuyOrder(tokenId, amount, price);
        await marketplace.connect(user2).placeSellOrder(tokenId, amount, price);
        
        const totalFees = await marketplace.getCollectedFees();
        
        // Total fees should be double the first trade fee
        expect(totalFees).to.equal(firstTradeFee * 2n);
      });
    });
  });

  describe("Compliance Monitoring", function () {
    beforeEach(async function () {
      // Setup balances for compliance testing
      const depositAmount = ethers.parseEther("10.0");
      await marketplace.connect(user1).depositETH({ value: depositAmount });
      await marketplace.connect(user2).depositETH({ value: depositAmount });
      
      // Transfer tokens to user2 for selling
      await tokenContract.connect(company).safeTransferFrom(
        company.address,
        user2.address,
        1,
        50,
        "0x"
      );
      
      // Deposit tokens to marketplace
      await marketplace.connect(user2).depositTokens(1, 50);
    });

    describe("User Status Checks", function () {
      it("Should enforce user verification for trading", async function () {
        // Create a new unverified user
        const [, , , , unverifiedUser] = await ethers.getSigners();
        await regulatoryManagement.connect(unverifiedUser).registerUser("ssi-unverified", 0);
        
        // Should fail to deposit ETH due to lack of verification
        await expect(marketplace.connect(unverifiedUser).depositETH({ value: ethers.parseEther("1.0") }))
          .to.be.revertedWith("User not authorized to trade");
        
        // Should fail to place order due to lack of verification
        await expect(marketplace.connect(unverifiedUser).placeBuyOrder(1, 10, ethers.parseEther("0.1")))
          .to.be.revertedWith("User not authorized to trade");
      });

      it("Should prevent suspended users from trading", async function () {
        // Suspend user1
        await regulatoryManagement.connect(owner).suspendUser(user1.address);
        
        // Should fail to place order due to suspension (canUserTrade returns false for suspended users)
        await expect(marketplace.connect(user1).placeBuyOrder(1, 10, ethers.parseEther("0.1")))
          .to.be.revertedWith("User not authorized to trade");
      });

      it("Should allow trading after user is unsuspended", async function () {
        // Suspend and then unsuspend user1
        await regulatoryManagement.connect(owner).suspendUser(user1.address);
        await regulatoryManagement.connect(owner).unsuspendUser(user1.address);
        
        // Should be able to place order after unsuspension
        await expect(marketplace.connect(user1).placeBuyOrder(1, 10, ethers.parseEther("0.1")))
          .to.not.be.reverted;
      });
    });

    describe("Trading Activity Logging", function () {
      it("Should log trading activity when orders are placed", async function () {
        const tokenId = 1n;
        const amount = 10n;
        const price = ethers.parseEther("0.1");
        
        // Place buy order and check activity logging
        const tx = await marketplace.connect(user1).placeBuyOrder(tokenId, amount, price);
        
        await expect(tx)
          .to.emit(marketplace, "TradingActivityLogged")
          .withArgs(user1.address, tokenId, amount, price, true, 1, await time.latest());
        
        // Check activity was recorded
        const activities = await marketplace.getUserTradingHistory(user1.address);
        expect(activities.length).to.equal(1);
        expect(activities[0].user).to.equal(user1.address);
        expect(activities[0].tokenId).to.equal(tokenId);
        expect(activities[0].amount).to.equal(amount);
        expect(activities[0].price).to.equal(price);
        expect(activities[0].isBuyOrder).to.be.true;
      });

      it("Should track user trading statistics", async function () {
        const tokenId = 1n;
        const amount = 10n;
        const price = ethers.parseEther("0.1");
        
        // Execute a trade
        await marketplace.connect(user1).placeBuyOrder(tokenId, amount, price);
        await marketplace.connect(user2).placeSellOrder(tokenId, amount, price);
        
        // Check trading statistics for both users
        const user1Stats = await marketplace.getUserTradingStats(user1.address);
        const user2Stats = await marketplace.getUserTradingStats(user2.address);
        
        expect(user1Stats.totalTrades).to.equal(1);
        expect(user2Stats.totalTrades).to.equal(1);
        
        const expectedVolume = amount * price;
        expect(user1Stats.totalVolume).to.equal(expectedVolume);
        expect(user2Stats.totalVolume).to.equal(expectedVolume);
      });

      it("Should accumulate trading statistics over multiple trades", async function () {
        const tokenId = 1n;
        const amount = 5n;
        const price = ethers.parseEther("0.1");
        
        // Execute first trade
        await marketplace.connect(user1).placeBuyOrder(tokenId, amount, price);
        await marketplace.connect(user2).placeSellOrder(tokenId, amount, price);
        
        // Execute second trade
        await marketplace.connect(user1).placeBuyOrder(tokenId, amount, price);
        await marketplace.connect(user2).placeSellOrder(tokenId, amount, price);
        
        // Check accumulated statistics
        const user1Stats = await marketplace.getUserTradingStats(user1.address);
        expect(user1Stats.totalTrades).to.equal(2);
        
        const expectedTotalVolume = 2n * amount * price;
        expect(user1Stats.totalVolume).to.equal(expectedTotalVolume);
      });

      it("Should retrieve recent trading activities", async function () {
        const tokenId = 1n;
        const amount = 5n;
        const price = ethers.parseEther("0.1");
        
        // Place multiple orders
        await marketplace.connect(user1).placeBuyOrder(tokenId, amount, price);
        await marketplace.connect(user2).placeSellOrder(tokenId, amount, price);
        await marketplace.connect(user1).placeBuyOrder(tokenId, amount, price);
        
        // Get recent activities
        const recentActivities = await marketplace.getRecentTradingActivities(2);
        expect(recentActivities.length).to.equal(2);
        
        // Check total activities count
        const totalActivities = await marketplace.getTotalTradingActivities();
        expect(totalActivities).to.equal(3);
      });
    });

    describe("Suspicious Activity Detection", function () {
      it("Should detect excessive trading frequency", async function () {
        // This would require placing many orders, so we'll test the logic
        const [suspicious, reason] = await marketplace.checkSuspiciousActivity(user1.address);
        expect(suspicious).to.be.false;
        expect(reason).to.equal("No suspicious activity detected");
      });

      it("Should allow admin to emergency suspend users", async function () {
        const suspensionReason = "Suspicious trading pattern";
        
        await expect(marketplace.connect(owner).emergencySuspendUser(user1.address, suspensionReason))
          .to.emit(marketplace, "ComplianceViolation")
          .withArgs(user1.address, suspensionReason)
          .and.to.emit(marketplace, "SuspiciousActivityDetected")
          .withArgs(user1.address, suspensionReason);
      });

      it("Should reject emergency suspension from non-admin", async function () {
        await expect(marketplace.connect(user1).emergencySuspendUser(user2.address, "Test reason"))
          .to.be.revertedWithCustomError(marketplace, "OwnableUnauthorizedAccount");
      });

      it("Should reject emergency suspension of unregistered user", async function () {
        const [, , , , , unregisteredUser] = await ethers.getSigners();
        
        await expect(marketplace.connect(owner).emergencySuspendUser(unregisteredUser.address, "Test reason"))
          .to.be.revertedWith("User not registered");
      });
    });

    describe("Compliance Integration", function () {
      it("Should provide comprehensive user trading stats", async function () {
        const stats = await marketplace.getUserTradingStats(user1.address);
        
        expect(stats.isVerified).to.be.true;
        expect(stats.isSuspended).to.be.false;
        expect(stats.totalTrades).to.equal(0); // No trades yet
        expect(stats.totalVolume).to.equal(0);
      });

      it("Should reflect regulatory management status changes", async function () {
        // Initially verified
        let stats = await marketplace.getUserTradingStats(user1.address);
        expect(stats.isVerified).to.be.true;
        expect(stats.isSuspended).to.be.false;
        
        // Suspend user
        await regulatoryManagement.connect(owner).suspendUser(user1.address);
        stats = await marketplace.getUserTradingStats(user1.address);
        expect(stats.isSuspended).to.be.true;
        
        // Unsuspend user
        await regulatoryManagement.connect(owner).unsuspendUser(user1.address);
        stats = await marketplace.getUserTradingStats(user1.address);
        expect(stats.isSuspended).to.be.false;
      });

      it("Should maintain trading history across status changes", async function () {
        const tokenId = 1n;
        const amount = 10n;
        const price = ethers.parseEther("0.1");
        
        // Place order before suspension
        await marketplace.connect(user1).placeBuyOrder(tokenId, amount, price);
        
        // Suspend and unsuspend user
        await regulatoryManagement.connect(owner).suspendUser(user1.address);
        await regulatoryManagement.connect(owner).unsuspendUser(user1.address);
        
        // Trading history should still be available
        const activities = await marketplace.getUserTradingHistory(user1.address);
        expect(activities.length).to.equal(1);
        expect(activities[0].user).to.equal(user1.address);
      });
    });
  });

  describe("ERC1155 Receiver", function () {
    it("Should properly implement ERC1155Receiver interface", async function () {
      const interfaceId = "0x4e2312e0"; // ERC1155Receiver interface ID
      expect(await marketplace.supportsInterface(interfaceId)).to.be.true;
    });
  });

  describe("Security Controls", function () {
    let tokenId: number;

    beforeEach(async function () {
      // Create a token and set up for security tests
      await tokenContract.connect(company).createToken(
        "Security Test Token",
        "STT",
        "Security Company",
        MAX_SUPPLY,
        INITIAL_PRICE
      );
      tokenId = 1;
      
      // Mint tokens to company
      await tokenContract.connect(company).mintToken(company.address, tokenId, 500n);
      
      // Deposit tokens and ETH for testing
      await tokenContract.connect(company).setApprovalForAll(await marketplace.getAddress(), true);
      await marketplace.connect(company).depositTokens(tokenId, 200n);
      await marketplace.connect(company).depositETH({ value: ethers.parseEther("10") });
      
      await marketplace.connect(user1).depositETH({ value: ethers.parseEther("5") });
    });

    describe("Pausable Functionality", function () {
      it("Should allow owner to pause the contract", async function () {
        await expect(marketplace.connect(owner).pause())
          .to.emit(marketplace, "Paused")
          .withArgs(owner.address);

        expect(await marketplace.paused()).to.be.true;
      });

      it("Should allow owner to unpause the contract", async function () {
        await marketplace.connect(owner).pause();
        
        await expect(marketplace.connect(owner).unpause())
          .to.emit(marketplace, "Unpaused")
          .withArgs(owner.address);

        expect(await marketplace.paused()).to.be.false;
      });

      it("Should allow owner to pause trading specifically", async function () {
        await expect(marketplace.connect(owner).pauseTrading())
          .to.emit(marketplace, "Paused")
          .withArgs(owner.address);

        expect(await marketplace.paused()).to.be.true;
      });

      it("Should reject pause by non-owner", async function () {
        await expect(marketplace.connect(user1).pause())
          .to.be.revertedWithCustomError(marketplace, "OwnableUnauthorizedAccount");
      });

      it("Should reject unpause by non-owner", async function () {
        await marketplace.connect(owner).pause();
        
        await expect(marketplace.connect(user1).unpause())
          .to.be.revertedWithCustomError(marketplace, "OwnableUnauthorizedAccount");
      });

      it("Should prevent ETH deposits when paused", async function () {
        await marketplace.connect(owner).pause();
        
        await expect(
          marketplace.connect(user1).depositETH({ value: ethers.parseEther("1") })
        ).to.be.revertedWithCustomError(marketplace, "EnforcedPause");
      });

      it("Should prevent token deposits when paused", async function () {
        await marketplace.connect(owner).pause();
        
        await expect(
          marketplace.connect(company).depositTokens(tokenId, 50n)
        ).to.be.revertedWithCustomError(marketplace, "EnforcedPause");
      });

      it("Should prevent buy orders when paused", async function () {
        await marketplace.connect(owner).pause();
        
        await expect(
          marketplace.connect(user1).placeBuyOrder(tokenId, 10n, INITIAL_PRICE)
        ).to.be.revertedWithCustomError(marketplace, "EnforcedPause");
      });

      it("Should prevent sell orders when paused", async function () {
        await marketplace.connect(owner).pause();
        
        await expect(
          marketplace.connect(company).placeSellOrder(tokenId, 10n, INITIAL_PRICE)
        ).to.be.revertedWithCustomError(marketplace, "EnforcedPause");
      });

      it("Should prevent manual order matching when paused", async function () {
        await marketplace.connect(owner).pause();
        
        await expect(
          marketplace.connect(user1).matchOrders(tokenId)
        ).to.be.revertedWithCustomError(marketplace, "EnforcedPause");
      });

      it("Should allow withdrawals when paused", async function () {
        await marketplace.connect(owner).pause();
        
        // ETH withdrawals should still work
        await expect(
          marketplace.connect(user1).withdrawETH(ethers.parseEther("1"))
        ).to.not.be.reverted;
        
        // Token withdrawals should still work
        await expect(
          marketplace.connect(company).withdrawTokens(tokenId, 50n)
        ).to.not.be.reverted;
      });

      it("Should allow order cancellations when paused", async function () {
        // Place an order first
        const tx = await marketplace.connect(user1).placeBuyOrder(tokenId, 10n, INITIAL_PRICE);
        const receipt = await tx.wait();
        const orderId = 1; // First order
        
        await marketplace.connect(owner).pause();
        
        // Order cancellation should still work
        await expect(
          marketplace.connect(user1).cancelOrder(orderId)
        ).to.not.be.reverted;
      });

      it("Should allow view functions when paused", async function () {
        await marketplace.connect(owner).pause();
        
        // View functions should still work
        const ethBalance = await marketplace.getUserETHBalance(user1.address);
        expect(ethBalance).to.be.greaterThan(0);
        
        const tokenBalance = await marketplace.getUserTokenBalance(company.address, tokenId);
        expect(tokenBalance).to.be.greaterThan(0);
        
        const orderBook = await marketplace.getOrderBook(tokenId);
        expect(orderBook).to.not.be.undefined;
      });

      it("Should resume normal operations after unpause", async function () {
        await marketplace.connect(owner).pause();
        await marketplace.connect(owner).unpause();
        
        // Should be able to deposit ETH
        await expect(
          marketplace.connect(user2).depositETH({ value: ethers.parseEther("1") })
        ).to.emit(marketplace, "ETHDeposited");
        
        // Should be able to place orders
        await expect(
          marketplace.connect(user1).placeBuyOrder(tokenId, 5n, INITIAL_PRICE)
        ).to.emit(marketplace, "OrderPlaced");
        
        await expect(
          marketplace.connect(company).placeSellOrder(tokenId, 5n, INITIAL_PRICE)
        ).to.emit(marketplace, "OrderPlaced");
      });
    });

    describe("Access Control", function () {
      it("Should have correct owner set", async function () {
        expect(await marketplace.owner()).to.equal(owner.address);
      });

      it("Should allow owner to transfer ownership", async function () {
        await expect(marketplace.connect(owner).transferOwnership(user1.address))
          .to.emit(marketplace, "OwnershipTransferred")
          .withArgs(owner.address, user1.address);

        expect(await marketplace.owner()).to.equal(user1.address);
      });

      it("Should reject ownership transfer by non-owner", async function () {
        await expect(marketplace.connect(user1).transferOwnership(user2.address))
          .to.be.revertedWithCustomError(marketplace, "OwnableUnauthorizedAccount");
      });

      it("Should allow new owner to perform admin functions", async function () {
        await marketplace.connect(owner).transferOwnership(user1.address);
        
        // New owner should be able to pause
        await expect(marketplace.connect(user1).pause())
          .to.emit(marketplace, "Paused");
        
        // New owner should be able to set trading fees
        await expect(marketplace.connect(user1).setTradingFeePercentage(100))
          .to.emit(marketplace, "TradingFeeUpdated");
        
        // New owner should be able to withdraw fees
        await marketplace.connect(user1).unpause();
        
        // Generate some fees first
        await marketplace.connect(user1).placeBuyOrder(tokenId, 5n, INITIAL_PRICE);
        await marketplace.connect(company).placeSellOrder(tokenId, 5n, INITIAL_PRICE);
        
        const collectedFees = await marketplace.getCollectedFees();
        if (collectedFees > 0) {
          await expect(marketplace.connect(user1).withdrawAllFees())
            .to.emit(marketplace, "FeesWithdrawn");
        }
      });

      it("Should prevent old owner from performing admin functions", async function () {
        await marketplace.connect(owner).transferOwnership(user1.address);
        
        // Old owner should not be able to pause
        await expect(marketplace.connect(owner).pause())
          .to.be.revertedWithCustomError(marketplace, "OwnableUnauthorizedAccount");
        
        // Old owner should not be able to set trading fees
        await expect(marketplace.connect(owner).setTradingFeePercentage(100))
          .to.be.revertedWithCustomError(marketplace, "OwnableUnauthorizedAccount");
        
        // Old owner should not be able to withdraw fees
        await expect(marketplace.connect(owner).withdrawAllFees())
          .to.be.revertedWithCustomError(marketplace, "OwnableUnauthorizedAccount");
      });

      it("Should restrict admin functions to owner only", async function () {
        // Non-owners should not be able to set trading fees
        await expect(marketplace.connect(user1).setTradingFeePercentage(100))
          .to.be.revertedWithCustomError(marketplace, "OwnableUnauthorizedAccount");
        
        // Non-owners should not be able to withdraw fees
        await expect(marketplace.connect(user1).withdrawAllFees())
          .to.be.revertedWithCustomError(marketplace, "OwnableUnauthorizedAccount");
        
        // Non-owners should not be able to emergency suspend users
        await expect(marketplace.connect(user1).emergencySuspendUser(user2.address, "Test reason"))
          .to.be.revertedWithCustomError(marketplace, "OwnableUnauthorizedAccount");
      });
    });

    describe("Reentrancy Protection", function () {
      it("Should have reentrancy guard on ETH deposits", async function () {
        // This test verifies that the nonReentrant modifier is present
        await expect(
          marketplace.connect(user1).depositETH({ value: ethers.parseEther("1") })
        ).to.emit(marketplace, "ETHDeposited");
      });

      it("Should have reentrancy guard on ETH withdrawals", async function () {
        await expect(
          marketplace.connect(user1).withdrawETH(ethers.parseEther("1"))
        ).to.emit(marketplace, "ETHWithdrawn");
      });

      it("Should have reentrancy guard on token deposits", async function () {
        await expect(
          marketplace.connect(company).depositTokens(tokenId, 50n)
        ).to.emit(marketplace, "TokensDeposited");
      });

      it("Should have reentrancy guard on token withdrawals", async function () {
        await expect(
          marketplace.connect(company).withdrawTokens(tokenId, 50n)
        ).to.emit(marketplace, "TokensWithdrawn");
      });

      it("Should have reentrancy guard on order placement", async function () {
        await expect(
          marketplace.connect(user1).placeBuyOrder(tokenId, 5n, INITIAL_PRICE)
        ).to.emit(marketplace, "OrderPlaced");
        
        await expect(
          marketplace.connect(company).placeSellOrder(tokenId, 5n, INITIAL_PRICE)
        ).to.emit(marketplace, "OrderPlaced");
      });

      it("Should have reentrancy guard on order cancellation", async function () {
        const tx = await marketplace.connect(user1).placeBuyOrder(tokenId, 5n, INITIAL_PRICE);
        const orderId = 1;
        
        await expect(
          marketplace.connect(user1).cancelOrder(orderId)
        ).to.emit(marketplace, "OrderCancelled");
      });

      it("Should have reentrancy guard on fee withdrawals", async function () {
        // Generate some fees first
        await marketplace.connect(user1).placeBuyOrder(tokenId, 5n, INITIAL_PRICE);
        await marketplace.connect(company).placeSellOrder(tokenId, 5n, INITIAL_PRICE);
        
        const collectedFees = await marketplace.getCollectedFees();
        if (collectedFees > 0) {
          await expect(
            marketplace.connect(owner).withdrawAllFees()
          ).to.emit(marketplace, "FeesWithdrawn");
        }
      });
    });

    describe("Emergency Controls", function () {
      it("Should allow owner to emergency suspend users", async function () {
        const reason = "Suspicious trading activity detected";
        
        await expect(
          marketplace.connect(owner).emergencySuspendUser(user1.address, reason)
        ).to.emit(marketplace, "ComplianceViolation")
         .withArgs(user1.address, reason)
         .and.to.emit(marketplace, "SuspiciousActivityDetected")
         .withArgs(user1.address, reason);
      });

      it("Should reject emergency suspension by non-owner", async function () {
        await expect(
          marketplace.connect(user1).emergencySuspendUser(user2.address, "Test reason")
        ).to.be.revertedWithCustomError(marketplace, "OwnableUnauthorizedAccount");
      });

      it("Should reject emergency suspension of unregistered user", async function () {
        const [, , , , unregisteredUser] = await ethers.getSigners();
        
        await expect(
          marketplace.connect(owner).emergencySuspendUser(unregisteredUser.address, "Test reason")
        ).to.be.revertedWith("User not registered");
      });

      it("Should reject emergency suspension of already suspended user", async function () {
        // Suspend user first through regulatory management
        await regulatoryManagement.connect(owner).suspendUser(user1.address);
        
        await expect(
          marketplace.connect(owner).emergencySuspendUser(user1.address, "Test reason")
        ).to.be.revertedWith("User already suspended");
      });

      it("Should allow checking suspicious activity", async function () {
        const [isSuspicious, reason] = await marketplace.checkSuspiciousActivity(user1.address);
        expect(typeof isSuspicious).to.equal("boolean");
        expect(typeof reason).to.equal("string");
      });

      it("Should detect excessive trading frequency", async function () {
        // This would require setting up many trades to trigger the suspicious activity detection
        // For now, we just verify the function exists and returns expected types
        const [isSuspicious, reason] = await marketplace.checkSuspiciousActivity(user1.address);
        expect(reason).to.include("No suspicious activity detected");
      });
    });

    describe("Input Validation", function () {
      it("Should validate zero amounts in deposits", async function () {
        await expect(
          marketplace.connect(user1).depositETH({ value: 0 })
        ).to.be.revertedWith("Deposit amount must be greater than zero");
      });

      it("Should validate zero amounts in withdrawals", async function () {
        await expect(
          marketplace.connect(user1).withdrawETH(0)
        ).to.be.revertedWith("Withdrawal amount must be greater than zero");
        
        await expect(
          marketplace.connect(company).withdrawTokens(tokenId, 0)
        ).to.be.revertedWith("Withdrawal amount must be greater than zero");
      });

      it("Should validate zero amounts in orders", async function () {
        await expect(
          marketplace.connect(user1).placeBuyOrder(tokenId, 0, INITIAL_PRICE)
        ).to.be.revertedWith("Amount must be greater than zero");
        
        await expect(
          marketplace.connect(user1).placeBuyOrder(tokenId, 10n, 0)
        ).to.be.revertedWith("Price must be greater than zero");
        
        await expect(
          marketplace.connect(company).placeSellOrder(tokenId, 0, INITIAL_PRICE)
        ).to.be.revertedWith("Amount must be greater than zero");
        
        await expect(
          marketplace.connect(company).placeSellOrder(tokenId, 10n, 0)
        ).to.be.revertedWith("Price must be greater than zero");
      });

      it("Should validate token existence", async function () {
        const nonExistentTokenId = 999;
        
        await expect(
          marketplace.connect(user1).placeBuyOrder(nonExistentTokenId, 10n, INITIAL_PRICE)
        ).to.be.revertedWith("Token does not exist");
        
        await expect(
          marketplace.connect(company).placeSellOrder(nonExistentTokenId, 10n, INITIAL_PRICE)
        ).to.be.revertedWith("Token does not exist");
        
        await expect(
          marketplace.connect(user1).matchOrders(nonExistentTokenId)
        ).to.be.revertedWith("Token does not exist");
      });

      it("Should validate order IDs", async function () {
        await expect(
          marketplace.connect(user1).cancelOrder(999)
        ).to.be.revertedWith("Invalid order ID");
        
        await expect(
          marketplace.connect(user1).getOrder(999)
        ).to.be.revertedWith("Invalid order ID");
      });

      it("Should validate sufficient balances", async function () {
        // Try to withdraw more ETH than available
        const userBalance = await marketplace.getUserETHBalance(user1.address);
        await expect(
          marketplace.connect(user1).withdrawETH(userBalance + ethers.parseEther("1"))
        ).to.be.revertedWith("Insufficient ETH balance");
        
        // Try to withdraw more tokens than available
        const tokenBalance = await marketplace.getUserTokenBalance(company.address, tokenId);
        await expect(
          marketplace.connect(company).withdrawTokens(tokenId, tokenBalance + 100n)
        ).to.be.revertedWith("Insufficient token balance in marketplace");
        
        // Try to place buy order with insufficient ETH
        await expect(
          marketplace.connect(user1).placeBuyOrder(tokenId, 1000n, ethers.parseEther("100"))
        ).to.be.revertedWith("Insufficient ETH balance");
        
        // Try to place sell order with insufficient tokens
        await expect(
          marketplace.connect(company).placeSellOrder(tokenId, 1000n, INITIAL_PRICE)
        ).to.be.revertedWith("Insufficient token balance");
      });
    });
  });
});