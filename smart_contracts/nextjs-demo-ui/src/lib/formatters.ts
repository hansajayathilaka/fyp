import { formatEther, parseEther } from 'viem'

interface FromWeiOptions {
  includeUnits?: boolean
  maxDecimals?: number
  sourceDecimals?: number
}

/**
 * Convert wei to ETH/token units with formatting options
 */
export function fromWei(value: string | bigint, options: FromWeiOptions = {}): string {
  try {
    const {
      includeUnits = true,
      maxDecimals = 4,
      sourceDecimals = 18
    } = options

    const bigIntValue = BigInt(value)
    
    // Convert from wei to decimal
    const ethValue = formatEther(bigIntValue)
    const numValue = parseFloat(ethValue)
    
    // Format with specified decimal places
    const formattedValue = numValue.toFixed(maxDecimals)
    
    // Remove trailing zeros and unnecessary decimal point
    const cleanValue = parseFloat(formattedValue).toString()
    
    // Add units if requested
    return includeUnits ? `${cleanValue} ETH` : cleanValue
  } catch (error) {
    console.error('Error converting from wei:', error)
    return includeUnits ? '0 ETH' : '0'
  }
}

/**
 * Convert ETH/token units to wei
 */
export function toWei(value: string): bigint {
  try {
    return parseEther(value)
  } catch (error) {
    console.error('Error converting to wei:', error)
    return 0n
  }
}

/**
 * Format a number for display with specified decimal places
 */
export function formatNumber(value: string | number, decimals: number = 4): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '0'
  
  // Format with specified decimal places and remove trailing zeros
  const formatted = num.toFixed(decimals)
  return parseFloat(formatted).toString()
}

/**
 * Format an address for display (truncated)
 */
export function formatAddress(address: string): string {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

/**
 * Format token quantity for display
 */
export function formatTokenQuantity(quantity: string | number | bigint, decimals: number = 4): string {
  try {
    let numValue: number
    
    if (typeof quantity === 'bigint') {
      // Convert from wei to decimal
      const ethValue = formatEther(quantity)
      numValue = parseFloat(ethValue)
    } else if (typeof quantity === 'string') {
      numValue = parseFloat(quantity)
    } else {
      numValue = quantity
    }
    
    if (isNaN(numValue)) return '0'
    
    // Format with specified decimal places and remove trailing zeros
    const formatted = numValue.toFixed(decimals)
    return parseFloat(formatted).toString()
  } catch (error) {
    console.error('Error formatting token quantity:', error)
    return '0'
  }
}

/**
 * Format a number with thousands separators and limited decimals
 */
export function formatNumberWithCommas(value: string | number | bigint, decimals: number = 4): string {
  try {
    let numValue: number
    
    if (typeof value === 'bigint') {
      const ethValue = formatEther(value)
      numValue = parseFloat(ethValue)
    } else if (typeof value === 'string') {
      numValue = parseFloat(value)
    } else {
      numValue = value
    }
    
    if (isNaN(numValue)) return '0'
    
    // Format with specified decimal places
    const formatted = numValue.toFixed(decimals)
    const cleanValue = parseFloat(formatted)
    
    // Add thousands separators
    return cleanValue.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals
    })
  } catch (error) {
    console.error('Error formatting number with commas:', error)
    return '0'
  }
}

/**
 * Get network information
 */
export function getNetworkInfo() {
  return {
    name: 'Sonic Testnet',
    chainId: 57054,
    currency: 'ETH',
    blockExplorer: 'https://testnet.sonicscan.org'
  }
}