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
- `ETHEREUM_PRIVATE_KEY` - Private key for deployment account
- `PROXY_ADDRESS` - Address of the deployed TonomyToken proxy contract

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
Set the network using `--network base-sepolia` or `--network base` when running commands

```bash
yarn deploy --network base-sepolia
```

### Upgrades
Set the network using `--network base-sepolia` or `--network base` when running commands

```bash
yarn upgrade --network base-sepolia
```

### Interaction
Set the network using `--network base-sepolia` or `--network base` when running commands

```bash
yarn interact --network base-sepolia
```

## Network Configuration & Deployed Addresses

| Network | Chain ID | Contract Address | Swap URL |
|---------|---------|------------------|----------|
| **Base Mainnet** | 8453 | TODO: `0x0000000000000000000000000000000000000000` | https://app.tonomy.io/bankless |
| **Base Testnet** | 84532 | [0x791f703116a5197D3c0dD41855bC0e715b6A2Df9](https://sepolia.basescan.org/address/0x791f703116a5197D3c0dD41855bC0e715b6A2Df9) | https://app.testnet.tonomy.io/bankless |

## Contract Features

- **Token Name**: Tonomy Token
- **Token Symbol**: TONO
- **Decimals**: 18
- **Upgradeable**: Yes (UUPS pattern)
- **Bridge Support**: Mint/burn functionality for authorized bridge

## TODO

- Make a withdrawal whitelist for owner (use Coinbase Prime account)