import { ethers, network } from 'hardhat';
import { sleep } from './time';

// TODO: change addresses as needed
const newOwnerAddress = '0x796E8629750b112ae66cBEa3F43Ca0fBB63662Ac';
const newAntiSniperManagerAddress = newOwnerAddress;
const newBridgeAddress = newOwnerAddress;
const newLpWalletAddress = newOwnerAddress;
const newPoolAddress = '0x1dcdD8703dE9640a60EC57923f8cdf66c976F291'; // get from Aerodrome or other DEX after creating pool

async function main() {
    const proxyAddress = process.env.PROXY_ADDRESS;

    if (!proxyAddress) throw new Error('PROXY_ADDRESS not set in .env');
    const [signer] = await ethers.getSigners();
    const token = await ethers.getContractAt('TonomyToken', proxyAddress, signer);
    const supply = await token.INITIAL_SUPPLY();
    const whole = supply / 10n ** (await token.decimals());
    const supplyString = whole.toLocaleString('en-US', {});

    console.log(`[Transfer] Transferring ownership of TonomyToken ${proxyAddress} on network ${network.name}:`);
    console.log(`[Transfer] 1. transferring supply of ${supplyString} TONO to ${newLpWalletAddress}...`);
    await token.transfer(newLpWalletAddress, supply);
    console.log(`[Transfer] 2. setting anti-sniping manager to ${newAntiSniperManagerAddress}...`);
    await token.setAntiSnipingManager(newAntiSniperManagerAddress);
    console.log(`[Transfer] 3. setting bridge to ${newBridgeAddress}...`);
    await token.setBridge(newBridgeAddress);
    console.log(`[Transfer] 4. setting lp wallet to ${newLpWalletAddress}...`);
    await token.setLpWallet(newLpWalletAddress);
    console.log(`[Transfer] 5. setting pool address to ${newPoolAddress}...`);
    await token.setPoolAddress(newPoolAddress);
    console.log(`[Pause] 6. pausing the contract...`);
    await token.pause();
    console.log(`[Transfer] 7. setting owner to ${newOwnerAddress}...`);
    await token.transferOwnership(newOwnerAddress);

    await sleep(2000);
    if ((await token.antiSnipingManager()) !== newAntiSniperManagerAddress)
        throw new Error('Anti-sniping manager transfer failed');
    if ((await token.bridge()) !== newBridgeAddress) throw new Error('Bridge transfer failed');
    if ((await token.owner()) !== newOwnerAddress) throw new Error('Ownership transfer failed');

    console.log('[Transfer] Ownership transfer completed successfully.');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
