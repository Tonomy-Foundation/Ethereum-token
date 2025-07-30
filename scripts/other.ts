import { ethers } from "hardhat";

const randomWallet = ethers.Wallet.createRandom();
const key = randomWallet.privateKey
const address = randomWallet.address;

console.log('Your address is:', address);
console.log('Your private key is:', key);