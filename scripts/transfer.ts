import { ethers, network } from 'hardhat';
import { TonomyToken, TonomyToken__factory } from '../typechain-types';

const newOwnerAddress = '0x31692F8De49120C5204A8Db08a299022eE618a17';
const newAntiSniperManagerAddress = newOwnerAddress;

async function main() {
    const proxyAddress = process.env.PROXY_ADDRESS;

    if (!proxyAddress) throw new Error('PROXY_ADDRESS not set in .env');
    const [signer] = await ethers.getSigners();
    const token = TonomyToken__factory.connect(proxyAddress, signer) as TonomyToken;

    console.log(`[Transfer] Transferring ownership of TonomyToken on network ${network.name}...`);
    console.log(`[Transfer] transferring supply of 30M TONO to ${newOwnerAddress}...`);
    await token.transfer(newOwnerAddress, ethers.parseEther('3000000000'));
    console.log(`[Transfer] setting anti-sniping manager to ${newAntiSniperManagerAddress}...`);
    await token.setAntiSnipingManager(newAntiSniperManagerAddress);
    console.log(`[Transfer] setting owner to ${newOwnerAddress}...`);
    await token.transferOwnership(newOwnerAddress);

    if ((await token.owner()) !== newOwnerAddress) throw new Error('Ownership transfer failed');
    if ((await token.antiSnipingManager()) !== newAntiSniperManagerAddress)
        throw new Error('Anti-sniping manager transfer failed');

    console.log('[Transfer] Ownership transferred to:', newOwnerAddress);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
