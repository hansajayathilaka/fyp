import { expect } from "chai";
import { ethers } from "hardhat";
import { MarketplaceItem } from "../typechain-types";

describe("MarketplaceItem", () => {
  async function deploy() {
    const [owner, other] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("MarketplaceItem");
    const item = (await factory.deploy("MarketplaceItem", "MPI")) as unknown as MarketplaceItem;
    await item.waitForDeployment();
    return { item, owner, other };
  }

  it("mints sequential token ids to any caller", async () => {
    const { item, owner, other } = await deploy();

    await expect(item.connect(other).mint(other.address))
      .to.emit(item, "Transfer")
      .withArgs(ethers.ZeroAddress, other.address, 1n);

    await item.connect(owner).mint(owner.address);

    expect(await item.ownerOf(1)).to.equal(other.address);
    expect(await item.ownerOf(2)).to.equal(owner.address);
  });

  it("has no owner-only restriction on mint", async () => {
    const { item, other } = await deploy();
    await expect(item.connect(other).mint(other.address)).to.not.be.reverted;
  });
});
