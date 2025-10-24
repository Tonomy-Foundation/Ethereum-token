import { upgrades, network, run } from 'hardhat';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
    const proxyAddress = process.env.PROXY_ADDRESS;

    if (!proxyAddress) throw new Error('PROXY_ADDRESS not set in .env');

    const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

    const padEnd = 18;

    console.log('Contract info:');
    console.log('Network'.padEnd(padEnd), network.name);
    console.log(
        'Proxy contract'.padEnd(padEnd),
        proxyAddress,
        '(this is the token contract address we tell others about)'
    );
    console.log('Implementation'.padEnd(padEnd), implementationAddress);

    console.log('\nVerifying proxy contract on Basescan...');

    await run('verify:verify', {
        address: proxyAddress,
        constructorArguments: [],
    });
    // await run('verify:verify', {
    //     address: implementationAddress,
    //     constructorArguments: [],
    // });

    console.log('✅ Implementation contract verified on Basescan!');
    console.log(`View at: https://basescan.org/address/${implementationAddress}#code`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});