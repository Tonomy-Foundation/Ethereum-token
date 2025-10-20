import { ethers, upgrades, network } from 'hardhat';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
    const proxyAddress = process.env.PROXY_ADDRESS;

    if (!proxyAddress) throw new Error('PROXY_ADDRESS not set in .env');

    const [signer] = await ethers.getSigners();

    const token = await ethers.getContractAt('TonomyToken', proxyAddress, signer);

    const padEnd = 18;
    const decimals = await token.decimals();
    const symbol = await token.symbol();

    console.log('Contract info:');
    console.log('Network'.padEnd(padEnd), network.name);
    console.log(
        'Proxy contract'.padEnd(padEnd),
        proxyAddress,
        '(this is the token contract address we tell others about)'
    );
    console.log('Implementation'.padEnd(padEnd), await upgrades.erc1967.getImplementationAddress(proxyAddress));
    console.log('');
    console.log('Contract state:');
    console.log('owner'.padEnd(padEnd), await token.owner());
    console.log('bridge'.padEnd(padEnd), await token.bridge());
    console.log('antiSnipingManager'.padEnd(padEnd), await token.antiSnipingManager());
    console.log('mintTo'.padEnd(padEnd), await token.mintTo());
    console.log('name'.padEnd(padEnd), await token.name());
    console.log('symbol'.padEnd(padEnd), symbol);
    console.log('decimals'.padEnd(padEnd), decimals);
    console.log('INITIAL_SUPPLY'.padEnd(padEnd), castQuantityToString(await token.INITIAL_SUPPLY(), decimals, symbol));
    console.log('totalSupply'.padEnd(padEnd), castQuantityToString(await token.totalSupply(), decimals, symbol));

    console.log('');
    console.log('Balances:');
    console.log(
        'contractBalance'.padEnd(padEnd),
        castQuantityToString(await token.balanceOf(proxyAddress), decimals, symbol)
    );
    console.log(
        'mintToBalance'.padEnd(padEnd),
        castQuantityToString(await token.balanceOf(await token.mintTo()), decimals, symbol)
    );
    console.log(
        'ownerBalance'.padEnd(padEnd),
        castQuantityToString(await token.balanceOf(await token.owner()), decimals, symbol)
    );

    if (process.env.ACCOUNT) {
        const account = process.env.ACCOUNT;

        console.log('');
        console.log(`Account ${account} state:`);
        console.log('balanceOf'.padEnd(padEnd), castQuantityToString(await token.balanceOf(account), decimals, symbol));

        if (process.env.SPENDER) {
            const spender = process.env.SPENDER;
            const allowance = await token.allowance(account, spender);

            console.log(
                'allowance'.padEnd(padEnd),
                castQuantityToString(allowance, decimals, symbol),
                `from spender: ${spender}`
            );
        }
    }

    if (process.env.TRANSACTION === 'true') {
        const signerAddress = await signer.getAddress();
        const to = process.env.TO_ADDRESS || signerAddress;
        const amount = process.env.AMOUNT || '1.0 TONO';

        const amountString = castQuantityToString(castStringToQuantity(amount, decimals, symbol), decimals, symbol);

        console.log('');
        console.log(`Transferring ${amountString} from ${signerAddress} to ${to}...`);
        const tx = await token.transfer(to, castStringToQuantity(amount, decimals, symbol));

        await tx.wait();
        console.log(
            `Transfer complete. New balance of ${to}:`,
            castQuantityToString(await token.balanceOf(to), decimals, symbol)
        );
    }
}

function castQuantityToString(quantity: bigint, decimals: bigint, symbol: string): string {
    const divisor = 10n ** decimals;
    const quotient = quantity / divisor;
    const remainder = quantity % divisor;

    return quotient.toString() + '.' + remainder.toString().padStart(Number(decimals), '0') + ' ' + symbol;
}

function castStringToQuantity(value: string, decimals: bigint, symbol: string): bigint {
    const parts = value.split(' ' + symbol)[0].split('.');

    if (parts.length !== 2) throw new Error('Invalid value format');

    const wholePart = BigInt(parts[0]);
    const fractionalPart = BigInt(parts[1].padEnd(Number(decimals), '0').slice(0, Number(decimals)));

    return wholePart * 10n ** decimals + fractionalPart;
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
