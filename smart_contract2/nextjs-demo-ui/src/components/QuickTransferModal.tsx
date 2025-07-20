'use client'

import { useState, useEffect } from 'react'
import { parseTokenQuantity } from '@/lib/decimal-utils'
import { fromWei, formatTokenQuantity } from '@/lib/formatters'
import { useContracts } from '@/contracts/hooks'
import { TransactionFeedback, useEnhancedTransactionState } from '@/components/TransactionFeedback'
import { useTokenHolding } from '@/hooks/useTokenHoldings'

interface QuickTransferModalProps {
  isOpen: boolean
  tokenId: bigint | null
  onClose: () => void
  onTransferComplete?: () => void
}

export function QuickTransferModal({
  isOpen,
  tokenId,
  onClose,
  onTransferComplete
}: QuickTransferModalProps) {
  const { marketplace } = useContracts()
  const transaction = useEnhancedTransactionState()

  // Form states
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit')
  const [error, setError] = useState<string | null>(null)

  // Get token holding data
  const { holding, isLoading: holdingLoading, error: holdingError } = useTokenHolding(tokenId || undefined)

  // Reset form when modal opens/closes or token changes
  useEffect(() => {
    if (isOpen) {
      setDepositAmount('')
      setWithdrawAmount('')
      setError(null)
      transaction.resetTransaction()
    }
  }, [isOpen, tokenId]) // Remove holding and transaction from dependencies

  // Set default tab based on available balances when holding data loads
  useEffect(() => {
    if (isOpen && holding && !holdingLoading) {
      setActiveTab(holding.walletBalance > BigInt(0) ? 'deposit' : 'withdraw')
    }
  }, [isOpen, holding, holdingLoading]) // Separate effect for tab setting

  // Handle deposit tokens with validation and transaction handling
  const handleDepositTokens = async () => {
    if (!depositAmount || !holding || !tokenId) return

    try {
      // Validation
      const amount = parseFloat(depositAmount)
      if (amount <= 0) {
        setError('Deposit amount must be greater than 0')
        return
      }

      const depositValue = parseTokenQuantity(depositAmount)

      if (depositValue > holding.walletBalance) {
        setError('Insufficient wallet balance for deposit')
        return
      }

      setError(null)
      transaction.setTransactionSubmitting(
        'Token Deposit',
        `Depositing ${depositAmount} tokens to marketplace...`
      )

      marketplace.depositTokens(tokenId, depositValue)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to deposit tokens'
      setError(errorMessage)
      transaction.setTransactionError(errorMessage, 'Deposit Error')
    }
  }

  // Handle withdraw tokens with marketplace balance validation
  const handleWithdrawTokens = async () => {
    if (!withdrawAmount || !holding || !tokenId) return

    try {
      // Validation
      const amount = parseFloat(withdrawAmount)
      if (amount <= 0) {
        setError('Withdrawal amount must be greater than 0')
        return
      }

      const withdrawValue = parseTokenQuantity(withdrawAmount)

      if (withdrawValue > holding.marketplaceBalance) {
        setError('Insufficient marketplace balance for withdrawal')
        return
      }

      setError(null)
      transaction.setTransactionSubmitting(
        'Token Withdrawal',
        `Withdrawing ${withdrawAmount} tokens from marketplace...`
      )

      marketplace.withdrawTokens(tokenId, withdrawValue)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to withdraw tokens'
      setError(errorMessage)
      transaction.setTransactionError(errorMessage, 'Withdrawal Error')
    }
  }

  // Watch for transaction hashes and integrate with existing transaction feedback system
  useEffect(() => {
    if (marketplace.data) {
      transaction.setTransactionHash(marketplace.data)
    }
  }, [marketplace.data, transaction.setTransactionHash])

  // Watch for transaction errors
  useEffect(() => {
    if (marketplace.error) {
      transaction.setTransactionError(marketplace.error.message, 'Transaction Error')
    }
  }, [marketplace.error, transaction.setTransactionError])

  // Handle successful transactions and auto-refresh
  useEffect(() => {
    if (transaction.transaction.status === 'success') {
      // Clear form
      setDepositAmount('')
      setWithdrawAmount('')
      setError(null)

      // Notify parent component to refresh data
      onTransferComplete?.()

      // Auto-close modal after successful transaction (optional)
      setTimeout(() => {
        onClose()
      }, 2000)
    }
  }, [transaction.transaction.status, onTransferComplete, onClose])

  if (!isOpen) return null

  // Show loading state while fetching token data
  if (holdingLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-600">Loading token data...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show error state if token data failed to load
  if (holdingError || !holding) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">Quick Transfer</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Error Content */}
          <div className="p-6">
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to Load Token Data</h3>
              <p className="text-gray-600 mb-4">
                {holdingError || 'Failed to load token information. Please try again.'}
              </p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Quick Transfer</h2>
            <p className="text-sm text-gray-600 mt-1">
              {holding.tokenInfo?.name || `Token #${tokenId}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Token Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3">Token Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Name:</span>
                <span className="font-medium">{holding.tokenInfo?.name || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Symbol:</span>
                <span className="font-medium">{holding.tokenInfo?.symbol || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Company:</span>
                <span className="font-medium">{holding.tokenInfo?.companyName || 'N/A'}</span>
              </div>
              {holding.tokenInfo?.initialPrice && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Price:</span>
                  <span className="font-medium">{fromWei(holding.tokenInfo.initialPrice)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Current Balances */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-sm font-medium text-gray-700 mb-1">Wallet Balance</p>
              <p className="text-lg font-bold text-blue-600">
                {formatTokenQuantity(holding.walletBalance)}
              </p>
              <p className="text-xs text-gray-500">Available to deposit</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-sm font-medium text-gray-700 mb-1">Marketplace Balance</p>
              <p className="text-lg font-bold text-green-600">
                {formatTokenQuantity(holding.marketplaceBalance)}
              </p>
              <p className="text-xs text-gray-500">Available to withdraw</p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('deposit')}
              className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'deposit'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              disabled={holding.walletBalance === BigInt(0)}
            >
              Deposit to Marketplace
            </button>
            <button
              onClick={() => setActiveTab('withdraw')}
              className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'withdraw'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              disabled={holding.marketplaceBalance === BigInt(0)}
            >
              Withdraw to Wallet
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start">
                <svg className="w-4 h-4 text-red-600 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-red-800">{error}</span>
              </div>
            </div>
          )}

          {/* Transaction Feedback */}
          {transaction.transaction.status !== 'idle' && (
            <TransactionFeedback
              transaction={transaction.transaction}
              showImmediate={true}
            />
          )}

          {/* Transfer Forms */}
          {activeTab === 'deposit' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deposit Amount
                </label>
                <div className="space-y-2">
                  <input
                    type="number"
                    step="1"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="Amount to deposit"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                    disabled={marketplace.isPending}
                  />
                  {depositAmount && parseFloat(depositAmount) > 0 && (
                    <p className="text-xs text-gray-500">
                      Max available: {formatTokenQuantity(holding.walletBalance)}
                    </p>
                  )}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        const amount = (holding.walletBalance * BigInt(25)) / BigInt(100)
                        setDepositAmount(formatTokenQuantity(amount))
                      }}
                      className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                      disabled={holding.walletBalance === BigInt(0)}
                    >
                      25%
                    </button>
                    <button
                      onClick={() => {
                        const amount = (holding.walletBalance * BigInt(50)) / BigInt(100)
                        setDepositAmount(formatTokenQuantity(amount))
                      }}
                      className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                      disabled={holding.walletBalance === BigInt(0)}
                    >
                      50%
                    </button>
                    <button
                      onClick={() => setDepositAmount(formatTokenQuantity(holding.walletBalance))}
                      className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                      disabled={holding.walletBalance === BigInt(0)}
                    >
                      Max
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={handleDepositTokens}
                disabled={
                  !depositAmount ||
                  parseFloat(depositAmount) <= 0 ||
                  marketplace.isPending ||
                  holding.walletBalance === BigInt(0)
                }
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {marketplace.isPending
                  ? 'Depositing...'
                  : 'Deposit Tokens'
                }
              </button>
            </div>
          )}

          {activeTab === 'withdraw' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Withdrawal Amount
                </label>
                <div className="space-y-2">
                  <input
                    type="number"
                    step="1"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="Amount to withdraw"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white text-gray-900"
                    disabled={marketplace.isPending}
                  />
                  {withdrawAmount && parseFloat(withdrawAmount) > 0 && (
                    <p className="text-xs text-gray-500">
                      Max available: {formatTokenQuantity(holding.marketplaceBalance)}
                    </p>
                  )}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        const amount = (holding.marketplaceBalance * BigInt(25)) / BigInt(100)
                        setWithdrawAmount(formatTokenQuantity(amount))
                      }}
                      className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                      disabled={holding.marketplaceBalance === BigInt(0)}
                    >
                      25%
                    </button>
                    <button
                      onClick={() => {
                        const amount = (holding.marketplaceBalance * BigInt(50)) / BigInt(100)
                        setWithdrawAmount(formatTokenQuantity(amount))
                      }}
                      className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                      disabled={holding.marketplaceBalance === BigInt(0)}
                    >
                      50%
                    </button>
                    <button
                      onClick={() => setWithdrawAmount(formatTokenQuantity(holding.marketplaceBalance))}
                      className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                      disabled={holding.marketplaceBalance === BigInt(0)}
                    >
                      Max
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={handleWithdrawTokens}
                disabled={
                  !withdrawAmount ||
                  parseFloat(withdrawAmount) <= 0 ||
                  marketplace.isPending ||
                  holding.marketplaceBalance === BigInt(0)
                }
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {marketplace.isPending
                  ? 'Withdrawing...'
                  : 'Withdraw Tokens'
                }
              </button>
            </div>
          )}

          {/* No Balance Warning */}
          {holding.walletBalance === BigInt(0) && holding.marketplaceBalance === BigInt(0) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <svg className="w-8 h-8 text-yellow-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-yellow-800">
                You don&apos;t have any balance for this token in your wallet or marketplace.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 rounded-b-lg">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              disabled={marketplace.isPending}
            >
              {transaction.transaction.status === 'success' ? 'Done' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}