import { ethers } from 'hardhat';

export function getWallet() {
    const PRIVATE_KEY = process.env.ETHEREUM_PRIVATE_KEY || '';

    const wallet = new ethers.Wallet(PRIVATE_KEY);

    if (!wallet) {
        throw new Error('Private key is not set or invalid');
    }

    return wallet;
}
