import { expect } from "chai";
import { ethers as originalEthers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { 
    RegulatoryManagement, 
    RegulatedERC1155Token, 
    RegulatedMarketplace 
} from "../typechain-types";
import { networkAwareEthers as ethers } from "./utils/test-decimal-utils";

describe("Frontend Integration - Events and View Functions", function () {
    let regulatoryManagement: RegulatoryManagement;
    let tokenContract: RegulatedERC1155Token;
    let marketplace: RegulatedMarketplace;
    let user1: HardhatEthersSigner;
    let user2: HardhatEthersSigner;
    let company1: HardhatEthersSigner;

    beforeEach(async function () {
        [, user1, user2, company1] = await ethers.getSigners();

        // Deploy RegulatoryManagement
        const RegulatoryManagementFactory = await ethers.getContractFactory("RegulatoryManagement");
        regulatoryManagement = await RegulatoryManagementFactory.deploy();
        await regulatoryManagement.waitForDeployment();

        // Deploy RegulatedERC1155Token
        const TokenFactory = await ethers.getContractFactory("RegulatedERC1155Token");
        tokenContract = await TokenFactory.deploy(
            await regulatoryManagement.getAddress(),
            "https://api.example.com/metadata/{id}.json"
        );
        await tokenContract.waitForDeployment();

        // Deploy RegulatedMarketplace
        const MarketplaceFactory = await ethers.getContractFactory("RegulatedMarketplace");
        marketplace = await MarketplaceFactory.deploy(
            await regulatoryManagement.getAddress(),
            await tokenContract.getAddress()
        );
        await marketplace.waitForDeployment();

        // Register and verify users
        await regulatoryManagement.connect(user1).registerUser("ssi-user1", 0); // Individual
        await regulatoryManagement.connect(user2).registerUser("ssi-user2", 0); // Individual
        await regulatoryManagement.connect(company1).registerUser("ssi-company1", 1); // Company

        await regulatoryManagement.verifyUser(user1.address);
        await regulatoryManagement.verifyUser(user2.address);
        await regulatoryManagement.verifyUser(company1.address);
    });

    describe("RegulatoryManagement Events", function () {
        it("Should emit UserRegistered event with correct parameters", async function () {
            const newUser = (await ethers.getSigners())[4];
            
            await expect(regulatoryManagement.connect(newUser).registerUser("ssi-newuser", 0))
                .to.emit(regulatoryManagement, "UserRegistered")
                .withArgs(newUser.address, "ssi-newuser", 0, await ethers.provider.getBlock("latest").then(b => b!.timestamp + 1));
        });

        it("Should emit UserVerified and PermissionsUpdated events", async function () {
            const newUser = (await ethers.getSigners())[4];
            await regulatoryManagement.connect(newUser).registerUser("ssi-newuser", 1); // Company
            
            await expect(regulatoryManagement.verifyUser(newUser.address))
                .to.emit(regulatoryManagement, "UserVerified")
                .and.to.emit(regulatoryManagement, "PermissionsUpdated")
                .withArgs(newUser.address, true, true);
        });

        it("Should emit UserSuspended and PermissionsUpdated events", async function () {
            await expect(regulatoryManagement.suspendUser(user1.address))
                .to.emit(regulatoryManagement, "UserSuspended")
                .and.to.emit(regulatoryManagement, "PermissionsUpdated")
                .withArgs(user1.address, false, false);
        });

        it("Should emit ContractPaused and ContractUnpaused events", async function () {
            await expect(regulatoryManagement.pause())
                .to.emit(regulatoryManagement, "ContractPaused");
            
            await expect(regulatoryManagement.unpause())
                .to.emit(regulatoryManagement, "ContractUnpaused");
        });
    });

    describe("RegulatoryManagement View Functions", function () {
        it("Should return all registered users", async function () {
            const allUsers = await regulatoryManagement.getAllUsers();
            expect(allUsers).to.have.length(3);
            expect(allUsers).to.include(user1.address);
            expect(allUsers).to.include(user2.address);
            expect(allUsers).to.include(company1.address);
        });

        it("Should return correct platform statistics", async function () {
            const stats = await regulatoryManagement.getPlatformStats();
            expect(stats.totalUsers).to.equal(3);
            expect(stats.verifiedUsers).to.equal(3);
            expect(stats.companyUsers).to.equal(1);
            expect(stats.individualUsers).to.equal(2);
            expect(stats.suspendedUsers).to.equal(0);
        });

        it("Should return users by type", async function () {
            const companyUsers = await regulatoryManagement.getUsersByType(1);
            expect(companyUsers).to.have.length(1);
            expect(companyUsers[0]).to.equal(company1.address);

            const individualUsers = await regulatoryManagement.getUsersByType(0);
            expect(individualUsers).to.have.length(2);
        });

        it("Should return verified users only", async function () {
            const verifiedUsers = await regulatoryManagement.getVerifiedUsers();
            expect(verifiedUsers).to.have.length(3);
        });
    });

    describe("Token Contract Events", function () {
        it("Should emit TokenCreated event with correct parameters", async function () {
            await expect(tokenContract.connect(company1).createToken(
                "Test Token",
                "TEST",
                "Test Company",
                1000,
                ethers.parseEther("0.1")
            ))
                .to.emit(tokenContract, "TokenCreated")
                .withArgs(
                    1,
                    company1.address,
                    "Test Token",
                    "TEST",
                    "Test Company",
                    1000,
                    ethers.parseEther("0.1"),
                    await ethers.provider.getBlock("latest").then(b => b!.timestamp + 1)
                );
        });

        it("Should emit TokenMinted event", async function () {
            await tokenContract.connect(company1).createToken(
                "Test Token",
                "TEST",
                "Test Company",
                1000,
                ethers.parseEther("0.1")
            );

            await expect(tokenContract.connect(company1).mintToken(user1.address, 1, 100))
                .to.emit(tokenContract, "TokenMinted")
                .withArgs(1, user1.address, 100, 100);
        });

        it("Should emit TokenStatusChanged event", async function () {
            await tokenContract.connect(company1).createToken(
                "Test Token",
                "TEST",
                "Test Company",
                1000,
                ethers.parseEther("0.1")
            );

            await expect(tokenContract.connect(company1).setTokenStatus(1, false))
                .to.emit(tokenContract, "TokenStatusChanged")
                .withArgs(1, false);
        });

        it("Should emit MarketplaceTransfer event", async function () {
            await tokenContract.connect(company1).createToken(
                "Test Token",
                "TEST",
                "Test Company",
                1000,
                ethers.parseEther("0.1")
            );
            await tokenContract.connect(company1).mintToken(user1.address, 1, 100);

            // Set up marketplace as authorized caller
            await tokenContract.connect(user1).setApprovalForAll(await marketplace.getAddress(), true);
            await marketplace.connect(user1).depositTokens(1, 50);

            // The MarketplaceTransfer event should be emitted during token deposit
            await expect(marketplace.connect(user1).depositTokens(1, 25))
                .to.emit(tokenContract, "MarketplaceTransfer");
        });
    });

    describe("Token Contract View Functions", function () {
        beforeEach(async function () {
            // Create test tokens
            await tokenContract.connect(company1).createToken(
                "Token 1",
                "TK1",
                "Company 1",
                1000,
                ethers.parseEther("0.1")
            );
            await tokenContract.connect(company1).createToken(
                "Token 2",
                "TK2",
                "Company 1",
                2000,
                ethers.parseEther("0.2")
            );
        });

        it("Should return tokens by creator", async function () {
            const creatorTokens = await tokenContract.getTokensByCreator(company1.address);
            expect(creatorTokens).to.have.length(2);
            expect(creatorTokens[0]).to.equal(1);
            expect(creatorTokens[1]).to.equal(2);
        });

        it("Should return active tokens", async function () {
            const activeTokens = await tokenContract.getActiveTokens();
            expect(activeTokens).to.have.length(2);
        });

        it("Should return token statistics", async function () {
            const stats = await tokenContract.getTokenStats();
            expect(stats.totalTokens).to.equal(2);
            expect(stats.activeTokens).to.equal(2);
            expect(stats.totalSupplyAll).to.equal(0); // No tokens minted yet
            expect(stats.totalMaxSupplyAll).to.equal(3000);
        });

        it("Should return multiple token info", async function () {
            const tokensInfo = await tokenContract.getMultipleTokenInfo([1, 2]);
            expect(tokensInfo).to.have.length(2);
            expect(tokensInfo[0].name).to.equal("Token 1");
            expect(tokensInfo[1].name).to.equal("Token 2");
        });

        it("Should return user token balances", async function () {
            await tokenContract.connect(company1).mintToken(user1.address, 1, 100);
            await tokenContract.connect(company1).mintToken(user1.address, 2, 200);

            const balances = await tokenContract.getUserTokenBalances(user1.address, [1, 2]);
            expect(balances[0]).to.equal(100);
            expect(balances[1]).to.equal(200);
        });
    });

    describe("Marketplace Events", function () {
        beforeEach(async function () {
            // Create and mint tokens
            await tokenContract.connect(company1).createToken(
                "Test Token",
                "TEST",
                "Test Company",
                1000,
                ethers.parseEther("0.1")
            );
            await tokenContract.connect(company1).mintToken(user1.address, 1, 100);
            await tokenContract.connect(company1).mintToken(user2.address, 1, 100);
        });

        it("Should emit MarketplaceInitialized event on deployment", async function () {
            const MarketplaceFactory = await ethers.getContractFactory("RegulatedMarketplace");
            const newMarketplace = await MarketplaceFactory.deploy(
                await regulatoryManagement.getAddress(),
                await tokenContract.getAddress()
            );
            
            await expect(newMarketplace.deploymentTransaction())
                .to.emit(newMarketplace, "MarketplaceInitialized")
                .withArgs(await regulatoryManagement.getAddress(), await tokenContract.getAddress(), 50);
        });

        it("Should emit ETHDeposited event", async function () {
            const depositAmount = ethers.parseEther("1");
            
            await expect(marketplace.connect(user1).depositETH({ value: depositAmount }))
                .to.emit(marketplace, "ETHDeposited")
                .withArgs(user1.address, depositAmount, depositAmount);
        });

        it("Should emit TokensDeposited event", async function () {
            await tokenContract.connect(user1).setApprovalForAll(await marketplace.getAddress(), true);
            
            await expect(marketplace.connect(user1).depositTokens(1, 50))
                .to.emit(marketplace, "TokensDeposited")
                .withArgs(user1.address, 1, 50, 50);
        });

        it("Should emit OrderPlaced and TradingActivityLogged events", async function () {
            await marketplace.connect(user1).depositETH({ value: ethers.parseEther("1") });
            
            await expect(marketplace.connect(user1).placeBuyOrder(1, 10, ethers.parseEther("0.1")))
                .to.emit(marketplace, "OrderPlaced")
                .and.to.emit(marketplace, "TradingActivityLogged");
        });

        it("Should emit TradeExecuted event when orders match", async function () {
            // Setup for trade
            await marketplace.connect(user1).depositETH({ value: ethers.parseEther("1") });
            await tokenContract.connect(user2).setApprovalForAll(await marketplace.getAddress(), true);
            await marketplace.connect(user2).depositTokens(1, 50);

            // Place orders
            await marketplace.connect(user1).placeBuyOrder(1, 10, ethers.parseEther("0.1"));
            
            await expect(marketplace.connect(user2).placeSellOrder(1, 10, ethers.parseEther("0.1")))
                .to.emit(marketplace, "TradeExecuted");
        });

        it("Should emit UserStatsUpdated event", async function () {
            // Setup for trade
            await marketplace.connect(user1).depositETH({ value: ethers.parseEther("1") });
            await tokenContract.connect(user2).setApprovalForAll(await marketplace.getAddress(), true);
            await marketplace.connect(user2).depositTokens(1, 50);

            // Place orders that will match
            await marketplace.connect(user1).placeBuyOrder(1, 10, ethers.parseEther("0.1"));
            
            await expect(marketplace.connect(user2).placeSellOrder(1, 10, ethers.parseEther("0.1")))
                .to.emit(marketplace, "UserStatsUpdated");
        });
    });

    describe("Marketplace View Functions", function () {
        beforeEach(async function () {
            // Create and mint tokens
            await tokenContract.connect(company1).createToken(
                "Test Token",
                "TEST",
                "Test Company",
                1000,
                ethers.parseEther("0.1")
            );
            await tokenContract.connect(company1).mintToken(user1.address, 1, 100);
            await tokenContract.connect(company1).mintToken(user2.address, 1, 100);

            // Setup marketplace balances
            await marketplace.connect(user1).depositETH({ value: ethers.parseEther("1") });
            await tokenContract.connect(user2).setApprovalForAll(await marketplace.getAddress(), true);
            await marketplace.connect(user2).depositTokens(1, 50);
        });

        it("Should return marketplace statistics", async function () {
            await marketplace.connect(user1).placeBuyOrder(1, 10, ethers.parseEther("0.1"));
            
            const stats = await marketplace.getMarketplaceStats();
            expect(stats.totalOrders).to.equal(1);
            expect(stats.activeOrders).to.equal(1);
        });

        it("Should return user balance correctly", async function () {
            const balance = await marketplace.getUserBalance(user1.address);
            expect(balance.ethBalance).to.equal(ethers.parseEther("1"));
        });

        it("Should return comprehensive user data", async function () {
            await marketplace.connect(user1).placeBuyOrder(1, 10, ethers.parseEther("0.1"));
            
            const userData = await marketplace.getComprehensiveUserData(user1.address);
            expect(userData.ethBalance).to.equal(ethers.parseEther("1.0") - (10n * ethers.parseEther("0.1"))); // 1 ETH - (10 * 0.1 ETH) locked in order
            expect(userData.activeOrdersCount).to.equal(1);
        });

        it("Should return all orders for token", async function () {
            await marketplace.connect(user1).placeBuyOrder(1, 10, ethers.parseEther("0.1"));
            await marketplace.connect(user2).placeSellOrder(1, 5, ethers.parseEther("0.2"));
            
            const orders = await marketplace.getAllOrdersForToken(1);
            expect(orders).to.have.length(2);
        });

        it("Should return recent orders", async function () {
            await marketplace.connect(user1).placeBuyOrder(1, 10, ethers.parseEther("0.1"));
            
            const recentOrders = await marketplace.getRecentOrders(5);
            expect(recentOrders).to.have.length(1);
        });

        it("Should return orders by status", async function () {
            await marketplace.connect(user1).placeBuyOrder(1, 10, ethers.parseEther("0.1"));
            
            const activeOrders = await marketplace.getOrdersByStatus(0); // ACTIVE
            expect(activeOrders).to.have.length(1);
        });

        it("Should return market depth", async function () {
            await marketplace.connect(user1).placeBuyOrder(1, 10, ethers.parseEther("0.1"));
            await marketplace.connect(user2).placeSellOrder(1, 5, ethers.parseEther("0.2"));
            
            const depth = await marketplace.getMarketDepth(1, 5);
            expect(depth.buyPrices).to.have.length(5);
            expect(depth.sellPrices).to.have.length(5);
        });
    });

    describe("Event Emission Verification", function () {
        it("Should emit all required events during complete trading workflow", async function () {
            // Create token
            await expect(tokenContract.connect(company1).createToken(
                "Workflow Token",
                "WFT",
                "Workflow Company",
                1000,
                ethers.parseEther("0.1")
            )).to.emit(tokenContract, "TokenCreated");

            // Mint tokens
            await expect(tokenContract.connect(company1).mintToken(user1.address, 1, 100))
                .to.emit(tokenContract, "TokenMinted");

            // Deposit ETH
            await expect(marketplace.connect(user1).depositETH({ value: ethers.parseEther("1") }))
                .to.emit(marketplace, "ETHDeposited");

            // Deposit tokens
            await tokenContract.connect(user1).setApprovalForAll(await marketplace.getAddress(), true);
            await expect(marketplace.connect(user1).depositTokens(1, 50))
                .to.emit(marketplace, "TokensDeposited");

            // Place order
            await expect(marketplace.connect(user1).placeBuyOrder(1, 10, ethers.parseEther("0.1")))
                .to.emit(marketplace, "OrderPlaced")
                .and.to.emit(marketplace, "TradingActivityLogged");

            // Cancel order
            await expect(marketplace.connect(user1).cancelOrder(1))
                .to.emit(marketplace, "OrderCancelled");
        });
    });
});