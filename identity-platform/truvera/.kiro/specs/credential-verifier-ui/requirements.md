# Requirements Document

## Introduction

This document outlines the requirements for a Credential Verifier UI application that provides a user-friendly interface for verifying digital credentials using the Truvera API. The verifier will complement the existing SSI issuer system by allowing organizations and individuals to verify the authenticity of credentials presented by users through QR code scanning and direct credential verification workflows.

## Requirements

### Requirement 1

**User Story:** As a verifier organization, I want to create proof requests for specific credential types, so that I can request users to present their credentials for verification.

#### Acceptance Criteria

1. WHEN a verifier accesses the application THEN the system SHALL display a form to create proof requests
2. WHEN creating a proof request THEN the system SHALL allow specifying credential types (e.g., DEIPAccessCredential)
3. WHEN creating a proof request THEN the system SHALL allow defining required fields from the credential subject
4. WHEN a proof request is created THEN the system SHALL generate a unique QR code for credential presentation
5. WHEN a proof request is created THEN the system SHALL provide a shareable URL for the proof request

### Requirement 2

**User Story:** As a verifier, I want to display QR codes for proof requests, so that credential holders can easily scan and present their credentials.

#### Acceptance Criteria

1. WHEN a proof request is created THEN the system SHALL generate a QR code containing the proof request URL
2. WHEN displaying the QR code THEN the system SHALL show clear instructions for credential holders
3. WHEN displaying the QR code THEN the system SHALL provide an alternative text-based URL for manual entry
4. WHEN the QR code is displayed THEN the system SHALL show the proof request details and requirements
5. WHEN the QR code expires THEN the system SHALL allow generating a new proof request

### Requirement 3

**User Story:** As a verifier, I want to monitor proof request status in real-time, so that I can see when credentials are presented and verified.

#### Acceptance Criteria

1. WHEN a proof request is active THEN the system SHALL poll the Truvera API for status updates
2. WHEN a credential is presented THEN the system SHALL display a notification of the presentation
3. WHEN monitoring status THEN the system SHALL show progress indicators for the verification process
4. WHEN a proof request times out THEN the system SHALL display an appropriate timeout message
5. WHEN verification is complete THEN the system SHALL navigate to the verification results page

### Requirement 4

**User Story:** As a verifier, I want to view detailed verification results, so that I can confirm the authenticity and validity of presented credentials.

#### Acceptance Criteria

1. WHEN credentials are verified THEN the system SHALL display the overall verification status (verified/unverified/partially verified)
2. WHEN displaying results THEN the system SHALL show detailed credential information including subject data
3. WHEN displaying results THEN the system SHALL show issuer information and credential validity period
4. WHEN displaying results THEN the system SHALL indicate if credentials are expired or invalid
5. WHEN multiple credentials are presented THEN the system SHALL show individual verification status for each credential
6. WHEN verification fails THEN the system SHALL display specific error messages and reasons for failure

### Requirement 5

**User Story:** As a verifier, I want to trigger custom backend actions upon successful verification, so that I can integrate verification results with my existing systems.

#### Acceptance Criteria

1. WHEN verification is successful THEN the system SHALL call a configurable custom function
2. WHEN calling the custom function THEN the system SHALL pass verification results and credential data
3. WHEN the custom function is called THEN the system SHALL handle both success and failure responses
4. WHEN custom function integration fails THEN the system SHALL log errors without blocking the verification display
5. WHEN custom function is not configured THEN the system SHALL continue normal operation without errors

### Requirement 6

**User Story:** As a verifier, I want the application to handle errors gracefully, so that I can understand and resolve issues during the verification process.

#### Acceptance Criteria

1. WHEN API calls fail THEN the system SHALL display user-friendly error messages
2. WHEN network connectivity is lost THEN the system SHALL show appropriate offline indicators
3. WHEN invalid credentials are presented THEN the system SHALL clearly explain the validation failures
4. WHEN system errors occur THEN the system SHALL provide troubleshooting guidance
5. WHEN errors are recoverable THEN the system SHALL offer retry mechanisms