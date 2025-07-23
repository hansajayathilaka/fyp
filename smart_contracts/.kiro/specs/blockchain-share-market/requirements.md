# Requirements Document

## Introduction

This document outlines the requirements for a blockchain-based share market system for a university final year project. The system integrates Self-Sovereign Identity (SSI) for user authentication, allows creation and trading of ERC-1155 tokens representing company shares, and includes a basic order book system. The focus is on demonstrating core blockchain and identity concepts with a functional implementation suitable for academic purposes.

## Requirements

### Requirement 1: SSI-Based User Registration

**User Story:** As a user, I want to register using my SSI credentials, so that I can establish my verified identity on the platform.

#### Acceptance Criteria

1. WHEN a user provides a valid SSI identifier THEN the system SHALL create a user profile
2. WHEN a user registers THEN the system SHALL assign user type (Individual or Company)
3. WHEN a user completes registration THEN the system SHALL emit a UserRegistered event
4. WHEN a user attempts duplicate registration THEN the system SHALL reject with appropriate error

### Requirement 2: Basic User Verification

**User Story:** As a platform admin, I want to verify registered users, so that only verified users can create tokens and trade.

#### Acceptance Criteria

1. WHEN an admin verifies a user THEN the system SHALL update user status to verified
2. WHEN a user is verified THEN the system SHALL enable trading and token creation permissions
3. WHEN a user is not verified THEN the system SHALL restrict trading activities
4. WHEN verification status changes THEN the system SHALL emit appropriate events

### Requirement 3: Token Creation and Management

**User Story:** As a verified company user, I want to create ERC-1155 tokens representing shares, so that I can digitize my company equity.

#### Acceptance Criteria

1. WHEN a verified Company user creates a token THEN the system SHALL mint a new ERC-1155 token
2. WHEN creating a token THEN the system SHALL require name, symbol, company name, max supply, and initial price
3. WHEN a token is created THEN the system SHALL assign unique token ID and store metadata
4. WHEN minting tokens THEN the system SHALL ensure total supply does not exceed maximum
5. WHEN a token is created THEN the system SHALL emit a TokenCreated event

### Requirement 4: Order Book Trading System

**User Story:** As a trader, I want to place buy and sell orders, so that I can trade tokens through an order book system.

#### Acceptance Criteria

1. WHEN a user places a buy order THEN the system SHALL lock required ETH amount in escrow
2. WHEN a user places a sell order THEN the system SHALL lock specified token amount in escrow
3. WHEN compatible orders exist THEN the system SHALL automatically match and execute trades
4. WHEN orders are partially filled THEN the system SHALL update order status appropriately
5. WHEN a user cancels an order THEN the system SHALL return locked funds/tokens
6. WHEN a trade executes THEN the system SHALL transfer tokens and ETH between parties

### Requirement 5: Basic Order Book Management

**User Story:** As a trader, I want to view active buy and sell orders, so that I can make informed trading decisions.

#### Acceptance Criteria

1. WHEN orders are placed THEN the system SHALL maintain buy and sell order books for each token
2. WHEN querying order books THEN the system SHALL return active orders sorted by price
3. WHEN orders are filled or cancelled THEN the system SHALL update order book status
4. WHEN viewing order book THEN the system SHALL display price, quantity, and order type

### Requirement 6: Simple Balance Management

**User Story:** As a user, I want to manage my ETH and token balances, so that I can fund my trading activities.

#### Acceptance Criteria

1. WHEN a user deposits ETH THEN the system SHALL credit their marketplace balance
2. WHEN a user withdraws ETH THEN the system SHALL verify sufficient balance and transfer funds
3. WHEN a user deposits tokens THEN the system SHALL update their marketplace token balance
4. WHEN a user withdraws tokens THEN the system SHALL transfer tokens to their wallet
5. WHEN funds are locked in orders THEN the system SHALL prevent withdrawal of locked amounts

### Requirement 7: Basic Trading Fees

**User Story:** As a platform operator, I want to collect simple trading fees, so that the platform can demonstrate fee collection mechanisms.

#### Acceptance Criteria

1. WHEN trades execute THEN the system SHALL calculate and collect a basic percentage fee
2. WHEN fees are collected THEN the system SHALL store them in a fee collection address
3. WHEN admin withdraws fees THEN the system SHALL transfer accumulated fees to owner
4. WHEN fee calculation occurs THEN the system SHALL handle zero-fee cases gracefully

### Requirement 8: Basic Compliance Monitoring

**User Story:** As an admin, I want to monitor trading activities, so that I can demonstrate basic compliance tracking.

#### Acceptance Criteria

1. WHEN trades occur THEN the system SHALL record basic trading activity logs
2. WHEN suspicious activity is detected THEN the system SHALL allow admin to suspend users
3. WHEN users are suspended THEN the system SHALL prevent their trading activities
4. WHEN audit information is needed THEN the system SHALL provide transaction history

### Requirement 9: Simple Security Controls

**User Story:** As an admin, I want basic security controls, so that I can manage the platform safely.

#### Acceptance Criteria

1. WHEN security issues arise THEN the system SHALL allow admin to pause trading
2. WHEN contracts are paused THEN the system SHALL prevent trading while allowing withdrawals
3. WHEN unauthorized access occurs THEN the system SHALL reject transactions appropriately
4. WHEN reentrancy risks exist THEN the system SHALL implement basic protection guards

### Requirement 10: Frontend Integration

**User Story:** As a user, I want a web interface to interact with the platform, so that I can easily use all features.

#### Acceptance Criteria

1. WHEN contract state changes THEN the system SHALL emit events for frontend updates
2. WHEN querying data THEN the system SHALL provide view functions for all major entities
3. WHEN users interact THEN the system SHALL provide clear feedback on transaction status
4. WHEN displaying information THEN the system SHALL show relevant token and order data