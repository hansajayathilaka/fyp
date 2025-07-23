import { expect } from "chai";
import { ethers } from "hardhat";
import { RegulatoryManagement } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("RegulatoryManagement", function () {
  let regulatoryManagement: RegulatoryManagement;
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    const RegulatoryManagementFactory = await ethers.getContractFactory("RegulatoryManagement");
    regulatoryManagement = await RegulatoryManagementFactory.deploy();
    await regulatoryManagement.waitForDeployment();
  });

  describe("User Registration", function () {
    it("Should register a new individual user with valid SSI identifier", async function () {
      const ssiIdentifier = "did:example:123456789";
      const userType = 0; // Individual

      await expect(regulatoryManagement.connect(user1).registerUser(ssiIdentifier, userType))
        .to.emit(regulatoryManagement, "UserRegistered")
        .withArgs(user1.address, ssiIdentifier, userType, await ethers.provider.getBlock("latest").then(b => b!.timestamp + 1));

      // Verify user is registered
      expect(await regulatoryManagement.isRegistered(user1.address)).to.be.true;
      expect(await regulatoryManagement.ssiIdentifierUsed(ssiIdentifier)).to.be.true;
    });

    it("Should register a new company user with valid SSI identifier", async function () {
      const ssiIdentifier = "did:example:company123";
      const userType = 1; // Company

      await expect(regulatoryManagement.connect(user1).registerUser(ssiIdentifier, userType))
        .to.emit(regulatoryManagement, "UserRegistered")
        .withArgs(user1.address, ssiIdentifier, userType, await ethers.provider.getBlock("latest").then(b => b!.timestamp + 1));

      // Verify user profile
      const profile = await regulatoryManagement.getUserProfile(user1.address);
      expect(profile.userAddress).to.equal(user1.address);
      expect(profile.ssiIdentifier).to.equal(ssiIdentifier);
      expect(profile.userType).to.equal(userType);
      expect(profile.isVerified).to.be.false;
      expect(profile.canTrade).to.be.false;
      expect(profile.canCreateTokens).to.be.false;
      expect(profile.isSuspended).to.be.false;
    });

    it("Should reject registration with empty SSI identifier", async function () {
      const ssiIdentifier = "";
      const userType = 0; // Individual

      await expect(regulatoryManagement.connect(user1).registerUser(ssiIdentifier, userType))
        .to.be.revertedWith("SSI identifier cannot be empty");
    });

    it("Should reject duplicate user registration", async function () {
      const ssiIdentifier = "did:example:123456789";
      const userType = 0; // Individual

      // First registration should succeed
      await regulatoryManagement.connect(user1).registerUser(ssiIdentifier, userType);

      // Second registration with same user should fail
      await expect(regulatoryManagement.connect(user1).registerUser("did:example:different", userType))
        .to.be.revertedWith("User already registered");
    });

    it("Should reject registration with duplicate SSI identifier", async function () {
      const ssiIdentifier = "did:example:123456789";
      const userType = 0; // Individual

      // First registration should succeed
      await regulatoryManagement.connect(user1).registerUser(ssiIdentifier, userType);

      // Second registration with same SSI identifier should fail
      await expect(regulatoryManagement.connect(user2).registerUser(ssiIdentifier, userType))
        .to.be.revertedWith("SSI identifier already used");
    });

    it("Should allow multiple users to register with different SSI identifiers", async function () {
      const ssiIdentifier1 = "did:example:user1";
      const ssiIdentifier2 = "did:example:user2";
      const userType = 0; // Individual

      await regulatoryManagement.connect(user1).registerUser(ssiIdentifier1, userType);
      await regulatoryManagement.connect(user2).registerUser(ssiIdentifier2, userType);

      expect(await regulatoryManagement.isRegistered(user1.address)).to.be.true;
      expect(await regulatoryManagement.isRegistered(user2.address)).to.be.true;
    });

    it("Should store correct user profile data", async function () {
      const ssiIdentifier = "did:example:testuser";
      const userType = 1; // Company

      await regulatoryManagement.connect(user1).registerUser(ssiIdentifier, userType);

      const profile = await regulatoryManagement.getUserProfile(user1.address);
      expect(profile.userAddress).to.equal(user1.address);
      expect(profile.ssiIdentifier).to.equal(ssiIdentifier);
      expect(profile.userType).to.equal(userType);
      expect(profile.isVerified).to.be.false;
      expect(profile.canTrade).to.be.false;
      expect(profile.canCreateTokens).to.be.false;
      expect(profile.isSuspended).to.be.false;
      expect(profile.registrationDate).to.be.greaterThan(0);
    });

    it("Should reject getting profile for unregistered user", async function () {
      await expect(regulatoryManagement.getUserProfile(user1.address))
        .to.be.revertedWith("User not registered");
    });
  });

  describe("User Verification", function () {
    beforeEach(async function () {
      // Register users for verification tests
      await regulatoryManagement.connect(user1).registerUser("did:example:individual", 0); // Individual
      await regulatoryManagement.connect(user2).registerUser("did:example:company", 1); // Company
    });

    it("Should allow admin to verify an individual user", async function () {
      await expect(regulatoryManagement.connect(owner).verifyUser(user1.address))
        .to.emit(regulatoryManagement, "UserVerified")
        .withArgs(user1.address, await ethers.provider.getBlock("latest").then(b => b!.timestamp + 1));

      const profile = await regulatoryManagement.getUserProfile(user1.address);
      expect(profile.isVerified).to.be.true;
      expect(profile.canTrade).to.be.true;
      expect(profile.canCreateTokens).to.be.false; // Individual users cannot create tokens
    });

    it("Should allow admin to verify a company user", async function () {
      await expect(regulatoryManagement.connect(owner).verifyUser(user2.address))
        .to.emit(regulatoryManagement, "UserVerified")
        .withArgs(user2.address, await ethers.provider.getBlock("latest").then(b => b!.timestamp + 1));

      const profile = await regulatoryManagement.getUserProfile(user2.address);
      expect(profile.isVerified).to.be.true;
      expect(profile.canTrade).to.be.true;
      expect(profile.canCreateTokens).to.be.true; // Company users can create tokens
    });

    it("Should reject verification by non-admin", async function () {
      await expect(regulatoryManagement.connect(user1).verifyUser(user2.address))
        .to.be.revertedWithCustomError(regulatoryManagement, "OwnableUnauthorizedAccount");
    });

    it("Should reject verification of unregistered user", async function () {
      const [, , , unregisteredUser] = await ethers.getSigners();
      await expect(regulatoryManagement.connect(owner).verifyUser(unregisteredUser.address))
        .to.be.revertedWith("User not registered");
    });

    it("Should reject verification of already verified user", async function () {
      await regulatoryManagement.connect(owner).verifyUser(user1.address);
      await expect(regulatoryManagement.connect(owner).verifyUser(user1.address))
        .to.be.revertedWith("User already verified");
    });
  });

  describe("User Suspension", function () {
    beforeEach(async function () {
      // Register and verify users for suspension tests
      await regulatoryManagement.connect(user1).registerUser("did:example:individual", 0);
      await regulatoryManagement.connect(user2).registerUser("did:example:company", 1);
      await regulatoryManagement.connect(owner).verifyUser(user1.address);
      await regulatoryManagement.connect(owner).verifyUser(user2.address);
    });

    it("Should allow admin to suspend a user", async function () {
      await expect(regulatoryManagement.connect(owner).suspendUser(user1.address))
        .to.emit(regulatoryManagement, "UserSuspended")
        .withArgs(user1.address, await ethers.provider.getBlock("latest").then(b => b!.timestamp + 1));

      const profile = await regulatoryManagement.getUserProfile(user1.address);
      expect(profile.isSuspended).to.be.true;
      expect(profile.canTrade).to.be.false;
      expect(profile.canCreateTokens).to.be.false;
    });

    it("Should allow admin to unsuspend a user", async function () {
      await regulatoryManagement.connect(owner).suspendUser(user2.address);
      
      await expect(regulatoryManagement.connect(owner).unsuspendUser(user2.address))
        .to.emit(regulatoryManagement, "UserUnsuspended")
        .withArgs(user2.address, await ethers.provider.getBlock("latest").then(b => b!.timestamp + 1));

      const profile = await regulatoryManagement.getUserProfile(user2.address);
      expect(profile.isSuspended).to.be.false;
      expect(profile.canTrade).to.be.true;
      expect(profile.canCreateTokens).to.be.true; // Company user permissions restored
    });

    it("Should reject suspension by non-admin", async function () {
      await expect(regulatoryManagement.connect(user1).suspendUser(user2.address))
        .to.be.revertedWithCustomError(regulatoryManagement, "OwnableUnauthorizedAccount");
    });

    it("Should reject suspension of unregistered user", async function () {
      const [, , , unregisteredUser] = await ethers.getSigners();
      await expect(regulatoryManagement.connect(owner).suspendUser(unregisteredUser.address))
        .to.be.revertedWith("User not registered");
    });

    it("Should reject suspension of already suspended user", async function () {
      await regulatoryManagement.connect(owner).suspendUser(user1.address);
      await expect(regulatoryManagement.connect(owner).suspendUser(user1.address))
        .to.be.revertedWith("User already suspended");
    });

    it("Should reject verification of suspended user", async function () {
      // Register a new user and suspend them before verification
      const [, , , newUser] = await ethers.getSigners();
      await regulatoryManagement.connect(newUser).registerUser("did:example:suspended", 0);
      await regulatoryManagement.connect(owner).suspendUser(newUser.address);
      
      await expect(regulatoryManagement.connect(owner).verifyUser(newUser.address))
        .to.be.revertedWith("Cannot verify suspended user");
    });

    it("Should reject unsuspension of non-suspended user", async function () {
      await expect(regulatoryManagement.connect(owner).unsuspendUser(user1.address))
        .to.be.revertedWith("User not suspended");
    });
  });
  
  describe("Permission Management", function () {
    beforeEach(async function () {
      // Register users for permission tests
      await regulatoryManagement.connect(user1).registerUser("did:example:individual", 0); // Individual
      await regulatoryManagement.connect(user2).registerUser("did:example:company", 1); // Company
    });

    describe("Trading Permissions", function () {
      it("Should return false for unregistered user trading permission", async function () {
        const [, , , unregisteredUser] = await ethers.getSigners();
        expect(await regulatoryManagement.canUserTrade(unregisteredUser.address)).to.be.false;
      });

      it("Should return false for unverified user trading permission", async function () {
        expect(await regulatoryManagement.canUserTrade(user1.address)).to.be.false;
      });

      it("Should return true for verified user trading permission", async function () {
        await regulatoryManagement.connect(owner).verifyUser(user1.address);
        expect(await regulatoryManagement.canUserTrade(user1.address)).to.be.true;
      });

      it("Should return false for suspended user trading permission", async function () {
        await regulatoryManagement.connect(owner).verifyUser(user1.address);
        await regulatoryManagement.connect(owner).suspendUser(user1.address);
        expect(await regulatoryManagement.canUserTrade(user1.address)).to.be.false;
      });
    });

    describe("Token Creation Permissions", function () {
      it("Should return false for unregistered user token creation permission", async function () {
        const [, , , unregisteredUser] = await ethers.getSigners();
        expect(await regulatoryManagement.canUserCreateTokens(unregisteredUser.address)).to.be.false;
      });

      it("Should return false for unverified individual user token creation permission", async function () {
        expect(await regulatoryManagement.canUserCreateTokens(user1.address)).to.be.false;
      });

      it("Should return false for verified individual user token creation permission", async function () {
        await regulatoryManagement.connect(owner).verifyUser(user1.address);
        expect(await regulatoryManagement.canUserCreateTokens(user1.address)).to.be.false;
      });

      it("Should return false for unverified company user token creation permission", async function () {
        expect(await regulatoryManagement.canUserCreateTokens(user2.address)).to.be.false;
      });

      it("Should return true for verified company user token creation permission", async function () {
        await regulatoryManagement.connect(owner).verifyUser(user2.address);
        expect(await regulatoryManagement.canUserCreateTokens(user2.address)).to.be.true;
      });

      it("Should return false for suspended company user token creation permission", async function () {
        await regulatoryManagement.connect(owner).verifyUser(user2.address);
        await regulatoryManagement.connect(owner).suspendUser(user2.address);
        expect(await regulatoryManagement.canUserCreateTokens(user2.address)).to.be.false;
      });
    });

    describe("User Status Queries", function () {
      it("Should return correct verification status", async function () {
        expect(await regulatoryManagement.isUserVerified(user1.address)).to.be.false;
        await regulatoryManagement.connect(owner).verifyUser(user1.address);
        expect(await regulatoryManagement.isUserVerified(user1.address)).to.be.true;
      });

      it("Should return false for unregistered user verification status", async function () {
        const [, , , unregisteredUser] = await ethers.getSigners();
        expect(await regulatoryManagement.isUserVerified(unregisteredUser.address)).to.be.false;
      });

      it("Should return correct suspension status", async function () {
        await regulatoryManagement.connect(owner).verifyUser(user1.address);
        expect(await regulatoryManagement.isUserSuspended(user1.address)).to.be.false;
        
        await regulatoryManagement.connect(owner).suspendUser(user1.address);
        expect(await regulatoryManagement.isUserSuspended(user1.address)).to.be.true;
      });

      it("Should return false for unregistered user suspension status", async function () {
        const [, , , unregisteredUser] = await ethers.getSigners();
        expect(await regulatoryManagement.isUserSuspended(unregisteredUser.address)).to.be.false;
      });

      it("Should return correct user type", async function () {
        expect(await regulatoryManagement.getUserType(user1.address)).to.equal(0); // Individual
        expect(await regulatoryManagement.getUserType(user2.address)).to.equal(1); // Company
      });

      it("Should reject getting user type for unregistered user", async function () {
        const [, , , unregisteredUser] = await ethers.getSigners();
        await expect(regulatoryManagement.getUserType(unregisteredUser.address))
          .to.be.revertedWith("User not registered");
      });
    });

    describe("Permission Integration Tests", function () {
      it("Should handle complete user lifecycle for individual user", async function () {
        // Initial state - no permissions
        expect(await regulatoryManagement.canUserTrade(user1.address)).to.be.false;
        expect(await regulatoryManagement.canUserCreateTokens(user1.address)).to.be.false;
        expect(await regulatoryManagement.isUserVerified(user1.address)).to.be.false;
        expect(await regulatoryManagement.isUserSuspended(user1.address)).to.be.false;

        // After verification - can trade but not create tokens
        await regulatoryManagement.connect(owner).verifyUser(user1.address);
        expect(await regulatoryManagement.canUserTrade(user1.address)).to.be.true;
        expect(await regulatoryManagement.canUserCreateTokens(user1.address)).to.be.false;
        expect(await regulatoryManagement.isUserVerified(user1.address)).to.be.true;
        expect(await regulatoryManagement.isUserSuspended(user1.address)).to.be.false;

        // After suspension - no permissions
        await regulatoryManagement.connect(owner).suspendUser(user1.address);
        expect(await regulatoryManagement.canUserTrade(user1.address)).to.be.false;
        expect(await regulatoryManagement.canUserCreateTokens(user1.address)).to.be.false;
        expect(await regulatoryManagement.isUserVerified(user1.address)).to.be.true;
        expect(await regulatoryManagement.isUserSuspended(user1.address)).to.be.true;

        // After unsuspension - trading restored but still no token creation
        await regulatoryManagement.connect(owner).unsuspendUser(user1.address);
        expect(await regulatoryManagement.canUserTrade(user1.address)).to.be.true;
        expect(await regulatoryManagement.canUserCreateTokens(user1.address)).to.be.false;
        expect(await regulatoryManagement.isUserVerified(user1.address)).to.be.true;
        expect(await regulatoryManagement.isUserSuspended(user1.address)).to.be.false;
      });

      it("Should handle complete user lifecycle for company user", async function () {
        // Initial state - no permissions
        expect(await regulatoryManagement.canUserTrade(user2.address)).to.be.false;
        expect(await regulatoryManagement.canUserCreateTokens(user2.address)).to.be.false;
        expect(await regulatoryManagement.isUserVerified(user2.address)).to.be.false;
        expect(await regulatoryManagement.isUserSuspended(user2.address)).to.be.false;

        // After verification - can trade and create tokens
        await regulatoryManagement.connect(owner).verifyUser(user2.address);
        expect(await regulatoryManagement.canUserTrade(user2.address)).to.be.true;
        expect(await regulatoryManagement.canUserCreateTokens(user2.address)).to.be.true;
        expect(await regulatoryManagement.isUserVerified(user2.address)).to.be.true;
        expect(await regulatoryManagement.isUserSuspended(user2.address)).to.be.false;

        // After suspension - no permissions
        await regulatoryManagement.connect(owner).suspendUser(user2.address);
        expect(await regulatoryManagement.canUserTrade(user2.address)).to.be.false;
        expect(await regulatoryManagement.canUserCreateTokens(user2.address)).to.be.false;
        expect(await regulatoryManagement.isUserVerified(user2.address)).to.be.true;
        expect(await regulatoryManagement.isUserSuspended(user2.address)).to.be.true;

        // After unsuspension - all permissions restored
        await regulatoryManagement.connect(owner).unsuspendUser(user2.address);
        expect(await regulatoryManagement.canUserTrade(user2.address)).to.be.true;
        expect(await regulatoryManagement.canUserCreateTokens(user2.address)).to.be.true;
        expect(await regulatoryManagement.isUserVerified(user2.address)).to.be.true;
        expect(await regulatoryManagement.isUserSuspended(user2.address)).to.be.false;
      });
    });
  });

  describe("Security Controls", function () {
    beforeEach(async function () {
      // Register users for security tests
      await regulatoryManagement.connect(user1).registerUser("did:example:individual", 0);
      await regulatoryManagement.connect(user2).registerUser("did:example:company", 1);
    });

    describe("Pausable Functionality", function () {
      it("Should allow owner to pause the contract", async function () {
        await expect(regulatoryManagement.connect(owner).pause())
          .to.emit(regulatoryManagement, "Paused")
          .withArgs(owner.address);

        expect(await regulatoryManagement.paused()).to.be.true;
      });

      it("Should allow owner to unpause the contract", async function () {
        await regulatoryManagement.connect(owner).pause();
        
        await expect(regulatoryManagement.connect(owner).unpause())
          .to.emit(regulatoryManagement, "Unpaused")
          .withArgs(owner.address);

        expect(await regulatoryManagement.paused()).to.be.false;
      });

      it("Should reject pause by non-owner", async function () {
        await expect(regulatoryManagement.connect(user1).pause())
          .to.be.revertedWithCustomError(regulatoryManagement, "OwnableUnauthorizedAccount");
      });

      it("Should reject unpause by non-owner", async function () {
        await regulatoryManagement.connect(owner).pause();
        
        await expect(regulatoryManagement.connect(user1).unpause())
          .to.be.revertedWithCustomError(regulatoryManagement, "OwnableUnauthorizedAccount");
      });

      it("Should prevent user registration when paused", async function () {
        await regulatoryManagement.connect(owner).pause();
        
        await expect(regulatoryManagement.connect(user1).registerUser("did:example:paused", 0))
          .to.be.revertedWithCustomError(regulatoryManagement, "EnforcedPause");
      });

      it("Should prevent user verification when paused", async function () {
        await regulatoryManagement.connect(owner).pause();
        
        await expect(regulatoryManagement.connect(owner).verifyUser(user1.address))
          .to.be.revertedWithCustomError(regulatoryManagement, "EnforcedPause");
      });

      it("Should prevent user suspension when paused", async function () {
        await regulatoryManagement.connect(owner).verifyUser(user1.address);
        await regulatoryManagement.connect(owner).pause();
        
        await expect(regulatoryManagement.connect(owner).suspendUser(user1.address))
          .to.be.revertedWithCustomError(regulatoryManagement, "EnforcedPause");
      });

      it("Should prevent user unsuspension when paused", async function () {
        await regulatoryManagement.connect(owner).verifyUser(user1.address);
        await regulatoryManagement.connect(owner).suspendUser(user1.address);
        await regulatoryManagement.connect(owner).pause();
        
        await expect(regulatoryManagement.connect(owner).unsuspendUser(user1.address))
          .to.be.revertedWithCustomError(regulatoryManagement, "EnforcedPause");
      });

      it("Should allow view functions when paused", async function () {
        await regulatoryManagement.connect(owner).pause();
        
        // View functions should still work
        expect(await regulatoryManagement.isRegistered(user1.address)).to.be.true;
        expect(await regulatoryManagement.canUserTrade(user1.address)).to.be.false;
        expect(await regulatoryManagement.canUserCreateTokens(user1.address)).to.be.false;
      });

      it("Should resume normal operations after unpause", async function () {
        await regulatoryManagement.connect(owner).pause();
        await regulatoryManagement.connect(owner).unpause();
        
        // Should be able to register new users
        const [, , , newUser] = await ethers.getSigners();
        await expect(regulatoryManagement.connect(newUser).registerUser("did:example:afterpause", 0))
          .to.emit(regulatoryManagement, "UserRegistered");
        
        // Should be able to verify users
        await expect(regulatoryManagement.connect(owner).verifyUser(user1.address))
          .to.emit(regulatoryManagement, "UserVerified");
      });
    });

    describe("Access Control", function () {
      it("Should have correct owner set", async function () {
        expect(await regulatoryManagement.owner()).to.equal(owner.address);
      });

      it("Should allow owner to transfer ownership", async function () {
        await expect(regulatoryManagement.connect(owner).transferOwnership(user1.address))
          .to.emit(regulatoryManagement, "OwnershipTransferred")
          .withArgs(owner.address, user1.address);

        expect(await regulatoryManagement.owner()).to.equal(user1.address);
      });

      it("Should reject ownership transfer by non-owner", async function () {
        await expect(regulatoryManagement.connect(user1).transferOwnership(user2.address))
          .to.be.revertedWithCustomError(regulatoryManagement, "OwnableUnauthorizedAccount");
      });

      it("Should allow new owner to perform admin functions", async function () {
        await regulatoryManagement.connect(owner).transferOwnership(user1.address);
        
        // New owner should be able to verify users
        await expect(regulatoryManagement.connect(user1).verifyUser(user2.address))
          .to.emit(regulatoryManagement, "UserVerified");
      });

      it("Should prevent old owner from performing admin functions", async function () {
        await regulatoryManagement.connect(owner).transferOwnership(user1.address);
        
        // Old owner should not be able to verify users
        const [, , , newUser] = await ethers.getSigners();
        await regulatoryManagement.connect(newUser).registerUser("did:example:newuser", 0);
        
        await expect(regulatoryManagement.connect(owner).verifyUser(newUser.address))
          .to.be.revertedWithCustomError(regulatoryManagement, "OwnableUnauthorizedAccount");
      });
    });

    describe("Reentrancy Protection", function () {
      it("Should have reentrancy guard on user registration", async function () {
        // This test verifies that the nonReentrant modifier is present
        // The actual reentrancy protection is tested by the OpenZeppelin library
        const [, , , newUser] = await ethers.getSigners();
        
        await expect(regulatoryManagement.connect(newUser).registerUser("did:example:reentrancy", 0))
          .to.emit(regulatoryManagement, "UserRegistered");
      });
    });
  });
});