'use client'

import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi'
import { useState, useEffect } from 'react'
import { clsx } from 'clsx'
import { getCurrentNetworkInfo } from '../lib/wagmi'
import { AdminBadge } from './AdminBadge'

export function WalletConnect() {
  const { address, isConnected } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  const networkInfo = getCurrentNetworkInfo()
  const isCorrectNetwork = chainId === networkInfo.chainId

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const handleConnect = () => {
    // Prefer MetaMask if available, otherwise use the first available connector
    const metaMaskConnector = connectors.find(connector => connector.name === 'MetaMask')
    const connectorToUse = metaMaskConnector || connectors[0]
    
    if (connectorToUse) {
      connect({ connector: connectorToUse })
    }
  }

  const handleNetworkSwitch = () => {
    if (switchChain) {
      switchChain({ chainId: networkInfo.chainId as 296 | 31337 })
    }
  }

  // Show loading state until mounted to prevent hydration mismatch
  if (!isMounted) {
    return (
      <div className="px-4 py-2 rounded-md text-sm font-medium bg-gray-200 text-gray-500 animate-pulse">
        Loading...
      </div>
    )
  }

  if (!isConnected) {
    return (
      <button
        onClick={handleConnect}
        disabled={isPending}
        className={clsx(
          'px-4 py-2 rounded-md text-sm font-medium transition-colors',
          'bg-blue-600 text-white hover:bg-blue-700',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'flex items-center space-x-2'
        )}
      >
        {isPending ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2v8h10V6H5z" clipRule="evenodd" />
            </svg>
            <span>Connect Wallet</span>
          </>
        )}
      </button>
    )
  }

  return (
    <div className="relative">
      <div className="flex items-center space-x-2">
        <AdminBadge />
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={clsx(
            'px-4 py-2 rounded-md text-sm font-medium transition-colors',
            'bg-green-600 text-white hover:bg-green-700',
            'flex items-center space-x-2'
          )}
        >
          <div className="w-2 h-2 bg-green-300 rounded-full" />
          <span>{formatAddress(address!)}</span>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg border z-50">
          <div className="p-4 space-y-3">
            {/* Address Info */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Connected Address</p>
                <AdminBadge />
              </div>
              <p className="text-sm font-mono text-gray-900 break-all">{address}</p>
            </div>

            {/* Network Status */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Network</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-900">
                  {networkInfo.network === 'hardhat' ? 'Local Hardhat' : 'Fantom Sonic Testnet'}
                </span>
                {!isCorrectNetwork && (
                  <button
                    onClick={handleNetworkSwitch}
                    className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded"
                  >
                    Switch Network
                  </button>
                )}
              </div>
              {!isCorrectNetwork && (
                <p className="text-xs text-red-600 mt-1">
                  Please switch to {networkInfo.network === 'hardhat' ? 'Local Hardhat' : 'Fantom Sonic Testnet'}
                </p>
              )}
            </div>

            {/* Disconnect Button */}
            <button
              onClick={() => {
                disconnect()
                setIsDropdownOpen(false)
              }}
              className="w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
            >
              Disconnect Wallet
            </button>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isDropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </div>
  )
}