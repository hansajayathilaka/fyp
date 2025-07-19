import { expect } from "chai";
import { ethers } from "hardhat";

describe("Development Environment Setup", function () {
  it("Should have access to ethers", function () {
    expect(ethers).to.not.be.undefined;
  });

  it("Should be able to get signers", async function () {
    const signers = await ethers.getSigners();
    expect(signers.length).to.be.greaterThan(0);
  });

  it("Should have OpenZeppelin contracts available", function () {
    // This will pass if OpenZeppelin is properly installed
    const fs = require("fs");
    const path = require("path");
    const ozPath = path.join(__dirname, "../node_modules/@openzeppelin/contracts/token/ERC1155/ERC1155.sol");
    expect(fs.existsSync(ozPath)).to.be.true;
  });
});