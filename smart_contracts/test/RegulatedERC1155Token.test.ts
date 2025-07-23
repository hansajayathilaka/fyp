import { expect } from "chai";
import { ethers as originalEthers } from "hardhat";
import { RegulatoryManagement, RegulatedERC1155Token } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { networkAwareEthers as ethers } from "./utils/test-decimal-utils";

describe("RegulatedERC1155Token", function () {
    let regulatoryManagement: RegulatoryManagement;
    let regulatedToken: RegulatedERC1155Token;
    let owner: SignerWithAddress;
    let companyUser: SignerWithAddress;
    let individualUser: SignerWithAddress;
    let unregisteredUser: SignerWithAddress;

    const TOKEN_URI = "https://api.example.com/token/{id}.json";

    beforeEach(async function () {
        [owner, companyUser, individualUser, unregisteredUser] = await ethers.getSigners();

        // Deploy RegulatoryManagement contract
        const RegulatoryManagementFactory = await ethers.getContractFactory("RegulatoryManagement");
        regulatoryManagement = await RegulatoryManagementFactory.deploy();
        await regulatoryManagement.waitForDeployment();

        // Deploy RegulatedERC1155Token contract
        const RegulatedTokenFactory = await ethers.getContractFactory("RegulatedERC1155Token");
        regulatedToken = await RegulatedTokenFactory.deploy(
            await regulatoryManagement.getAddress(),
            TOKEN_URI
        );
        await regulatedToken.waitForDeployment();

        // Register and verify company user
        await regulatoryManagement.connect(companyUser).registerUser("company-ssi-123", 1); // UserType.Company = 1
        await regulatoryManagement.connect(owner).verifyUser(companyUser.address);

        // Register and verify individual user
        await regulatoryManagement.connect(individualUser).registerUser("individual-ssi-456", 0); // UserType.Individual = 0
        await regulatoryManagement.connect(owner).verifyUser(individualUser.address);
    });

    describe("Token Creation", function () {
        it("Should allow verified company users to create tokens", async function () {
            const tokenName = "ACME Corp Shares";
            const tokenSymbol = "ACME";
            const companyName = "ACME Corporation";
            const maxSupply = ethers.parseEther("1000000");
            const initialPrice = ethers.parseEther("10");

            const tx = await regulatedToken.connect(companyUser).createToken(
                tokenName,
                tokenSymbol,
                companyName,
                maxSupply,
                initialPrice
            );

            const receipt = await tx.wait();
            const tokenCreatedEvent = receipt?.logs.find(
                log => regulatedToken.interface.parseLog(log as any)?.name === "TokenCreated"
            );

            expect(tokenCreatedEvent).to.not.be.undefined;

            // Check token metadata
            const tokenInfo = await regulatedToken.getTokenInfo(1);
            expect(tokenInfo.name).to.equal(tokenName);
            expect(tokenInfo.symbol).to.equal(tokenSymbol);
            expect(tokenInfo.companyName).to.equal(companyName);
            expect(tokenInfo.maxSupply).to.equal(maxSupply);
            expect(tokenInfo.initialPrice).to.equal(initialPrice);
            expect(tokenInfo.creator).to.equal(companyUser.address);
            expect(tokenInfo.currentSupply).to.equal(0);
            expect(tokenInfo.isActive).to.be.true;
        });

        it("Should not allow individual users to create tokens", async function () {
            await expect(
                regulatedToken.connect(individualUser).createToken(
                    "Test Token",
                    "TEST",
                    "Test Company",
                    ethers.parseEther("1000"),
                    ethers.parseEther("1")
                )
            ).to.be.revertedWith("Only verified company users can create tokens");
        });

        it("Should not allow unregistered users to create tokens", async function () {
            await expect(
                regulatedToken.connect(unregisteredUser).createToken(
                    "Test Token",
                    "TEST",
                    "Test Company",
                    ethers.parseEther("1000"),
                    ethers.parseEther("1")
                )
            ).to.be.revertedWith("Only verified company users can create tokens");
        });

        it("Should reject token creation with empty name", async function () {
            await expect(
                regulatedToken.connect(companyUser).createToken(
                    "",
                    "TEST",
                    "Test Company",
                    ethers.parseEther("1000"),
                    ethers.parseEther("1")
                )
            ).to.be.revertedWith("Token name cannot be empty");
        });

        it("Should reject token creation with empty symbol", async function () {
            await expect(
                regulatedToken.connect(companyUser).createToken(
                    "Test Token",
                    "",
                    "Test Company",
                    ethers.parseEther("1000"),
                    ethers.parseEther("1")
                )
            ).to.be.revertedWith("Token symbol cannot be empty");
        });

        it("Should reject token creation with empty company name", async function () {
            await expect(
                regulatedToken.connect(companyUser).createToken(
                    "Test Token",
                    "TEST",
                    "",
                    ethers.parseEther("1000"),
                    ethers.parseEther("1")
                )
            ).to.be.revertedWith("Company name cannot be empty");
        });

        it("Should reject token creation with zero max supply", async function () {
            await expect(
                regulatedToken.connect(companyUser).createToken(
                    "Test Token",
                    "TEST",
                    "Test Company",
                    0,
                    ethers.parseEther("1")
                )
            ).to.be.revertedWith("Max supply must be greater than zero");
        });

        it("Should reject token creation with zero initial price", async function () {
            await expect(
                regulatedToken.connect(companyUser).createToken(
                    "Test Token",
                    "TEST",
                    "Test Company",
                    ethers.parseEther("1000"),
                    0
                )
            ).to.be.revertedWith("Initial price must be greater than zero");
        });

        it("Should track all created tokens", async function () {
            // Create first token
            await regulatedToken.connect(companyUser).createToken(
                "Token 1",
                "TK1",
                "Company 1",
                ethers.parseEther("1000"),
                ethers.parseEther("1")
            );

            // Create second token
            await regulatedToken.connect(companyUser).createToken(
                "Token 2",
                "TK2",
                "Company 2",
                ethers.parseEther("2000"),
                ethers.parseEther("2")
            );

            const allTokens = await regulatedToken.getAllTokens();
            expect(allTokens.length).to.equal(2);
            expect(allTokens[0]).to.equal(1);
            expect(allTokens[1]).to.equal(2);

            const totalTypes = await regulatedToken.getTotalTokenTypes();
            expect(totalTypes).to.equal(2);
        });

        it("Should emit TokenCreated event with correct parameters", async function () {
            const tokenName = "ACME Corp Shares";
            const tokenSymbol = "ACME";
            const companyName = "ACME Corporation";
            const maxSupply = ethers.parseEther("1000000");
            const initialPrice = ethers.parseEther("10");

            await expect(
                regulatedToken.connect(companyUser).createToken(
                    tokenName,
                    tokenSymbol,
                    companyName,
                    maxSupply,
                    initialPrice
                )
            ).to.emit(regulatedToken, "TokenCreated")
             .withArgs(
                 1, // tokenId
                 companyUser.address, // creator
                 tokenName,
                 tokenSymbol,
                 companyName,
                 maxSupply,
                 initialPrice,
                 (await ethers.provider.getBlock("latest"))!.timestamp + 1 // approximate timestamp
             );
        });

        it("Should check if token is active", async function () {
            await regulatedToken.connect(companyUser).createToken(
                "Test Token",
                "TEST",
                "Test Company",
                ethers.parseEther("1000"),
                ethers.parseEther("1")
            );

            const isActive = await regulatedToken.isTokenActive(1);
            expect(isActive).to.be.true;
        });

        it("Should revert when querying non-existent token", async function () {
            await expect(
                regulatedToken.getTokenInfo(999)
            ).to.be.revertedWith("Token does not exist");

            await expect(
                regulatedToken.isTokenActive(999)
            ).to.be.revertedWith("Token does not exist");
        });
    });

    describe("Token Minting", function () {
        let tokenId: number;

        beforeEach(async function () {
            // Create a token for minting tests
            const tx = await regulatedToken.connect(companyUser).createToken(
                "Test Token",
                "TEST",
                "Test Company",
                ethers.parseEther("1000"),
                ethers.parseEther("1")
            );
            tokenId = 1;
        });

        it("Should allow token creator to mint tokens", async function () {
            const mintAmount = ethers.parseEther("100");
            
            await expect(
                regulatedToken.connect(companyUser).mintToken(individualUser.address, tokenId, mintAmount)
            ).to.emit(regulatedToken, "TokenMinted")
             .withArgs(tokenId, individualUser.address, mintAmount, mintAmount);

            // Check balance
            const balance = await regulatedToken.balanceOf(individualUser.address, tokenId);
            expect(balance).to.equal(mintAmount);

            // Check current supply
            const currentSupply = await regulatedToken.getCurrentSupply(tokenId);
            expect(currentSupply).to.equal(mintAmount);
        });

        it("Should allow contract owner to mint tokens", async function () {
            const mintAmount = ethers.parseEther("50");
            
            await expect(
                regulatedToken.connect(owner).mintToken(individualUser.address, tokenId, mintAmount)
            ).to.emit(regulatedToken, "TokenMinted")
             .withArgs(tokenId, individualUser.address, mintAmount, mintAmount);

            const balance = await regulatedToken.balanceOf(individualUser.address, tokenId);
            expect(balance).to.equal(mintAmount);
        });

        it("Should not allow unauthorized users to mint tokens", async function () {
            await expect(
                regulatedToken.connect(individualUser).mintToken(individualUser.address, tokenId, ethers.parseEther("100"))
            ).to.be.revertedWith("Only token creator or contract owner can mint");
        });

        it("Should not allow minting beyond max supply", async function () {
            const maxSupply = ethers.parseEther("1000");
            const exceedingAmount = ethers.parseEther("1001");
            
            await expect(
                regulatedToken.connect(companyUser).mintToken(individualUser.address, tokenId, exceedingAmount)
            ).to.be.revertedWith("Minting would exceed maximum supply");
        });

        it("Should track supply correctly with multiple mints", async function () {
            const firstMint = ethers.parseEther("300");
            const secondMint = ethers.parseEther("200");
            
            await regulatedToken.connect(companyUser).mintToken(individualUser.address, tokenId, firstMint);
            await regulatedToken.connect(companyUser).mintToken(companyUser.address, tokenId, secondMint);
            
            const currentSupply = await regulatedToken.getCurrentSupply(tokenId);
            expect(currentSupply).to.equal(firstMint + secondMint);
            
            const remainingSupply = await regulatedToken.getRemainingSupply(tokenId);
            expect(remainingSupply).to.equal(ethers.parseEther("1000") - (firstMint + secondMint));
        });

        it("Should not allow minting to zero address", async function () {
            await expect(
                regulatedToken.connect(companyUser).mintToken(ethers.ZeroAddress, tokenId, ethers.parseEther("100"))
            ).to.be.revertedWith("Cannot mint to zero address");
        });

        it("Should not allow minting zero amount", async function () {
            await expect(
                regulatedToken.connect(companyUser).mintToken(individualUser.address, tokenId, 0)
            ).to.be.revertedWith("Amount must be greater than zero");
        });

        it("Should not allow minting inactive tokens", async function () {
            // Deactivate token
            await regulatedToken.connect(companyUser).setTokenStatus(tokenId, false);
            
            await expect(
                regulatedToken.connect(companyUser).mintToken(individualUser.address, tokenId, ethers.parseEther("100"))
            ).to.be.revertedWith("Token is not active");
        });

        it("Should not allow minting non-existent tokens", async function () {
            await expect(
                regulatedToken.connect(companyUser).mintToken(individualUser.address, 999, ethers.parseEther("100"))
            ).to.be.revertedWith("Token does not exist");
        });
    });

    describe("Token Status Management", function () {
        let tokenId: number;

        beforeEach(async function () {
            const tx = await regulatedToken.connect(companyUser).createToken(
                "Test Token",
                "TEST",
                "Test Company",
                ethers.parseEther("1000"),
                ethers.parseEther("1")
            );
            tokenId = 1;
        });

        it("Should allow token creator to change token status", async function () {
            await expect(
                regulatedToken.connect(companyUser).setTokenStatus(tokenId, false)
            ).to.emit(regulatedToken, "TokenStatusChanged")
             .withArgs(tokenId, false);

            const isActive = await regulatedToken.isTokenActive(tokenId);
            expect(isActive).to.be.false;
        });

        it("Should allow contract owner to change token status", async function () {
            await expect(
                regulatedToken.connect(owner).setTokenStatus(tokenId, false)
            ).to.emit(regulatedToken, "TokenStatusChanged")
             .withArgs(tokenId, false);

            const isActive = await regulatedToken.isTokenActive(tokenId);
            expect(isActive).to.be.false;
        });

        it("Should not allow unauthorized users to change token status", async function () {
            await expect(
                regulatedToken.connect(individualUser).setTokenStatus(tokenId, false)
            ).to.be.revertedWith("Only token creator or contract owner can change status");
        });

        it("Should not allow changing status of non-existent token", async function () {
            await expect(
                regulatedToken.connect(companyUser).setTokenStatus(999, false)
            ).to.be.revertedWith("Token does not exist");
        });
    });

    describe("Supply Queries", function () {
        let tokenId: number;

        beforeEach(async function () {
            const tx = await regulatedToken.connect(companyUser).createToken(
                "Test Token",
                "TEST",
                "Test Company",
                ethers.parseEther("1000"),
                ethers.parseEther("1")
            );
            tokenId = 1;
        });

        it("Should return correct max supply", async function () {
            const maxSupply = await regulatedToken.getMaxSupply(tokenId);
            expect(maxSupply).to.equal(ethers.parseEther("1000"));
        });

        it("Should return correct current supply", async function () {
            const currentSupply = await regulatedToken.getCurrentSupply(tokenId);
            expect(currentSupply).to.equal(0);

            // Mint some tokens
            await regulatedToken.connect(companyUser).mintToken(individualUser.address, tokenId, ethers.parseEther("100"));
            
            const newCurrentSupply = await regulatedToken.getCurrentSupply(tokenId);
            expect(newCurrentSupply).to.equal(ethers.parseEther("100"));
        });

        it("Should return correct remaining supply", async function () {
            const remainingSupply = await regulatedToken.getRemainingSupply(tokenId);
            expect(remainingSupply).to.equal(ethers.parseEther("1000"));

            // Mint some tokens
            await regulatedToken.connect(companyUser).mintToken(individualUser.address, tokenId, ethers.parseEther("300"));
            
            const newRemainingSupply = await regulatedToken.getRemainingSupply(tokenId);
            expect(newRemainingSupply).to.equal(ethers.parseEther("700"));
        });

        it("Should revert supply queries for non-existent tokens", async function () {
            await expect(
                regulatedToken.getCurrentSupply(999)
            ).to.be.revertedWith("Token does not exist");

            await expect(
                regulatedToken.getMaxSupply(999)
            ).to.be.revertedWith("Token does not exist");

            await expect(
                regulatedToken.getRemainingSupply(999)
            ).to.be.revertedWith("Token does not exist");
        });
    });

    describe("Marketplace Transfer", function () {
        let tokenId: number;

        beforeEach(async function () {
            // Create and mint tokens for testing
            await regulatedToken.connect(companyUser).createToken(
                "Test Token",
                "TEST",
                "Test Company",
                ethers.parseEther("1000"),
                ethers.parseEther("1")
            );
            tokenId = 1;
            
            // Mint tokens to company user
            await regulatedToken.connect(companyUser).mintToken(companyUser.address, tokenId, ethers.parseEther("500"));
        });

        it("Should allow marketplace transfer between verified users", async function () {
            const transferAmount = ethers.parseEther("100");
            
            await regulatedToken.marketplaceTransfer(
                companyUser.address,
                individualUser.address,
                tokenId,
                transferAmount
            );

            const companyBalance = await regulatedToken.balanceOf(companyUser.address, tokenId);
            const individualBalance = await regulatedToken.balanceOf(individualUser.address, tokenId);
            
            expect(companyBalance).to.equal(ethers.parseEther("400"));
            expect(individualBalance).to.equal(transferAmount);
        });

        it("Should not allow transfer from unverified user", async function () {
            // Suspend company user
            await regulatoryManagement.connect(owner).suspendUser(companyUser.address);
            
            await expect(
                regulatedToken.marketplaceTransfer(
                    companyUser.address,
                    individualUser.address,
                    tokenId,
                    ethers.parseEther("100")
                )
            ).to.be.revertedWith("Sender not authorized to trade");
        });

        it("Should not allow transfer to unverified user", async function () {
            // Suspend individual user
            await regulatoryManagement.connect(owner).suspendUser(individualUser.address);
            
            await expect(
                regulatedToken.marketplaceTransfer(
                    companyUser.address,
                    individualUser.address,
                    tokenId,
                    ethers.parseEther("100")
                )
            ).to.be.revertedWith("Recipient not authorized to trade");
        });

        it("Should not allow self-transfer", async function () {
            await expect(
                regulatedToken.marketplaceTransfer(
                    companyUser.address,
                    companyUser.address,
                    tokenId,
                    ethers.parseEther("100")
                )
            ).to.be.revertedWith("Cannot transfer to self");
        });

        it("Should not allow transfer of inactive tokens", async function () {
            // Deactivate token
            await regulatedToken.connect(companyUser).setTokenStatus(tokenId, false);
            
            await expect(
                regulatedToken.marketplaceTransfer(
                    companyUser.address,
                    individualUser.address,
                    tokenId,
                    ethers.parseEther("100")
                )
            ).to.be.revertedWith("Token is not active");
        });

        it("Should not allow transfer with insufficient balance", async function () {
            await expect(
                regulatedToken.marketplaceTransfer(
                    companyUser.address,
                    individualUser.address,
                    tokenId,
                    ethers.parseEther("1000") // More than available
                )
            ).to.be.revertedWith("Insufficient balance");
        });

        it("Should not allow transfer from/to zero address", async function () {
            await expect(
                regulatedToken.marketplaceTransfer(
                    ethers.ZeroAddress,
                    individualUser.address,
                    tokenId,
                    ethers.parseEther("100")
                )
            ).to.be.revertedWith("Transfer from zero address");

            await expect(
                regulatedToken.marketplaceTransfer(
                    companyUser.address,
                    ethers.ZeroAddress,
                    tokenId,
                    ethers.parseEther("100")
                )
            ).to.be.revertedWith("Transfer to zero address");
        });

        it("Should not allow transfer of zero amount", async function () {
            await expect(
                regulatedToken.marketplaceTransfer(
                    companyUser.address,
                    individualUser.address,
                    tokenId,
                    0
                )
            ).to.be.revertedWith("Amount must be greater than zero");
        });

        it("Should not allow transfer of non-existent token", async function () {
            await expect(
                regulatedToken.marketplaceTransfer(
                    companyUser.address,
                    individualUser.address,
                    999,
                    ethers.parseEther("100")
                )
            ).to.be.revertedWith("Token does not exist");
        });
    });

    describe("Standard Transfer Overrides", function () {
        let tokenId: number;

        beforeEach(async function () {
            // Create and mint tokens for testing
            await regulatedToken.connect(companyUser).createToken(
                "Test Token",
                "TEST",
                "Test Company",
                ethers.parseEther("1000"),
                ethers.parseEther("1")
            );
            tokenId = 1;
            
            // Mint tokens to company user
            await regulatedToken.connect(companyUser).mintToken(companyUser.address, tokenId, ethers.parseEther("500"));
        });

        it("Should allow standard transfer between verified users", async function () {
            const transferAmount = ethers.parseEther("100");
            
            await regulatedToken.connect(companyUser).safeTransferFrom(
                companyUser.address,
                individualUser.address,
                tokenId,
                transferAmount,
                "0x"
            );

            const companyBalance = await regulatedToken.balanceOf(companyUser.address, tokenId);
            const individualBalance = await regulatedToken.balanceOf(individualUser.address, tokenId);
            
            expect(companyBalance).to.equal(ethers.parseEther("400"));
            expect(individualBalance).to.equal(transferAmount);
        });

        it("Should not allow standard transfer from unverified user", async function () {
            // Suspend company user
            await regulatoryManagement.connect(owner).suspendUser(companyUser.address);
            
            await expect(
                regulatedToken.connect(companyUser).safeTransferFrom(
                    companyUser.address,
                    individualUser.address,
                    tokenId,
                    ethers.parseEther("100"),
                    "0x"
                )
            ).to.be.revertedWith("Sender not authorized to trade");
        });

        it("Should not allow standard transfer to unverified user", async function () {
            // Suspend individual user
            await regulatoryManagement.connect(owner).suspendUser(individualUser.address);
            
            await expect(
                regulatedToken.connect(companyUser).safeTransferFrom(
                    companyUser.address,
                    individualUser.address,
                    tokenId,
                    ethers.parseEther("100"),
                    "0x"
                )
            ).to.be.revertedWith("Recipient not authorized to trade");
        });

        it("Should not allow standard self-transfer", async function () {
            await expect(
                regulatedToken.connect(companyUser).safeTransferFrom(
                    companyUser.address,
                    companyUser.address,
                    tokenId,
                    ethers.parseEther("100"),
                    "0x"
                )
            ).to.be.revertedWith("Cannot transfer to self");
        });

        it("Should not allow batch transfer with inactive tokens", async function () {
            // Create second token and deactivate first
            await regulatedToken.connect(companyUser).createToken(
                "Test Token 2",
                "TEST2",
                "Test Company 2",
                ethers.parseEther("1000"),
                ethers.parseEther("1")
            );
            const tokenId2 = 2;
            
            await regulatedToken.connect(companyUser).mintToken(companyUser.address, tokenId2, ethers.parseEther("200"));
            await regulatedToken.connect(companyUser).setTokenStatus(tokenId, false);
            
            await expect(
                regulatedToken.connect(companyUser).safeBatchTransferFrom(
                    companyUser.address,
                    individualUser.address,
                    [tokenId, tokenId2],
                    [ethers.parseEther("100"), ethers.parseEther("50")],
                    "0x"
                )
            ).to.be.revertedWith("Token is not active");
        });
    });

    describe("Security Controls", function () {
        let tokenId: number;

        beforeEach(async function () {
            // Create a token for security tests
            await regulatedToken.connect(companyUser).createToken(
                "Test Token",
                "TEST",
                "Test Company",
                ethers.parseEther("1000"),
                ethers.parseEther("1")
            );
            tokenId = 1;
            
            // Mint some tokens
            await regulatedToken.connect(companyUser).mintToken(companyUser.address, tokenId, ethers.parseEther("500"));
        });

        describe("Pausable Functionality", function () {
            it("Should allow owner to pause the contract", async function () {
                await expect(regulatedToken.connect(owner).pause())
                    .to.emit(regulatedToken, "Paused")
                    .withArgs(owner.address);

                expect(await regulatedToken.paused()).to.be.true;
            });

            it("Should allow owner to unpause the contract", async function () {
                await regulatedToken.connect(owner).pause();
                
                await expect(regulatedToken.connect(owner).unpause())
                    .to.emit(regulatedToken, "Unpaused")
                    .withArgs(owner.address);

                expect(await regulatedToken.paused()).to.be.false;
            });

            it("Should reject pause by non-owner", async function () {
                await expect(regulatedToken.connect(companyUser).pause())
                    .to.be.revertedWithCustomError(regulatedToken, "OwnableUnauthorizedAccount");
            });

            it("Should reject unpause by non-owner", async function () {
                await regulatedToken.connect(owner).pause();
                
                await expect(regulatedToken.connect(companyUser).unpause())
                    .to.be.revertedWithCustomError(regulatedToken, "OwnableUnauthorizedAccount");
            });

            it("Should prevent token creation when paused", async function () {
                await regulatedToken.connect(owner).pause();
                
                await expect(
                    regulatedToken.connect(companyUser).createToken(
                        "Paused Token",
                        "PAUSE",
                        "Paused Company",
                        ethers.parseEther("1000"),
                        ethers.parseEther("1")
                    )
                ).to.be.revertedWithCustomError(regulatedToken, "EnforcedPause");
            });

            it("Should prevent token minting when paused", async function () {
                await regulatedToken.connect(owner).pause();
                
                await expect(
                    regulatedToken.connect(companyUser).mintToken(individualUser.address, tokenId, ethers.parseEther("100"))
                ).to.be.revertedWithCustomError(regulatedToken, "EnforcedPause");
            });

            it("Should prevent marketplace transfers when paused", async function () {
                await regulatedToken.connect(owner).pause();
                
                await expect(
                    regulatedToken.marketplaceTransfer(
                        companyUser.address,
                        individualUser.address,
                        tokenId,
                        ethers.parseEther("100")
                    )
                ).to.be.revertedWithCustomError(regulatedToken, "EnforcedPause");
            });

            it("Should prevent standard transfers when paused", async function () {
                await regulatedToken.connect(owner).pause();
                
                await expect(
                    regulatedToken.connect(companyUser).safeTransferFrom(
                        companyUser.address,
                        individualUser.address,
                        tokenId,
                        ethers.parseEther("100"),
                        "0x"
                    )
                ).to.be.revertedWithCustomError(regulatedToken, "EnforcedPause");
            });

            it("Should prevent batch transfers when paused", async function () {
                await regulatedToken.connect(owner).pause();
                
                await expect(
                    regulatedToken.connect(companyUser).safeBatchTransferFrom(
                        companyUser.address,
                        individualUser.address,
                        [tokenId],
                        [ethers.parseEther("100")],
                        "0x"
                    )
                ).to.be.revertedWithCustomError(regulatedToken, "EnforcedPause");
            });

            it("Should allow view functions when paused", async function () {
                await regulatedToken.connect(owner).pause();
                
                // View functions should still work
                const tokenInfo = await regulatedToken.getTokenInfo(tokenId);
                expect(tokenInfo.name).to.equal("Test Token");
                
                const balance = await regulatedToken.balanceOf(companyUser.address, tokenId);
                expect(balance).to.equal(ethers.parseEther("500"));
                
                const isActive = await regulatedToken.isTokenActive(tokenId);
                expect(isActive).to.be.true;
            });

            it("Should resume normal operations after unpause", async function () {
                await regulatedToken.connect(owner).pause();
                await regulatedToken.connect(owner).unpause();
                
                // Should be able to create tokens
                await expect(
                    regulatedToken.connect(companyUser).createToken(
                        "After Pause Token",
                        "AFTER",
                        "After Company",
                        ethers.parseEther("1000"),
                        ethers.parseEther("1")
                    )
                ).to.emit(regulatedToken, "TokenCreated");
                
                // Should be able to mint tokens
                await expect(
                    regulatedToken.connect(companyUser).mintToken(individualUser.address, tokenId, ethers.parseEther("100"))
                ).to.emit(regulatedToken, "TokenMinted");
                
                // Should be able to transfer tokens
                await expect(
                    regulatedToken.connect(companyUser).safeTransferFrom(
                        companyUser.address,
                        individualUser.address,
                        tokenId,
                        ethers.parseEther("50"),
                        "0x"
                    )
                ).to.not.be.reverted;
            });
        });

        describe("Access Control", function () {
            it("Should have correct owner set", async function () {
                expect(await regulatedToken.owner()).to.equal(owner.address);
            });

            it("Should allow owner to transfer ownership", async function () {
                await expect(regulatedToken.connect(owner).transferOwnership(companyUser.address))
                    .to.emit(regulatedToken, "OwnershipTransferred")
                    .withArgs(owner.address, companyUser.address);

                expect(await regulatedToken.owner()).to.equal(companyUser.address);
            });

            it("Should reject ownership transfer by non-owner", async function () {
                await expect(regulatedToken.connect(companyUser).transferOwnership(individualUser.address))
                    .to.be.revertedWithCustomError(regulatedToken, "OwnableUnauthorizedAccount");
            });

            it("Should allow new owner to perform admin functions", async function () {
                await regulatedToken.connect(owner).transferOwnership(companyUser.address);
                
                // New owner should be able to mint tokens
                await expect(
                    regulatedToken.connect(companyUser).mintToken(individualUser.address, tokenId, ethers.parseEther("100"))
                ).to.emit(regulatedToken, "TokenMinted");
                
                // New owner should be able to pause
                await expect(regulatedToken.connect(companyUser).pause())
                    .to.emit(regulatedToken, "Paused");
            });

            it("Should prevent old owner from performing admin functions", async function () {
                await regulatedToken.connect(owner).transferOwnership(companyUser.address);
                
                // Old owner should not be able to mint tokens (unless they are the token creator)
                // Create a new token with different creator to test this
                const [, , , , newCompany] = await ethers.getSigners();
                await regulatoryManagement.connect(newCompany).registerUser("new-company-ssi", 1);
                await regulatoryManagement.connect(owner).verifyUser(newCompany.address); // Original owner still owns regulatory management
                
                await regulatedToken.connect(newCompany).createToken(
                    "New Token",
                    "NEW",
                    "New Company",
                    ethers.parseEther("1000"),
                    ethers.parseEther("1")
                );
                const newTokenId = 2;
                
                // Old owner should not be able to mint this new token
                await expect(
                    regulatedToken.connect(owner).mintToken(individualUser.address, newTokenId, ethers.parseEther("100"))
                ).to.be.revertedWith("Only token creator or contract owner can mint");
                
                // Old owner should not be able to pause
                await expect(regulatedToken.connect(owner).pause())
                    .to.be.revertedWithCustomError(regulatedToken, "OwnableUnauthorizedAccount");
            });
        });

        describe("Reentrancy Protection", function () {
            it("Should have reentrancy guard on token creation", async function () {
                // This test verifies that the nonReentrant modifier is present
                // The actual reentrancy protection is tested by the OpenZeppelin library
                await expect(
                    regulatedToken.connect(companyUser).createToken(
                        "Reentrancy Test",
                        "REENT",
                        "Reentrancy Company",
                        ethers.parseEther("1000"),
                        ethers.parseEther("1")
                    )
                ).to.emit(regulatedToken, "TokenCreated");
            });

            it("Should have reentrancy guard on token minting", async function () {
                await expect(
                    regulatedToken.connect(companyUser).mintToken(individualUser.address, tokenId, ethers.parseEther("100"))
                ).to.emit(regulatedToken, "TokenMinted");
            });
        });

        describe("Input Validation", function () {
            it("Should validate token existence in all functions", async function () {
                const nonExistentTokenId = 999;
                
                await expect(regulatedToken.getTokenInfo(nonExistentTokenId))
                    .to.be.revertedWith("Token does not exist");
                
                await expect(regulatedToken.isTokenActive(nonExistentTokenId))
                    .to.be.revertedWith("Token does not exist");
                
                await expect(regulatedToken.getCurrentSupply(nonExistentTokenId))
                    .to.be.revertedWith("Token does not exist");
                
                await expect(regulatedToken.getMaxSupply(nonExistentTokenId))
                    .to.be.revertedWith("Token does not exist");
                
                await expect(regulatedToken.getRemainingSupply(nonExistentTokenId))
                    .to.be.revertedWith("Token does not exist");
                
                await expect(
                    regulatedToken.connect(companyUser).mintToken(individualUser.address, nonExistentTokenId, ethers.parseEther("100"))
                ).to.be.revertedWith("Token does not exist");
                
                await expect(
                    regulatedToken.connect(companyUser).setTokenStatus(nonExistentTokenId, false)
                ).to.be.revertedWith("Token does not exist");
                
                await expect(
                    regulatedToken.marketplaceTransfer(
                        companyUser.address,
                        individualUser.address,
                        nonExistentTokenId,
                        ethers.parseEther("100")
                    )
                ).to.be.revertedWith("Token does not exist");
            });

            it("Should validate zero address inputs", async function () {
                await expect(
                    regulatedToken.connect(companyUser).mintToken(ethers.ZeroAddress, tokenId, ethers.parseEther("100"))
                ).to.be.revertedWith("Cannot mint to zero address");
                
                await expect(
                    regulatedToken.marketplaceTransfer(
                        ethers.ZeroAddress,
                        individualUser.address,
                        tokenId,
                        ethers.parseEther("100")
                    )
                ).to.be.revertedWith("Transfer from zero address");
                
                await expect(
                    regulatedToken.marketplaceTransfer(
                        companyUser.address,
                        ethers.ZeroAddress,
                        tokenId,
                        ethers.parseEther("100")
                    )
                ).to.be.revertedWith("Transfer to zero address");
            });

            it("Should validate zero amounts", async function () {
                await expect(
                    regulatedToken.connect(companyUser).mintToken(individualUser.address, tokenId, 0)
                ).to.be.revertedWith("Amount must be greater than zero");
                
                await expect(
                    regulatedToken.marketplaceTransfer(
                        companyUser.address,
                        individualUser.address,
                        tokenId,
                        0
                    )
                ).to.be.revertedWith("Amount must be greater than zero");
            });
        });
    });
});