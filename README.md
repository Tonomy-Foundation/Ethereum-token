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

For the complete Tonomy ecosystem contracts on the Tonomy Blockchain, see: [Tonomy-Contracts repository](https://github.com/Tonomy-Foundation/Tonomy-Contracts)

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

Set the network using ` --network base_testnet` or ` --network base` when running commands

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
yarn deploy --network base_testnet
```

### Upgrades
```bash
yarn upgrade --network base_testnet
```

### Interaction
```bash
yarn interact --network base_testnet
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