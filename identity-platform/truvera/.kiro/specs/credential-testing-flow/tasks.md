# Implementation Plan

- [x] 1. Create script structure and generate random test data
  - Create `scripts/test-credential.js` file with basic Node.js setup
  - Implement random data generation functions that output realistic test data
  - Generate and display: firstName, lastName, nic, country, email, walletAddress, investorType, kycLevel, amlStatus
  - Output: Console log showing all generated test data in readable format
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Set up Truvera API connection and create OpenID issuer
  - Add axios dependency and create Truvera API client with authentication
  - Implement function to create OpenID issuer using the generated test data
  - Make API call to Truvera `/openid/issuers` endpoint with credential data
  - Output: Console log showing issuer ID and issuer URL from Truvera response
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 3. Generate QR code from issuer URL
  - Add qrcode dependency to generate QR codes
  - Take the issuer URL from step 2 and generate a QR code
  - Display QR code in console as ASCII art and save as PNG file
  - Output: QR code displayed in console + saved as `credential-qr.png` file
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 4. Add user confirmation and completion
  - Display clear instructions for scanning QR code with Dock wallet
  - Add simple prompt asking user to confirm when credential is added to wallet
  - Show completion message and exit script after user confirmation
  - Output: Clear instructions, user prompt, and completion confirmation
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 5. Add environment configuration and error handling
  - Create .env file loading for TRUVERA_API_URL, TRUVERA_API_KEY, ISSUER_DID
  - Add basic error handling for API failures with clear error messages
  - Add npm script `test-credential` to run the script easily
  - Output: Clear error messages if configuration is missing or API calls fail
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
