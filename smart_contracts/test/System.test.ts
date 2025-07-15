import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("🏛️ Blockchain Share Market System", function () {
  
  async function deploySystemFixture() {
    const [owner, company, user1, user2, feeRecipient] = await ethers.getSigners();
    
    // Deploy RegulatoryManagement
    const RegulatoryManagement = await ethers.getContractFactory("RegulatoryManagement");
    const regulatoryManagement = await RegulatoryManagement.deploy();
    
    // Deploy RegulatedERC1155Token
    const RegulatedERC1155Token = await ethers.getContractFactory("RegulatedERC1155Token");
    const baseURI = "https://api.example.com/token/{id}";
    const tokenContract = await RegulatedERC1155Token.deploy(
      await regulatoryManagement.getAddress(),
      baseURI
    );
    
    // Deploy RegulatedMarketplace
    const RegulatedMarketplace = await ethers.getContractFactory("RegulatedMarketplace");
    const marketplace = await RegulatedMarketplace.deploy(
      await regulatoryManagement.getAddress(),
      feeRecipient.address
    );
    
    return {
      regulatoryManagement,
      tokenContract,
      marketplace,
      owner,
      company,
      user1,
      user2,
      feeRecipient
    };
  }
  
  describe("System Deployment", function () {
    it("Should deploy all contracts successfully", async function () {
      const { regulatoryManagement, tokenContract, marketplace, owner, feeRecipient } = await loadFixture(deploySystemFixture);
      
      expect(await regulatoryManagement.owner()).to.equal(owner.address);
      expect(await tokenContract.owner()).to.equal(owner.address);
      expect(await marketplace.owner()).to.equal(owner.address);
    });
  });
  
  describe("Basic Integration Test", function () {
    it("Should complete a basic workflow", async function () {
      const { regulatoryManagement, tokenContract, marketplace, owner, user1 } = await loadFixture(deploySystemFixture);
      
      // Test basic contract interaction
      const isVerified = await regulatoryManagement.isVerifiedUser(user1.address);
      expect(isVerified).to.be.false;
      
      const canTrade = await regulatoryManagement.canUserTrade(user1.address);
      expect(canTrade).to.be.false;
      
      // Test token contract deployment
      const nextTokenId = await tokenContract.nextTokenId();
      expect(nextTokenId).to.equal(1);
      
      // Test marketplace deployment
      const tradingFee = await marketplace.tradingFeePercentage();
      expect(tradingFee).to.equal(250); // 2.5%
    });
  });
});
