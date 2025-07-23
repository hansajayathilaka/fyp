# toWei Usage Update Summary

## Overview

I've updated the application to use the `toWei` function directly when converting ETH/HBAR values to wei/tinybar for sending to contracts, instead of using the `parseAmount` function.

## Key Changes

### 1. Updated Portfolio Page

```typescript
// Before
const depositValue = parseAmount(depositAmount)

// After
const depositValue = toWei(depositAmount)
```

### 2. Updated Marketplace Page

```typescript
// Before
const value = parseAmount(depositAmount)
const amount = parseAmount(withdrawAmount)
const price = parseAmount(orderForm.price)

// After
const value = toWei(depositAmount)
const amount = toWei(withdrawAmount)
const price = toWei(orderForm.price)
```

### 3. Updated ETHDepositForm Component

```typescript
// Before
const amount = parseAmount(depositAmount, inputFormat)

// After
const amount = inputFormat === 'token' 
  ? toWei(depositAmount)
  : BigInt(depositAmount.trim())
```

### 4. Updated Tokens Page

```typescript
// Before
const initialPrice = parseAmount(createForm.initialPrice)

// After
const initialPrice = toWei(createForm.initialPrice)
```

## Benefits

1. **Direct Conversion**: Using `toWei` directly makes it clear that we're converting from ETH/HBAR to wei/tinybar
2. **Simplified Code**: Removes an unnecessary abstraction layer
3. **Consistent API**: All conversions now use the same pattern

## Usage Guidelines

1. **For sending values to contracts**:
   ```typescript
   // Convert user input (ETH/HBAR) to blockchain format (wei/tinybar)
   const value = toWei(userInput)
   contract.deposit(value)
   ```

2. **For displaying values from contracts**:
   ```typescript
   // Convert blockchain format (wei/tinybar) to user-friendly format (ETH/HBAR)
   const displayValue = fromWei(contractValue)
   ```

3. **For handling both formats** (like in ETHDepositForm):
   ```typescript
   const value = inputFormat === 'token' 
     ? toWei(userInput)
     : BigInt(userInput.trim())
   ```