'use client'

import { ReactNode } from 'react'
import { getCurrentNetworkInfo } from '../lib/wagmi'
import { clsx } from 'clsx'

interface EtherscanLinkProps {
  hash: string
  type?: 'tx' | 'address' | 'block'
  children?: ReactNode
  className?: string
  showIcon?: boolean
}

export function EtherscanLink({ 
  hash, 
  type = 'tx', 
  children, 
  className,
  showIcon = true 
}: EtherscanLinkProps) {
  const networkInfo = getCurrentNetworkInfo()

  const getExplorerUrl = () => {
    if (networkInfo.isLocal) {
      // For local development, return a placeholder or local explorer
      return `#local-${type}-${hash}`
    }
    
    // For Hedera testnet
    const baseUrl = 'https://hashscan.io/testnet'
    switch (type) {
      case 'tx':
        return `${baseUrl}/transaction/${hash}`
      case 'address':
        return `${baseUrl}/account/${hash}`
      case 'block':
        return `${baseUrl}/block/${hash}`
      default:
        return `${baseUrl}/transaction/${hash}`
    }
  }

  const getDisplayText = () => {
    if (children) return children
    
    switch (type) {
      case 'tx':
        return 'View Transaction'
      case 'address':
        return 'View Address'
      case 'block':
        return 'View Block'
      default:
        return 'View on Explorer'
    }
  }

  const handleClick = (e: React.MouseEvent) => {
    if (networkInfo.isLocal) {
      e.preventDefault()
      // For local development, show an alert or modal instead
      alert(`Local Development: ${type.toUpperCase()} Hash: ${hash}`)
      return
    }
  }

  return (
    <a
      href={getExplorerUrl()}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={clsx(
        'inline-flex items-center space-x-1 transition-colors',
        networkInfo.isLocal 
          ? 'text-gray-500 cursor-help' 
          : 'text-blue-600 hover:text-blue-800 hover:underline',
        className
      )}
      title={networkInfo.isLocal ? 'Local development - no block explorer available' : `View on ${networkInfo.network === 'hardhat' ? 'Local Explorer' : 'HashScan'}`}
    >
      <span>{getDisplayText()}</span>
      {showIcon && (
        <svg 
          className="w-3 h-3" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" 
          />
        </svg>
      )}
    </a>
  )
}

// Utility component for displaying transaction hashes with explorer links
export function TransactionHash({ 
  hash, 
  className,
  showFullHash = false 
}: { 
  hash: string
  className?: string
  showFullHash?: boolean 
}) {
  const formatHash = (hash: string) => {
    if (showFullHash) return hash
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`
  }

  return (
    <div className={clsx('flex items-center space-x-2', className)}>
      <code className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
        {formatHash(hash)}
      </code>
      <EtherscanLink 
        hash={hash} 
        type="tx"
        className="text-xs"
        showIcon={true}
      >
        View
      </EtherscanLink>
    </div>
  )
}

// Utility component for displaying addresses with explorer links
export function AddressLink({ 
  address, 
  className,
  showFullAddress = false,
  label
}: { 
  address: string
  className?: string
  showFullAddress?: boolean
  label?: string
}) {
  const formatAddress = (addr: string) => {
    if (showFullAddress) return addr
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  return (
    <div className={clsx('flex items-center space-x-2', className)}>
      {label && <span className="text-sm text-gray-600">{label}:</span>}
      <code className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
        {formatAddress(address)}
      </code>
      <EtherscanLink 
        hash={address} 
        type="address"
        className="text-xs"
        showIcon={true}
      >
        View
      </EtherscanLink>
    </div>
  )
}

// Component for immediate transaction feedback - shows as soon as hash is available
export function ImmediateTransactionFeedback({ 
  hash, 
  title = "Transaction Submitted",
  className 
}: { 
  hash: `0x${string}`
  title?: string
  className?: string 
}) {
  return (
    <div className={clsx(
      'bg-blue-50 border border-blue-200 rounded-lg p-4',
      className
    )}>
      <div className="flex items-center space-x-2 mb-2">
        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <h3 className="text-sm font-medium text-blue-900">{title}</h3>
      </div>
      
      <p className="text-sm text-blue-800 mb-3">
        Your transaction has been submitted to the blockchain and is being processed.
      </p>
      
      <div className="space-y-2">
        <div>
          <p className="text-xs text-blue-700 uppercase tracking-wide font-medium">Transaction Hash</p>
          <code className="text-xs font-mono text-blue-900 bg-blue-100 px-2 py-1 rounded block break-all">
            {hash}
          </code>
        </div>
        
        <EtherscanLink 
          hash={hash} 
          type="tx"
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          Track Transaction Progress →
        </EtherscanLink>
      </div>
    </div>
  )
}