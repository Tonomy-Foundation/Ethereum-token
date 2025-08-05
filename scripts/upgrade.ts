import { ethers, network, upgrades } from "hardhat";
import { sleep } from "./time";
import { getWallet } from "./wallet";

async function main() {
  const proxyAddress = process.env.PROXY_ADDRESS;
  if (!proxyAddress) throw new Error("PROXY_ADDRESS not set in .env");

  const TonomyToken = await ethers.getContractFactory("TonomyToken");
  console.log(`[Upgrade] Upgrading proxy at ${proxyAddress} on network ${network.name}...`);

  const upgraded = await upgrades.upgradeProxy(proxyAddress, TonomyToken);
  await upgraded.waitForDeployment();
  await sleep(5000);
  console.log("[Upgrade] TonomyToken proxy upgraded successfully.");

  const padEnd = 25;
  console.log('Upgraded by:'.padEnd(padEnd), getWallet().address);
  console.log("Proxy contract:".padEnd(padEnd), proxyAddress);
  console.log("Implementation contract:".padEnd(padEnd), await upgrades.erc1967.getImplementationAddress(proxyAddress));
  console.log('Contract.owner:'.padEnd(padEnd), await upgraded.owner());
  console.log('Contract.bridge:'.padEnd(padEnd), await upgraded.bridge());

}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
