/**
 * Simple decimal utility functions for handling network-specific decimal places
 * Replaces parseEther/formatEther with network-aware functions
 */

import { parseUnits, formatUnits } from 'ethers';

/**
 * Network decimal configuration
 */
const NETWORK_DECIMALS = {
  ETHEREUM: 18,
  HEDERA: 8
} as const;

/**
 * Detect current network and return appropriate decimal places
 * @returns number of decimal places for the current network
 */
function getNetworkDecimals(): number {
  // Check if we're in a browser environment with ethereum provider
  if (typeof window !== 'undefined' && window.ethereum?.chainId) {
    const chainId = window.ethereum.chainId;
    // Hedera testnet (0x128 = 296) and mainnet (0x129 = 297)
    if (chainId === '0x128' || chainId === '0x129') {
      return NETWORK_DECIMALS.HEDERA;
    }
  }
  
  // Default to Ethereum decimals
  return NETWORK_DECIMALS.ETHEREUM;
}

/**
 * Parse user input string to blockchain format (replaces parseEther)
 * @param input - User input string (e.g., "1.5")
 * @returns bigint value in blockchain format
 * @throws Error if input is invalid or parsing fails
 */
export function parseAmount(input: string): bigint {
  if (!input || input.trim() === '') {
    throw new Error('Input cannot be empty');
  }
  
  try {
    const decimals = getNetworkDecimals();
    return parseUnits(input.trim(), decimals);
  } catch (error) {
    // Enhance error message with more context
    throw new Error(`Failed to parse amount "${input}": ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Format blockchain amount to display string (replaces formatEther)
 * @param amount - Amount in blockchain format (bigint)
 * @returns formatted string for display
 * @throws Error if formatting fails
 */
export function formatAmount(amount: bigint): string {
  try {
    const decimals = getNetworkDecimals();
    return formatUnits(amount, decimals);
  } catch (error) {
    // Enhance error message with more context
    throw new Error(`Failed to format amount "${amount}": ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Safe format function that handles errors gracefully
 * @param amount - Amount in blockchain format (bigint)
 * @param fallbackValue - Optional custom fallback value to use if formatting fails
 * @returns formatted string or fallback value
 */
export function safeFormatAmount(amount: bigint, fallbackValue?: string): string {
  try {
    return formatAmount(amount);
  } catch (error) {
    // Log the error for debugging
    console.error('Error formatting amount:', error);
    
    // Return fallback value if provided
    if (fallbackValue !== undefined) {
      return fallbackValue;
    }
    
    // Otherwise try to use raw value, with additional error handling
    try {
      return amount.toString();
    } catch (innerError) {
      console.error('Error converting amount to string:', innerError);
      return 'Invalid amount';
    }
  }
}

/**
 * Parse amount with error handling
 * @param input - User input string
 * @param defaultValue - Optional default value to return if parsing fails (if provided, function won't throw)
 * @returns bigint value or throws descriptive error (or returns defaultValue if provided)
 */
export function safeParseAmount(input: string, defaultValue?: bigint): bigint {
  try {
    if (!input || input.trim() === '') {
      throw new Error('Input cannot be empty');
    }
    
    // Basic validation for number format
    const cleanInput = input.trim();
    if (!/^\d*\.?\d+$/.test(cleanInput)) {
      throw new Error('Invalid number format');
    }
    
    return parseAmount(cleanInput);
  } catch (error) {
    // If defaultValue is provided, return it instead of throwing
    if (defaultValue !== undefined) {
      console.error('Error parsing amount:', error);
      return defaultValue;
    }
    
    // Otherwise throw with a descriptive message
    throw new Error(`Invalid amount: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get current network decimal configuration
 * @returns object with decimals and network info
 */
export function getNetworkInfo(): { decimals: number; network: string } {
  const decimals = getNetworkDecimals();
  const network = decimals === NETWORK_DECIMALS.HEDERA ? 'Hedera' : 'Ethereum';
  
  return { decimals, network };
}

/**
 * Validates if a string is a valid number that can be parsed
 * @param input - String to validate
 * @returns Object with validation result and error message if invalid
 */
export function validateAmountInput(input: string): { isValid: boolean; errorMessage?: string } {
  if (!input || input.trim() === '') {
    return { isValid: false, errorMessage: 'Input cannot be empty' };
  }
  
  const cleanInput = input.trim();
  
  // Check for basic number format (allows decimals)
  if (!/^\d*\.?\d+$/.test(cleanInput)) {
    return { isValid: false, errorMessage: 'Invalid number format' };
  }
  
  // Check for reasonable number range
  try {
    const num = parseFloat(cleanInput);
    if (isNaN(num)) {
      return { isValid: false, errorMessage: 'Not a valid number' };
    }
    
    if (num < 0) {
      return { isValid: false, errorMessage: 'Amount cannot be negative' };
    }
    
    // Check if number is too large to safely handle
    if (num > Number.MAX_SAFE_INTEGER) {
      return { isValid: false, errorMessage: 'Amount is too large' };
    }
    
    return { isValid: true };
  } catch (error) {
    return { 
      isValid: false, 
      errorMessage: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * Format amount with limited decimal places for display
 * @param amount - Amount in blockchain format (bigint)
 * @param maxDecimals - Maximum decimal places to show (default: 6)
 * @param fallbackValue - Optional custom fallback value to use if formatting fails
 * @returns formatted string with limited decimals
 */
export function formatAmountForDisplay(amount: bigint, maxDecimals: number = 6, fallbackValue?: string): string {
  try {
    const formatted = formatAmount(amount);
    const num = parseFloat(formatted);
    
    // Handle zero case
    if (num === 0) {
      return '0';
    }
    
    // Handle very small numbers without scientific notation
    if (Math.abs(num) < Math.pow(10, -maxDecimals)) {
      return num.toFixed(maxDecimals).replace(/\.?0+$/, '');
    }
    
    // Format with max decimals and remove trailing zeros
    return num.toFixed(maxDecimals).replace(/\.?0+$/, '');
  } catch (error) {
    console.error('Error formatting amount for display:', error);
    
    // If fallback is provided, use it
    if (fallbackValue !== undefined) {
      return fallbackValue;
    }
    
    // Otherwise try to use safeFormatAmount as a fallback
    try {
      return safeFormatAmount(amount, 'Invalid amount');
    } catch (innerError) {
      console.error('Error in fallback formatting:', innerError);
      return 'Invalid amount';
    }
  }
}