# Requirements Document

## Introduction

This document outlines the requirements for building a simple Self-Sovereign Identity (SSI) issuing platform using Truvera. The platform will enable users to connect their MetaMask wallet, establish a connection with their Truvera wallet through QR code scanning, fill out a form with their details, and receive verifiable credentials directly in their Truvera wallet. The system will leverage the DEIP Access Credential schema for issuing credentials that provide access to the DEIP platform.

## Requirements

### Requirement 1

**User Story:** As a user, I want to connect my MetaMask wallet on the landing page, so that I can authenticate and begin the credential issuance process.

#### Acceptance Criteria

1. WHEN a user visits the landing page THEN the system SHALL display a "Connect MetaMask" button
2. WHEN a user clicks the "Connect MetaMask" button THEN the system SHALL prompt the user to connect their MetaMask wallet
3. WHEN the MetaMask connection is successful THEN the system SHALL display the user's wallet address
4. WHEN the MetaMask connection fails THEN the system SHALL display an appropriate error message
5. IF MetaMask is not installed THEN the system SHALL display instructions to install MetaMask

### Requirement 2

**User Story:** As a user, I want to scan a QR code with my Truvera wallet after connecting MetaMask, so that I can establish a secure connection between the platform and my wallet.

#### Acceptance Criteria

1. WHEN MetaMask is successfully connected THEN the system SHALL generate a unique QR code for wallet connection
2. WHEN the QR code is generated THEN the system SHALL display it prominently on the page with instructions to scan with Truvera wallet
3. WHEN a user scans the QR code with their Truvera wallet THEN the system SHALL establish a DIDComm connection
4. WHEN the wallet connection is established THEN the system SHALL display a confirmation message
5. WHEN the wallet connection times out THEN the system SHALL regenerate a new QR code
6. IF the QR code scanning fails THEN the system SHALL provide troubleshooting instructions

### Requirement 3

**User Story:** As a user, I want to fill out a form with my personal details after establishing the wallet connection, so that I can provide the necessary information for credential issuance.

#### Acceptance Criteria

1. WHEN the wallet connection is established THEN the system SHALL display a form with required fields
2. WHEN the form is displayed THEN the system SHALL include fields for firstName, lastName, country, email, walletAddress, investorType, kycLevel, and amlStatus
3. WHEN a user fills out the form THEN the system SHALL validate all required fields (firstName, lastName, country, investorType, kycLevel)
4. WHEN the form validation passes THEN the system SHALL enable the submit button
5. WHEN the form validation fails THEN the system SHALL display specific error messages for each invalid field
6. WHEN a user submits the form THEN the system SHALL pre-populate the walletAddress field with the connected MetaMask address
7. IF a user tries to submit an incomplete form THEN the system SHALL prevent submission and highlight missing required fields

### Requirement 4

**User Story:** As a user, I want to receive a verifiable credential in my Truvera wallet after submitting the form, so that I can use it to access the DEIP platform.

#### Acceptance Criteria

1. WHEN a user successfully submits the form THEN the system SHALL create a credential offer using the DEIP Access Credential schema
2. WHEN the form is processed THEN the system SHALL immediately prepare the credential offer and generate a QR code
3. WHEN the credential offer is prepared THEN the system SHALL display a success confirmation with completed steps and next actions
4. WHEN the QR code is generated THEN the system SHALL redirect the user to scan it with their Truvera wallet
5. WHEN a user scans the QR code THEN the system SHALL deliver the credential to their Truvera wallet via OpenID credential offer
6. WHEN the credential is successfully delivered THEN the system SHALL display a final success confirmation
7. WHEN the credential delivery fails THEN the system SHALL display an error message and provide retry options
8. WHEN the credential is received THEN the user SHALL be able to view it in their Truvera wallet
9. IF the credential preparation or issuance process fails THEN the system SHALL log the error and notify the user with specific error messages

### Requirement 5

**User Story:** As a platform administrator, I want the system to securely manage API keys and credentials, so that the platform operates securely and reliably.

#### Acceptance Criteria

1. WHEN the system starts THEN it SHALL load Truvera API credentials from secure environment variables
2. WHEN making API calls to Truvera THEN the system SHALL use proper authentication headers
3. WHEN handling user data THEN the system SHALL encrypt sensitive information in transit
4. WHEN storing temporary session data THEN the system SHALL use secure session management
5. WHEN errors occur THEN the system SHALL log them without exposing sensitive information
6. IF API rate limits are exceeded THEN the system SHALL implement appropriate retry mechanisms

### Requirement 6

**User Story:** As a user, I want to see clear status updates throughout the process, so that I understand what is happening at each step.

#### Acceptance Criteria

1. WHEN each step begins THEN the system SHALL display a loading indicator with descriptive text
2. WHEN a step completes successfully THEN the system SHALL show a success message and progress indicator
3. WHEN an error occurs THEN the system SHALL display a user-friendly error message with suggested actions
4. WHEN form submission is successful THEN the system SHALL show an enhanced success confirmation with completed steps checklist and next actions
5. WHEN the credential offer is being prepared THEN the system SHALL display progress indicators and status messages
6. WHEN the process is complete THEN the system SHALL show a final success page with next steps
7. WHEN the user navigates between steps THEN the system SHALL maintain a clear progress indicator
8. IF the user refreshes the page THEN the system SHALL restore the appropriate step based on session state

### Requirement 7

**User Story:** As a user, I want the platform to work responsively across different devices, so that I can complete the process on desktop, tablet, or mobile.

#### Acceptance Criteria

1. WHEN a user accesses the platform on any device THEN the system SHALL display a responsive interface
2. WHEN viewing on mobile devices THEN the QR code SHALL be appropriately sized and scannable
3. WHEN using touch devices THEN all interactive elements SHALL be touch-friendly
4. WHEN the screen size changes THEN the layout SHALL adapt appropriately
5. WHEN using the form on mobile THEN input fields SHALL be properly sized and accessible
6. IF the device doesn't support MetaMask THEN the system SHALL provide alternative connection methods or clear instructions