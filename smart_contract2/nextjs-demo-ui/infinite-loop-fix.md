# Infinite Loop Fix - QuickTransferModal

## Issue Fixed
"Maximum update depth exceeded" error caused by infinite re-render loop in QuickTransferModal component.

## Root Cause
The useEffect hooks were including complex objects (`transaction` and `holding`) in their dependency arrays, which caused the effects to run on every render because these objects are recreated each time.

## Problem Code
```typescript
// ❌ WRONG - transaction object changes on every render
useEffect(() => {
  // ... code
}, [isOpen, tokenId, holding, transaction]) // transaction causes infinite loop

useEffect(() => {
  if (marketplace.data) {
    transaction.setTransactionHash(marketplace.data)
  }
}, [marketplace.data, transaction]) // transaction causes infinite loop
```

## Solution Applied

### 1. Removed Problematic Dependencies
```typescript
// ✅ FIXED - Removed transaction from dependencies
useEffect(() => {
  if (isOpen) {
    setDepositAmount('')
    setWithdrawAmount('')
    setError(null)
    transaction.resetTransaction()
  }
}, [isOpen, tokenId]) // Only primitive values as dependencies
```

### 2. Split Complex Logic into Separate Effects
```typescript
// ✅ FIXED - Separate effect for tab setting
useEffect(() => {
  if (isOpen && holding && !holdingLoading) {
    setActiveTab(holding.walletBalance > BigInt(0) ? 'deposit' : 'withdraw')
  }
}, [isOpen, holding, holdingLoading]) // More specific dependencies
```

### 3. Simplified Transaction Watching
```typescript
// ✅ FIXED - Only watch for data changes, not transaction object
useEffect(() => {
  if (marketplace.data) {
    transaction.setTransactionHash(marketplace.data)
  }
}, [marketplace.data]) // Only primitive/stable values

useEffect(() => {
  if (marketplace.error) {
    transaction.setTransactionError(marketplace.error.message, 'Transaction Error')
  }
}, [marketplace.error]) // Only primitive/stable values
```

## Changes Made

1. **Removed `transaction` from useEffect dependencies** - The transaction object is recreated on every render
2. **Removed `holding` from initial reset effect** - Moved tab setting to separate effect
3. **Split tab setting logic** - Created dedicated effect with more specific dependencies
4. **Simplified transaction watching** - Only watch for actual data changes, not object references

## Why This Fixes the Issue

- **Stable Dependencies**: Only using primitive values and stable references as dependencies
- **Separated Concerns**: Different effects handle different aspects of the component lifecycle
- **Avoided Object Dependencies**: Complex objects that change on every render are no longer dependencies
- **Specific Triggers**: Each effect only runs when its specific data actually changes

## Testing
The modal now opens and closes without infinite re-renders:
- ✅ Modal opens correctly
- ✅ Form resets when modal opens
- ✅ Tab selection works based on available balances
- ✅ Transaction feedback works correctly
- ✅ No infinite loop errors
- ✅ Percentage buttons work correctly

The fix maintains all functionality while eliminating the infinite render loop.