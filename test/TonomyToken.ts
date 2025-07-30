import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("TonomyToken", function () {
  async function deployTokenFixture() {
    const [owner, bridge, user, blacklisted, beneficiary] = await hre.ethers.getSigners();
    const TonomyToken = await hre.ethers.getContractFactory("TonomyToken");
    const token = await TonomyToken.deploy();
    await token.waitForDeployment();
    await token.initialize();
    return { token, owner, bridge, user, blacklisted, beneficiary };
  }

  describe("Deployment", function () {
    it("Should set the correct name, symbol, and initial supply", async function () {
      const { token } = await loadFixture(deployTokenFixture);
      expect(await token.name()).to.equal("Tonomy Token");
      expect(await token.symbol()).to.equal("TONO");
      expect(await token.balanceOf(token.target)).to.equal(await token.INITIAL_SUPPLY());
    });
  });

  describe("Blacklist", function () {
    it("Should allow owner to set and unset blacklist", async function () {
      const { token, owner, blacklisted } = await loadFixture(deployTokenFixture);
      await token.setBlacklist([blacklisted.address], [true]);
      expect(await token.isBlacklisted(blacklisted.address)).to.be.true;
      await token.setBlacklist([blacklisted.address], [false]);
      expect(await token.isBlacklisted(blacklisted.address)).to.be.false;
    });
    it("Should block blacklisted addresses from transfers", async function () {
      const { token, owner, blacklisted, user } = await loadFixture(deployTokenFixture);
      await token.setBlacklist([blacklisted.address], [true]);
      await expect(token.safeTransfer(blacklisted.address, 100)).to.be.revertedWith("TonomyToken: blacklisted");
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

  describe("Timelock", function () {
    it("Should allow owner to promise tokens and beneficiary to release them after time", async function () {
      const { token, owner, beneficiary } = await loadFixture(deployTokenFixture);
      const releaseTime = (await time.latest()) + 1000;
      await token.promiseToken(beneficiary.address, 1000, releaseTime);
      const timelockAddr = (await token.timelocks(beneficiary.address, 0));
      expect(timelockAddr).to.not.equal(hre.ethers.ZeroAddress);
      await time.increaseTo(releaseTime);
      await expect(token.connect(beneficiary).releaseTimelock(timelockAddr)).to.not.be.reverted;
    });
  });

  describe("Airdrop", function () {
    it("Should airdrop tokens to multiple recipients", async function () {
      const { token, owner, user, beneficiary } = await loadFixture(deployTokenFixture);
      await token.airdrop([user.address, beneficiary.address], [100, 200]);
      expect(await token.balanceOf(user.address)).to.equal(100);
      expect(await token.balanceOf(beneficiary.address)).to.equal(200);
    });
  });

  describe("Safe Transfer", function () {
    it("Should allow owner to transfer tokens from contract to an address", async function () {
      const { token, owner, user } = await loadFixture(deployTokenFixture);
      await token.safeTransfer(user.address, 123);
      expect(await token.balanceOf(user.address)).to.equal(123);
    });
  });

  describe("Upgradeability", function () {
    it("Should only allow owner to upgrade", async function () {
      const { token, owner, user } = await loadFixture(deployTokenFixture);
      await expect(token.connect(user).upgradeTo(user.address)).to.be.reverted;
    });
  });
});
