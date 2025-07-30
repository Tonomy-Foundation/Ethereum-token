import { ethers, upgrades } from "hardhat";

async function main() {
  const TonomyToken = await ethers.getContractFactory("TonomyToken");
  console.log("[Deploy] Deploying TonomyToken proxy...");

  const token = await upgrades.deployProxy(TonomyToken, [], {
    initializer: "initialize",
    kind: "uups"
  });
  await token.waitForDeployment();
  const address = await token.getAddress();

  console.log("TonomyToken Proxy deployed at:", address);
  const implAddress = await upgrades.erc1967.getImplementationAddress(address);
  console.log("Implementation deployed at:", implAddress);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
