'use client'

import { useState, useEffect } from 'react'
import { useAccount, useBalance } from 'wagmi'
import { fromWei, toWei, formatTokenQuantity } from '@/lib/formatters'
import { useContracts } from '@/contracts/hooks'
import { TransactionFeedback, useEnhancedTransactionState } from '@/components/TransactionFeedback'
import { useTokenHoldings, usePortfolioStats } from '@/hooks/useTokenHoldings'
import { usePortfolioUpdates } from '@/hooks/usePortfolioRealTimeUpdates'
import { PortfolioSkeleton, ETHBalanceSkeleton, TokenHoldingCardSkeleton } from '@/components/SkeletonLoader'
import { ClientOnly } from '@/components/ClientOnly'
import { PageLoadingFallback } from '@/components/PageLoadingFallback'
import {
  ErrorState,
  ContractErrorState,
  WalletNotConnectedState,
  EmptyPortfolioState,
  NoEthState,
  PartialErrorState,
  NetworkStatusIndicator
} from '@/components/PortfolioErrorStates'
import { usePortfolioErrorHandling, useNetworkStatus } from '@/hooks/usePortfolioErrorHandling'
import { QuickTransferModal } from '@/components/QuickTransferModal'

// ETH Balance Section Component
function ETHBalanceSection() {
  const { address } = useAccount()
  const { marketplace, regulatory } = useContracts()
  const ethTransaction = useEnhancedTransactionState()
  const { errorState, setError, clearError, retry, safeExecute } = usePortfolioErrorHandling()

  // Check user validation status
  const { data: userProfile } = regulatory.useGetUserProfile(address)
  const { data: canTrade } = regulatory.useCanUserTrade(address)

  // Form states
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')

  // Data fetching with loading states and error handling
  const {
    data: walletBalance,
    isLoading: walletBalanceLoading,
    error: walletBalanceError,
    refetch: refetchWalletBalance
  } = useBalance({ address })

  const {
    data: marketplaceBalance,
    isLoading: marketplaceBalanceLoading,
    error: marketplaceBalanceError,
    refetch: refetchMarketplaceBalance
  } = marketplace.useGetUserETHBalance(address)

  // Real-time updates integration
  usePortfolioUpdates({
    transactionHash: marketplace.data,
    transactionStatus: ethTransaction.transaction.status
  })

  // Handle data fetching errors
  useEffect(() => {
    if (walletBalanceError) {
      setError(`Wallet balance error: ${walletBalanceError.message}`)
    } else if (marketplaceBalanceError) {
      setError(`Marketplace balance error: ${marketplaceBalanceError.message}`)
    } else if (errorState.hasError && !walletBalanceError && !marketplaceBalanceError) {
      clearError()
    }
  }, [walletBalanceError, marketplaceBalanceError, setError, clearError, errorState.hasError])

  // Calculate total ETH
  const walletEth = walletBalance?.value || BigInt(0)

  // Use marketplace balance directly (already in the correct format)
  const marketplaceEth = marketplaceBalance || BigInt(0)

  const totalEth = walletEth + marketplaceEth

  // Handle deposit ETH with enhanced error handling
  const handleDepositETH = async () => {
    if (!depositAmount) return

    // Validation
    const amount = parseFloat(depositAmount)
    if (amount <= 0) {
      setError('Deposit amount must be greater than 0')
      return
    }

    const walletEth = walletBalance?.value || BigInt(0)
    const depositValue = toWei(depositAmount, { targetDecimals: 18 })

    console.log('Deposit Debug:', {
      depositAmount,
      depositAmountParsed: amount,
      depositValue: depositValue.toString(),
      depositValueInEth: fromWei(depositValue, { includeUnits: false }),
      walletEth: walletEth.toString(),
      walletEthInEth: fromWei(walletEth, { includeUnits: false }),
      userProfile: userProfile,
      canTrade: canTrade
    })

    if (depositValue > walletEth) {
      setError('Insufficient wallet balance for deposit')
      return
    }

    await safeExecute(async () => {
      ethTransaction.setTransactionSubmitting(
        'ETH Deposit',
        `Depositing ${depositAmount} ETH to marketplace...`
      )
      marketplace.depositETH(depositValue)
      console.log('Deposit transaction initiated')
      setDepositAmount('')
      clearError()
    }, undefined, {
      customErrorMessage: 'Failed to deposit ETH. Please try again.'
    })
  }

  // Handle withdraw ETH with enhanced error handling
  const handleWithdrawETH = async () => {
    if (!withdrawAmount) return

    // Validation
    const amount = parseFloat(withdrawAmount)
    if (amount <= 0) {
      setError('Withdrawal amount must be greater than 0')
      return
    }

    // Use marketplace balance directly
    const marketplaceEth = marketplaceBalance || BigInt(0)
    const withdrawValue = toWei(withdrawAmount)

    if (withdrawValue > marketplaceEth) {
      setError('Insufficient marketplace balance for withdrawal')
      return
    }

    await safeExecute(async () => {
      ethTransaction.setTransactionSubmitting(
        'ETH Withdrawal',
        `Withdrawing ${withdrawAmount} ETH from marketplace...`
      )
      marketplace.withdrawETH(withdrawValue)
      console.log('Withdraw transaction initiated')
      setWithdrawAmount('')
      clearError()
    }, undefined, {
      customErrorMessage: 'Failed to withdraw ETH. Please try again.'
    })
  }

  // Retry function for failed operations
  const handleRetry = async () => {
    await retry(async () => {
      await Promise.all([
        refetchWalletBalance(),
        refetchMarketplaceBalance()
      ])
    })
  }

  // Watch for transaction hashes
  useEffect(() => {
    if (marketplace.data) {
      console.log('Transaction hash received:', marketplace.data)
      ethTransaction.setTransactionHash(marketplace.data)
    }
  }, [marketplace.data, ethTransaction.setTransactionHash])

  // Watch for transaction errors
  useEffect(() => {
    if (marketplace.error) {
      console.log('Transaction error:', marketplace.error)
      ethTransaction.setTransactionError(marketplace.error.message, 'Transaction Error')
    }
  }, [marketplace.error, ethTransaction.setTransactionError])

  // Watch for transaction status changes
  useEffect(() => {
    console.log('Transaction status:', ethTransaction.transaction.status)
    if (ethTransaction.transaction.status === 'success') {
      console.log('Transaction succeeded, refetching balances...')
      refetchMarketplaceBalance()
    }
  }, [ethTransaction.transaction.status, refetchMarketplaceBalance])

  // Show skeleton while loading
  if (walletBalanceLoading || marketplaceBalanceLoading) {
    return <ETHBalanceSkeleton />
  }

  // Show error state if there are critical errors
  if (errorState.hasError && (walletBalanceError || marketplaceBalanceError)) {
    return (
      <div className="bg-white rounded-lg border">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">ETH Balance</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage your ETH across wallet and marketplace
          </p>
        </div>
        <div className="p-6">
          <ContractErrorState
            error={errorState.error || 'Failed to load ETH balance data'}
            onRetry={handleRetry}
            onForceRefresh={() => window.location.reload()}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">ETH Balance</h2>
        <p className="text-sm text-gray-600 mt-1">
          Manage your ETH across wallet and marketplace
        </p>
      </div>
      <div className="p-6">
        {/* Error State for non-critical errors */}
        {errorState.hasError && !walletBalanceError && !marketplaceBalanceError && (
          <PartialErrorState
            title="Transaction Error"
            message={errorState.error || 'An error occurred during the transaction'}
            onRetry={errorState.canRetry ? handleRetry : undefined}
            onContinue={clearError}
            className="mb-6"
          />
        )}

        {/* Transaction Feedback */}
        {ethTransaction.transaction.status !== 'idle' && (
          <TransactionFeedback
            transaction={ethTransaction.transaction}
            showImmediate={true}
            className="mb-6"
          />
        )}

        {/* No ETH Warning */}
        {walletBalance?.value === BigInt(0) && marketplaceEth === BigInt(0) && (
          <NoEthState className="mb-6" />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Balance Display */}
          <div className="space-y-4">
            {/* Total ETH */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Total ETH Balance</p>
                  <p className="text-2xl font-bold text-blue-600">{fromWei(totalEth, { includeUnits: false, maxDecimals: 4, sourceDecimals: 18 })}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Wallet Balance */}
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-700">Wallet Balance</p>
                <p className="text-lg font-bold text-blue-600">{fromWei(walletEth, { includeUnits: false, maxDecimals: 4, sourceDecimals: 18 })}</p>
                <p className="text-xs text-gray-500">Available for deposits</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
            </div>

            {/* Marketplace Balance */}
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-700">Marketplace Balance</p>
                <p className="text-lg font-bold text-green-600">{fromWei(marketplaceEth, { includeUnits: false, maxDecimals: 4 })}</p>
                <p className="text-xs text-gray-500">Available for trading</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
            </div>
          </div>

          {/* Quick Transfer Actions */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quick ETH Transfer</label>

              {/* Deposit ETH */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Deposit to Marketplace</label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      step="0.001"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="Amount in ETH"
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                    />
                    <button
                      onClick={handleDepositETH}
                      disabled={!depositAmount || marketplace.isPending || parseFloat(depositAmount) <= 0}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {marketplace.isPending ? 'Depositing...' : 'Deposit'}
                    </button>
                  </div>
                  {depositAmount && parseFloat(depositAmount) > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Max available: {fromWei(walletEth, { maxDecimals: 4, sourceDecimals: 18 })}
                    </p>
                  )}
                </div>

                {/* Withdraw ETH */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Withdraw from Marketplace</label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      step="0.001"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="Amount in ETH"
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                    />
                    <button
                      onClick={handleWithdrawETH}
                      disabled={!withdrawAmount || marketplace.isPending || parseFloat(withdrawAmount) <= 0}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {marketplace.isPending ? 'Withdrawing...' : 'Withdraw'}
                    </button>
                  </div>
                  {withdrawAmount && parseFloat(withdrawAmount) > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Max available: {fromWei(marketplaceEth, { maxDecimals: 4 })}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Balance Distribution Visual */}
            {totalEth > BigInt(0) && (
              <div className="mt-6">
                <p className="text-sm font-medium text-gray-700 mb-2">Balance Distribution</p>
                <div className="flex rounded-lg overflow-hidden h-3 bg-gray-200">
                  <div
                    className="bg-blue-500"
                    style={{
                      width: `${(Number(walletEth) / Number(totalEth)) * 100}%`
                    }}
                  />
                  <div
                    className="bg-green-500"
                    style={{
                      width: `${(Number(marketplaceEth) / Number(totalEth)) * 100}%`
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>Wallet: {((Number(walletEth) / Number(totalEth)) * 100).toFixed(1)}%</span>
                  <span>Marketplace: {((Number(marketplaceEth) / Number(totalEth)) * 100).toFixed(1)}%</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PortfolioPage() {
  return (
    <ClientOnly fallback={
      <PageLoadingFallback
        title="Portfolio Overview"
        description="Loading your wallet balance and token holdings..."
      />
    }>
      <PortfolioContent />
    </ClientOnly>
  )
}

function PortfolioContent() {
  const { address, isConnected } = useAccount()
  const { marketplace } = useContracts()
  const { errorState, setError, clearError, retry, safeExecute } = usePortfolioErrorHandling()
  const { isOnline, isConnected: networkConnected } = useNetworkStatus()

  // Modal state for quick transfer functionality
  const [selectedTokenForTransfer, setSelectedTokenForTransfer] = useState<bigint | null>(null)
  const [transferModalOpen, setTransferModalOpen] = useState(false)

  // Data fetching for summary with loading states and error handling
  const {
    data: walletBalance,
    isLoading: walletBalanceLoading,
    error: walletBalanceError,
    refetch: refetchWalletBalance
  } = useBalance({ address })

  const {
    data: marketplaceBalance,
    isLoading: marketplaceBalanceLoading,
    error: marketplaceBalanceError,
    refetch: refetchMarketplaceBalance
  } = marketplace.useGetUserETHBalance(address)

  // Token holdings data with enhanced error handling
  const {
    tokenHoldings,
    isLoading: tokenHoldingsLoading,
    error: tokenHoldingsError,
    refetch: refetchTokenHoldings
  } = useTokenHoldings()

  const {
    totalTokenTypes,
    totalEstimatedValue,
    isLoading: portfolioStatsLoading,
    error: portfolioStatsError
  } = usePortfolioStats()

  // Real-time updates for the entire portfolio
  const { forceRefresh } = usePortfolioUpdates({
    enablePeriodicUpdates: true,
    periodicInterval: 30000 // 30 seconds
  })

  // Handle various error states
  useEffect(() => {
    if (walletBalanceError) {
      setError(`Wallet balance error: ${walletBalanceError.message}`)
    } else if (marketplaceBalanceError) {
      setError(`Marketplace balance error: ${marketplaceBalanceError.message}`)
    } else if (tokenHoldingsError) {
      setError(`Token holdings error: ${tokenHoldingsError}`)
    } else if (portfolioStatsError) {
      setError(`Portfolio stats error: ${portfolioStatsError}`)
    } else if (errorState.hasError && !walletBalanceError && !marketplaceBalanceError && !tokenHoldingsError && !portfolioStatsError) {
      clearError()
    }
  }, [walletBalanceError, marketplaceBalanceError, tokenHoldingsError, portfolioStatsError, setError, clearError, errorState.hasError])

  // Comprehensive retry function
  const handleRetryAll = async () => {
    await retry(async () => {
      await Promise.all([
        refetchWalletBalance(),
        refetchMarketplaceBalance(),
        refetchTokenHoldings()
      ])
    })
  }



  // Calculate totals for empty state checks
  const walletEth = walletBalance?.value || BigInt(0)

  // Use marketplace balance directly
  const marketplaceEth = marketplaceBalance || BigInt(0)

  const totalEth = walletEth + marketplaceEth

  // Debug log for portfolio values
  console.log('Portfolio Values:', {
    walletBalance: walletBalance,
    marketplaceBalance: marketplaceBalance,
    walletEth: walletEth.toString(),
    walletEthInEth: Number(walletEth) / 1e18,
    marketplaceEthRaw: typeof marketplaceBalance === 'bigint' ? marketplaceBalance.toString() : '0',
    marketplaceEth: marketplaceEth.toString(),
    marketplaceEthInEth: Number(marketplaceEth) / 1e18,
    totalEth: totalEth.toString(),
    totalEthInEth: Number(totalEth) / 1e18,
    totalEstimatedValue: totalEstimatedValue.toString(),
    totalEstimatedValueInEth: Number(totalEstimatedValue) / 1e18,
    totalPortfolioValue: (totalEth + totalEstimatedValue).toString(),
    totalPortfolioValueInEth: Number(totalEth + totalEstimatedValue) / 1e18
  });

  // Individual loading states for progressive loading
  const isLoadingOverall = walletBalanceLoading || marketplaceBalanceLoading || tokenHoldingsLoading || portfolioStatsLoading
  const hasAnyData = walletBalance || marketplaceBalance || tokenHoldings.length > 0
  const hasAnyAssets = totalEth > BigInt(0) || tokenHoldings.length > 0

  // Check if portfolio is completely empty (no ETH, no tokens)
  if (!isLoadingOverall && !errorState.hasError && !hasAnyAssets) {
    return (
      <div className="max-w-6xl mx-auto p-8">
        <NetworkStatusIndicator
          isOnline={isOnline}
          isConnected={networkConnected}
        />
        <EmptyPortfolioState />
      </div>
    )
  }

  // Show wallet not connected state
  if (!isConnected) {
    return (
      <div className="max-w-6xl mx-auto p-8">
        <WalletNotConnectedState />
      </div>
    )
  }

  // Show critical error state if there are major issues
  if (errorState.hasError && (walletBalanceError || marketplaceBalanceError)) {
    return (
      <div className="max-w-6xl mx-auto p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Portfolio Overview</h1>
          <p className="text-gray-600">
            Complete view of your digital assets across wallet and marketplace
          </p>
        </div>
        <ContractErrorState
          error={errorState.error || 'Failed to load portfolio data'}
          onRetry={handleRetryAll}
          onForceRefresh={() => window.location.reload()}
        />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-8">
      {/* Network Status Indicator */}
      <NetworkStatusIndicator
        isOnline={isOnline}
        isConnected={networkConnected}
      />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Portfolio Overview</h1>
          <p className="text-gray-600 mt-1">
            Complete view of your digital assets across wallet and marketplace
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Error indicator */}
          {errorState.hasError && !walletBalanceError && !marketplaceBalanceError && (
            <div className="flex items-center space-x-2 text-sm text-orange-600">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>Partial errors</span>
            </div>
          )}

          {/* Real-time update indicator */}
          {isLoadingOverall && (
            <div className="flex items-center space-x-2 text-sm text-blue-600">
              <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span>Updating...</span>
            </div>
          )}

          {/* Manual refresh button */}
          <button
            onClick={handleRetryAll}
            disabled={isLoadingOverall}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh portfolio data"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          <div className="text-sm text-gray-600 bg-gray-100 px-3 py-2 rounded-lg">
            <span className="font-medium">Connected:</span> {address?.slice(0, 6)}...{address?.slice(-4)}
          </div>
        </div>
      </div>

      {/* Portfolio Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Total ETH Card */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total ETH</p>
              {walletBalanceLoading || marketplaceBalanceLoading ? (
                <div className="w-20 h-8 bg-gray-200 rounded animate-pulse mt-1" />
              ) : (
                <p className="text-2xl font-bold text-blue-600">{fromWei(totalEth, { includeUnits: false, maxDecimals: 4, sourceDecimals: 18 })}</p>
              )}
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Wallet + Marketplace</p>
        </div>

        {/* Token Types Card */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Token Types</p>
              {portfolioStatsLoading ? (
                <div className="w-12 h-8 bg-gray-200 rounded animate-pulse mt-1" />
              ) : (
                <p className="text-2xl font-bold text-green-600">{totalTokenTypes}</p>
              )}
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Different tokens held</p>
        </div>

        {/* Portfolio Value Card */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Portfolio Value</p>
              {walletBalanceLoading || marketplaceBalanceLoading || portfolioStatsLoading ? (
                <div className="w-24 h-8 bg-gray-200 rounded animate-pulse mt-1" />
              ) : (
                <p className="text-2xl font-bold text-purple-600">{fromWei(totalEth + totalEstimatedValue, { maxDecimals: 4, sourceDecimals: 18 })}</p>
              )}
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">ETH + Token estimated value</p>
        </div>

        {/* Trading Ready Card */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Trading Ready</p>
              {marketplaceBalanceLoading ? (
                <div className="w-16 h-8 bg-gray-200 rounded animate-pulse mt-1" />
              ) : (
                <p className="text-2xl font-bold text-orange-600">{fromWei(marketplaceEth, { includeUnits: false, maxDecimals: 4 })}</p>
              )}
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Assets in marketplace</p>
        </div>
      </div>

      {/* ETH Balance Section */}
      <ETHBalanceSection />

      {/* Token Holdings Section */}
      <div className="bg-white rounded-lg border">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Token Holdings</h2>
              <p className="text-sm text-gray-600 mt-1">
                Complete overview of your token holdings across wallet and marketplace
              </p>
            </div>
            {tokenHoldingsError && (
              <div className="flex items-center space-x-2 text-sm text-red-600">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>Loading error</span>
              </div>
            )}
          </div>
        </div>
        <div className="p-6">
          {tokenHoldingsLoading && tokenHoldings.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <TokenHoldingCardSkeleton key={index} />
              ))}
            </div>
          ) : tokenHoldingsError ? (
            <ContractErrorState
              error={tokenHoldingsError}
              onRetry={refetchTokenHoldings}
              onForceRefresh={handleRetryAll}
            />
          ) : tokenHoldings.length === 0 ? (
            <EmptyPortfolioState
              hasEth={totalEth > BigInt(0)}
            />
          ) : (
            <div className="space-y-4">
              {/* Loading indicator for partial updates */}
              {tokenHoldingsLoading && tokenHoldings.length > 0 && (
                <div className="flex items-center justify-center py-2 text-sm text-blue-600">
                  <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />
                  Updating token holdings...
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tokenHoldings.map((holding) => (
                  <div key={holding.tokenId.toString()} className="bg-gray-50 rounded-lg p-6 border relative">
                    {/* Real-time update indicator */}
                    {tokenHoldingsLoading && (
                      <div className="absolute top-2 right-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                      </div>
                    )}

                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">
                          {holding.tokenInfo?.name || `Token ${holding.tokenId}`}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {holding.tokenInfo?.symbol || `TKN${holding.tokenId}`} • {holding.tokenInfo?.companyName || 'Unknown Company'}
                        </p>
                      </div>
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Total Supply</span>
                        <span className="font-semibold text-gray-900">{formatTokenQuantity(holding.totalBalance)}</span>
                      </div>

                      <div className="flex justify-between items-center p-2 bg-green-50 rounded-md">
                        <span className="text-sm font-medium text-green-700">Available for Trading</span>
                        <span className="text-green-600 font-semibold">{formatTokenQuantity(holding.marketplaceBalance)}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">In Wallet</span>
                        <span className="text-blue-600">{formatTokenQuantity(holding.walletBalance)}</span>
                      </div>

                      {holding.tokenInfo && (
                        <div className="pt-3 border-t border-gray-200 space-y-1">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Token Price</span>
                            <span className="font-medium text-gray-700">
                              {fromWei(holding.tokenInfo.initialPrice)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Est. Value</span>
                            <span className="font-medium text-purple-600">
                              {(() => {
                                const estValue = holding.tokenInfo.initialPrice * holding.totalBalance;
                                console.log('Token Card Est Value:', {
                                  tokenId: holding.tokenId.toString(),
                                  tokenName: holding.tokenInfo.name,
                                  initialPrice: holding.tokenInfo.initialPrice.toString(),
                                  initialPriceInEth: Number(holding.tokenInfo.initialPrice) / 1e18,
                                  totalBalance: holding.totalBalance.toString(),
                                  estValue: estValue.toString(),
                                  estValueInEth: Number(estValue) / 1e18
                                });
                                return fromWei(estValue);
                              })()}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Trading Status & Quick Transfer */}
                      <div className="pt-3 border-t border-gray-200 space-y-2">
                        {holding.marketplaceBalance > BigInt(0) && (
                          <div className="flex items-center space-x-2 text-xs text-green-600">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span>Ready for trading</span>
                          </div>
                        )}
                        <button
                          onClick={() => {
                            setSelectedTokenForTransfer(holding.tokenId)
                            setTransferModalOpen(true)
                          }}
                          className="w-full px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                          <span>Quick Transfer</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Transfer Modal */}
      <QuickTransferModal
        isOpen={transferModalOpen}
        tokenId={selectedTokenForTransfer}
        onClose={() => {
          setTransferModalOpen(false)
          setSelectedTokenForTransfer(null)
        }}
        onTransferComplete={() => {
          // Refresh portfolio data after successful transfer
          handleRetryAll()
        }}
      />
    </div>
  )
}