import { formatUnits, parseUnits } from 'viem';

/**
 * Get current network decimal configuration
 * @returns object with decimals and network info
 */
export function getNetworkInfo(): { decimals: number; network: string } {
  // Check if we're in a browser environment with ethereum provider
  if (typeof window !== 'undefined' && window.ethereum?.chainId) {
    const chainId = window.ethereum.chainId;
    // Hedera testnet (0x128 = 296) and mainnet (0x129 = 297)
    if (chainId === '0x128' || chainId === '0x129') {
      return { decimals: 8, network: 'Hedera' };
    }
  }

  // Default to Ethereum
  return { decimals: 18, network: 'Ethereum' };
}

/**
 * Convert wei/tinybar to ETH/HBAR
 * 
 * @param value - Value in blockchain format (wei/tinybar as bigint)
 * @param options - Formatting options
 * @param options.includeUnits - Whether to include currency units (default: true)
 * @param options.maxDecimals - Maximum decimal places to show (default: 4)
 * @param options.sourceDecimals - Source decimal places (default: auto-detected from network)
 * @returns Formatted string with appropriate display value
 * 
 * @example
 * // Convert wei to ETH with units (auto-detects network decimals)
 * fromWei(BigInt("1000000000000000000")) // "1 ETH"
 * 
 * // Convert tinybar to HBAR without units
 * fromWei(BigInt("100000000"), { includeUnits: false }) // "1"
 * 
 * // Force 18 decimals for a value regardless of network
 * fromWei(BigInt("1000000000000000000"), { sourceDecimals: 18 }) // "1 ETH" or "1 HBAR"
 */
export function fromWei(
  value: bigint,
  options: {
    includeUnits?: boolean;
    maxDecimals?: number;
    sourceDecimals?: number;
  } = {}
): string {
  const { decimals, network } = getNetworkInfo();
  const {
    includeUnits = true,
    maxDecimals = 4,
    sourceDecimals = decimals
  } = options;

  // Handle null or undefined values
  if (value === undefined || value === null) {
    return includeUnits ? `0 ${network === 'Hedera' ? 'HBAR' : 'ETH'}` : '0';
  }

  // Convert to decimal string using viem's formatUnits with the specified source decimals
  const formattedValue = formatUnits(value, sourceDecimals);

  // Parse as float for formatting
  const numValue = parseFloat(formattedValue);

  let displayValue: string;

  // Format the number based on its value
  if (numValue === 0) {
    displayValue = '0';
  } else if (numValue < 0.0001 && numValue > 0) {
    // Very small values
    displayValue = '<0.0001';
  } else {
    // Normal values - format with specified decimals and trim trailing zeros
    displayValue = numValue.toFixed(maxDecimals).replace(/\.?0+$/, '');
    // If we removed all decimals and just have a dot at the end, remove it
    if (displayValue.endsWith('.')) {
      displayValue = displayValue.slice(0, -1);
    }
  }

  // Add units if requested
  if (includeUnits) {
    const unit = network === 'Hedera' ? 'HBAR' : 'ETH';
    return `${displayValue} ${unit}`;
  }

  return displayValue;
}

/**
 * Convert ETH/HBAR to wei/tinybar
 * 
 * @param value - Value in ETH/HBAR as string
 * @param options - Conversion options
 * @param options.targetDecimals - Target decimal places (default: auto-detected from network)
 * @returns bigint value in wei/tinybar
 * 
 * @example
 * // Convert ETH to wei (auto-detects network decimals)
 * toWei("1.5") // BigInt("1500000000000000000")
 * 
 * // Force conversion to 18 decimals regardless of network
 * toWei("1.5", { targetDecimals: 18 }) // BigInt("1500000000000000000")
 */
export function toWei(
  value: string,
  options: {
    targetDecimals?: number;
  } = {}
): bigint {
  const { decimals } = getNetworkInfo();
  const { targetDecimals = decimals } = options;


  // Handle empty values
  if (!value || value.trim() === '') {
    return BigInt(0);
  }

  try {
    // Manual implementation to replace parseUnits
    // First, clean the input value
    const cleanValue = value.trim();

    // Check if the value is a valid number
    if (!/^\d*\.?\d*$/.test(cleanValue)) {
      throw new Error('Invalid number format');
    }

    // Split the value into integer and decimal parts
    const [integerPart, decimalPart = ''] = cleanValue.split('.');

    // Calculate the integer component
    let result = BigInt(integerPart || '0');

    // Multiply by 10^targetDecimals
    for (let i = 0; i < targetDecimals; i++) {
      result *= BigInt(10);
    }

    // Add the decimal component if it exists
    if (decimalPart) {
      // Pad or truncate decimal part to match target decimals
      const paddedDecimal = decimalPart.padEnd(targetDecimals, '0').slice(0, targetDecimals);
      // Convert decimal part to BigInt and add to result
      const decimalValue = BigInt(paddedDecimal);
      result += decimalValue;
    }

    console.log(`Converted ${value} to ${result} with ${targetDecimals} decimals`);
    return result;
  } catch (error) {
    console.error('Error converting to wei/tinybar:', error);
    return BigInt(0);
  }
}

/**
 * Format token quantities (like max supply) without decimal conversion
 * @param value - Token quantity (bigint)
 * @returns Formatted string representing the exact token quantity
 */
export function formatTokenQuantity(value: bigint): string {
  return value.toString();
}

/**
 * Format ETH/HBAR values with appropriate precision and units
 * This is a compatibility function that uses fromWei internally
 * 
 * @param value - Value in blockchain format (bigint)
 * @param options - Formatting options
 * @param options.maxDecimals - Maximum decimal places to show (default: 4)
 * @param options.showUnit - Whether to show the currency unit (default: true)
 * @param options.compact - Whether to use compact notation for large numbers (default: false)
 * @param options.sourceDecimals - Source decimal places (default: network decimals)
 * @returns Formatted string with appropriate currency unit
 */
export function formatETHValue(
  value: bigint,
  options: {
    maxDecimals?: number;
    showUnit?: boolean;
    compact?: boolean;
    sourceDecimals?: number;
  } = {}
): string {
  const { maxDecimals = 4, showUnit = true } = options;

  // Use our new fromWei function
  return fromWei(value, {
    includeUnits: showUnit,
    maxDecimals,
    sourceDecimals: options.sourceDecimals
  });
}