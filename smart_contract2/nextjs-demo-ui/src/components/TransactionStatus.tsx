'use client'

import { useState, useEffect } from 'react'
import { useWaitForTransactionReceipt } from 'wagmi'
import { EtherscanLink } from './EtherscanLink'
import { clsx } from 'clsx'

export interface TransactionState {
  hash?: `0x${string}`
  status: 'idle' | 'pending' | 'success' | 'error'
  error?: string
}

interface TransactionStatusProps {
  transaction: TransactionState
  onStatusChange?: (status: TransactionState['status']) => void
  title?: string
  successMessage?: string
  className?: string
}

export function TransactionStatus({ 
  transaction, 
  onStatusChange, 
  title = "Transaction Status",
  successMessage = "Transaction completed successfully!",
  className 
}: TransactionStatusProps) {
  const [localStatus, setLocalStatus] = useState<TransactionState['status']>('idle')

  // Watch for transaction receipt if we have a hash
  const { data: receipt, isError, isLoading, isSuccess } = useWaitForTransactionReceipt({
    hash: transaction.hash,
    query: {
      enabled: !!transaction.hash && transaction.status === 'pending',
    },
  })

  // Update status based on transaction receipt
  useEffect(() => {
    if (transaction.hash) {
      if (isLoading) {
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

  // Don't render if idle and no hash
  if (localStatus === 'idle' && !transaction.hash) {
    return null
  }

  const getStatusIcon = () => {
    switch (localStatus) {
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
      case 'pending':
        return 'Transaction submitted and pending confirmation...'
      case 'success':
        return successMessage
      case 'error':
        return transaction.error || 'Transaction failed'
      default:
        return ''
    }
  }

  const getStatusColor = () => {
    switch (localStatus) {
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
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>
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
        <div className="text-xs text-gray-600 space-y-1">
          <p>Block: {receipt.blockNumber.toString()}</p>
          <p>Gas Used: {receipt.gasUsed.toString()}</p>
          {receipt.status === 'success' && (
            <p className="text-green-600 font-medium">✓ Confirmed</p>
          )}
        </div>
      )}
    </div>
  )
}

// Hook for managing transaction state
export function useTransactionState() {
  const [transaction, setTransaction] = useState<TransactionState>({
    status: 'idle'
  })

  const setTransactionHash = (hash: `0x${string}`) => {
    setTransaction({
      hash,
      status: 'pending'
    })
  }

  const setTransactionError = (error: string) => {
    setTransaction(prev => ({
      ...prev,
      status: 'error',
      error
    }))
  }

  const resetTransaction = () => {
    setTransaction({
      status: 'idle'
    })
  }

  const setTransactionSubmitted = (hash: `0x${string}`) => {
    // Immediately set to pending with hash for instant feedback
    setTransaction({
      hash,
      status: 'pending'
    })
  }

  return {
    transaction,
    setTransactionHash,
    setTransactionError,
    resetTransaction,
    setTransaction,
    setTransactionSubmitted
  }
}