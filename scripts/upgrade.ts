import { ethers, upgrades } from "hardhat";

async function main() {
  const proxyAddress = process.env.PROXY_ADDRESS;
  if (!proxyAddress) throw new Error("PROXY_ADDRESS not set in .env");

  const TonomyToken = await ethers.getContractFactory("TonomyToken");
  console.log(`[Upgrade] Upgrading proxy at ${proxyAddress}...`);

  const upgraded = await upgrades.upgradeProxy(proxyAddress, TonomyToken);
  await upgraded.deployed();

  console.log("Upgrade complete. Current implementation is at",
    await upgrades.erc1967.getImplementationAddress(proxyAddress));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
