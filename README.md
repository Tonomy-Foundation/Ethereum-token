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
Set the network using `--network base_testnet` or `--network base` when running commands

```bash
yarn deploy --network base_testnet
```

### Upgrades
Set the network using `--network base_testnet` or `--network base` when running commands

```bash
yarn upgrade --network base_testnet
```

### Interaction
Set the network using `--network base_testnet` or `--network base` when running commands

```bash
yarn interact --network base_testnet
```

## Network Configuration & Deployed Addresses

| Network | Chain ID | Contract Address | Swap URL |
|---------|---------|------------------|----------|
| **Base Mainnet** | 8453 | TODO: `0x0000000000000000000000000000000000000000` | https://swap.tonomy.io |
| **Base Testnet** | 84532 | [0xd985a34300AE7BAE0ba9e02173813107ADceC71D](https://sepolia.basescan.org/address/0xd985a34300AE7BAE0ba9e02173813107ADceC71D) | https://swap.testnet.tonomy.io |

## Contract Features

- **Token Name**: Tonomy Token
- **Token Symbol**: TONO
- **Decimals**: 18
- **Upgradeable**: Yes (UUPS pattern)
- **Bridge Support**: Mint/burn functionality for authorized bridge


## TODO
- Update the token supply and name
- Make a withdrawal whitelist for owner (use Coinbase Prime account)