'use client'

import { ReactNode } from 'react'
import { clsx } from 'clsx'

interface ErrorStateProps {
  title: string
  message: string
  icon?: ReactNode
  actions?: ReactNode
  className?: string
}

/**
 * Generic error state component for portfolio-related errors
 */
export function ErrorState({ title, message, icon, actions, className }: ErrorStateProps) {
  return (
    <div className={clsx('text-center py-12', className)}>
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
        {icon || (
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">{message}</p>
      {actions && (
        <div className="flex justify-center space-x-3">
          {actions}
        </div>
      )}
    </div>
  )
}

/**
 * Contract call failure error state
 */
export function ContractErrorState({ 
  error, 
  onRetry, 
  onForceRefresh,
  className 
}: { 
  error: string
  onRetry?: () => void
  onForceRefresh?: () => void
  className?: string 
}) {
  const isNetworkError = error.toLowerCase().includes('network') || 
                        error.toLowerCase().includes('fetch') ||
                        error.toLowerCase().includes('timeout') ||
                        error.toLowerCase().includes('rpc')

  const isContractError = error.toLowerCase().includes('contract') ||
                         error.toLowerCase().includes('revert') ||
                         error.toLowerCase().includes('execution')

  let title = 'Contract Call Failed'
  let message = 'There was an error communicating with the blockchain. This might be temporary.'
  let icon = (
    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )

  if (isNetworkError) {
    title = 'Network Connection Error'
    message = 'Unable to connect to the blockchain network. Please check your internet connection and try again.'
    icon = (
      <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
      </svg>
    )
  } else if (isContractError) {
    title = 'Smart Contract Error'
    message = 'The smart contract returned an error. This might be due to invalid parameters or contract state.'
    icon = (
      <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }

  const actions = (
    <>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      )}
      {onForceRefresh && (
        <button
          onClick={onForceRefresh}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
        >
          Force Refresh
        </button>
      )}
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
      >
        Reload Page
      </button>
    </>
  )

  return (
    <ErrorState
      title={title}
      message={message}
      icon={icon}
      actions={actions}
      className={className}
    />
  )
}

/**
 * Wallet not connected state
 */
export function WalletNotConnectedState({ className }: { className?: string }) {
  return (
    <div className={clsx('text-center py-12', className)}>
      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Portfolio Overview</h1>
      <p className="text-gray-600 mb-8 max-w-md mx-auto">
        View your complete asset portfolio including ETH balances and token holdings across wallet and marketplace.
      </p>
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md mx-auto">
        <div className="flex items-center space-x-3">
          <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div className="text-left">
            <p className="font-medium text-yellow-800">Wallet Connection Required</p>
            <p className="text-sm text-yellow-700">Please connect your wallet to view your portfolio.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Empty portfolio state when user has no assets
 */
export function EmptyPortfolioState({ 
  hasEth = false,
  className 
}: { 
  hasEth?: boolean
  className?: string 
}) {
  return (
    <div className={clsx('text-center py-12', className)}>
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {hasEth ? 'No Token Holdings' : 'Empty Portfolio'}
      </h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        {hasEth 
          ? "You have ETH but no tokens yet. Visit the marketplace to start trading or the tokens page to create new tokens."
          : "You don't have any assets yet. Get started by acquiring some ETH and tokens to build your portfolio."
        }
      </p>
      <div className="flex justify-center space-x-4">
        <a
          href="/marketplace"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Visit Marketplace
        </a>
        <a
          href="/tokens"
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
        >
          Manage Tokens
        </a>
      </div>
    </div>
  )
}

/**
 * No ETH balance state
 */
export function NoEthState({ className }: { className?: string }) {
  return (
    <div className={clsx('bg-yellow-50 border border-yellow-200 rounded-lg p-6', className)}>
      <div className="flex items-start space-x-3">
        <svg className="w-6 h-6 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <div className="flex-1">
          <h4 className="font-medium text-yellow-800 mb-1">No ETH Balance</h4>
          <p className="text-sm text-yellow-700 mb-3">
            You need ETH to interact with the marketplace and pay for transaction fees. 
            Consider acquiring some ETH to start trading.
          </p>
          <div className="flex space-x-2">
            <button
              onClick={() => window.open('https://faucet.fantom.network/', '_blank')}
              className="text-sm px-3 py-1 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 transition-colors"
            >
              Get Test ETH
            </button>
            <button
              onClick={() => window.location.reload()}
              className="text-sm px-3 py-1 border border-yellow-300 text-yellow-800 rounded hover:bg-yellow-100 transition-colors"
            >
              Refresh Balance
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Partial data loading state with error recovery
 */
export function PartialErrorState({ 
  title,
  message,
  onRetry,
  onContinue,
  className 
}: {
  title: string
  message: string
  onRetry?: () => void
  onContinue?: () => void
  className?: string
}) {
  return (
    <div className={clsx('bg-orange-50 border border-orange-200 rounded-lg p-4', className)}>
      <div className="flex items-start space-x-3">
        <svg className="w-5 h-5 text-orange-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="flex-1">
          <h4 className="font-medium text-orange-800 mb-1">{title}</h4>
          <p className="text-sm text-orange-700 mb-3">{message}</p>
          <div className="flex space-x-2">
            {onRetry && (
              <button
                onClick={onRetry}
                className="text-sm px-3 py-1 bg-orange-100 text-orange-800 rounded hover:bg-orange-200 transition-colors"
              >
                Retry
              </button>
            )}
            {onContinue && (
              <button
                onClick={onContinue}
                className="text-sm px-3 py-1 border border-orange-300 text-orange-800 rounded hover:bg-orange-100 transition-colors"
              >
                Continue Anyway
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Network status indicator
 */
export function NetworkStatusIndicator({ 
  isOnline = true,
  isConnected = true,
  className 
}: {
  isOnline?: boolean
  isConnected?: boolean
  className?: string
}) {
  if (isOnline && isConnected) return null

  return (
    <div className={clsx('bg-red-50 border border-red-200 rounded-lg p-3 mb-4', className)}>
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-red-800">
          {!isOnline ? 'No Internet Connection' : 'Blockchain Connection Lost'}
        </span>
      </div>
      <p className="text-xs text-red-700 mt-1">
        {!isOnline 
          ? 'Check your internet connection and try again.'
          : 'Unable to connect to the blockchain network. Some features may not work properly.'
        }
      </p>
    </div>
  )
}