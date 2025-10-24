import { ethers, network } from 'hardhat';
import { getWallet } from './wallet';

console.log('Creating random key...');
const randomWallet = ethers.Wallet.createRandom();
const key = randomWallet.privateKey;
const address = randomWallet.address;

console.log('Random address is:', address);
console.log('Random private key is:', key);

console.log('');
console.log(`Checking ${network.name} network key...`);

console.log('Using wallet address:', getWallet().address);
