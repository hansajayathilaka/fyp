import { expect } from "chai";
import { ethers } from "hardhat";
import { Marketplace, MarketplaceItem } from "../typechain-types";

const PRICE = ethers.parseEther("1");

describe("Marketplace", () => {
  async function deploy() {
    const [seller, buyer, other] = await ethers.getSigners();

    const itemFactory = await ethers.getContractFactory("MarketplaceItem");
    const item = (await itemFactory.deploy("MarketplaceItem", "MPI")) as unknown as MarketplaceItem;
    await item.waitForDeployment();

    const marketplaceFactory = await ethers.getContractFactory("Marketplace");
    const marketplace = (await marketplaceFactory.deploy(
      await item.getAddress()
    )) as unknown as Marketplace;
    await marketplace.waitForDeployment();

    await item.connect(seller).mint(seller.address); // tokenId 1
    const tokenId = 1n;

    return { item, marketplace, seller, buyer, other, tokenId };
  }

  async function deployListed() {
    const ctx = await deploy();
    await ctx.item.connect(ctx.seller).approve(await ctx.marketplace.getAddress(), ctx.tokenId);
    await ctx.marketplace.connect(ctx.seller).listItem(ctx.tokenId, PRICE);
    return ctx;
  }

  describe("happy path", () => {
    it("mint -> approve -> list -> buy: transfers ownership, pays seller, deactivates listing", async () => {
      const { item, marketplace, seller, buyer, tokenId } = await deployListed();

      const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);

      await expect(marketplace.connect(buyer).buyItem(tokenId, { value: PRICE }))
        .to.emit(marketplace, "Bought")
        .withArgs(tokenId, buyer.address, PRICE);

      expect(await item.ownerOf(tokenId)).to.equal(buyer.address);

      const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
      expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(PRICE);

      const listing = await marketplace.listings(tokenId);
      expect(listing.active).to.equal(false);
    });

    it("mint -> approve -> list -> cancel: listing inactive, item still owned by seller", async () => {
      const { item, marketplace, seller, tokenId } = await deployListed();

      await expect(marketplace.connect(seller).cancelListing(tokenId))
        .to.emit(marketplace, "Cancelled")
        .withArgs(tokenId);

      const listing = await marketplace.listings(tokenId);
      expect(listing.active).to.equal(false);
      expect(await item.ownerOf(tokenId)).to.equal(seller.address);
    });
  });

  describe("revert path", () => {
    it("listItem without prior approval -> NotApproved", async () => {
      const { marketplace, seller, tokenId } = await deploy();
      await expect(
        marketplace.connect(seller).listItem(tokenId, PRICE)
      ).to.be.revertedWithCustomError(marketplace, "NotApproved");
    });

    it("listItem by non-owner -> NotOwner", async () => {
      const { marketplace, other, tokenId } = await deploy();
      await expect(
        marketplace.connect(other).listItem(tokenId, PRICE)
      ).to.be.revertedWithCustomError(marketplace, "NotOwner");
    });

    it("listItem with price 0 -> ZeroPrice", async () => {
      const { item, marketplace, seller, tokenId } = await deploy();
      await item.connect(seller).approve(await marketplace.getAddress(), tokenId);
      await expect(
        marketplace.connect(seller).listItem(tokenId, 0)
      ).to.be.revertedWithCustomError(marketplace, "ZeroPrice");
    });

    it("buyItem with wrong msg.value -> WrongPrice", async () => {
      const { marketplace, buyer, tokenId } = await deployListed();
      await expect(
        marketplace.connect(buyer).buyItem(tokenId, { value: PRICE - 1n })
      ).to.be.revertedWithCustomError(marketplace, "WrongPrice");
    });

    it("buyItem on an inactive/already-sold listing -> NotActive", async () => {
      const { marketplace, buyer, other, tokenId } = await deployListed();
      await marketplace.connect(buyer).buyItem(tokenId, { value: PRICE });
      await expect(
        marketplace.connect(other).buyItem(tokenId, { value: PRICE })
      ).to.be.revertedWithCustomError(marketplace, "NotActive");
    });

    it("buyItem on your own listing -> SelfPurchase", async () => {
      const { marketplace, seller, tokenId } = await deployListed();
      await expect(
        marketplace.connect(seller).buyItem(tokenId, { value: PRICE })
      ).to.be.revertedWithCustomError(marketplace, "SelfPurchase");
    });

    it("cancelListing by non-seller -> NotSeller", async () => {
      const { marketplace, other, tokenId } = await deployListed();
      await expect(
        marketplace.connect(other).cancelListing(tokenId)
      ).to.be.revertedWithCustomError(marketplace, "NotSeller");
    });

    it("cancelListing on an already-inactive listing -> NotActive", async () => {
      const { marketplace, seller, tokenId } = await deployListed();
      await marketplace.connect(seller).cancelListing(tokenId);
      await expect(
        marketplace.connect(seller).cancelListing(tokenId)
      ).to.be.revertedWithCustomError(marketplace, "NotActive");
    });

    it("listItem on an already-active listing -> AlreadyListed", async () => {
      const { marketplace, seller, tokenId } = await deployListed();
      await expect(
        marketplace.connect(seller).listItem(tokenId, PRICE)
      ).to.be.revertedWithCustomError(marketplace, "AlreadyListed");
    });
  });
});
