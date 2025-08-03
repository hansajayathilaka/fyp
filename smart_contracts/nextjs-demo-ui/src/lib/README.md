# Decimal Handling System

This document explains how the decimal handling system works in the application, particularly for handling different units like wei (ETH) and tinybar (HBAR).

## Overview

The application uses standard Ethereum-compatible decimal handling:
- All networks: 18 decimals (wei)

The system uses a centralized decimal handling system that:
1. Detects the current network
2. Normalizes values to the appropriate unit
3. Formats values for display with the correct currency symbol

## Key Functions

### `normalizeAmount(amount, sourceDecimals?)`

This is the central function for handling unit conversions. It:
- Takes a bigint value in any unit
- Optionally accepts the source decimals (if known)
- Returns a normalized value in the appropriate unit for the current network

Example:
```typescript
// Convert a value that might be in tinybar (8 decimals) to wei (18 decimals)
const normalizedValue = normalizeAmount(marketplaceBalance);
```

### `formatETHValue(value, options)`

This function formats a normalized value for display:
- Takes a normalized bigint value
- Returns a formatted string with the appropriate currency symbol (ETH or HBAR)
- Supports options like decimal places, showing/hiding the unit, and compact display

Example:
```typescript
// Format a normalized value for display
const displayValue = formatETHValue(normalizedValue, { maxDecimals: 4, showUnit: true });
```

### `parseAmount(input)`

This function parses a user input string to a blockchain format:
- Takes a string like "1.5"
- Returns a bigint value in the appropriate unit for the current network

Example:
```typescript
// Parse user input to blockchain format
const blockchainValue = parseAmount("1.5");
```

## Token Quantities vs. Currency Values

The system distinguishes between:
- **Token quantities**: Whole numbers without decimal conversion (e.g., "10 tokens")
- **Currency values**: Values with decimal places (e.g., "1.5 ETH")

For token quantities, use:
- `parseTokenQuantity` for parsing
- `formatTokenQuantity` for display

For currency values, use:
- `parseAmount` for parsing
- `formatETHValue` for display

## Network Detection

The system uses standard Ethereum decimal formatting:
- All networks: 18 decimals (wei)

## Best Practices

1. Always normalize values before adding or comparing them
2. Use the appropriate formatting function based on the value type
3. For token balances from different sources, use `normalizeAmount` to ensure they're in the same unit