# Custom Decimals Update Summary

## Overview

I've updated the formatter functions to accept custom decimal parameters, allowing you to specify source/target decimals regardless of the network.

## Key Changes

### 1. Updated `fromWei` Function

Added a `sourceDecimals` parameter to the `fromWei` function:

```typescript
fromWei(
  value: bigint,
  options: {
    includeUnits?: boolean;
    maxDecimals?: number;
    sourceDecimals?: number; // New parameter
  } = {}
): string
```

This allows you to specify the source decimals when converting from wei/tinybar to ETH/HBAR:

```typescript
// Auto-detect network decimals (default)
fromWei(value)

// Force 18 decimals regardless of network
fromWei(value, { sourceDecimals: 18 })

// Force 8 decimals regardless of network
fromWei(value, { sourceDecimals: 8 })
```

### 2. Updated `toWei` Function

Added a `targetDecimals` parameter to the `toWei` function:

```typescript
toWei(
  value: string,
  options: {
    targetDecimals?: number; // New parameter
  } = {}
): bigint
```

This allows you to specify the target decimals when converting from ETH/HBAR to wei/tinybar:

```typescript
// Auto-detect network decimals (default)
toWei(value)

// Force 18 decimals regardless of network
toWei(value, { targetDecimals: 18 })

// Force 8 decimals regardless of network
toWei(value, { targetDecimals: 8 })
```

### 3. Updated Utility Functions

Updated all utility functions in decimal-utils.ts to pass through the custom decimal parameters:

- `parseAmount` - Added targetDecimals parameter
- `formatAmount` - Added sourceDecimals parameter
- `safeFormatAmount` - Added sourceDecimals parameter
- `safeParseAmount` - Added targetDecimals parameter
- `formatAmountForDisplay` - Added sourceDecimals parameter

### 4. Updated Usage in Components

Updated marketplace page to use the sourceDecimals parameter where needed:

```typescript
// For token prices that are always in 18 decimals
fromWei(tokenInfo.initialPrice, { sourceDecimals: 18 })

// For order prices that are in 8 decimals
fromWei(order.price, { includeUnits: false, sourceDecimals: 8 })
```

## Usage Guidelines

1. **For most cases, use the default auto-detection**:
   ```typescript
   fromWei(value) // Auto-detects network decimals
   toWei(value)   // Auto-detects network decimals
   ```

2. **For values that are always in a specific decimal format**:
   ```typescript
   // For values always in 18 decimals (Ethereum format)
   fromWei(value, { sourceDecimals: 18 })
   
   // For values always in 8 decimals (Hedera format)
   fromWei(value, { sourceDecimals: 8 })
   ```

3. **For converting to a specific decimal format**:
   ```typescript
   // Convert to 18 decimals format
   toWei(value, { targetDecimals: 18 })
   
   // Convert to 8 decimals format
   toWei(value, { targetDecimals: 8 })
   ```