# Testing Guide

This guide explains how to test the blockchain integration functionality.

## Available Test Commands

### 1. Complete Test Suite (Recommended)
```bash
npm run test:blockchain
```
This runs both offline and online tests:
- Tests the blockchain service implementation (offline)
- Tests the API endpoints and integration (online, requires server)
- Provides helpful feedback if server is not running

### 2. Service-Only Test (Offline)
```bash
npm run test:blockchain:service
```
Tests only the blockchain service implementation without requiring a running server.

### 3. Integration Test (Online)
```bash
npm run test:blockchain:integration
```
Tests the API endpoints and full integration. Requires the server to be running.

## Running Tests

### Quick Test (No Server Required)
```bash
# Test the blockchain service implementation
npm run test:blockchain:service
```

### Full Test (Server Required)
```bash
# Terminal 1: Start the server
npm start

# Terminal 2: Run the complete test suite
npm run test:blockchain
```

## Test Results Explanation

### ✅ Expected Successes
- **Offline Service Test**: Should always pass
- **Server Running Check**: Passes when server is running
- **Blockchain Configuration**: Passes when config is valid
- **Blockchain Connection**: Passes when RPC URL is accessible

### ⚠️ Expected Warnings/Failures (With Test Data)
- **User Registration**: May fail with test/placeholder credentials
- **Transaction Submission**: May fail without real private key and contract
- **Verification Results**: May show `verified: false` with mock data

### ❌ Actual Failures (Need Investigation)
- **Server Not Running**: Start server with `npm start`
- **Configuration Errors**: Check environment variables
- **Import Errors**: Run `npm run build` first

## Test Data

The tests use mock credentials with:
- **User Type**: Company (based on `organizationName` field)
- **SSI Identifier**: `did:example:user123`
- **Contract Address**: Placeholder address
- **Private Key**: Test private key (not real)

## Environment Setup for Real Testing

To test with real blockchain integration:

1. **Update Environment Variables**:
   ```bash
   BLOCKCHAIN_ENABLED=true
   SMART_CONTRACT_ADDRESS=0xYourRealContractAddress
   ACCOUNT_PRIVATE_KEY=0xYourRealPrivateKey
   BLOCKCHAIN_RPC_URL=https://your-real-rpc-url.com
   ```

2. **Deploy Smart Contract** with the required interface:
   ```solidity
   function registerUser(string memory ssiIdentifier, UserType userType) external;
   ```

3. **Fund Account** with sufficient balance for gas fees

4. **Run Tests**:
   ```bash
   npm run test:blockchain
   ```

## Troubleshooting

### "Server is not running"
```bash
# Start the server first
npm start
# Then run tests in another terminal
npm run test:blockchain
```

### "Cannot find module './dist/services/blockchainService'"
```bash
# Build the project first
npm run build
# Then run tests
npm run test:blockchain
```

### "socket hang up" or "connection failed"
- Check if RPC URL is accessible
- Verify network connectivity
- Ensure contract address exists on the network

### "insufficient funds" or "gas estimation failed"
- Check account balance
- Verify contract exists and is deployed
- Ensure private key corresponds to funded account

## Test Output Examples

### Successful Test Run
```
🔗 Blockchain Integration Test Suite

=== Testing Blockchain Service (Offline) ===
✓ Disabled blockchain service created successfully
✓ Registration with disabled service: SUCCESS
✓ Configuration retrieved
✓ Offline blockchain service test completed successfully

=== Testing Blockchain Integration (Online) ===
✓ Server is running
✓ Blockchain config retrieved
✓ Blockchain connection test successful
✓ Online blockchain integration test completed

=== Test Summary ===
Offline Service Test: ✓ PASSED
Online Integration Test: ✓ PASSED
🎉 Test suite completed!
```

### Server Not Running
```
🔗 Blockchain Integration Test Suite

=== Testing Blockchain Service (Offline) ===
✓ Offline blockchain service test completed successfully

=== Testing Blockchain Integration (Online) ===
✗ Server is not running at http://localhost:4001

💡 Tip: Start the server with "npm start" to run the full integration test
```