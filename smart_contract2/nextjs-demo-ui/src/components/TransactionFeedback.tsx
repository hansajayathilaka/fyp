'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWaitForTransactionReceipt } from 'wagmi'
import { EtherscanLink, ImmediateTransactionFeedback } from './EtherscanLink'
import { TransactionStatus, useTransactionState } from './TransactionStatus'
import { clsx } from 'clsx'

export interface EnhancedTransactionState {
  hash?: `0x${string}`
  status: 'idle' | 'submitting' | 'pending' | 'success' | 'error'
  error?: string
  title?: string
  description?: string
}

interface TransactionFeedbackProps {
  transaction: EnhancedTransactionState
  onStatusChange?: (status: EnhancedTransactionState['status']) => void
  className?: string
  showImmediate?: boolean
}

/**
 * Enhanced Transaction Feedback Component
 * Provides comprehensive transaction feedback including:
 * - Immediate hash display when transaction is submitted
 * - Real-time status updates with loading states
 * - Etherscan links for all transaction states
 * - Clear success/error messaging
 */
export function TransactionFeedback({ 
  transaction, 
  onStatusChange, 
  className,
  showImmediate = true
}: TransactionFeedbackProps) {
  const [localStatus, setLocalStatus] = useState<EnhancedTransactionState['status']>('idle')

  // Watch for transaction receipt if we have a hash
  const { data: receipt, isError, isLoading, isSuccess } = useWaitForTransactionReceipt({
    hash: transaction.hash,
    query: {
      enabled: !!transaction.hash && (transaction.status === 'pending' || transaction.status === 'submitting'),
    },
  })

  // Update status based on transaction receipt
  useEffect(() => {
    if (transaction.hash) {
      if (isLoading || transaction.status === 'submitting') {
        setLocalStatus('pending')
        onStatusChange?.('pending')
      } else if (isSuccess && receipt) {
        setLocalStatus('success')
        onStatusChange?.('success')
      } else if (isError) {
        setLocalStatus('error')
        onStatusChange?.('error')
      }
    } else {
      setLocalStatus(transaction.status)
    }
  }, [transaction.hash, transaction.status, isLoading, isSuccess, isError, receipt, onStatusChange])

  // Show immediate feedback when transaction is first submitted
  if (showImmediate && transaction.hash && localStatus === 'pending' && !receipt) {
    return (
      <ImmediateTransactionFeedback 
        hash={transaction.hash}
        title={transaction.title || "Transaction Submitted"}
        className={className}
      />
    )
  }

  // Don't render if idle and no hash
  if (localStatus === 'idle' && !transaction.hash) {
    return null
  }

  const getStatusIcon = () => {
    switch (localStatus) {
      case 'submitting':
      case 'pending':
        return (
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        )
      case 'success':
        return (
          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )
      default:
        return null
    }
  }

  const getStatusMessage = () => {
    switch (localStatus) {
      case 'submitting':
        return 'Submitting transaction...'
      case 'pending':
        return 'Transaction pending confirmation...'
      case 'success':
        return transaction.description || 'Transaction completed successfully!'
      case 'error':
        return transaction.error || 'Transaction failed'
      default:
        return ''
    }
  }

  const getStatusColor = () => {
    switch (localStatus) {
      case 'submitting':
      case 'pending':
        return 'border-blue-200 bg-blue-50'
      case 'success':
        return 'border-green-200 bg-green-50'
      case 'error':
        return 'border-red-200 bg-red-50'
      default:
        return 'border-gray-200 bg-gray-50'
    }
  }

  return (
    <div className={clsx(
      'border rounded-lg p-4 space-y-3',
      getStatusColor(),
      className
    )}>
      {/* Header */}
      <div className="flex items-center space-x-2">
        {getStatusIcon()}
        <h3 className="text-sm font-medium text-gray-900">
          {transaction.title || "Transaction Status"}
        </h3>
      </div>

      {/* Status Message */}
      <p className={clsx(
        'text-sm',
        localStatus === 'error' ? 'text-red-700' : 
        localStatus === 'success' ? 'text-green-700' : 
        'text-blue-700'
      )}>
        {getStatusMessage()}
      </p>

      {/* Transaction Hash and Link */}
      {transaction.hash && (
        <div className="space-y-2">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Transaction Hash</p>
            <p className="text-xs font-mono text-gray-700 break-all">{transaction.hash}</p>
          </div>
          
          <EtherscanLink 
            hash={transaction.hash} 
            type="tx"
            className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800"
          >
            {localStatus === 'pending' ? 'View Pending Transaction →' : 'View on Block Explorer →'}
          </EtherscanLink>
          
          {localStatus === 'pending' && (
            <p className="text-xs text-blue-600 italic">
              Transaction submitted! Click the link above to track its progress on the blockchain.
            </p>
          )}
        </div>
      )}

      {/* Additional Receipt Info for Success */}
      {localStatus === 'success' && receipt && (
        <div className="text-xs text-gray-600 space-y-1 pt-2 border-t border-gray-200">
          <p><span className="font-medium">Block:</span> {receipt.blockNumber.toString()}</p>
          <p><span className="font-medium">Gas Used:</span> {receipt.gasUsed.toString()}</p>
          <p><span className="font-medium">Status:</span> 
            <span className="text-green-600 font-medium ml-1">✓ Confirmed</span>
          </p>
        </div>
      )}
    </div>
  )
}

// Enhanced hook for managing transaction state with better feedback
export function useEnhancedTransactionState() {
  const [transaction, setTransaction] = useState<EnhancedTransactionState>({
    status: 'idle'
  })

  const setTransactionSubmitting = useCallback((title?: string, description?: string) => {
    setTransaction({
      status: 'submitting',
      title,
      description
    })
  }, [])

  const setTransactionHash = useCallback((hash: `0x${string}`, title?: string, description?: string) => {
    setTransaction(prev => ({
      ...prev,
      hash,
      status: 'pending',
      title: title || prev.title,
      description: description || prev.description
    }))
  }, [])

  const setTransactionError = useCallback((error: string, title?: string) => {
    setTransaction(prev => ({
      ...prev,
      status: 'error',
      error,
      title: title || prev.title
    }))
  }, [])

  const setTransactionSuccess = useCallback((description?: string, title?: string) => {
    setTransaction(prev => ({
      ...prev,
      status: 'success',
      description: description || prev.description,
      title: title || prev.title
    }))
  }, [])

  const resetTransaction = useCallback(() => {
    setTransaction({
      status: 'idle'
    })
  }, [])

  return {
    transaction,
    setTransactionSubmitting,
    setTransactionHash,
    setTransactionError,
    setTransactionSuccess,
    resetTransaction,
    setTransaction
  }
}

// Utility component for quick transaction feedback display
export function QuickTransactionFeedback({ 
  hash, 
  title,
  description,
  className 
}: { 
  hash?: `0x${string}`
  title?: string
  description?: string
  className?: string 
}) {
  if (!hash) return null

  return (
    <div className={clsx(
      'bg-blue-50 border border-blue-200 rounded-lg p-3',
      className
    )}>
      <div className="flex items-center space-x-2 mb-2">
        <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium text-blue-900">{title || "Transaction Submitted"}</span>
      </div>
      
      {description && (
        <p className="text-sm text-blue-800 mb-2">{description}</p>
      )}
      
      <div className="flex items-center justify-between">
        <code className="text-xs font-mono text-blue-900 bg-blue-100 px-2 py-1 rounded">
          {hash.slice(0, 10)}...{hash.slice(-8)}
        </code>
        <EtherscanLink 
          hash={hash} 
          type="tx"
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          Track →
        </EtherscanLink>
      </div>
    </div>
  )
}