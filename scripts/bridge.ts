import { ethers } from 'hardhat';

async function main() {
    const proxyAddress = process.env.PROXY_ADDRESS;

    if (!proxyAddress) throw new Error('PROXY_ADDRESS not set in .env');
    const [signer] = await ethers.getSigners();
    const token = await ethers.getContractAt('TonomyToken', proxyAddress, signer);

    const bridgeOrMint: 'mint' | 'burn' = 'mint'; // change as needed
    const to = '0x796E8629750b112ae66cBEa3F43Ca0fBB63662Ac'; // change as needed
    const amount = ethers.parseUnits('1000', await token.decimals()); // change as needed

    if (bridgeOrMint === 'mint') {
        console.log(`[Bridge] TonomyToken.bridgeMint() ${ethers.formatUnits(amount, await token.decimals())} TONO to ${to}...`);
        const tx = await token.bridgeMint(to, amount);
        await tx.wait();
        console.log('[Bridge] Bridge transaction completed.');
    } else if (bridgeOrMint === 'burn') {
        console.log(`[Bridge] TonomyToken.bridgeBurn() ${ethers.formatUnits(amount, await token.decimals())} TONO from ${to}...`);
        const tx = await token.bridgeBurn(to, amount);
        await tx.wait();
        console.log('[Bridge] Bridge transaction completed.');
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
