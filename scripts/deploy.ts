import { ethers, upgrades, network } from "hardhat";
import { getWallet } from "./wallet";
import { sleep } from "./time";

async function main() {
  const TonomyToken = await ethers.getContractFactory("TonomyToken");
  console.log(`[Deploy] Deploying TonomyToken proxy on network ${network.name}...`);

  const token = await upgrades.deployProxy(TonomyToken, [], {
    initializer: "initialize",
    kind: "uups",
  });
  await token.waitForDeployment();
  await sleep(5000);

  console.log("[Deploy] TonomyToken proxy deployed successfully.");
  const proxyAddress = await token.getAddress();

  const padEnd = 25;
  console.log('Deployed by:'.padEnd(padEnd), getWallet().address);
  console.log("Proxy contract:".padEnd(padEnd), proxyAddress);
  console.log("Implementation contract:".padEnd(padEnd), await upgrades.erc1967.getImplementationAddress(proxyAddress));
  console.log('Contract.owner:'.padEnd(padEnd), await token.owner());
  console.log('Contract.bridge:'.padEnd(padEnd), await token.bridge());
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
