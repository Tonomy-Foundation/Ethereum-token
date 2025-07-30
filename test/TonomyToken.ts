

import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import type { TonomyToken } from "../typechain-types/contracts/TonomyToken";
import type { Signer } from "ethers";

describe("TonomyToken", function () {

    let token: TonomyToken;
    let owner: Signer;
    let bridge: Signer;
    let user: Signer;

  async function deployTokenFixture() {
    const [owner, bridge, user] = await ethers.getSigners();
    const TonomyToken = await ethers.getContractFactory("TonomyToken");
    const token = await upgrades.deployProxy(TonomyToken, [], { kind: "uups" });
    await token.waitForDeployment();
    return { token, owner, bridge, user };
  }

  beforeEach(async function () {
    const result = await loadFixture(deployTokenFixture);
    token = result.token;
    owner = result.owner;
    bridge = result.bridge;
    user = result.user;
  });

  describe("Deployment", function () {
    it("Should set the correct name, symbol, and initial supply", async function () {
      expect(await token.name()).to.equal("Tonomy Token");
      expect(await token.symbol()).to.equal("TONO");
      expect(await token.balanceOf(token.target)).to.equal(await token.INITIAL_SUPPLY());
    });
  });

  describe("Bridge", function () {
    it("Should allow only bridge to mint and burn", async function () {
      await token.setBridge(bridge.address);
      await expect(token.connect(bridge).bridgeMint(user.address, 1000)).to.not.be.reverted;
      await expect(token.connect(user).bridgeMint(user.address, 1000)).to.be.revertedWith("TonomyToken: caller is not the bridge");
      await expect(token.connect(bridge).bridgeBurn(user.address, 1000)).to.not.be.reverted;
    });
  });

  describe("Upgradeability", function () {
    it("Should only allow owner to upgrade", async function () {
      await expect(token.connect(user).upgradeTo(user.address)).to.be.reverted;
    });
  });

  describe("ERC20", function () {
    it("Should allow transfer between accounts", async function () {
      await token.setBridge(bridge.address);
      await token.connect(bridge).bridgeMint(owner.address, 2000);
      await token.connect(owner).transfer(user.address, 1000);
      expect(await token.balanceOf(user.address)).to.equal(1000);
    });

    it("Should allow approve and transferFrom", async function () {
      await token.setBridge(bridge.address);
      await token.connect(bridge).bridgeMint(owner.address, 1000);
      await token.connect(owner).transfer(user.address, 500);
      await token.connect(user).approve(bridge.address, 200);
      await token.connect(bridge).transferFrom(user.address, bridge.address, 200);
      expect(await token.balanceOf(bridge.address)).to.equal(200);
      expect(await token.balanceOf(user.address)).to.equal(300);
    });

    it("Should return correct allowance", async function () {
      await token.setBridge(bridge.address);
      await token.connect(bridge).bridgeMint(owner.address, 100);
      await token.connect(owner).transfer(user.address, 100);
      await token.connect(user).approve(bridge.address, 50);
      expect(await token.allowance(user.address, bridge.address)).to.equal(50);
    });

    it("Should return correct balanceOf", async function () {
      await token.setBridge(bridge.address);
      await token.connect(bridge).bridgeMint(owner.address, 1234);
      await token.connect(owner).transfer(user.address, 1234);
      expect(await token.balanceOf(user.address)).to.equal(1234);
    });
  });
});
