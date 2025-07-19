# Blockchain Share Market

A blockchain-based share market system with Self-Sovereign Identity (SSI) integration for university final year project.

## Features

- SSI-based user registration and verification
- ERC-1155 token creation for company shares
- Order book trading system with automatic matching
- Basic compliance monitoring
- Hedera testnet deployment support

## Development Environment

### Prerequisites

- Node.js (v20.16.0 or higher)
- npm or yarn
- Git

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

4. Add your private key to `.env` for Hedera testnet deployment

### Available Scripts

- `npm run compile` - Compile smart contracts
- `npm test` - Run tests
- `npm run test:coverage` - Run tests with coverage
- `npm run deploy:local` - Deploy to local Hardhat network
- `npm run deploy:hedera` - Deploy to Hedera testnet
- `npm run node` - Start local Hardhat node
- `npm run clean` - Clean artifacts and cache

### Project Structure

```
├── contracts/          # Smart contracts
├── test/              # Test files
├── scripts/           # Deployment scripts
├── ignition/          # Hardhat Ignition modules
├── .kiro/specs/       # Project specifications
└── README.md
```

### Networks

- **Local Development**: Hardhat Network (chainId: 31337)
- **Testnet**: Hedera Testnet (chainId: 296)

### Technology Stack

- **Smart Contracts**: Solidity ^0.8.28
- **Framework**: Hardhat
- **Testing**: Chai + Ethers.js
- **Standards**: OpenZeppelin ERC-1155
- **Network**: Hedera Hashgraph

## Getting Started

1. Set up the development environment (completed)
2. Implement smart contracts
3. Write comprehensive tests
4. Deploy to testnet
5. Build frontend integration

## License

MIT