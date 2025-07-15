import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("🏛️ RegulatoryManagement", function () {
  
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
    it("Should allow user registration", async function () {
      const { regulatoryManagement, user1 } = await loadFixture(deployRegulatoryManagementFixture);
      
      await expect(regulatoryManagement.connect(user1).registerUser("individual", "low"))
        .to.emit(regulatoryManagement, "UserRegistered");
      
      const userProfile = await regulatoryManagement.getUserProfile(user1.address);
      expect(userProfile.isRegistered).to.be.true;
      expect(userProfile.userType).to.equal("individual");
      expect(userProfile.riskCategory).to.equal("low");
    });
    
    it("Should not allow duplicate registration", async function () {
      const { regulatoryManagement, user1 } = await loadFixture(deployRegulatoryManagementFixture);
      
      await regulatoryManagement.connect(user1).registerUser("individual", "low");
      
      await expect(regulatoryManagement.connect(user1).registerUser("individual", "low"))
        .to.be.revertedWith("User already registered");
    });
  });
  
  describe("KYC Process", function () {
    it("Should allow KYC submission", async function () {
      const { regulatoryManagement, user1 } = await loadFixture(deployRegulatoryManagementFixture);
      
      await regulatoryManagement.connect(user1).registerUser("individual", "low");
      
      await expect(regulatoryManagement.connect(user1).submitKYC(
        "John Doe",
        "1990-01-01",
        "US",
        "12345678",
        "123 Main St",
        "+1234567890",
        "john@example.com",
        "Software Engineer",
        "Salary",
        "US"
      )).to.emit(regulatoryManagement, "KYCSubmitted");
      
      const kycData = await regulatoryManagement.getKYCData(user1.address);
      expect(kycData.fullName).to.equal("John Doe");
      expect(kycData.email).to.equal("john@example.com");
      expect(kycData.isVerified).to.be.false;
    });
    
    it("Should allow KYC verification by authorized verifier", async function () {
      const { regulatoryManagement, owner, user1 } = await loadFixture(deployRegulatoryManagementFixture);
      
      await regulatoryManagement.connect(user1).registerUser("individual", "low");
      await regulatoryManagement.connect(user1).submitKYC(
        "John Doe",
        "1990-01-01",
        "US",
        "12345678",
        "123 Main St",
        "+1234567890",
        "john@example.com",
        "Software Engineer",
        "Salary",
        "US"
      );
      
      await expect(regulatoryManagement.connect(owner).verifyKYC(user1.address))
        .to.emit(regulatoryManagement, "KYCVerified")
        .withArgs(user1.address, owner.address, await ethers.provider.getBlockNumber() + 1);
      
      const kycData = await regulatoryManagement.getKYCData(user1.address);
      expect(kycData.isVerified).to.be.true;
      expect(kycData.verifiedBy).to.equal(owner.address);
      
      const userProfile = await regulatoryManagement.getUserProfile(user1.address);
      expect(userProfile.isVerified).to.be.true;
      expect(userProfile.canTrade).to.be.true;
    });
  });
  
  describe("Trading Limits", function () {
    it("Should check trading limits correctly", async function () {
      const { regulatoryManagement, owner, user1 } = await loadFixture(deployRegulatoryManagementFixture);
      
      await regulatoryManagement.connect(user1).registerUser("individual", "low");
      await regulatoryManagement.connect(user1).submitKYC(
        "John Doe", "1990-01-01", "US", "12345678", "123 Main St",
        "+1234567890", "john@example.com", "Software Engineer", "Salary", "US"
      );
      await regulatoryManagement.connect(owner).verifyKYC(user1.address);
      
      const tradingAmount = ethers.parseEther("1000");
      const canTrade = await regulatoryManagement.checkTradingLimit(user1.address, tradingAmount);
      expect(canTrade).to.be.true;
      
      const excessiveAmount = ethers.parseEther("100000");
      const canTradeExcessive = await regulatoryManagement.checkTradingLimit(user1.address, excessiveAmount);
      expect(canTradeExcessive).to.be.false;
    });
  });
  
  describe("Verifier Management", function () {
    it("Should allow owner to authorize verifiers", async function () {
      const { regulatoryManagement, owner, verifier } = await loadFixture(deployRegulatoryManagementFixture);
      
      await expect(regulatoryManagement.connect(owner).authorizeVerifier(verifier.address))
        .to.emit(regulatoryManagement, "VerifierAuthorized")
        .withArgs(verifier.address, owner.address);
      
      expect(await regulatoryManagement.authorizedVerifiers(verifier.address)).to.be.true;
    });
    
    it("Should allow owner to revoke verifiers", async function () {
      const { regulatoryManagement, owner, verifier } = await loadFixture(deployRegulatoryManagementFixture);
      
      await regulatoryManagement.connect(owner).authorizeVerifier(verifier.address);
      
      await expect(regulatoryManagement.connect(owner).revokeVerifier(verifier.address))
        .to.emit(regulatoryManagement, "VerifierRevoked")
        .withArgs(verifier.address, owner.address);
      
      expect(await regulatoryManagement.authorizedVerifiers(verifier.address)).to.be.false;
    });
  });
});
