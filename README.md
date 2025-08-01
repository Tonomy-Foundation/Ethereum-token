# Tonomy Token (TONO) - Base Implementation

A bridged version of the Tonomy Token deployed on Base blockchain for Ethereum DeFi ecosystem integration.

## Overview

This repository contains the Base blockchain implementation of the Tonomy Token (TONO). **The primary $TONO token with full utilities operates on the Tonomy Blockchain**. This Base version serves as a bridged token to enable interaction with Ethereum's DeFi ecosystem.

The Tonomy Token Base implementation is a UUPS upgradeable ERC20 token that includes:
- Bridge functionality for cross-chain operations with Tonomy Blockchain
- Minting and burning capabilities restricted to bridge contract
- Owner-controlled upgradability
- Standard ERC20 functionality (transfer, approve, allowance)

**Bridge & Swap**: Users can swap between Tonomy Blockchain and Base networks through our official swap interfaces.

For the complete Tonomy ecosystem contracts, see: [Tonomy-Contracts repository](https://github.com/Tonomy-Foundation/Tonomy-Contracts)

## Installation

```bash
yarn install
```

## Environment Setup

Copy `.env.example` to `.env` and fill in the required values:
- `INFURA_API_KEY` - Your Infura API key for Base network access
- `PRIVATE_KEY` - Private key for deployment account
- `ETHERSCAN_API_KEY` - API key for contract verification

## Scripts

### Compilation
```bash
yarn compile
```

### Testing
```bash
yarn test
```

### Deployment
```bash
# Deploy to Base testnet
yarn deploy:testnet

# Deploy to Base mainnet
yarn deploy:mainnet
```

### Upgrades
```bash
# Upgrade on Base testnet
yarn upgrade:testnet

# Upgrade on Base mainnet
yarn upgrade:mainnet
```

### Interaction
```bash
# Interact with deployed contract on testnet
yarn interact

# Generate new account
yarn account
```

## Network Configuration & Deployed Addresses

| Network | Chain ID | RPC URL | Contract Address | Swap URL |
|---------|----------|---------|------------------|----------|
| **Base Mainnet** | 8453 | `https://base-mainnet.infura.io/v3/{INFURA_API_KEY}` | TODO: `0x0000000000000000000000000000000000000000` | https://swap.tonomy.io |
| **Base Testnet** | 84532 | `https://base-sepolia.infura.io/v3/{INFURA_API_KEY}` | TODO: `0x0000000000000000000000000000000000000000` | https://swap.testnet.tonomy.io |

## Contract Features

- **Token Name**: Tonomy Token
- **Token Symbol**: TONO
- **Decimals**: 18
- **Upgradeable**: Yes (UUPS pattern)
- **Bridge Support**: Mint/burn functionality for authorized bridge


## TODO
- Update the token supply and name
- Make a withdrawal whitelist for owner (use Coinbase Prime account)