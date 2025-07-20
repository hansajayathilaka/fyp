'use client'

import { useState, useEffect } from 'react'
import { useAccount, useChainId, useConnect, useDisconnect } from 'wagmi'
import { getCurrentNetworkInfo } from '../lib/wagmi'
import { hashioClient } from '../lib/hashio-client'

interface NetworkTestModalProps {
  isOpen: boolean
  onClose: () => void
}

export function NetworkTestModal({ isOpen, onClose }: NetworkTestModalProps) {
  const { address, isConnected, isConnecting } = useAccount()
  const chainId = useChainId()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const [networkInfo, setNetworkInfo] = useState<any>(null)
  const [rpcTest, setRpcTest] = useState<{ status: string; message: string }>({ status: 'idle', message: '' })

  useEffect(() => {
    setNetworkInfo(getCurrentNetworkInfo())
  }, [])

  const testRpcConnection = async () => {
    setRpcTest({ status: 'testing', message: 'Testing RPC connection...' })
    
    try {
      const data = await hashioClient.getChainId()
      setRpcTest({ 
        status: 'success', 
        message: `RPC connection successful. Chain ID: ${data.result}` 
      })
    } catch (error) {
      setRpcTest({ 
        status: 'error', 
        message: `RPC connection error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      })
    }
  }

  const handleConnect = () => {
    const injectedConnector = connectors.find(connector => connector.name === 'Injected')
    if (injectedConnector) {
      connect({ connector: injectedConnector })
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Network Connection Test</h2>
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
          {/* Network Info */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900 flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-3a5 5 0 00-5-5H3" />
              </svg>
              Network Configuration
            </h3>
            {networkInfo && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Network:</span>
                  <span className="font-medium">{networkInfo.network}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Chain ID:</span>
                  <span className="font-medium">{networkInfo.chainId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Environment:</span>
                  <span className="font-medium">{networkInfo.isLocal ? 'Local Development' : 'Testnet'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Wallet Connection */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900 flex items-center">
              <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              Wallet Connection
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Status:</span>
                <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                  isConnected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                }`}>
                  {isConnected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
              
              {isConnected && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Address:</span>
                    <span className="font-mono text-sm">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Current Chain ID:</span>
                    <span className="font-medium">{chainId}</span>
                  </div>
                </>
              )}
              
              <div className="pt-2">
                {!isConnected ? (
                  <button
                    onClick={handleConnect}
                    disabled={isConnecting || isPending}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isConnecting || isPending ? 'Connecting...' : 'Connect Wallet'}
                  </button>
                ) : (
                  <button
                    onClick={() => disconnect()}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Disconnect Wallet
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* RPC Test */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900 flex items-center">
              <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
              </svg>
              RPC Connection Test
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <button
                onClick={testRpcConnection}
                disabled={rpcTest.status === 'testing'}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {rpcTest.status === 'testing' ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Testing Connection...
                  </span>
                ) : (
                  'Test RPC Connection'
                )}
              </button>
              
              {rpcTest.message && (
                <div className={`p-3 rounded-md text-sm ${
                  rpcTest.status === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
                  rpcTest.status === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
                  'bg-blue-50 text-blue-800 border border-blue-200'
                }`}>
                  <div className="flex items-start">
                    {rpcTest.status === 'success' && (
                      <svg className="w-4 h-4 mr-2 mt-0.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {rpcTest.status === 'error' && (
                      <svg className="w-4 h-4 mr-2 mt-0.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    <span>{rpcTest.message}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Available Connectors */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900 flex items-center">
              <svg className="w-5 h-5 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Available Connectors
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="space-y-2">
                {connectors.map((connector) => (
                  <div key={connector.id} className="flex items-center justify-between py-2">
                    <span className="font-medium">{connector.name}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      connector.id === 'injected' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {connector.id}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 rounded-b-lg">
          <div className="flex justify-end">
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