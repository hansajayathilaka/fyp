# Requirements Document

## Introduction

This feature will create a comprehensive portfolio/wallet page that provides users with a complete overview of their digital assets. The page will display ETH balances, token holdings, and clearly distinguish between assets held in the user's wallet versus those deposited in the marketplace for trading. This centralized view will help users understand their total asset allocation and make informed decisions about trading and asset management.

## Requirements

### Requirement 1

**User Story:** As a token holder, I want to see my total ETH balance across both my wallet and marketplace deposits, so that I can understand my complete ETH holdings.

#### Acceptance Criteria

1. WHEN the user visits the portfolio page THEN the system SHALL display their current wallet ETH balance
2. WHEN the user has ETH deposited in the marketplace THEN the system SHALL display their marketplace ETH balance separately
3. WHEN displaying ETH balances THEN the system SHALL show a combined total ETH balance
4. WHEN ETH balances are displayed THEN the system SHALL format amounts in a user-friendly way with appropriate decimal places

### Requirement 2

**User Story:** As a token holder, I want to see all my token holdings with clear information about each token, so that I can understand what assets I own.

#### Acceptance Criteria

1. WHEN the user visits the portfolio page THEN the system SHALL display all tokens they hold with non-zero balances
2. WHEN displaying token holdings THEN the system SHALL show token name, symbol, company name, and token ID
3. WHEN displaying token holdings THEN the system SHALL show the current balance for each token
4. WHEN displaying token holdings THEN the system SHALL show token metadata including initial price and current supply information
5. WHEN no tokens are held THEN the system SHALL display an appropriate empty state message

### Requirement 3

**User Story:** As a trader, I want to see which of my tokens are deposited in the marketplace versus held in my wallet, so that I can understand what's available for trading.

#### Acceptance Criteria

1. WHEN displaying token holdings THEN the system SHALL clearly distinguish between wallet balance and marketplace balance for each token
2. WHEN a token has both wallet and marketplace balances THEN the system SHALL show both amounts separately
3. WHEN a token is only in wallet or only in marketplace THEN the system SHALL clearly indicate the location
4. WHEN displaying marketplace balances THEN the system SHALL indicate these tokens are available for trading

### Requirement 4

**User Story:** As a user, I want to quickly transfer tokens between my wallet and marketplace, so that I can efficiently manage my trading positions.

#### Acceptance Criteria

1. WHEN viewing token holdings THEN the system SHALL provide quick deposit/withdraw actions for each token
2. WHEN depositing tokens to marketplace THEN the system SHALL validate the user has sufficient wallet balance
3. WHEN withdrawing tokens from marketplace THEN the system SHALL validate the user has sufficient marketplace balance
4. WHEN performing transfers THEN the system SHALL provide clear transaction feedback and status updates
5. WHEN transfers complete THEN the system SHALL automatically refresh the displayed balances

### Requirement 5

**User Story:** As a user, I want to see summary statistics of my portfolio, so that I can understand my overall asset allocation and value.

#### Acceptance Criteria

1. WHEN the user visits the portfolio page THEN the system SHALL display total number of different tokens held
2. WHEN the user has token holdings THEN the system SHALL calculate and display total estimated portfolio value based on initial token prices
3. WHEN displaying portfolio statistics THEN the system SHALL show breakdown of assets in wallet vs marketplace
4. WHEN the user has no assets THEN the system SHALL display appropriate guidance on how to acquire tokens

### Requirement 6

**User Story:** As a user, I want the portfolio page to update in real-time when I make transactions, so that I always see current information.

#### Acceptance Criteria

1. WHEN the user completes a transaction THEN the system SHALL automatically refresh relevant balance information
2. WHEN balances are loading THEN the system SHALL show appropriate loading states
3. WHEN there are errors fetching data THEN the system SHALL display clear error messages with retry options
4. WHEN the user's wallet is not connected THEN the system SHALL prompt them to connect their wallet