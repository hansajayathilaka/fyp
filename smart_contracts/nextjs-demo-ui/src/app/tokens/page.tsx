'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useRegulatedToken, useRegulatoryManagement } from '../../contracts/hooks'
import { TransactionFeedback, useEnhancedTransactionState } from '../../components/TransactionFeedback'
import { AddressLink } from '../../components/EtherscanLink'
import { ClientOnly } from '../../components/ClientOnly'
import { PageLoadingFallback } from '../../components/PageLoadingFallback'
import { TokenMetadata, TokenStats } from '../../types/contracts'
import { parseTokenQuantity } from '@/lib/decimal-utils'
import { fromWei, toWei, formatTokenQuantity } from '@/lib/formatters'

export default function TokensPage() {
  return (
    <ClientOnly fallback={
      <PageLoadingFallback 
        title="Token Management" 
        description="Loading token contracts and blockchain connection..."
      />
    }>
      <TokensContent />
    </ClientOnly>
  )
}

function TokensContent() {
  const { address } = useAccount()
  const tokenTransaction = useEnhancedTransactionState()
  
  // Contract hooks
  const token = useRegulatedToken()
  const regulatory = useRegulatoryManagement()
  
  // State
  const [activeTab, setActiveTab] = useState<'create' | 'list' | 'mint' | 'stats'>('list')
  const [selectedTokenId, setSelectedTokenId] = useState<bigint | null>(null)
  
  // Form states
  const [createForm, setCreateForm] = useState({
    name: '',
    symbol: '',
    companyName: '',
    maxSupply: '',
    initialPrice: ''
  })
  
  const [mintForm, setMintForm] = useState({
    tokenId: '',
    recipient: '',
    amount: ''
  })

  // Data fetching
  const { data: userProfile } = regulatory.useGetUserProfile(address)
  const { data: allTokenIds, refetch: refetchTokens } = token.useGetAllTokens()
  const { data: tokenStats } = token.useGetTokenStats()
  const { data: userTokens } = token.useGetTokensByCreator(address)
  const { data: selectedTokenInfo } = token.useGetTokenInfo(selectedTokenId || undefined)

  // Check if user can create tokens
  const canCreateTokens = userProfile?.canCreateTokens // canCreateTokens field

  // Handle transaction events
  token.useWatchTokenCreated((logs) => {
    console.log('Token created:', logs)
    refetchTokens()
    tokenTransaction.setTransactionSuccess('Token created successfully!')
  })

  token.useWatchTokenMinted((logs) => {
    console.log('Token minted:', logs)
    refetchTokens()
    tokenTransaction.setTransactionSuccess('Tokens minted successfully!')
  })

  // Handle create token
  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canCreateTokens) {
      tokenTransaction.setTransactionError('You are not authorized to create tokens', 'Authorization Error')
      return
    }

    try {
      tokenTransaction.setTransactionSubmitting(
        'Token Creation',
        `Creating token "${createForm.name}" (${createForm.symbol}) for ${createForm.companyName}...`
      )
      
      const maxSupply = parseTokenQuantity(createForm.maxSupply)
      const initialPrice = toWei(createForm.initialPrice)
      
      token.createToken(
        createForm.name,
        createForm.symbol,
        createForm.companyName,
        maxSupply,
        initialPrice
      )
    } catch (error) {
      tokenTransaction.setTransactionError(
        error instanceof Error ? error.message : 'Failed to create token',
        'Token Creation Failed'
      )
    }
  }

  // Handle mint token
  const handleMintToken = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTokenId) return

    try {
      tokenTransaction.setTransactionSubmitting(
        'Token Minting',
        `Minting ${mintForm.amount} tokens (ID: ${selectedTokenId}) to ${mintForm.recipient.slice(0, 10)}...`
      )
      
      const amount = parseTokenQuantity(mintForm.amount)
      const recipient = mintForm.recipient as `0x${string}`
      
      token.mintToken(recipient, selectedTokenId, amount)
    } catch (error) {
      tokenTransaction.setTransactionError(
        error instanceof Error ? error.message : 'Failed to mint token',
        'Token Minting Failed'
      )
    }
  }

  // Watch for transaction hash
  useEffect(() => {
    if (token.data) {
      tokenTransaction.setTransactionHash(token.data)
    }
  }, [token.data, tokenTransaction.setTransactionHash])

  useEffect(() => {
    if (token.error) {
      tokenTransaction.setTransactionError(token.error.message, 'Transaction Error')
    }
  }, [token.error, tokenTransaction.setTransactionError])

  // Component to display individual token info
  const TokenCard = ({ tokenId }: { tokenId: bigint }) => {
    const { data: tokenInfo } = token.useGetTokenInfo(tokenId)
    
    if (!tokenInfo) {
      return (
        <div className="bg-white border rounded-lg p-6 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i}>
                <div className="h-3 bg-gray-200 rounded w-full mb-1"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      )
    }

    const tokenData = tokenInfo as TokenMetadata
    
    return (
      <div className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{tokenData.name}</h3>
            <p className="text-gray-600">{tokenData.symbol} • {tokenData.companyName}</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 text-xs rounded-full ${
              tokenData.isActive 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {tokenData.isActive ? 'Active' : 'Inactive'}
            </span>
            <button
              onClick={() => setSelectedTokenId(tokenId)}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Select for Minting
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Current Supply</p>
            <p className="font-medium">{formatTokenQuantity(tokenData.currentSupply)}</p>
          </div>
          <div>
            <p className="text-gray-500">Max Supply</p>
            <p className="font-medium">{formatTokenQuantity(tokenData.maxSupply)}</p>
          </div>
          <div>
            <p className="text-gray-500">Initial Price</p>
            <p className="font-medium">{fromWei(tokenData.initialPrice)}</p>
          </div>
          <div>
            <p className="text-gray-500">Created</p>
            <p className="font-medium">
              {new Date(Number(tokenData.createdAt) * 1000).toLocaleDateString()}
            </p>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t">
          <AddressLink 
            address={tokenData.creator} 
            label="Creator"
            className="text-sm"
          />
        </div>
      </div>
    )
  }

  const formatStatsData = (statsData: readonly unknown[]): TokenStats => {
    return {
      totalTokens: statsData[0] as bigint,
      activeTokens: statsData[1] as bigint,
      totalSupplyAll: statsData[2] as bigint,
      totalMaxSupplyAll: statsData[3] as bigint
    }
  }

  const handleRefresh = () => {
    window.location.reload()
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Token Management</h1>
            <p className="text-gray-600">Create and manage equity tokens for your company</p>
          </div>
          
          {/* Manual refresh button */}
          <button
            onClick={handleRefresh}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Refresh token data"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* User Status */}
      {address && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-800">
                <span className="font-medium">Status:</span> {
                  !userProfile ? 'Loading...' :
                  !userProfile.isVerified ? 'Not Verified' :
                  canCreateTokens ? 'Authorized Token Creator' :
                  'Registered User'
                }
              </p>
              {userProfile && (
                <p className="text-sm text-blue-600 mt-1">
                  User Type: {userProfile.userType === 1 ? 'Company' : 'Individual'}
                </p>
              )}
            </div>
            {!canCreateTokens && (
              <div className="text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded">
                Token creation requires company validation
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {['list', 'create', 'mint', 'stats'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as 'create' | 'list' | 'mint' | 'stats')}
              className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab === 'list' ? 'Token List' : 
               tab === 'create' ? 'Create Token' :
               tab === 'mint' ? 'Mint Tokens' : 'Statistics'}
            </button>
          ))}
        </nav>
      </div>

      {/* Enhanced Transaction Feedback */}
      {tokenTransaction.transaction.status !== 'idle' && (
        <TransactionFeedback 
          transaction={tokenTransaction.transaction}
          className="mb-6"
          showImmediate={true}
        />
      )}

      {/* Tab Content */}
      {activeTab === 'list' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">All Tokens</h2>
            <div className="text-sm text-gray-500">
              {allTokenIds ? `${(allTokenIds as readonly bigint[]).length} tokens found` : 'Loading...'}
            </div>
          </div>

          {allTokenIds && (allTokenIds as readonly bigint[]).length > 0 ? (
            <div className="grid gap-4">
              {(allTokenIds as readonly bigint[]).map((tokenId) => (
                <TokenCard key={tokenId.toString()} tokenId={tokenId} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-500">No tokens found</p>
              {canCreateTokens && (
                <button
                  onClick={() => setActiveTab('create')}
                  className="mt-2 text-blue-600 hover:text-blue-800"
                >
                  Create your first token →
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'create' && (
        <div className="max-w-2xl">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Create New Token</h2>
          
          {!canCreateTokens ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
              <h3 className="text-amber-800 font-medium mb-2">Authorization Required</h3>
              <p className="text-amber-700 text-sm">
                You need to be a verified company user to create tokens. Please ensure you are:
              </p>
              <ul className="list-disc list-inside text-amber-700 text-sm mt-2 space-y-1">
                <li>Registered as a Company user type</li>
                <li>Verified by an administrator</li>
                <li>Granted token creation permissions</li>
              </ul>
            </div>
          ) : (
            <form onSubmit={handleCreateToken} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Token Name
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.name}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                    placeholder="e.g., TechCorp Shares"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Token Symbol
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.symbol}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, symbol: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                    placeholder="e.g., TECH"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  required
                  value={createForm.companyName}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, companyName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  placeholder="e.g., TechCorp Inc."
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Supply
                  </label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={createForm.maxSupply}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, maxSupply: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                    placeholder="1000000"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Initial Price (ETH)
                  </label>
                  <input
                    type="number"
                    step="0.000000000000000001"
                    required
                    value={createForm.initialPrice}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, initialPrice: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                    placeholder="0.001"
                  />
                </div>
              </div>
              
              <button
                type="submit"
                disabled={token.isPending}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {token.isPending ? 'Creating Token...' : 'Create Token'}
              </button>
            </form>
          )}
        </div>
      )}

      {activeTab === 'mint' && (
        <div className="max-w-2xl">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Mint Tokens</h2>
          
          {selectedTokenId !== null && selectedTokenInfo ? (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">Selected Token</h3>
                <div className="text-sm text-blue-800">
                  <p><span className="font-medium">Name:</span> {(selectedTokenInfo as TokenMetadata).name}</p>
                  <p><span className="font-medium">Symbol:</span> {(selectedTokenInfo as TokenMetadata).symbol}</p>
                  <p><span className="font-medium">Current Supply:</span> {formatTokenQuantity((selectedTokenInfo as TokenMetadata).currentSupply)}</p>
                  <p><span className="font-medium">Max Supply:</span> {formatTokenQuantity((selectedTokenInfo as TokenMetadata).maxSupply)}</p>
                </div>
              </div>
              
              <form onSubmit={handleMintToken} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recipient Address
                  </label>
                  <input
                    type="text"
                    required
                    value={mintForm.recipient}
                    onChange={(e) => setMintForm(prev => ({ ...prev, recipient: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                    placeholder="0x..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount to Mint
                  </label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={mintForm.amount}
                    onChange={(e) => setMintForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                    placeholder="100"
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={token.isPending}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {token.isPending ? 'Minting...' : 'Mint Tokens'}
                </button>
              </form>
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-500 mb-4">Select a token from the Token List to mint</p>
              <button
                onClick={() => setActiveTab('list')}
                className="text-blue-600 hover:text-blue-800"
              >
                Go to Token List →
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Token Statistics</h2>
          
          {tokenStats ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {(() => {
                const stats = formatStatsData(tokenStats)
                return (
                  <>
                    <div className="bg-white border rounded-lg p-6">
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Total Tokens</h3>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalTokens.toString()}</p>
                    </div>
                    
                    <div className="bg-white border rounded-lg p-6">
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Active Tokens</h3>
                      <p className="text-2xl font-bold text-green-600">{stats.activeTokens.toString()}</p>
                    </div>
                    
                    <div className="bg-white border rounded-lg p-6">
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Total Supply</h3>
                      <p className="text-2xl font-bold text-blue-600">{formatTokenQuantity(stats.totalSupplyAll)}</p>
                    </div>
                    
                    <div className="bg-white border rounded-lg p-6">
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Total Max Supply</h3>
                      <p className="text-2xl font-bold text-purple-600">{formatTokenQuantity(stats.totalMaxSupplyAll)}</p>
                    </div>
                  </>
                )
              })()}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-500">Loading statistics...</p>
            </div>
          )}
          
          {/* User's Tokens */}
          {address && userTokens && (userTokens as readonly bigint[]).length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Created Tokens</h3>
              <div className="grid gap-4">
                {(userTokens as readonly bigint[]).map((tokenId) => (
                  <TokenCard key={tokenId.toString()} tokenId={tokenId} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}