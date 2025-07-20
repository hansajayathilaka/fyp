import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { getBlockExplorerUrl } from './wagmi'

// Utility function for combining Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format address for display (show first 6 and last 4 characters)
export function formatAddress(address: string): string {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

// Format large numbers with appropriate units
export function formatNumber(value: bigint | number, decimals: number = 18): string {
  const num = typeof value === 'bigint' ? Number(value) / Math.pow(10, decimals) : value
  
  if (num >= 1e9) {
    return `${(num / 1e9).toFixed(2)}B`
  } else if (num >= 1e6) {
    return `${(num / 1e6).toFixed(2)}M`
  } else if (num >= 1e3) {
    return `${(num / 1e3).toFixed(2)}K`
  } else {
    return num.toFixed(2)
  }
}

// Format ETH values
export function formatEth(value: bigint): string {
  return formatNumber(value, 18)
}

// Format token amounts (assuming 18 decimals for most tokens)
export function formatTokenAmount(value: bigint, decimals: number = 18): string {
  return formatNumber(value, decimals)
}

// Convert ETH string to wei (bigint)
export function parseEth(value: string): bigint {
  const num = parseFloat(value)
  return BigInt(Math.floor(num * Math.pow(10, 18)))
}

// Convert token amount string to smallest unit
export function parseTokenAmount(value: string, decimals: number = 18): bigint {
  const num = parseFloat(value)
  return BigInt(Math.floor(num * Math.pow(10, decimals)))
}

// Format timestamp to readable date
export function formatTimestamp(timestamp: bigint): string {
  const date = new Date(Number(timestamp) * 1000)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
}

// Generate Etherscan/block explorer link
export function generateExplorerLink(hash: string, type: 'tx' | 'address' = 'tx'): string {
  return getBlockExplorerUrl(hash, type)
}

// Validate Ethereum address
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

// Truncate text with ellipsis
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

// Calculate percentage
export function calculatePercentage(value: bigint, total: bigint): number {
  if (total === BigInt(0)) return 0
  return Number((value * BigInt(100)) / total)
}

// Format percentage
export function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`
}

// Sleep utility for delays
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Copy text to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    return false
  }
}

// Generate random ID
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

// Debounce function
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Format user type for display
export function formatUserType(userType: 0 | 1 | 'Individual' | 'Company'): string {
  if (typeof userType === 'number') {
    return userType === 0 ? 'Individual' : 'Company'
  }
  return userType
}

// Format order type for display
export function formatOrderType(orderType: 0 | 1 | 'BUY' | 'SELL'): string {
  if (typeof orderType === 'number') {
    return orderType === 0 ? 'BUY' : 'SELL'
  }
  return orderType
}

// Format order status for display
export function formatOrderStatus(status: 0 | 1 | 2 | 'ACTIVE' | 'FILLED' | 'CANCELLED'): string {
  if (typeof status === 'number') {
    switch (status) {
      case 0: return 'ACTIVE'
      case 1: return 'FILLED'
      case 2: return 'CANCELLED'
      default: return 'UNKNOWN'
    }
  }
  return status
}

// Get status color for UI
export function getStatusColor(status: string): string {
  switch (status.toUpperCase()) {
    case 'ACTIVE': return 'text-green-600'
    case 'FILLED': return 'text-blue-600'
    case 'CANCELLED': return 'text-red-600'
    case 'VERIFIED': return 'text-green-600'
    case 'SUSPENDED': return 'text-red-600'
    default: return 'text-gray-600'
  }
}

// Get order type color for UI
export function getOrderTypeColor(orderType: string): string {
  switch (orderType.toUpperCase()) {
    case 'BUY': return 'text-green-600'
    case 'SELL': return 'text-red-600'
    default: return 'text-gray-600'
  }
}

// Validate positive number input
export function validatePositiveNumber(value: string): boolean {
  const num = parseFloat(value)
  return !isNaN(num) && num > 0
}

// Format price with currency symbol
export function formatPrice(value: bigint, symbol: string = 'ETH'): string {
  return `${formatEth(value)} ${symbol}`
}

// Calculate trade value
export function calculateTradeValue(amount: bigint, price: bigint): bigint {
  return (amount * price) / BigInt(Math.pow(10, 18))
}