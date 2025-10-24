import { upgrades, network } from 'hardhat';
import { tenderly } from 'hardhat';
// import * as tenderly from '@tenderly/hardhat-tenderly';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
    const proxyAddress = process.env.PROXY_ADDRESS;

    if (!proxyAddress) throw new Error('PROXY_ADDRESS not set in .env');

    const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress)

    const padEnd = 18;

    console.log('Contract info:');
    console.log('Network'.padEnd(padEnd), network.name);
    console.log(
        'Proxy contract'.padEnd(padEnd),
        proxyAddress,
        '(this is the token contract address we tell others about)'
    );
    console.log('Implementation'.padEnd(padEnd), implementationAddress);

    console.log('\nVerifying implementation contract on Tenderly...');

    await tenderly.verify({
        name: 'TonomyToken',
        address: implementationAddress,
    });
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
