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
  let spender: Signer;
  let pool: Signer;
  let other: Signer;

  async function deployTokenFixture() {
    const [owner, bridge, user, spender, pool, other] = await ethers.getSigners();
    const TonomyToken = await ethers.getContractFactory("TonomyToken");
    const token = (await upgrades.deployProxy(TonomyToken, [], { kind: "uups" })) as unknown as TonomyToken;
    await token.waitForDeployment();
    return { token, owner, bridge, user, spender, pool, other };
  }

  async function evmIncreaseTime(seconds: number) {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine", []);
  }

  beforeEach(async function () {
    const result = await loadFixture(deployTokenFixture);
    token = result.token;
    owner = result.owner;
    bridge = result.bridge;
    user = result.user;
    spender = result.spender;
    pool = result.pool;
    other = result.other;
  });

  // ----------------------- Deployment -----------------------
  describe("Deployment", function () {
    it("sets name, symbol, decimals, initial supply", async function () {
      expect(await token.name()).to.equal("Tonomy Token");
      expect(await token.symbol()).to.equal("TONO");
      expect(await token.decimals()).to.equal(18);
      expect(await token.INITIAL_SUPPLY()).to.equal(ethers.parseEther("100000000"));
      expect(await token.totalSupply()).to.equal(ethers.parseEther("100000000"));
    });

    it("owner is LP & bridge at init; initial supply to owner", async function () {
      const ownerAddr = await owner.getAddress();
      expect(await token.owner()).to.equal(ownerAddr);
      expect(await token.bridge()).to.equal(ownerAddr);
      expect(await token.balanceOf(ownerAddr)).to.equal(await token.INITIAL_SUPPLY());
      expect(await token.isPoolAddressSet()).to.equal(false);
      expect(await token.isLaunchPeriodActive()).to.equal(true);
      expect(await token.cooldownEnabled()).to.equal(true);
    });
  });

  // ----------------------- Bridge Management -----------------------
  describe("Bridge Management", function () {
    it("owner can set bridge", async function () {
      const addr = await bridge.getAddress();
      await expect(token.setBridge(addr)).to.not.be.reverted;
      expect(await token.bridge()).to.equal(addr);
    });

    it("non-owner cannot set bridge", async function () {
      await expect(token.connect(user).setBridge(await bridge.getAddress()))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("rejects setting bridge to zero address (custom error)", async function () {
      await expect(token.setBridge(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(token, "AddressCannotBeZero");
    });
  });

  // ----------------------- Bridge Functions -----------------------
  describe("Bridge Functions", function () {
    beforeEach(async function () {
      await token.setBridge(await bridge.getAddress());
    });

    describe("bridgeMint", function () {
      it("bridge can mint", async function () {
        const to = await user.getAddress();
        const amt = ethers.parseEther("1000");
        await expect(token.connect(bridge).bridgeMint(to, amt))
          .to.emit(token, "Transfer")
          .withArgs(ethers.ZeroAddress, to, amt);
        expect(await token.balanceOf(to)).to.equal(amt);
      });

      it("non-bridge cannot mint", async function () {
        await expect(token.connect(user).bridgeMint(await user.getAddress(), 1n))
          .to.be.revertedWith("TonomyToken: caller is not the bridge");
      });

      it("mint to zero reverts via OZ", async function () {
        await expect(token.connect(bridge).bridgeMint(ethers.ZeroAddress, 1n))
          .to.be.revertedWith("ERC20: mint to the zero address");
      });
    });

    describe("bridgeBurn", function () {
      beforeEach(async function () {
        await token.connect(bridge).bridgeMint(await user.getAddress(), ethers.parseEther("1000"));
      });

      it("bridge can burn", async function () {
        const from = await user.getAddress();
        const amt = ethers.parseEther("250");
        const balBefore = await token.balanceOf(from);
        const tsBefore = await token.totalSupply();
        await expect(token.connect(bridge).bridgeBurn(from, amt))
          .to.emit(token, "Transfer")
          .withArgs(from, ethers.ZeroAddress, amt);
        expect(await token.balanceOf(from)).to.equal(balBefore - amt);
        expect(await token.totalSupply()).to.equal(tsBefore - amt);
      });

      it("non-bridge cannot burn", async function () {
        await expect(token.connect(user).bridgeBurn(await user.getAddress(), 1n))
          .to.be.revertedWith("TonomyToken: caller is not the bridge");
      });

      it("burning more than balance reverts", async function () {
        const from = await user.getAddress();
        const bal = await token.balanceOf(from);
        await expect(token.connect(bridge).bridgeBurn(from, bal + 1n))
          .to.be.revertedWith("ERC20: burn amount exceeds balance");
      });

      it("burn from zero reverts", async function () {
        await expect(token.connect(bridge).bridgeBurn(ethers.ZeroAddress, 1n))
          .to.be.revertedWith("ERC20: burn from the zero address");
      });
    });
  });

  // ----------------------- ERC20 Basics -----------------------
  describe("ERC20: transfer / approve / transferFrom", function () {
    beforeEach(async function () {
      await token.setBridge(await bridge.getAddress());
      await token.connect(bridge).bridgeMint(await owner.getAddress(), ethers.parseEther("5000"));
      await token.connect(bridge).bridgeMint(await user.getAddress(), ethers.parseEther("1000"));
    });

    it("transfer works", async function () {
      const to = await spender.getAddress();
      const amt = ethers.parseEther("500");
      await expect(token.connect(user).transfer(to, amt))
        .to.emit(token, "Transfer")
        .withArgs(await user.getAddress(), to, amt);
      expect(await token.balanceOf(to)).to.equal(amt);
    });

    it("transfer to zero reverts", async function () {
      await expect(token.connect(user).transfer(ethers.ZeroAddress, 1n))
        .to.be.revertedWith("ERC20: transfer to the zero address");
    });

    it("cannot transfer more than balance", async function () {
      const bal = await token.balanceOf(await user.getAddress());
      await expect(token.connect(user).transfer(await spender.getAddress(), bal + 1n))
        .to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });

    it("approve/allowance", async function () {
      const to = await spender.getAddress();
      const amt = ethers.parseEther("200");
      await expect(token.connect(user).approve(to, amt))
        .to.emit(token, "Approval")
        .withArgs(await user.getAddress(), to, amt);
      expect(await token.allowance(await user.getAddress(), to)).to.equal(amt);
    });

    it("approve zero address reverts", async function () {
      await expect(token.connect(user).approve(ethers.ZeroAddress, 1n))
        .to.be.revertedWith("ERC20: approve to the zero address");
    });

    it("transferFrom with allowance", async function () {
      const u = await user.getAddress();
      const sp = await spender.getAddress();
      const ow = await owner.getAddress();
      await token.connect(user).approve(sp, ethers.parseEther("500"));
      await expect(token.connect(spender).transferFrom(u, ow, ethers.parseEther("200")))
        .to.emit(token, "Transfer")
        .withArgs(u, ow, ethers.parseEther("200"))
        .and.to.emit(token, "Approval")
        .withArgs(u, sp, ethers.parseEther("300"));
    });

    it("transferFrom exceeding allowance reverts", async function () {
      await token.connect(user).approve(await spender.getAddress(), ethers.parseEther("100"));
      await expect(token.connect(spender).transferFrom(
        await user.getAddress(), await owner.getAddress(), ethers.parseEther("101")
      )).to.be.revertedWith("ERC20: insufficient allowance");
    });

    it("unlimited allowance stays", async function () {
      await token.connect(user).approve(await spender.getAddress(), ethers.MaxUint256);
      await token.connect(spender).transferFrom(
        await user.getAddress(), await owner.getAddress(), ethers.parseEther("123")
      );
      expect(await token.allowance(await user.getAddress(), await spender.getAddress()))
        .to.equal(ethers.MaxUint256);
    });
  });

  // ----------------------- Pausable -----------------------
  describe("Pausable", function () {
    beforeEach(async function () {
      await token.setBridge(await bridge.getAddress());
      await token.connect(bridge).bridgeMint(await user.getAddress(), ethers.parseEther("100"));
    });

    it("owner can pause/unpause; paused blocks transfers and mint/burn", async function () {
      await token.pause();

      await expect(token.connect(user).transfer(await owner.getAddress(), 1n))
        .to.be.revertedWith("ERC20Pausable: token transfer while paused");

      await expect(token.connect(bridge).bridgeMint(await user.getAddress(), 1n))
        .to.be.revertedWith("ERC20Pausable: token transfer while paused");

      await expect(token.connect(bridge).bridgeBurn(await user.getAddress(), 1n))
        .to.be.revertedWith("ERC20Pausable: token transfer while paused");

      await token.unpause();
      await expect(token.connect(user).transfer(await owner.getAddress(), 1n)).to.not.be.reverted;
    });
  });

  // ----------------------- Launch / Trading Controls -----------------------
  describe("Trading gate, launch period, LP bypass", function () {
    beforeEach(async function () {
      // Set pool and seed pool with tokens via LP (owner) bypass
      await token.setPoolAddress(await pool.getAddress());
      await token.setBridge(await bridge.getAddress());
      // owner -> pool (LP bypass)
      await token.connect(bridge).bridgeMint(await owner.getAddress(), ethers.parseEther("10000"));
      await token.connect(owner).transfer(await pool.getAddress(), ethers.parseEther("5000"));
    });

    it("while trading disabled: any pool-related transfer reverts (non-LP)", async function () {
      // user -> pool
      await token.connect(bridge).bridgeMint(await user.getAddress(), ethers.parseEther("10"));
      await expect(token.connect(user).transfer(await pool.getAddress(), ethers.parseEther("1")))
        .to.be.revertedWithCustomError(token, "TradingNotEnabled");

      // pool -> user
      await expect(token.connect(pool).transfer(await user.getAddress(), ethers.parseEther("1")))
        .to.be.revertedWithCustomError(token, "TradingNotEnabled");
    });

    it("LP bypass works even when trading disabled and during launch", async function () {
      // owner (LP) -> pool
      await expect(token.connect(owner).transfer(await pool.getAddress(), ethers.parseEther("1")))
        .to.not.be.reverted;

      // pool -> owner (to == LP bypass)
      await expect(token.connect(pool).transfer(await owner.getAddress(), ethers.parseEther("1")))
        .to.not.be.reverted;
    });

    it("once trading enabled: sells to pool blocked during launch for non-LP", async function () {
      await token.setTradingEnabled(true);
      await token.connect(bridge).bridgeMint(await user.getAddress(), ethers.parseEther("10"));

      // user -> pool should hit SellsBlocked (launch active)
      await expect(token.connect(user).transfer(await pool.getAddress(), ethers.parseEther("1")))
        .to.be.revertedWithCustomError(token, "SellsBlocked");

      // LP can still sell
      await expect(token.connect(owner).transfer(await pool.getAddress(), ethers.parseEther("1")))
        .to.not.be.reverted;
    });

    it("disabling launch period allows sells to pool", async function () {
      await token.setTradingEnabled(true);
      await token.setLaunchPeriodEnabled(false);
      await token.connect(bridge).bridgeMint(await user.getAddress(), ethers.parseEther("10"));
      await expect(token.connect(user).transfer(await pool.getAddress(), ethers.parseEther("1")))
        .to.not.be.reverted;
    });

    it("per-wallet buy cap enforced during launch", async function () {
      await token.setTradingEnabled(true);
      await token.setLaunchPeriodEnabled(true);
    
      // keep cooldown enabled but short to speed the test
      await token.setCooldownEnabled(true, 5); // seconds
    
      // small cap for test
      await token.setPerWalletBuyCap(ethers.parseEther("2"));
    
      // first buy OK
      await expect(
        token.connect(pool).transfer(await user.getAddress(), ethers.parseEther("1"))
      ).to.not.be.reverted;
    
      // wait for cooldown to elapse so the next revert is ONLY due to the cap
      const cd = Number(await token.cooldownSeconds());
      await ethers.provider.send("evm_increaseTime", [cd + 1]);
      await ethers.provider.send("evm_mine", []);
    
      // second buy pushes cumulative to 3 > 2 -> cap revert
      await expect(
        token.connect(pool).transfer(await user.getAddress(), ethers.parseEther("2"))
      ).to.be.revertedWithCustomError(token, "PerWalletBuyCapExceeded");
    
      // tracking shows only the successful first buy
      expect(await token.getWalletBuyAmount(await user.getAddress()))
        .to.equal(ethers.parseEther("1"));
    
      // after launch ends, buys are unrestricted by cap
      await token.setLaunchPeriodEnabled(false);
      await expect(
        token.connect(pool).transfer(await user.getAddress(), ethers.parseEther("10"))
      ).to.not.be.reverted;
    });
    

    it("cooldown between buys enforced", async function () {
      await token.setTradingEnabled(true);
      await token.setCooldownEnabled(true, 10); // 10s

      // First buy ok
      await expect(token.connect(pool).transfer(await user.getAddress(), ethers.parseEther("1")))
        .to.not.be.reverted;

      // Second buy within 10s reverts
      await expect(token.connect(pool).transfer(await user.getAddress(), ethers.parseEther("1")))
        .to.be.revertedWithCustomError(token, "CooldownActive");

      // Advance time and buy again
      await evmIncreaseTime(11);
      await expect(token.connect(pool).transfer(await user.getAddress(), ethers.parseEther("1")))
        .to.not.be.reverted;
    });
  });

  // ----------------------- Anti-sniping -----------------------
  describe("Anti-sniping window & auto-blacklist", function () {
    beforeEach(async function () {
      await token.setPoolAddress(await pool.getAddress());
      await token.setBridge(await bridge.getAddress());
      await token.connect(bridge).bridgeMint(await owner.getAddress(), ethers.parseEther("10000"));
      // LP seeds pool (bypass)
      await token.connect(owner).transfer(await pool.getAddress(), ethers.parseEther("5000"));
      // Enable trading so pool transfers are allowed
      await token.setTradingEnabled(true);
      // Start anti-sniping window
      await token.setAntiSnipingSeconds(60);
      await token.setLiquidityAdded();
    });

    it("pool->wallet during window blacklists the buyer; further transfers blocked", async function () {
      const u = await user.getAddress();
      const nonLp = await other.getAddress();
    
      // Sanity: window active
      expect(await token.isAntiSnipingPeriodActive()).to.equal(true);
    
      // Buy during window → auto-blacklist
      await expect(
        token.connect(pool).transfer(u, ethers.parseEther("1"))
      ).to.emit(token, "WalletBlacklisted").withArgs(u, true);
    
      // Confirm blacklisted
      expect(await token.isBlacklisted(u)).to.equal(true);
    
      // Any transfer involving non-LP must now revert
      await expect(
        token.connect(user).transfer(nonLp, 1n)
      ).to.be.revertedWithCustomError(token, "WalletIsBlacklisted");
    
      await expect(
        token.connect(other).transfer(u, 1n)
      ).to.be.revertedWithCustomError(token, "WalletIsBlacklisted");
    });
    

    it("LP is never blacklisted; pool->LP during window succeeds and no event", async function () {
      const lp = await owner.getAddress();
      await expect(token.connect(pool).transfer(lp, ethers.parseEther("1")))
        .to.not.emit(token, "WalletBlacklisted");
      expect(await token.isBlacklisted(lp)).to.equal(false);
    });

    it("after window expires, new buyers are not auto-blacklisted", async function () {
      await evmIncreaseTime(61);
      const o = await other.getAddress();
      await expect(token.connect(pool).transfer(o, ethers.parseEther("1")))
        .to.not.emit(token, "WalletBlacklisted");
      expect(await token.isBlacklisted(o)).to.equal(false);
    });

    it("manual unblacklist restores transfers", async function () {
      const u = await user.getAddress();
      await token.connect(pool).transfer(u, ethers.parseEther("1")); // auto blacklist
      await token.setWalletBlacklisted(u, false);
      await expect(token.connect(user).transfer(await owner.getAddress(), 1n)).to.not.be.reverted;
    });

    it("batch blacklist applies to multiple addresses", async function () {
      const u = await user.getAddress();
      const o = await other.getAddress();
      await token.batchBlacklistWallets([u, o], true);
      expect(await token.isBlacklisted(u)).to.equal(true);
      expect(await token.isBlacklisted(o)).to.equal(true);
    });

    it("mint/burn and LP bypass ignore anti-sniping checks", async function () {
      // Mint to pool while trading disabled should still be allowed (mint skips checks)
      await token.setTradingEnabled(false);
      await expect(token.connect(bridge).bridgeMint(await pool.getAddress(), 1n))
        .to.not.be.reverted;

      // Burn from pool should be allowed (burn skips checks)
      await token.setTradingEnabled(true);
      await expect(token.connect(bridge).bridgeBurn(await pool.getAddress(), 1n))
        .to.not.be.reverted;
    });
  });

  // ----------------------- Admin & Views -----------------------
  describe("Admin setters & view helpers", function () {
    it("setLpWallet / setPoolAddress enforce non-zero", async function () {
      await expect(token.setLpWallet(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(token, "AddressCannotBeZero");
      await expect(token.setPoolAddress(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(token, "AddressCannotBeZero");
    });

    it("isPoolAddressSet reflects state; canTrade depends on trading & blacklist", async function () {
      expect(await token.isPoolAddressSet()).to.equal(false);
      await token.setPoolAddress(await pool.getAddress());
      expect(await token.isPoolAddressSet()).to.equal(true);

      const u = await user.getAddress();
      expect(await token.canTrade(u)).to.equal(false); // trading disabled by default
      await token.setTradingEnabled(true);
      expect(await token.canTrade(u)).to.equal(true);
      await token.setWalletBlacklisted(u, true);
      expect(await token.canTrade(u)).to.equal(false);
    });

    it("getRemainingAntiSnipingSeconds changes after setLiquidityAdded and time passes", async function () {
      await token.setAntiSnipingSeconds(10);
      await token.setLiquidityAdded();
      const rem1 = await token.getRemainingAntiSnipingSeconds();
      expect(rem1).to.be.greaterThan(0);
      await evmIncreaseTime(11);
      const rem2 = await token.getRemainingAntiSnipingSeconds();
      expect(rem2).to.equal(0);
    });

    it("resetWalletBuyAmount clears tracking", async function () {
      // Setup: enable trading, set pool, seed pool, do one buy
      await token.setPoolAddress(await pool.getAddress());
      await token.setBridge(await bridge.getAddress());
      await token.connect(bridge).bridgeMint(await owner.getAddress(), ethers.parseEther("1000"));
      await token.connect(owner).transfer(await pool.getAddress(), ethers.parseEther("100"));
      await token.setTradingEnabled(true);

      const u = await user.getAddress();
      await token.connect(pool).transfer(u, ethers.parseEther("7"));
      expect(await token.getWalletBuyAmount(u)).to.equal(ethers.parseEther("7"));

      await token.resetWalletBuyAmount([u]);
      expect(await token.getWalletBuyAmount(u)).to.equal(0n);
    });
  });

  // ----------------------- Upgradeability -----------------------
  describe("Upgradeability", function () {
    it("only owner can upgrade", async function () {
      await expect(token.connect(user).upgradeTo(await (await owner).getAddress()))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("owner can upgrade to new implementation (smoke)", async function () {
      const Impl = await ethers.getContractFactory("TonomyToken");
      const impl = await Impl.deploy();
      await impl.waitForDeployment();
      await expect(token.connect(owner).upgradeTo(await impl.getAddress())).to.not.be.reverted;
    });
  });

  // ----------------------- Edge Cases -----------------------
  describe("Edge Cases", function () {
    it("wallet-to-wallet transfers unaffected by trading/launch when not blacklisted", async function () {
      await token.setBridge(await bridge.getAddress());
      await token.connect(bridge).bridgeMint(await user.getAddress(), ethers.parseEther("5"));
      await expect(token.connect(user).transfer(await other.getAddress(), ethers.parseEther("1")))
        .to.not.be.reverted;
    });

    it("self-transfer is a no-op", async function () {
      await token.setBridge(await bridge.getAddress());
      await token.connect(bridge).bridgeMint(await user.getAddress(), ethers.parseEther("10"));
      const u = await user.getAddress();
      await expect(token.connect(user).transfer(u, ethers.parseEther("3"))).to.not.be.reverted;
      expect(await token.balanceOf(u)).to.equal(ethers.parseEther("10"));
    });
  });
});
