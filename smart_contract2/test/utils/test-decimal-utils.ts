/**
 * Test utilities for decimal handling
 * Provides replacements for ethers.parseEther and ethers.formatEther
 * that are network-aware
 */

import { parseAmount, formatAmount } from '../../src/utils/decimal-utils';
import { ethers } from 'hardhat';

/**
 * Network-aware replacement for ethers.parseEther
 * @param value - String value to parse
 * @returns bigint value in the correct decimal format for the network
 */
export function parseEther(value: string): bigint {
  return parseAmount(value);
}

/**
 * Network-aware replacement for ethers.formatEther
 * @param value - BigInt value to format
 * @returns string representation with correct decimal places
 */
export function formatEther(value: bigint): string {
  return formatAmount(value);
}

/**
 * Provides ethers with network-aware parseEther and formatEther
 * Use this as a drop-in replacement for ethers in test files
 */
export const networkAwareEthers = {
  ...ethers,
  parseEther,
  formatEther
};