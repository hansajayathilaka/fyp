# Requirements Document

## Introduction

This feature involves reverting the custom decimal handling system that was previously implemented for Hedera blockchain integration. Since the project has migrated from Hedera to Fantom Sonic (which uses Ethereum-compatible structure with standard 18 decimals), the custom decimal handling code needs to be removed and replaced with standard Ethereum decimal handling patterns.

## Requirements

### Requirement 1

**User Story:** As a developer, I want to remove all custom decimal handling code from the system, so that the codebase is clean and uses standard Ethereum decimal patterns compatible with Fantom Sonic.

#### Acceptance Criteria

1. WHEN the system processes token amounts THEN it SHALL use standard 18-decimal Ethereum formatting
2. WHEN custom decimal conversion functions are found THEN they SHALL be removed from the codebase
3. WHEN decimal handling utilities exist THEN they SHALL be replaced with standard web3 utilities
4. WHEN token display logic uses custom decimals THEN it SHALL be updated to use standard Ethereum decimal handling

### Requirement 2

**User Story:** As a developer, I want to ensure all blockchain interactions use Fantom Sonic compatible decimal handling, so that token amounts are processed correctly on the new blockchain.

#### Acceptance Criteria

1. WHEN making blockchain calls THEN the system SHALL use standard wei/ether conversion patterns
2. WHEN displaying token balances THEN they SHALL be formatted using standard Ethereum decimal conventions
3. WHEN parsing blockchain responses THEN the system SHALL handle amounts as standard 18-decimal values
4. WHEN sending transactions THEN amounts SHALL be converted using standard web3 utilities

### Requirement 3

**User Story:** As a developer, I want to update any configuration or constants related to decimal handling, so that the system reflects the migration to Fantom Sonic.

#### Acceptance Criteria

1. WHEN decimal-related constants are found THEN they SHALL be updated to reflect Ethereum standards
2. WHEN configuration files contain custom decimal settings THEN they SHALL be removed or updated
3. WHEN environment variables reference custom decimals THEN they SHALL be updated for Fantom Sonic compatibility
4. WHEN type definitions include custom decimal types THEN they SHALL be simplified to standard formats

