import { ethers, network } from 'hardhat';

async function main() {
    const proxyAddress = process.env.PROXY_ADDRESS;

    if (!proxyAddress) throw new Error('PROXY_ADDRESS not set in .env');
    const [signer] = await ethers.getSigners();
    const token = await ethers.getContractAt('TonomyToken', proxyAddress, signer);

    console.log(`[Bridge] Interacting with TonomyToken ${proxyAddress} on network ${network.name}:`);

    const bridgeOrMint: 'mint' | 'burn' = process.env.BRIDGE_ACTION ?? 'mint'; // change as needed
    const to = process.env.BRIDGE_TO ?? '0x8951e9D016Cc0Cf86b4f6819c794dD64e4C3a1A1'; // change as needed
    const amount = process.env.BRIDGE_AMOUNT ?? '10'; // change as needed
    const quantity = ethers.parseUnits(amount, await token.decimals()); // change as needed

    if (bridgeOrMint === 'mint') {
        console.log(`[Bridge] TonomyToken.bridgeMint() ${ethers.formatUnits(quantity, await token.decimals())} TONO to ${to}...`);
        const tx = await token.bridgeMint(to, quantity);
        await tx.wait();
        console.log('[Bridge] Bridge transaction completed.');
    } else if (bridgeOrMint === 'burn') {
        console.log(`[Bridge] TonomyToken.bridgeBurn() ${ethers.formatUnits(quantity, await token.decimals())} TONO from ${to}...`);
        const tx = await token.bridgeBurn(to, quantity);
        await tx.wait();
        console.log('[Bridge] Bridge transaction completed.');
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
