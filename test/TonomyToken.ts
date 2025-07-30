
import { expect } from "chai";
import {ethers, upgrades } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
// import { upgrades } from "@openzeppelin/hardhat-upgrades";

describe("TonomyToken", function () {
  async function deployTokenFixture() {
    const [owner, bridge, user] = await ethers.getSigners();
    const TonomyToken = await ethers.getContractFactory("TonomyToken");
    const token = await upgrades.deployProxy(TonomyToken, [], { kind: "uups" });
    return { token, owner, bridge, user };
  }

  describe("Deployment", function () {
    it("Should set the correct name, symbol, and initial supply", async function () {
      const { token } = await loadFixture(deployTokenFixture);
      expect(await token.name()).to.equal("Tonomy Token");
      expect(await token.symbol()).to.equal("TONO");
      expect(await token.balanceOf(token.target)).to.equal(await token.INITIAL_SUPPLY());
    });
  });

  describe("Bridge", function () {
    it("Should allow only bridge to mint and burn", async function () {
      const { token, owner, bridge, user } = await loadFixture(deployTokenFixture);
      await token.setBridge(bridge.address);
      await expect(token.connect(bridge).bridgeMint(user.address, 1000)).to.not.be.reverted;
      await expect(token.connect(user).bridgeMint(user.address, 1000)).to.be.revertedWith("TonomyToken: caller is not the bridge");
      await expect(token.connect(bridge).bridgeBurn(user.address, 1000)).to.not.be.reverted;
    });
  });

  describe("Upgradeability", function () {
    it("Should only allow owner to upgrade", async function () {
      const { token, owner, user } = await loadFixture(deployTokenFixture);
      await expect(token.connect(user).upgradeTo(user.address)).to.be.reverted;
    });
  });
});
