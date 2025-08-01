# Requirements Document

## Introduction

This document outlines the requirements for building a simple credential testing flow that generates random test data, issues credentials, and displays QR codes for testing with the Dock wallet. This is a streamlined testing tool designed to quickly validate credential issuance and wallet integration without requiring user input or complex forms. The system will generate realistic test data, create credentials using the existing Truvera integration, and provide QR codes for immediate testing with the Dock wallet application.

## Requirements

### Requirement 1

**User Story:** As a developer, I want to generate random test data with a single click, so that I can quickly create realistic credential data for testing purposes.

#### Acceptance Criteria

1. WHEN a user clicks the "Generate Test Data" button THEN the system SHALL create random realistic test data including firstName, lastName, country, email, walletAddress, investorType, kycLevel, and amlStatus
2. WHEN test data is generated THEN the system SHALL display the generated data in a readable format
3. WHEN generating random data THEN the system SHALL use realistic values (real country names, proper email formats, valid wallet addresses)
4. WHEN data is generated THEN the system SHALL ensure all required fields for credential issuance are populated
5. IF data generation fails THEN the system SHALL display an error message and allow retry

### Requirement 2

**User Story:** As a developer, I want to issue a credential using the generated test data, so that I can test the credential issuance process without manual data entry.

#### Acceptance Criteria

1. WHEN test data is available THEN the system SHALL display an "Issue Credential" button
2. WHEN a user clicks "Issue Credential" THEN the system SHALL create a credential using the generated test data and DEIP Access Credential schema
3. WHEN the credential is being issued THEN the system SHALL display a loading indicator with progress updates
4. WHEN credential issuance is successful THEN the system SHALL display a success message and prepare the QR code
5. WHEN credential issuance fails THEN the system SHALL display specific error messages and allow retry
6. IF the Truvera API is unavailable THEN the system SHALL display appropriate error messages with troubleshooting guidance

### Requirement 3

**User Story:** As a developer, I want to see a QR code for the issued credential, so that I can scan it with the Dock wallet to test credential reception.

#### Acceptance Criteria

1. WHEN a credential is successfully issued THEN the system SHALL generate a QR code for credential offer
2. WHEN the QR code is generated THEN the system SHALL display it prominently with clear scanning instructions
3. WHEN displaying the QR code THEN the system SHALL include the credential details alongside the QR code
4. WHEN the QR code is displayed THEN the system SHALL provide instructions specific to Dock wallet scanning
5. WHEN the QR code expires THEN the system SHALL automatically regenerate a new QR code
6. IF QR code generation fails THEN the system SHALL display an error message and provide retry options

### Requirement 4

**User Story:** As a developer, I want to verify that the credential was successfully received in the Dock wallet, so that I can confirm the end-to-end testing flow works correctly.

#### Acceptance Criteria

1. WHEN a QR code is scanned THEN the system SHALL provide status updates about credential delivery
2. WHEN credential delivery is successful THEN the system SHALL display a confirmation message
3. WHEN checking delivery status THEN the system SHALL poll the Truvera API for delivery confirmation
4. WHEN the credential is confirmed delivered THEN the system SHALL display success status and credential details
5. WHEN delivery fails THEN the system SHALL display error information and suggest troubleshooting steps
6. IF delivery status cannot be determined THEN the system SHALL provide manual verification instructions

### Requirement 5

**User Story:** As a developer, I want to reset and start a new test cycle, so that I can quickly test multiple credential scenarios.

#### Acceptance Criteria

1. WHEN testing is complete THEN the system SHALL display a "Start New Test" button
2. WHEN a user clicks "Start New Test" THEN the system SHALL clear all previous data and return to the initial state
3. WHEN resetting THEN the system SHALL clean up any active sessions or connections
4. WHEN starting a new cycle THEN the system SHALL generate fresh test data
5. IF cleanup fails THEN the system SHALL log errors but still allow new test cycles to begin

### Requirement 6

**User Story:** As a developer, I want to see the complete testing flow status at all times, so that I can understand what step is currently active and what has been completed.

#### Acceptance Criteria

1. WHEN the testing flow begins THEN the system SHALL display a progress indicator showing all steps
2. WHEN each step completes THEN the system SHALL update the progress indicator and show completion status
3. WHEN an error occurs THEN the system SHALL highlight the failed step and provide error details
4. WHEN viewing the interface THEN the system SHALL show current step, completed steps, and remaining steps
5. WHEN the flow is complete THEN the system SHALL show a summary of all completed actions
6. IF the user refreshes the page THEN the system SHALL restore the current progress state