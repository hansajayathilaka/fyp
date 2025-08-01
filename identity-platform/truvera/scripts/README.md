# Credential Testing Scripts

This directory contains scripts for testing credential issuance and verification flows.

## Scripts Overview

### 1. `credential-utils.js`
Common utility functions shared between testing scripts:
- Random test data generation
- Truvera API client creation
- QR code generation
- Environment validation
- User interaction helpers

### 2. `test-credential.js`
Tests the credential **issuance** flow:
- Generates random test data
- Creates OpenID issuer via Truvera API
- Generates QR code for Dock wallet
- Guides user through credential acceptance

**Usage:**
```bash
npm run test:credential
# or
node scripts/test-credential.js
```

### 3. `test-verification.js`
Tests the credential **verification** flow:
- Creates a proof request via Truvera API
- Generates QR code for credential presentation
- Waits for user to present credential from wallet
- Verifies the presented credential automatically
- Shows verification results and user status

**Usage:**
```bash
npm run test:verification
# or
node scripts/test-verification.js
```

## Prerequisites

1. **Environment Setup**: Ensure your `.env` file in the `backend` directory contains:
   ```
   TRUVERA_API_URL=https://api-testnet.truvera.io
   TRUVERA_API_KEY=your_api_key_here
   ISSUER_DID=your_issuer_did_here
   CREDENTIAL_SCHEMA_URL=your_schema_url_here
   ```

2. **Dependencies**: Install required packages:
   ```bash
   npm install
   ```

3. **Dock Wallet**: Have the Dock wallet app installed on your mobile device for testing.

## Testing Flow

### Complete Testing Workflow

1. **Issue a Credential**:
   ```bash
   npm run test:credential
   ```
   - Follow the prompts to generate test data
   - Scan the QR code with Dock wallet
   - Accept the credential in your wallet

2. **Verify the Credential**:
   ```bash
   npm run test:verification
   ```
   - The script will generate a QR code for credential presentation
   - Scan the QR code with your Dock wallet
   - Select and present your DEIP credential
   - View the automatic verification results

### Verification Flow Details

The verification script implements the proper OpenID for Verifiable Presentations (OID4VP) flow:
1. Creates a proof request specifying required credential attributes
2. Generates a QR code containing the presentation request
3. Polls the Truvera API every 5 seconds waiting for credential presentation
4. Automatically verifies the presented credential when received
5. Shows detailed verification results and user status

## Output Files

- `credential-qr.png`: QR code image for credential offers (issuance flow)
- `verification-qr.png`: QR code image for credential presentation requests (verification flow)
- Console logs with detailed test results and verification status

## Troubleshooting

### Common Issues

1. **Missing Environment Variables**:
   - Check your `backend/.env` file
   - Ensure all required variables are set

2. **API Connection Errors**:
   - Verify your Truvera API key is valid
   - Check your internet connection
   - Ensure the API URL is correct

3. **QR Code Scanning Issues**:
   - Ensure good lighting when scanning
   - Try adjusting distance from the screen
   - Check that Dock wallet has camera permissions

4. **Credential Presentation Issues**:
   - Make sure you have a DEIP Access Credential in your wallet
   - Ensure the credential matches the proof request requirements
   - Check that your wallet supports the presentation format
   - Wait for the full 5-minute timeout if needed

### Getting Help

- Check the console output for detailed error messages
- Verify your environment configuration
- Ensure you have the latest version of Dock wallet
- Make sure you have valid DEIP credentials in your wallet
- Check that the proof request hasn't expired (5-minute timeout)

## Security Notes

- These scripts are for **testing purposes only**
- The verification flow uses real cryptographic verification
- Real credentials should be handled securely
- Never share your private keys or API credentials
- Proof requests have a 5-minute expiration for security
- The polling mechanism respects API rate limits with 5-second intervals