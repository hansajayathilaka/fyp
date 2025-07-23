'use client'

import { useState, useEffect } from 'react'
import { getCurrentNetworkInfo } from '../lib/wagmi'

export function DevelopmentNotice() {
  const [isVisible, setIsVisible] = useState(false)
  const [networkInfo, setNetworkInfo] = useState<any>(null)

  useEffect(() => {
    setNetworkInfo(getCurrentNetworkInfo())
    // Show notice in development or when using Hedera testnet
    if (process.env.NODE_ENV === 'development' || getCurrentNetworkInfo().network === 'hederaTestnet') {
      setIsVisible(true)
    }
  }, [])

  if (!isVisible || !networkInfo) return null

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
            <svg className="w-3 h-3 text-yellow-800" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="text-sm">
            <span className="font-medium text-yellow-800">Development Mode:</span>
            <span className="text-yellow-700 ml-1">
              Using {networkInfo.network === 'hederaTestnet' ? 'Hedera Testnet' : 'Local Network'}. 
              Some RPC errors are expected and can be ignored.
            </span>
          </div>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-yellow-600 hover:text-yellow-800 p-1"
          aria-label="Dismiss notice"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}