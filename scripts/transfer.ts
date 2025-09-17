import { ethers, network } from 'hardhat';
import { sleep } from './time';

// TODO: change addresses as needed
const newOwnerAddress = '0x31692F8De49120C5204A8Db08a299022eE618a17';
const newAntiSniperManagerAddress = newOwnerAddress;
const newBridgeAddress = newOwnerAddress;

async function main() {
    const proxyAddress = process.env.PROXY_ADDRESS;

    if (!proxyAddress) throw new Error('PROXY_ADDRESS not set in .env');
    const [signer] = await ethers.getSigners();
    const token = await ethers.getContractAt('TonomyToken', proxyAddress, signer);
    const supply = await token.INITIAL_SUPPLY();
    const whole = supply / 10n ** (await token.decimals());
    const supplyString = whole.toLocaleString('en-US', {});

    console.log(`[Transfer] Transferring ownership of TonomyToken ${proxyAddress} on network ${network.name}:`);
    console.log(`[Transfer] 1. transferring supply of ${supplyString} TONO to ${newOwnerAddress}...`);
    await token.transfer(newOwnerAddress, supply);
    console.log(`[Transfer] 2. setting anti-sniping manager to ${newAntiSniperManagerAddress}...`);
    await token.setAntiSnipingManager(newAntiSniperManagerAddress);
    console.log(`[Transfer] 3. setting bridge to ${newBridgeAddress}...`);
    await token.setBridge(newBridgeAddress);
    console.log(`[Transfer] 4. setting owner to ${newOwnerAddress}...`);
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
