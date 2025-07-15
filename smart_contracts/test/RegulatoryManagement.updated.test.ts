import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("🏛️ RegulatoryManagement (Updated)", function () {
  
  async function deployRegulatoryManagementFixture() {
    const [owner, verifier, user1, user2] = await ethers.getSigners();
    
    const RegulatoryManagement = await ethers.getContractFactory("RegulatoryManagement");
    const regulatoryManagement = await RegulatoryManagement.deploy();
    
    return { regulatoryManagement, owner, verifier, user1, user2 };
  }
  
  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      const { regulatoryManagement, owner } = await loadFixture(deployRegulatoryManagementFixture);
      
      expect(await regulatoryManagement.owner()).to.equal(owner.address);
      expect(await regulatoryManagement.authorizedVerifiers(owner.address)).to.be.true;
    });
  });
  
  describe("User Registration", function () {
    it("Should allow user registration with SSI identifier", async function () {
      const { regulatoryManagement, user1 } = await loadFixture(deployRegulatoryManagementFixture);
      
      const ssiIdentifier = ethers.keccak256(ethers.toUtf8Bytes("user1_ssi_id"));
      
      await expect(regulatoryManagement.connect(user1).registerUser("individual", "low", "US", ssiIdentifier))
        .to.emit(regulatoryManagement, "UserRegistered");
      
      const userProfile = await regulatoryManagement.getUserProfile(user1.address);
      expect(userProfile.isRegistered).to.be.true;
      expect(userProfile.userType).to.equal("individual");
      expect(userProfile.riskCategory).to.equal("low");
      expect(userProfile.jurisdiction).to.equal("US");
      
      const storedSSI = await regulatoryManagement.getUserSSIIdentifier(user1.address);
      expect(storedSSI).to.equal(ssiIdentifier);
    });
    
    it("Should not allow duplicate registration", async function () {
      const { regulatoryManagement, user1 } = await loadFixture(deployRegulatoryManagementFixture);
      
      const ssiIdentifier = ethers.keccak256(ethers.toUtf8Bytes("user1_ssi_id"));
      await regulatoryManagement.connect(user1).registerUser("individual", "low", "US", ssiIdentifier);
      
      await expect(regulatoryManagement.connect(user1).registerUser("individual", "low", "US", ssiIdentifier))
        .to.be.revertedWith("User already registered");
    });
    
    it("Should not allow empty SSI identifier", async function () {
      const { regulatoryManagement, user1 } = await loadFixture(deployRegulatoryManagementFixture);
      
      const emptySSI = ethers.ZeroHash;
      
      await expect(regulatoryManagement.connect(user1).registerUser("individual", "low", "US", emptySSI))
        .to.be.revertedWith("SSI identifier cannot be empty");
    });
  });
  
  describe("User Verification", function () {
    it("Should allow user verification by authorized verifier", async function () {
      const { regulatoryManagement, owner, user1 } = await loadFixture(deployRegulatoryManagementFixture);
      
      const ssiIdentifier = ethers.keccak256(ethers.toUtf8Bytes("user1_ssi_id"));
      await regulatoryManagement.connect(user1).registerUser("individual", "low", "US", ssiIdentifier);
      
      await expect(regulatoryManagement.connect(owner).verifyUser(user1.address))
        .to.emit(regulatoryManagement, "UserVerified")
        .and.to.emit(regulatoryManagement, "TradingPermissionGranted");
      
      const userProfile = await regulatoryManagement.getUserProfile(user1.address);
      expect(userProfile.isVerified).to.be.true;
      expect(userProfile.canTrade).to.be.true;
    });
    
    it("Should allow jurisdiction updates", async function () {
      const { regulatoryManagement, owner, user1 } = await loadFixture(deployRegulatoryManagementFixture);
      
      const ssiIdentifier = ethers.keccak256(ethers.toUtf8Bytes("user1_ssi_id"));
      await regulatoryManagement.connect(user1).registerUser("individual", "low", "US", ssiIdentifier);
      
      await expect(regulatoryManagement.connect(owner).updateJurisdiction(user1.address, "CA"))
        .to.emit(regulatoryManagement, "JurisdictionUpdated");
      
      const jurisdiction = await regulatoryManagement.getUserJurisdiction(user1.address);
      expect(jurisdiction).to.equal("CA");
    });
  });
  
  describe("Trading Limits", function () {
    it("Should check trading limits correctly", async function () {
      const { regulatoryManagement, owner, user1 } = await loadFixture(deployRegulatoryManagementFixture);
      
      const ssiIdentifier = ethers.keccak256(ethers.toUtf8Bytes("user1_ssi_id"));
      await regulatoryManagement.connect(user1).registerUser("individual", "low", "US", ssiIdentifier);
      await regulatoryManagement.connect(owner).verifyUser(user1.address);
      
      const tradingAmount = ethers.parseEther("1000");
      const canTrade = await regulatoryManagement.checkTradingLimit(user1.address, tradingAmount);
      expect(canTrade).to.be.true;
      
      const excessiveAmount = ethers.parseEther("100000");
      const canTradeExcessive = await regulatoryManagement.checkTradingLimit(user1.address, excessiveAmount);
      expect(canTradeExcessive).to.be.false;
    });
    
    it("Should allow trading limit updates", async function () {
      const { regulatoryManagement, owner, user1 } = await loadFixture(deployRegulatoryManagementFixture);
      
      const ssiIdentifier = ethers.keccak256(ethers.toUtf8Bytes("user1_ssi_id"));
      await regulatoryManagement.connect(user1).registerUser("individual", "low", "US", ssiIdentifier);
      await regulatoryManagement.connect(owner).verifyUser(user1.address);
      
      const newDailyLimit = ethers.parseEther("10000");
      const newMonthlyLimit = ethers.parseEther("100000");
      
      await expect(regulatoryManagement.connect(owner).updateTradingLimits(user1.address, newDailyLimit, newMonthlyLimit))
        .to.emit(regulatoryManagement, "TradingLimitsUpdated");
      
      const tradingLimits = await regulatoryManagement.getTradingLimits(user1.address);
      expect(tradingLimits.dailyLimit).to.equal(newDailyLimit);
      expect(tradingLimits.monthlyLimit).to.equal(newMonthlyLimit);
    });
  });
  
  describe("Verifier Management", function () {
    it("Should allow owner to authorize verifiers", async function () {
      const { regulatoryManagement, owner, verifier } = await loadFixture(deployRegulatoryManagementFixture);
      
      await expect(regulatoryManagement.connect(owner).authorizeVerifier(verifier.address))
        .to.emit(regulatoryManagement, "VerifierAuthorized");
      
      expect(await regulatoryManagement.authorizedVerifiers(verifier.address)).to.be.true;
    });
    
    it("Should allow owner to revoke verifiers", async function () {
      const { regulatoryManagement, owner, verifier } = await loadFixture(deployRegulatoryManagementFixture);
      
      await regulatoryManagement.connect(owner).authorizeVerifier(verifier.address);
      
      await expect(regulatoryManagement.connect(owner).revokeVerifier(verifier.address))
        .to.emit(regulatoryManagement, "VerifierRevoked");
      
      expect(await regulatoryManagement.authorizedVerifiers(verifier.address)).to.be.false;
    });
  });
  
  describe("Trading Permission Management", function () {
    it("Should allow revoking trading permissions", async function () {
      const { regulatoryManagement, owner, user1 } = await loadFixture(deployRegulatoryManagementFixture);
      
      const ssiIdentifier = ethers.keccak256(ethers.toUtf8Bytes("user1_ssi_id"));
      await regulatoryManagement.connect(user1).registerUser("individual", "low", "US", ssiIdentifier);
      await regulatoryManagement.connect(owner).verifyUser(user1.address);
      
      // User should be able to trade initially
      expect(await regulatoryManagement.canUserTrade(user1.address)).to.be.true;
      
      // Revoke trading permission
      await expect(regulatoryManagement.connect(owner).revokeTradingPermission(user1.address))
        .to.emit(regulatoryManagement, "TradingPermissionRevoked");
      
      expect(await regulatoryManagement.canUserTrade(user1.address)).to.be.false;
    });
    
    it("Should allow granting trading permissions", async function () {
      const { regulatoryManagement, owner, user1 } = await loadFixture(deployRegulatoryManagementFixture);
      
      const ssiIdentifier = ethers.keccak256(ethers.toUtf8Bytes("user1_ssi_id"));
      await regulatoryManagement.connect(user1).registerUser("individual", "low", "US", ssiIdentifier);
      await regulatoryManagement.connect(owner).verifyUser(user1.address);
      await regulatoryManagement.connect(owner).revokeTradingPermission(user1.address);
      
      // User should not be able to trade
      expect(await regulatoryManagement.canUserTrade(user1.address)).to.be.false;
      
      // Grant trading permission back
      await expect(regulatoryManagement.connect(owner).grantTradingPermission(user1.address))
        .to.emit(regulatoryManagement, "TradingPermissionGranted");
      
      expect(await regulatoryManagement.canUserTrade(user1.address)).to.be.true;
    });
  });
});
