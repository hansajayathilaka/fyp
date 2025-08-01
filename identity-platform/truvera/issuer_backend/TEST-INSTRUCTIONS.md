# Credential Issuance Flow Testing

This document provides instructions for testing the complete credential issuance flow and extracting QR code data for manual testing with the Truvera (Dock) wallet.

## Prerequisites

1. **Backend server running**: Make sure the backend is running on `http://localhost:3001`
   ```bash
   npm run dev
   ```

2. **Truvera wallet app**: Install the Truvera (Dock) wallet app on your mobile device

## Test Scripts

### 1. Full Flow Test Script

The main test script (`test-flow.js`) runs through the complete credential issuance flow:

```bash
# Run the full flow test
npm run test:flow

# Or directly
node test-flow.js
```

**What it does:**
1. Creates a new session
2. Connects a test wallet address
3. Submits test form data
4. Generates a credential offer QR code
5. Extracts QR code data for manual testing
6. Checks initial credential status
7. Displays session information

**Output files:**
- `qr-code-data.txt` - Raw QR code data for manual entry
- `qr-code.html` - Visual QR code that you can open in a browser

### 2. Status Monitoring Script

Monitor the credential status in real-time:

```bash
# Monitor status for a specific session (replace SESSION_ID)
npm run monitor SESSION_ID

# Or directly with custom interval (5 seconds default)
node monitor-status.js SESSION_ID 3000
```

### 3. Status Check Script

Check status once for an existing session:

```bash
# Check status for a specific session
npm run test:status SESSION_ID

# Or directly
node test-flow.js status SESSION_ID
```

## Manual Testing with Truvera Wallet

### Step 1: Run the Test Script

```bash
npm run test:flow
```

This will output something like:
```
📱 QR CODE DATA FOR MANUAL TESTING:
============================================================
openid-credential-offer://?credential_offer_uri=https://api-testnet.truvera.io/openid/issuers/abc123/credential-offers/xyz789
============================================================
```

### Step 2: Get the QR Code

The script creates two files:

1. **qr-code-data.txt** - Contains the raw QR code data
2. **qr-code.html** - Visual QR code you can open in your browser

### Step 3: Test with Truvera Wallet

1. **Open your Truvera wallet app**
2. **Look for QR code scanning option** (usually "Scan QR Code" or "Receive Credential")
3. **Scan the QR code** from the HTML file or manually enter the QR code data
4. **Review the credential offer** - You should see:
   - Credential type: DEIP Access Credential
   - Issuer information
   - Your test data (name, country, etc.)
5. **Accept the credential** to receive it in your wallet

### Step 4: Monitor Status

While testing with the wallet, run the monitoring script in another terminal:

```bash
npm run monitor SESSION_ID
```

This will show real-time status updates as you interact with the wallet.

## Expected QR Code Format

The QR code contains an OpenID credential offer URL in this format:

```
openid-credential-offer://?credential_offer_uri=https://api-testnet.truvera.io/openid/issuers/{ISSUER_ID}/credential-offers/{OFFER_ID}
```

## Test Data

The test script uses this sample data:

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "country": "United States",
  "email": "john.doe@example.com",
  "walletAddress": "0x3d4ed828b9c7f60d7b5a5c8e9f2a1b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5",
  "investorType": "Individual",
  "kycLevel": "basic",
  "amlStatus": "cleared"
}
```

## Troubleshooting

### Common Issues

1. **"Session creation failed"**
   - Make sure the backend server is running
   - Check that the API endpoints are accessible

2. **"QR code generation failed"**
   - Verify Truvera API credentials in `.env`
   - Check network connectivity to Truvera API

3. **"Credential status always pending"**
   - This is expected if you haven't scanned the QR code yet
   - The status will change to "issued" after wallet acceptance

### Debug Information

The test script provides detailed logging:
- ✅ Success messages in green
- ❌ Error messages in red
- ⚠️ Warning messages in yellow
- ℹ️ Info messages in blue

### API Endpoints Tested

- `POST /api/session/create` - Create new session
- `POST /api/wallet/connect` - Connect wallet
- `POST /api/credentials/form` - Submit form data
- `POST /api/credentials/qr-generate` - Generate credential offer QR
- `GET /api/credentials/status/{sessionId}` - Check credential status
- `GET /api/session/{sessionId}` - Get session information

## Expected Flow States

1. **Session Created** → `wallet_connection`
2. **Wallet Connected** → `qr_generation`
3. **Form Submitted** → `qr_generation`
4. **QR Generated** → `wallet_pairing`
5. **Credential Accepted** → `completion`

## Next Steps

After successful manual testing:

1. **Verify credential in wallet** - Check that the credential appears in your Truvera wallet
2. **Test credential verification** - Use the credential for verification if applicable
3. **Test error scenarios** - Try invalid data, expired sessions, etc.
4. **Performance testing** - Test with multiple concurrent sessions

## Support

If you encounter issues:

1. Check the backend logs for detailed error messages
2. Verify your Truvera API configuration
3. Ensure your wallet app is up to date
4. Test with different QR code scanning methods (camera vs manual entry)