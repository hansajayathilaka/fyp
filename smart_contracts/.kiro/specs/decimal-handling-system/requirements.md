# Requirements Document

## Introduction

The current system assumes all tokens use 18 decimal places like Ethereum, but Hedera uses 8 decimals. This causes conversion errors and incorrect displays. We need a simple decimal handling system that works with both networks without over-engineering.

## Requirements

### Requirement 1

**User Story:** As a developer, I want a simple decimal utility, so that I can convert between user input and blockchain format for both Ethereum (18 decimals) and Hedera (8 decimals).

#### Acceptance Criteria

1. WHEN converting user input to blockchain format THEN the utility SHALL use the correct decimal places for the network
2. WHEN converting blockchain amounts to display THEN the utility SHALL format with appropriate precision
3. WHEN the network is Hedera THEN the utility SHALL use 8 decimals
4. WHEN the network is Ethereum THEN the utility SHALL use 18 decimals

### Requirement 2

**User Story:** As a user, I want to see properly formatted token amounts, so that I can read them easily without long decimal strings.

#### Acceptance Criteria

1. WHEN displaying amounts THEN the system SHALL show at most 6 decimal places
2. WHEN amounts are zero THEN the system SHALL display "0"
3. WHEN amounts are very small THEN the system SHALL not show scientific notation
4. WHEN formatting fails THEN the system SHALL show the raw value

### Requirement 3

**User Story:** As a developer, I want to replace existing formatEther/parseEther calls, so that the system works correctly on Hedera.

#### Acceptance Criteria

1. WHEN replacing parseEther calls THEN the new function SHALL handle both 8 and 18 decimal inputs
2. WHEN replacing formatEther calls THEN the new function SHALL format with the correct decimals
3. WHEN updating components THEN existing functionality SHALL continue to work
4. WHEN errors occur THEN the system SHALL provide clear error messages