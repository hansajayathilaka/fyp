/**
 * Browser-compatible decimal utility functions for handling network-specific decimal places
 * Replaces parseEther/formatEther with network-aware functions
 */

import { toWei, fromWei, getNetworkInfo } from './formatters';

/**
 * Input format types for crypto values
 */
export type CryptoInputFormat = 'token' | 'wei'; // token = ETH/HBAR, wei = wei/tinybar

/**
 * Parse user input string to blockchain format (replaces parseEther)
 * @param input - User input string (e.g., "1.5")
 * @param format - Input format ('token' for ETH/HBAR or 'wei' for wei/tinybar)
 * @param targetDecimals - Optional target decimal places (default: auto-detected from network)
 * @returns bigint value in blockchain format
 */
export function parseAmount(
  input: string, 
  format: CryptoInputFormat = 'token',
  targetDecimals?: number
): bigint {
  // If input is already in wei/tinybar format, convert directly to bigint
  if (format === 'wei') {
    // Ensure the input is a valid integer
    if (!/^\d+$/.test(input.trim())) {
      throw new Error('Wei/tinybar values must be integers');
    }
    return BigInt(input.trim());
  }
  
  // Otherwise parse as ETH/HBAR with appropriate decimals
  return toWei(input, { targetDecimals });
}

/**
 * Parse token quantity without applying decimal conversion
 * For values like token amounts that should be whole numbers
 * @param input - User input string (e.g., "1000")
 * @returns bigint value without decimal conversion
 */
export function parseTokenQuantity(input: string): bigint {
  // Convert directly to bigint without decimal conversion
  return BigInt(input);
}

/**
 * Format blockchain amount to display string (replaces formatEther)
 * @param amount - Amount in blockchain format (bigint)
 * @param sourceDecimals - Optional source decimal places (default: auto-detected from network)
 * @returns formatted string for display
 */
export function formatAmount(amount: bigint, sourceDecimals?: number): string {
  return fromWei(amount, { includeUnits: false, sourceDecimals });
}

/**
 * Safe format function that handles errors gracefully
 * @param amount - Amount in blockchain format (bigint)
 * @param sourceDecimals - Optional source decimal places (default: auto-detected from network)
 * @returns formatted string or fallback value
 */
export function safeFormatAmount(amount: bigint, sourceDecimals?: number): string {
  try {
    return formatAmount(amount, sourceDecimals);
  } catch (error) {
    // Return raw value as fallback
    return amount.toString();
  }
}

/**
 * Parse amount with error handling
 * @param input - User input string
 * @param format - Input format ('token' for ETH/HBAR or 'wei' for wei/tinybar)
 * @param targetDecimals - Optional target decimal places (default: auto-detected from network)
 * @returns bigint value or throws descriptive error
 */
export function safeParseAmount(
  input: string, 
  format: CryptoInputFormat = 'token',
  targetDecimals?: number
): bigint {
  try {
    if (!input || input.trim() === '') {
      throw new Error('Input cannot be empty');
    }
    
    const cleanInput = input.trim();
    
    // Different validation based on format
    if (format === 'wei') {
      // Wei/tinybar must be integers
      if (!/^\d+$/.test(cleanInput)) {
        throw new Error('Wei/tinybar values must be integers');
      }
    } else {
      // Token values can have decimals
      if (!/^\d*\.?\d+$/.test(cleanInput)) {
        throw new Error('Invalid number format');
      }
    }
    
    return parseAmount(cleanInput, format, targetDecimals);
  } catch (error) {
    throw new Error(`Invalid amount: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Ensure values are in the correct format for the current network
 * @param amount - Amount in blockchain format (bigint)
 * @param sourceDecimals - Source decimals (defaults to 18 for Ethereum values)
 * @returns amount adjusted for the current network
 */
export function normalizeAmount(amount: bigint | undefined | null, sourceDecimals: number = 18): bigint {
  if (amount === undefined || amount === null) {
    return BigInt(0);
  }
  
  const { decimals: targetDecimals } = getNetworkInfo();
  
  // If source and target are the same, no conversion needed
  if (sourceDecimals === targetDecimals) {
    return amount;
  }
  
  // Convert from source to target decimals
  if (sourceDecimals < targetDecimals) {
    // Need to multiply to increase precision
    // Use BigInt.pow() workaround for exponentiation
    let factor = BigInt(1);
    for (let i = 0; i < targetDecimals - sourceDecimals; i++) {
      factor *= BigInt(10);
    }
    return amount * factor;
  } else {
    // Need to divide to decrease precision
    // Use BigInt.pow() workaround for exponentiation
    let factor = BigInt(1);
    for (let i = 0; i < sourceDecimals - targetDecimals; i++) {
      factor *= BigInt(10);
    }
    return amount / factor;
  }
}

/**
 * Format amount with limited decimal places for display
 * @param amount - Amount in blockchain format (bigint)
 * @param maxDecimals - Maximum decimal places to show (default: 6)
 * @param sourceDecimals - Optional source decimal places (default: auto-detected from network)
 * @returns formatted string with limited decimals
 */
export function formatAmountForDisplay(
  amount: bigint, 
  maxDecimals: number = 6,
  sourceDecimals?: number
): string {
  return fromWei(amount, { 
    includeUnits: false, 
    maxDecimals,
    sourceDecimals
  });
}