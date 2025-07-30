import { ethers, network } from "hardhat";

console.log('Creating random key...');
const randomWallet = ethers.Wallet.createRandom();
const key = randomWallet.privateKey
const address = randomWallet.address;

console.log('Random address is:', address);
console.log('Random private key is:', key);

console.log('');
console.log(`Checking ${network.name} network key...`);
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

const wallet = new ethers.Wallet(PRIVATE_KEY);
if (!wallet) {
  throw new Error("Private key is not set or invalid");
}
console.log("Using wallet address:", wallet.address);