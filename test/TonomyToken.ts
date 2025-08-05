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

  async function deployTokenFixture() {
    const [owner, bridge, user, spender] = await ethers.getSigners();
    const TonomyToken = await ethers.getContractFactory("TonomyToken");
    const token = await upgrades.deployProxy(TonomyToken, [], { kind: "uups" });
    await token.waitForDeployment();
    return { token, owner, bridge, user, spender };
  }

  beforeEach(async function () {
    const result = await loadFixture(deployTokenFixture);
    token = result.token;
    owner = result.owner;
    bridge = result.bridge;
    user = result.user;
    spender = result.spender;
  });

  describe("Deployment", function () {
    it("Should set the correct name, symbol, and initial supply", async function () {
      expect(await token.name()).to.equal("Tonomy Token");
      expect(await token.symbol()).to.equal("TONO");
      expect(await token.decimals()).to.equal(18);
      expect(await token.INITIAL_SUPPLY()).to.equal(ethers.parseEther("100000000"));
      expect(await token.totalSupply()).to.equal(ethers.parseEther("100000000"));
    });

    it("Should set the correct owner and bridge on initialization", async function () {
      expect(await token.owner()).to.equal(await owner.getAddress());
      expect(await token.bridge()).to.equal(await owner.getAddress());
    });

    it("Should mint initial supply to owner", async function () {
      const ownerAddress = await owner.getAddress();
      expect(await token.balanceOf(ownerAddress)).to.equal(await token.INITIAL_SUPPLY());
    });
  });

  describe("Bridge Management", function () {
    it("Should allow owner to set bridge", async function () {
      const bridgeAddress = await bridge.getAddress();
      await token.setBridge(bridgeAddress);
      expect(await token.bridge()).to.equal(bridgeAddress);
    });

    it("Should not allow non-owner to set bridge", async function () {
      await expect(token.connect(user).setBridge(await bridge.getAddress()))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should not allow setting bridge to zero address", async function () {
      await expect(token.setBridge(ethers.ZeroAddress))
        .to.be.revertedWith("Invalid bridge address");
    });
  });

  describe("Bridge Functions", function () {
    beforeEach(async function () {
      await token.setBridge(await bridge.getAddress());
    });

    describe("Bridge Mint", function () {
      it("Should allow bridge to mint tokens", async function () {
        const userAddress = await user.getAddress();
        const mintAmount = ethers.parseEther("1000");
        
        await expect(token.connect(bridge).bridgeMint(userAddress, mintAmount))
          .to.emit(token, "Transfer")
          .withArgs(ethers.ZeroAddress, userAddress, mintAmount);

        expect(await token.balanceOf(userAddress)).to.equal(mintAmount);
        expect(await token.totalSupply()).to.equal(
          (await token.INITIAL_SUPPLY()) + mintAmount
        );
      });

      it("Should not allow non-bridge to mint", async function () {
        await expect(token.connect(user).bridgeMint(await user.getAddress(), 1000))
          .to.be.revertedWith("TonomyToken: caller is not the bridge");
      });

      it("Should not allow owner to mint if not bridge", async function () {
        await expect(token.connect(owner).bridgeMint(await user.getAddress(), 1000))
          .to.be.revertedWith("TonomyToken: caller is not the bridge");
      });

      it("Should not allow minting to zero address", async function () {
        await expect(token.connect(bridge).bridgeMint(ethers.ZeroAddress, 1000))
          .to.be.revertedWith("ERC20: mint to the zero address");
      });
    });

    describe("Bridge Burn", function () {
      beforeEach(async function () {
        // Mint some tokens to user first
        await token.connect(bridge).bridgeMint(await user.getAddress(), ethers.parseEther("1000"));
      });

      it("Should allow bridge to burn tokens", async function () {
        const userAddress = await user.getAddress();
        const burnAmount = ethers.parseEther("500");
        const initialBalance = await token.balanceOf(userAddress);
        const initialSupply = await token.totalSupply();

        await expect(token.connect(bridge).bridgeBurn(userAddress, burnAmount))
          .to.emit(token, "Transfer")
          .withArgs(userAddress, ethers.ZeroAddress, burnAmount);

        expect(await token.balanceOf(userAddress)).to.equal(initialBalance - burnAmount);
        expect(await token.totalSupply()).to.equal(initialSupply - burnAmount);
      });

      it("Should not allow non-bridge to burn", async function () {
        await expect(token.connect(user).bridgeBurn(await user.getAddress(), 100))
          .to.be.revertedWith("TonomyToken: caller is not the bridge");
      });

      it("Should not allow burning more than balance", async function () {
        const userAddress = await user.getAddress();
        const balance = await token.balanceOf(userAddress);
        await expect(token.connect(bridge).bridgeBurn(userAddress, balance + 1n))
          .to.be.revertedWith("ERC20: burn amount exceeds balance");
      });

      it("Should not allow burning from zero address", async function () {
        await expect(token.connect(bridge).bridgeBurn(ethers.ZeroAddress, 100))
          .to.be.revertedWith("ERC20: burn from the zero address");
      });
    });
  });

  describe("ERC20 Transfer Functions", function () {
    beforeEach(async function () {
      // Setup: Give owner and user some tokens
      await token.setBridge(await bridge.getAddress());
      await token.connect(bridge).bridgeMint(await owner.getAddress(), ethers.parseEther("5000"));
      await token.connect(bridge).bridgeMint(await user.getAddress(), ethers.parseEther("1000"));
    });

    describe("Transfer", function () {
      it("Should allow valid transfers", async function () {
        const userAddress = await user.getAddress();
        const spenderAddress = await spender.getAddress();
        const transferAmount = ethers.parseEther("500");
        
        await expect(token.connect(user).transfer(spenderAddress, transferAmount))
          .to.emit(token, "Transfer")
          .withArgs(userAddress, spenderAddress, transferAmount);

        expect(await token.balanceOf(userAddress)).to.equal(ethers.parseEther("500"));
        expect(await token.balanceOf(spenderAddress)).to.equal(transferAmount);
      });

      it("Should not allow transfer to zero address", async function () {
        await expect(token.connect(user).transfer(ethers.ZeroAddress, 100))
          .to.be.revertedWith("ERC20: transfer to the zero address");
      });

      it("Should not allow transfer exceeding balance", async function () {
        const balance = await token.balanceOf(await user.getAddress());
        await expect(token.connect(user).transfer(await spender.getAddress(), balance + 1n))
          .to.be.revertedWith("ERC20: transfer amount exceeds balance");
      });

      it("Should allow zero amount transfers", async function () {
        await expect(token.connect(user).transfer(await spender.getAddress(), 0))
          .to.not.be.reverted;
      });

      it("Should allow transfers to a contract address without reverting", async function () {
        const ownerAddress = await owner.getAddress();
        const contractAddress = await token.getAddress();          // token proxy is a contract
        const amount = ethers.parseEther("100");

        await token.connect(bridge).bridgeMint(ownerAddress, amount);
        await expect(
          token.connect(owner).transfer(contractAddress, amount)
        ).to.not.be.reverted;
        expect(await token.balanceOf(contractAddress)).to.equal(amount);
      });
    });

    describe("Approve", function () {
      it("Should allow setting allowances", async function () {
        const userAddress = await user.getAddress();
        const spenderAddress = await spender.getAddress();
        const approveAmount = ethers.parseEther("200");

        await expect(token.connect(user).approve(spenderAddress, approveAmount))
          .to.emit(token, "Approval")
          .withArgs(userAddress, spenderAddress, approveAmount);

        expect(await token.allowance(userAddress, spenderAddress)).to.equal(approveAmount);
      });

      it("Should not allow approving zero address", async function () {
        await expect(token.connect(user).approve(ethers.ZeroAddress, 100))
          .to.be.revertedWith("ERC20: approve to the zero address");
      });

      it("Should allow zero amount approvals", async function () {
        await expect(token.connect(user).approve(await spender.getAddress(), 0))
          .to.not.be.reverted;
      });

      it("Should overwrite existing allowances", async function () {
        const spenderAddress = await spender.getAddress();
        await token.connect(user).approve(spenderAddress, 100);
        await token.connect(user).approve(spenderAddress, 200);
        expect(await token.allowance(await user.getAddress(), spenderAddress)).to.equal(200);
      });
    });

    describe("TransferFrom", function () {
      beforeEach(async function () {
        // User approves spender to spend 500 tokens
        await token.connect(user).approve(await spender.getAddress(), ethers.parseEther("500"));
      });

      it("Should allow valid transferFrom", async function () {
        const userAddress = await user.getAddress();
        const spenderAddress = await spender.getAddress();
        const ownerAddress = await owner.getAddress();
        const transferAmount = ethers.parseEther("200");

        await expect(token.connect(spender).transferFrom(userAddress, ownerAddress, transferAmount))
          .to.emit(token, "Transfer")
          .withArgs(userAddress, ownerAddress, transferAmount)
          .and.to.emit(token, "Approval")
          .withArgs(userAddress, spenderAddress, ethers.parseEther("300"));

        expect(await token.balanceOf(userAddress)).to.equal(ethers.parseEther("800"));
        expect(await token.allowance(userAddress, spenderAddress)).to.equal(ethers.parseEther("300"));
      });

      it("Should not allow transferFrom exceeding allowance", async function () {
        await expect(token.connect(spender).transferFrom(
          await user.getAddress(),
          await owner.getAddress(),
          ethers.parseEther("600")
        )).to.be.revertedWith("ERC20: insufficient allowance");
      });

      it("Should not allow transferFrom exceeding balance", async function () {
        // Approve large amount but user doesn't have enough balance
        await token.connect(user).approve(await spender.getAddress(), ethers.parseEther("2000"));
        await expect(token.connect(spender).transferFrom(
          await user.getAddress(),
          await owner.getAddress(),
          ethers.parseEther("1500")
        )).to.be.revertedWith("ERC20: transfer amount exceeds balance");
      });

      it("Should not allow transferFrom to zero address", async function () {
        await expect(token.connect(spender).transferFrom(
          await user.getAddress(),
          ethers.ZeroAddress,
          100
        )).to.be.revertedWith("ERC20: transfer to the zero address");
      });

      it("Should not allow transferFrom from zero address", async function () {
        await expect(token.connect(spender).transferFrom(
          ethers.ZeroAddress,
          await owner.getAddress(),
          100
        )).to.be.revertedWith("ERC20: insufficient allowance");
      });

      it("Should handle unlimited allowances", async function () {
        // Set unlimited allowance
        await token.connect(user).approve(await spender.getAddress(), ethers.MaxUint256);
        
        await token.connect(spender).transferFrom(
          await user.getAddress(),
          await owner.getAddress(),
          ethers.parseEther("500")
        );

        // Allowance should remain unlimited
        expect(await token.allowance(await user.getAddress(), await spender.getAddress()))
          .to.equal(ethers.MaxUint256);
      });
    });
  });

  describe("Upgradeability", function () {
    it("Should only allow owner to upgrade", async function () {
      await expect(token.connect(user).upgradeTo(await user.getAddress()))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should allow owner to upgrade", async function () {
      // Deploy a new implementation (just using same contract for test)
      const TonomyTokenV2 = await ethers.getContractFactory("TonomyToken");
      const newImplementation = await TonomyTokenV2.deploy();
      await newImplementation.waitForDeployment();

      await expect(token.connect(owner).upgradeTo(await newImplementation.getAddress()))
        .to.not.be.reverted;
    });
  });

  describe("View Functions", function () {
    it("Should return correct balanceOf", async function () {
      const userAddress = await user.getAddress();
      await token.setBridge(await bridge.getAddress());
      await token.connect(bridge).bridgeMint(userAddress, 1234);
      expect(await token.balanceOf(userAddress)).to.equal(1234);
    });

    it("Should return correct allowance", async function () {
      const userAddress = await user.getAddress();
      const spenderAddress = await spender.getAddress();
      await token.connect(user).approve(spenderAddress, 50);
      expect(await token.allowance(userAddress, spenderAddress)).to.equal(50);
    });

    it("Should return correct totalSupply", async function () {
      const initialSupply = await token.INITIAL_SUPPLY();
      expect(await token.totalSupply()).to.equal(initialSupply);
      
      // Mint more tokens
      await token.setBridge(await bridge.getAddress());
      await token.connect(bridge).bridgeMint(await user.getAddress(), 1000);
      expect(await token.totalSupply()).to.equal(initialSupply + 1000n);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle multiple consecutive operations", async function () {
      await token.setBridge(await bridge.getAddress());
      
      // Multiple mints
      await token.connect(bridge).bridgeMint(await user.getAddress(), 100);
      await token.connect(bridge).bridgeMint(await user.getAddress(), 200);
      expect(await token.balanceOf(await user.getAddress())).to.equal(300);

      // Multiple approvals
      await token.connect(user).approve(await spender.getAddress(), 50);
      await token.connect(user).approve(await spender.getAddress(), 100);
      expect(await token.allowance(await user.getAddress(), await spender.getAddress())).to.equal(100);

      // Multiple transfers
      await token.connect(spender).transferFrom(await user.getAddress(), await owner.getAddress(), 50);
      await token.connect(spender).transferFrom(await user.getAddress(), await owner.getAddress(), 30);
      expect(await token.balanceOf(await user.getAddress())).to.equal(220);
    });

    it("Should handle self-transfers", async function () {
      await token.setBridge(await bridge.getAddress());
      await token.connect(bridge).bridgeMint(await user.getAddress(), 1000);
      
      const userAddress = await user.getAddress();
      await expect(token.connect(user).transfer(userAddress, 500))
        .to.not.be.reverted;
      
      expect(await token.balanceOf(userAddress)).to.equal(1000);
    });
  });
});