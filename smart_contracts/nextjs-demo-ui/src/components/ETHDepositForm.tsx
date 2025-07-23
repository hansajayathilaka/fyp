'use client'

import { useState, useEffect } from 'react'
import { CryptoInputFormat } from '@/lib/decimal-utils'
import { fromWei, toWei } from '@/lib/formatters'
import { useContracts } from '@/contracts/hooks'
import { TransactionFeedback, useEnhancedTransactionState } from '@/components/TransactionFeedback'

interface ETHDepositFormProps {
  onDepositComplete?: () => void
  className?: string
}

export function ETHDepositForm({ onDepositComplete, className = '' }: ETHDepositFormProps) {
  const { marketplace } = useContracts()
  const transaction = useEnhancedTransactionState()

  // Form states
  const [depositAmount, setDepositAmount] = useState('')
  const [inputFormat, setInputFormat] = useState<CryptoInputFormat>('token')
  const [error, setError] = useState<string | null>(null)
  const [equivalentAmount, setEquivalentAmount] = useState<string>('')

  // Get network currency symbol
  const currencySymbol = typeof window !== 'undefined' && 
    window.ethereum?.chainId && 
    (window.ethereum.chainId === '0x128' || window.ethereum.chainId === '0x129') 
      ? 'HBAR' 
      : 'ETH'
  
  const smallUnitSymbol = currencySymbol === 'HBAR' ? 'tinybar' : 'wei'

  // Calculate equivalent amount when input changes
  useEffect(() => {
    if (!depositAmount || depositAmount === '0') {
      setEquivalentAmount('');
      return;
    }

    try {
      // Handle both token and wei formats
      const amount = inputFormat === 'token' 
        ? toWei(depositAmount)
        : BigInt(depositAmount.trim());
      
      if (inputFormat === 'token') {
        // If input is ETH/HBAR, show equivalent in wei/tinybar
        setEquivalentAmount(`${amount.toString()} ${smallUnitSymbol}`);
      } else {
        // If input is wei/tinybar, show equivalent in ETH/HBAR
        setEquivalentAmount(fromWei(amount, { includeUnits: true }));
      }
    } catch (err) {
      setEquivalentAmount('');
    }
  }, [depositAmount, inputFormat, smallUnitSymbol]);

  // Reset form
  const resetForm = () => {
    setDepositAmount('')
    setError(null)
    transaction.resetTransaction()
  }

  // Handle deposit with validation and transaction handling
  const handleDeposit = async () => {
    if (!depositAmount) return

    try {
      // Validation
      if (parseFloat(depositAmount) <= 0) {
        setError('Deposit amount must be greater than 0')
        return
      }

      let depositValue: bigint;
      try {
        // Handle both token and wei formats
        depositValue = inputFormat === 'token'
          ? toWei(depositAmount)
          : BigInt(depositAmount.trim());
      } catch (err) {
        setError(`Invalid amount: ${err instanceof Error ? err.message : 'Unknown error'}`)
        return
      }

      setError(null)
      transaction.setTransactionSubmitting(
        'ETH Deposit',
        `Depositing ${fromWei(depositValue)} to marketplace...`
      )

      // Call your deposit function here
      // Example: marketplace.depositETH(depositValue)
      // For now, we'll just simulate a successful transaction
      setTimeout(() => {
        transaction.setTransactionSuccess('Deposit successful!');
        
        // Notify parent component to refresh data
        onDepositComplete?.();
        
        // Reset form after success
        resetForm();
      }, 2000);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to deposit'
      setError(errorMessage)
      transaction.setTransactionError(errorMessage, 'Deposit Error')
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Deposit {currencySymbol}</h2>
        
        {/* Input Format Toggle */}
        <div className="flex mb-4 bg-gray-100 rounded-md p-1">
          <button
            onClick={() => setInputFormat('token')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              inputFormat === 'token'
                ? 'bg-white shadow text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {currencySymbol}
          </button>
          <button
            onClick={() => setInputFormat('wei')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              inputFormat === 'wei'
                ? 'bg-white shadow text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {smallUnitSymbol}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
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

        {/* Deposit Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Deposit Amount ({inputFormat === 'token' ? currencySymbol : smallUnitSymbol})
            </label>
            <div className="space-y-2">
              <input
                type={inputFormat === 'wei' ? "number" : "text"}
                step={inputFormat === 'token' ? "0.000001" : "1"}
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder={`Amount in ${inputFormat === 'token' ? currencySymbol : smallUnitSymbol}`}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                disabled={transaction.transaction.status === 'submitting'}
              />
              
              {/* Equivalent amount display */}
              {equivalentAmount && (
                <p className="text-xs text-gray-500">
                  Equivalent: {equivalentAmount}
                </p>
              )}
              
              {/* Quick amount buttons for token format */}
              {inputFormat === 'token' && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => setDepositAmount('0.01')}
                    className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    0.01
                  </button>
                  <button
                    onClick={() => setDepositAmount('0.1')}
                    className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    0.1
                  </button>
                  <button
                    onClick={() => setDepositAmount('1')}
                    className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    1
                  </button>
                </div>
              )}
              
              {/* Quick amount buttons for wei format */}
              {inputFormat === 'wei' && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => setDepositAmount('1000000000000000')}
                    className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    0.001 {currencySymbol}
                  </button>
                  <button
                    onClick={() => setDepositAmount('10000000000000000')}
                    className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    0.01 {currencySymbol}
                  </button>
                  <button
                    onClick={() => setDepositAmount('100000000000000000')}
                    className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    0.1 {currencySymbol}
                  </button>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleDeposit}
            disabled={
              !depositAmount ||
              parseFloat(depositAmount) <= 0 ||
              transaction.transaction.status === 'submitting'
            }
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {transaction.transaction.status === 'submitting'
              ? 'Depositing...'
              : `Deposit ${currencySymbol}`
            }
          </button>
        </div>
      </div>
    </div>
  )
}