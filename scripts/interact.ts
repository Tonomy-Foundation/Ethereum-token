import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const proxyAddress = process.env.PROXY_ADDRESS;
  if (!proxyAddress) throw new Error("PROXY_ADDRESS not set");

  const TonomyToken = await ethers.getContractFactory("TonomyToken");
  const token = TonomyToken.attach(proxyAddress);

  const bridgeAddr = process.env.BRIDGE_ADDRESS;
  if (!bridgeAddr) throw new Error("BRIDGE_ADDRESS not set");
  console.log(`Setting bridge to ${bridgeAddr}...`);

  const tx = await token.setBridge(bridgeAddr);
  await tx.wait();
  console.log("Bridge set on contract");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
