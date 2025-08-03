# Design Document

## Overview

This design outlines the systematic removal of custom decimal handling code that was implemented for Hedera blockchain integration. Since the project has migrated to Fantom Sonic (which uses standard Ethereum-compatible 18-decimal formatting), all custom decimal handling logic needs to be removed and replaced with standard Ethereum patterns.

The migration involves removing Hedera-specific code, custom decimal utilities, and replacing them with standard web3 utilities that work seamlessly with Fantom Sonic's Ethereum-compatible structure.

## Architecture

### Current State Analysis

Based on codebase analysis, the following custom decimal handling components exist:

1. **Custom Decimal Utilities** (`scripts/decimal-utils.ts`)
   - Network-specific decimal detection (Hedera 8 decimals vs Ethereum 18 decimals)
   - Custom `parseAmount()` and `formatAmount()` functions
   - Hedera chain ID detection logic

2. **Token Formatter System** (referenced in tests)
   - `TokenFormatter` class with custom decimal handling
   - `DecimalConfig` class for network-specific configuration
   - Support for both Ethereum (18 decimals) and Hedera (8 decimals) formats

3. **NextJS Utils** (`nextjs-demo-ui/src/lib/utils.ts`)
   - Standard Ethereum utilities that are already compatible
   - Functions like `formatTokenAmount()`, `parseEth()`, `parseTokenAmount()`

4. **Configuration Files**
   - Hardhat config with Hedera testnet settings
   - Environment variables for Hedera network URLs
   - Package.json scripts for Hedera deployment

### Target State

After reversion, the system will use:

1. **Standard Web3 Utilities**
   - Native `parseUnits()` and `formatUnits()` from ethers.js with 18 decimals
   - Remove all network detection logic
   - Use consistent 18-decimal formatting throughout

2. **Simplified Token Handling**
   - Remove custom TokenFormatter and DecimalConfig classes
   - Use standard Ethereum decimal patterns
   - Eliminate Hedera-specific code paths

3. **Updated Configuration**
   - Remove Hedera network configurations
   - Update deployment scripts for Fantom Sonic
   - Clean up environment variables

## Components and Interfaces

### 1. Decimal Utilities Removal

**Files to Remove/Modify:**
- `scripts/decimal-utils.ts` - Remove entirely or replace with standard utilities
- `src/config/decimal-config.ts` - Remove entirely
- `src/config/token-formatter.ts` - Remove entirely

**Replacement Pattern:**
```typescript
// Instead of custom parseAmount/formatAmount
import { parseUnits, formatUnits } from 'ethers';

// Standard 18-decimal parsing
const amount = parseUnits(userInput, 18);

// Standard 18-decimal formatting  
const displayValue = formatUnits(amount, 18);
```

### 2. NextJS Utils Simplification

**Current Functions (Keep):**
- `formatTokenAmount()` - Already uses standard decimals parameter
- `parseTokenAmount()` - Already uses standard decimals parameter
- `formatEth()` - Already uses 18 decimals

**Functions to Update:**
- Remove any Hedera-specific logic if present
- Ensure all functions default to 18 decimals

### 3. Configuration Updates

**Hardhat Configuration:**
- Remove `hederaTestnet` network configuration
- Add Fantom Sonic network configuration
- Update deployment scripts

**Package.json Scripts:**
- Remove `deploy:hedera` and `demo:hedera` scripts
- Add Fantom Sonic equivalent scripts

**Environment Variables:**
- Remove `HEDERA_TESTNET_URL`
- Add Fantom Sonic RPC URL variables

## Data Models

### Token Amount Representation

**Before (Hedera-aware):**
```typescript
interface TokenAmount {
  value: bigint;
  decimals: number; // Could be 8 or 18
  network: 'Ethereum' | 'Hedera';
}
```

**After (Ethereum-standard):**
```typescript
interface TokenAmount {
  value: bigint;
  decimals: 18; // Always 18 for Fantom Sonic
}
```

### Network Configuration

**Remove:**
```typescript
const NETWORK_DECIMALS = {
  ETHEREUM: 18,
  HEDERA: 8
};
```

**Replace with:**
```typescript
const DECIMALS = 18; // Standard for Fantom Sonic
```

## Error Handling

### Decimal Conversion Errors

**Current Approach:**
- Network-specific error handling
- Different error messages for different decimal precisions

**New Approach:**
- Standard Ethereum error handling patterns
- Consistent error messages for 18-decimal operations
- Remove network detection error paths

### Validation Updates

**Remove:**
- Hedera-specific validation logic
- Network-dependent decimal validation

**Keep:**
- Standard number format validation
- Range checking for reasonable amounts
- Input sanitization

## Testing Strategy

Since tests are not required for this reversion, the focus will be on:

1. **Code Removal Verification**
   - Ensure all Hedera-specific code is removed
   - Verify no broken imports or references remain

2. **Functionality Preservation**
   - Ensure existing Ethereum-compatible functions continue working
   - Verify UI components still display amounts correctly

3. **Configuration Validation**
   - Confirm deployment scripts work with new network configuration
   - Verify environment variables are properly updated

## Implementation Approach

### Phase 1: Remove Custom Decimal System
1. Delete custom decimal utility files
2. Remove TokenFormatter and DecimalConfig classes
3. Update imports throughout codebase

### Phase 2: Update Configuration
1. Remove Hedera network configurations
2. Add Fantom Sonic network settings
3. Update deployment scripts and package.json

### Phase 3: Code Cleanup
1. Remove Hedera-specific references in comments and documentation
2. Update README and documentation files
3. Clean up any remaining Hedera artifacts

### Phase 4: Verification
1. Ensure all imports resolve correctly
2. Verify no Hedera-specific code remains
3. Test that standard Ethereum utilities work as expected

## Migration Benefits

1. **Simplified Codebase**: Removes complex network detection and dual-decimal support
2. **Standard Patterns**: Uses well-established Ethereum decimal handling
3. **Better Compatibility**: Full compatibility with Fantom Sonic's Ethereum-like structure
4. **Reduced Maintenance**: Eliminates custom decimal handling code that needs maintenance
5. **Cleaner Architecture**: Removes abstraction layers that are no longer needed