/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { fromWei, toWei } from '@/lib/formatters'
import { useContracts } from '@/contracts/hooks'
import { TransactionFeedback, useEnhancedTransactionState } from '@/components/TransactionFeedback'
import { ClientOnly } from '@/components/ClientOnly'
import { PageLoadingFallback } from '@/components/PageLoadingFallback'

export default function MarketplacePage() {
  return (
    <ClientOnly fallback={
      <PageLoadingFallback 
        title="Equity Investment Marketplace" 
        description="Loading marketplace contracts and trading interface..."
      />
    }>
      <MarketplaceContent />
    </ClientOnly>
  )
}

function MarketplaceContent() {
  const { address, isConnected } = useAccount()
  const { marketplace, token } = useContracts()
  const [selectedTokenId, setSelectedTokenId] = useState<bigint | null>(null)
  const [activeTab, setActiveTab] = useState<'trade' | 'orders' | 'balances' | 'completed'>('trade')
  
  // Enhanced transaction state for all marketplace operations
  const marketplaceTransaction = useEnhancedTransactionState()
  const [currentTransactionType, setCurrentTransactionType] = useState<string>('')

  // Form states
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [orderForm, setOrderForm] = useState({
    tokenId: '',
    amount: '',
    price: '',
    type: 'BUY' as 'BUY' | 'SELL'
  })

  // Data fetching
  const { data: activeTokens } = token.useGetActiveTokens()
  const { data: userData } = marketplace.useGetComprehensiveUserData(address)
  const { data: orderBook } = marketplace.useGetOrderBook(selectedTokenId || undefined)
  const { data: marketplaceStats } = marketplace.useGetMarketplaceStats()

  // Set default token selection
  useEffect(() => {
    if (activeTokens && Array.isArray(activeTokens) && activeTokens.length > 0 && !selectedTokenId) {
      setSelectedTokenId(activeTokens[0])
    }
  }, [activeTokens, selectedTokenId])

  // Handle deposit ETH
  const handleDepositETH = async () => {
    if (!depositAmount) return
    
    try {
      setCurrentTransactionType('ETH Deposit')
      marketplaceTransaction.setTransactionSubmitting(
        'ETH Deposit', 
        `Depositing ${depositAmount} ETH to marketplace...`
      )
      const value = toWei(depositAmount)
      marketplace.depositETH(value)
      setDepositAmount('')
    } catch (error) {
      marketplaceTransaction.setTransactionError(
        error instanceof Error ? error.message : 'Deposit failed',
        'ETH Deposit Failed'
      )
    }
  }

  // Handle withdraw ETH
  const handleWithdrawETH = async () => {
    if (!withdrawAmount) return
    
    try {
      setCurrentTransactionType('ETH Withdrawal')
      marketplaceTransaction.setTransactionSubmitting(
        'ETH Withdrawal', 
        `Withdrawing ${withdrawAmount} ETH from marketplace...`
      )
      const amount = toWei(withdrawAmount)
      marketplace.withdrawETH(amount)
      setWithdrawAmount('')
    } catch (error) {
      marketplaceTransaction.setTransactionError(
        error instanceof Error ? error.message : 'Withdrawal failed',
        'ETH Withdrawal Failed'
      )
    }
  }

  // Handle place order
  const handlePlaceOrder = async () => {
    if (!orderForm.tokenId || !orderForm.amount || !orderForm.price) return
    
    try {
      setCurrentTransactionType(`${orderForm.type} Order`)
      marketplaceTransaction.setTransactionSubmitting(
        `${orderForm.type} Order Placement`, 
        `Placing ${orderForm.type.toLowerCase()} order for ${orderForm.amount} tokens at ${orderForm.price} ETH each...`
      )
      const tokenId = BigInt(orderForm.tokenId)
      const amount = BigInt(orderForm.amount)
      const price = toWei(orderForm.price)
      
      if (orderForm.type === 'BUY') {
        marketplace.placeBuyOrder(tokenId, amount, price)
      } else {
        marketplace.placeSellOrder(tokenId, amount, price)
      }
      
      setOrderForm({ tokenId: '', amount: '', price: '', type: 'BUY' })
    } catch (error) {
      marketplaceTransaction.setTransactionError(
        error instanceof Error ? error.message : 'Order placement failed',
        `${orderForm.type} Order Failed`
      )
    }
  }

  // Watch for transaction hashes
  useEffect(() => {
    if (marketplace.data) {
      marketplaceTransaction.setTransactionHash(marketplace.data)
    }
  }, [marketplace.data, marketplaceTransaction.setTransactionHash])
  
  // Refresh data when transaction completes
  useEffect(() => {
    if (marketplaceTransaction.transaction.status === 'success') {
      // Force a refresh of the page data
      setTimeout(() => {
        window.location.reload()
      }, 2000) // Wait 2 seconds to allow the blockchain to update
    }
  }, [marketplaceTransaction.transaction.status])

  if (!isConnected) {
    return (
      <div className="max-w-6xl mx-auto p-8">
        <div className="text-center py-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Marketplace Trading</h1>
          <p className="text-gray-600">Please connect your wallet to access the marketplace.</p>
        </div>
      </div>
    )
  }

  const handleRefresh = () => {
    window.location.reload()
  }

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Marketplace Trading</h1>
        <div className="flex items-center space-x-4">
          {/* Manual refresh button */}
          <button
            onClick={handleRefresh}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Refresh marketplace data"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <div className="text-sm text-gray-600">
            Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
          </div>
        </div>
      </div>

      {marketplaceStats && Array.isArray(marketplaceStats) && marketplaceStats.length >= 4 ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border p-4">
            <div className="text-2xl font-bold text-blue-600">{marketplaceStats[0]?.toString() || '0'}</div>
            <div className="text-sm text-gray-600">Total Orders</div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="text-2xl font-bold text-green-600">{marketplaceStats[1]?.toString() || '0'}</div>
            <div className="text-sm text-gray-600">Active Orders</div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="text-2xl font-bold text-purple-600">{marketplaceStats[2]?.toString() || '0'}</div>
            <div className="text-sm text-gray-600">Total Trades</div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="text-2xl font-bold text-orange-600">{marketplaceStats[3] ? fromWei(marketplaceStats[3]) : '0'}</div>
            <div className="text-sm text-gray-600">Total Volume</div>
          </div>
        </div>
      ) : null}

      {/* Enhanced Transaction Feedback - Shows immediate feedback and real-time updates */}
      {marketplaceTransaction.transaction.status !== 'idle' && (
        <TransactionFeedback
          transaction={marketplaceTransaction.transaction}
          showImmediate={true}
        />
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'trade', label: 'Trading' },
            { id: 'orders', label: 'Order Book' },
            { id: 'balances', label: 'Balances' },
            { id: 'completed', label: 'My Orders' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'trade' | 'orders' | 'balances' | 'completed')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Trading Tab */}
      {activeTab === 'trade' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Placement */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Place Order</h2>
            
            <div className="space-y-4">
              {/* Order Type Toggle */}
              <div className="flex rounded-lg border p-1">
                <button
                  onClick={() => setOrderForm(prev => ({ ...prev, type: 'BUY' }))}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${
                    orderForm.type === 'BUY'
                      ? 'bg-green-100 text-green-700 border border-green-200'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Buy Order
                </button>
                <button
                  onClick={() => setOrderForm(prev => ({ ...prev, type: 'SELL' }))}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${
                    orderForm.type === 'SELL'
                      ? 'bg-red-100 text-red-700 border border-red-200'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Sell Order
                </button>
              </div>

              {/* Token Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Token</label>
                <select
                  value={orderForm.tokenId}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, tokenId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                >
                  <option value="">Select a token</option>
                  {activeTokens && Array.isArray(activeTokens) ? activeTokens.map((tokenId) => (
                    <option key={tokenId.toString()} value={tokenId.toString()}>
                      Token #{tokenId.toString()}
                    </option>
                  )) : null}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  value={orderForm.amount}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="Enter amount"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price (ETH per token)</label>
                <input
                  type="number"
                  step="0.001"
                  value={orderForm.price}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="Enter price in ETH"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                />
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={!orderForm.tokenId || !orderForm.amount || !orderForm.price}
                className={`w-full py-2 px-4 rounded-md font-medium ${
                  orderForm.type === 'BUY'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                } disabled:bg-gray-300 disabled:cursor-not-allowed`}
              >
                Place {orderForm.type} Order
              </button>
            </div>


          </div>

          {/* Available Tokens */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Tokens Available for Trading</h2>
            
            <div className="space-y-3">
              {activeTokens && Array.isArray(activeTokens) ? activeTokens.map((tokenId) => (
                <TokenCard key={tokenId.toString()} tokenId={tokenId} />
              )) : null}
              
              {(!activeTokens || !Array.isArray(activeTokens) || activeTokens.length === 0) && (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-sm">No tokens available for trading</p>
                  <p className="text-gray-400 text-xs mt-1">Check back later or create new tokens</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Order Book Tab */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {/* Token Selection for Order Book */}
          <div className="bg-white rounded-lg border p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Token to View Order Book</label>
            <select
              value={selectedTokenId?.toString() || ''}
              onChange={(e) => setSelectedTokenId(e.target.value ? BigInt(e.target.value) : null)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
            >
              <option value="">Select a token</option>
              {activeTokens && Array.isArray(activeTokens) ? activeTokens.map((tokenId) => (
                <option key={tokenId.toString()} value={tokenId.toString()}>
                  Token #{tokenId.toString()}
                </option>
              )) : null}
            </select>
          </div>

          {selectedTokenId && orderBook && (
            <OrderBookDisplay 
              orderBook={orderBook} 
              marketplaceTransaction={marketplaceTransaction}
              setCurrentTransactionType={setCurrentTransactionType}
            />
          )}
        </div>
      )}

      {/* Balances Tab */}
      {activeTab === 'balances' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ETH Balance Management */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">ETH Balance</h2>
            
            {userData && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-lg font-medium">
                  {fromWei(userData[0])}
                </div>
                <div className="text-sm text-gray-600">Available Balance</div>
              </div>
            )}

            <div className="space-y-4">
              {/* Deposit ETH */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deposit ETH</label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    step="0.001"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="Amount to deposit"
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  />
                  <button
                    onClick={handleDepositETH}
                    disabled={!depositAmount}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300"
                  >
                    Deposit
                  </button>
                </div>
              </div>

              {/* Withdraw ETH */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Withdraw ETH</label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    step="0.001"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="Amount to withdraw"
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  />
                  <button
                    onClick={handleWithdrawETH}
                    disabled={!withdrawAmount}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-300"
                  >
                    Withdraw
                  </button>
                </div>
              </div>
            </div>


          </div>

          {/* Token Balances */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Tradable Token Balances</h2>
            <p className="text-sm text-gray-600 mb-4">Tokens deposited in marketplace and available for trading</p>
            
            {userData && userData[1].length > 0 ? (
              <div className="space-y-3">
                {userData[1].map((tokenId, index) => (
                  <TokenBalanceCard 
                    key={tokenId.toString()} 
                    tokenId={tokenId} 
                    balance={userData[2][index]}
                    marketplaceTransaction={marketplaceTransaction}
                    setCurrentTransactionType={setCurrentTransactionType}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm">No tokens deposited for trading</p>
                <p className="text-gray-400 text-xs mt-1">Deposit tokens from your portfolio to start trading</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Order Management Tab */}
      {activeTab === 'completed' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Management</h2>
            <OrderManagementDisplay 
              address={address}
              marketplaceTransaction={marketplaceTransaction}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// Token Card Component
function TokenCard({ tokenId }: { tokenId: bigint }) {
  const { token } = useContracts()
  const { data: tokenInfo } = token.useGetTokenInfo(tokenId)

  if (!tokenInfo) return null

  return (
    <div className="border rounded-lg p-4 hover:bg-gray-50">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium">{tokenInfo.name} ({tokenInfo.symbol})</h3>
          <p className="text-sm text-gray-600">{tokenInfo.companyName}</p>
          <p className="text-xs text-gray-500">Token #{tokenId.toString()}</p>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium">{fromWei(tokenInfo.initialPrice)}</div>
          <div className="text-xs text-gray-600">Initial Price</div>
        </div>
      </div>
      <div className="mt-2 flex justify-between text-sm text-gray-600">
        <span>Trading Price: {fromWei(tokenInfo.initialPrice)}</span>
        <span className={`px-2 py-1 rounded text-xs ${tokenInfo.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {tokenInfo.isActive ? 'Available' : 'Inactive'}
        </span>
      </div>
    </div>
  )
}

// Order Book Display Component
function OrderBookDisplay({ 
  orderBook, 
  marketplaceTransaction,
  setCurrentTransactionType
}: { 
  orderBook: readonly [readonly unknown[], readonly unknown[]];
  marketplaceTransaction: ReturnType<typeof useEnhancedTransactionState>;
  setCurrentTransactionType: (type: string) => void;
}) {
  const buyOrders = orderBook[0] as readonly { orderId: bigint; trader: `0x${string}`; tokenId: bigint; amount: bigint; price: bigint; filledAmount: bigint; orderType: number; status: number; createdAt: bigint; }[]
  const sellOrders = orderBook[1] as readonly { orderId: bigint; trader: `0x${string}`; tokenId: bigint; amount: bigint; price: bigint; filledAmount: bigint; orderType: number; status: number; createdAt: bigint; }[]
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Buy Orders */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-green-600 mb-4">Buy Orders</h3>
        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-4 text-sm font-medium text-gray-700 border-b pb-2">
            <div>Price (ETH)</div>
            <div>Amount</div>
            <div>Total (ETH)</div>
            <div>Action</div>
          </div>
          {buyOrders.length > 0 ? (
            buyOrders.map((order) => (
              <OrderRowDirect 
                key={order.orderId.toString()} 
                order={order} 
                type="BUY" 
                marketplaceTransaction={marketplaceTransaction}
                setCurrentTransactionType={setCurrentTransactionType}
              />
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">No buy orders</p>
          )}
        </div>
      </div>

      {/* Sell Orders */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-red-600 mb-4">Sell Orders</h3>
        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-4 text-sm font-medium text-gray-700 border-b pb-2">
            <div>Price (ETH)</div>
            <div>Amount</div>
            <div>Total (ETH)</div>
            <div>Action</div>
          </div>
          {sellOrders.length > 0 ? (
            sellOrders.map((order) => (
              <OrderRowDirect 
                key={order.orderId.toString()} 
                order={order} 
                type="SELL" 
                marketplaceTransaction={marketplaceTransaction}
                setCurrentTransactionType={setCurrentTransactionType}
              />
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">No sell orders</p>
          )}
        </div>
      </div>
    </div>
  )
}

// Order Row Component (Direct with order data)
function OrderRowDirect({ 
  order, 
  type, 
  marketplaceTransaction,
  setCurrentTransactionType
}: { 
  order: { orderId: bigint; trader: `0x${string}`; tokenId: bigint; amount: bigint; price: bigint; filledAmount: bigint; orderType: number; status: number; createdAt: bigint; }; 
  type: 'BUY' | 'SELL';
  marketplaceTransaction: ReturnType<typeof useEnhancedTransactionState>;
  setCurrentTransactionType: (type: string) => void;
}) {
  const { marketplace } = useContracts()
  const { address } = useAccount()
  const [buyAmount, setBuyAmount] = useState<string>('')
  const [showBuyForm, setShowBuyForm] = useState<boolean>(false)

  // Format the price and calculate total
  // Assuming order.price is in tinybar (8 decimals)
  const price = fromWei(order.price, { includeUnits: false })
  const amount = (order.amount - order.filledAmount).toString() // Show remaining amount
  const total = fromWei(order.price * (order.amount - order.filledAmount), { includeUnits: false })
  const isMyOrder = order.trader.toLowerCase() === address?.toLowerCase()

  const handleCancelOrder = () => {
    try {
      setCurrentTransactionType('Cancel Order')
      marketplaceTransaction.setTransactionSubmitting(
        'Cancel Order',
        `Cancelling ${type.toLowerCase()} order #${order.orderId}...`
      )
      marketplace.cancelOrder(order.orderId)
    } catch (error) {
      marketplaceTransaction.setTransactionError(
        error instanceof Error ? error.message : 'Order cancellation failed',
        'Cancel Order Failed'
      )
    }
  }

  // Function to handle buying from a sell order
  const handleBuyFromSellOrder = () => {
    if (!buyAmount || parseInt(buyAmount) <= 0) return
    
    try {
      const buyAmountBigInt = BigInt(buyAmount)
      const totalCost = order.price * buyAmountBigInt
      
      setCurrentTransactionType('Buy Tokens')
      marketplaceTransaction.setTransactionSubmitting(
        'Buy Tokens',
        `Buying ${buyAmount} tokens at ${price} ETH each...`
      )
      
      // Place a buy order at the same price as the sell order
      // The marketplace contract will automatically match these orders
      marketplace.placeBuyOrder(order.tokenId, buyAmountBigInt, order.price)
      
      setBuyAmount('')
      setShowBuyForm(false)
    } catch (error) {
      marketplaceTransaction.setTransactionError(
        error instanceof Error ? error.message : 'Buy transaction failed',
        'Buy Failed'
      )
    }
  }

  return (
    <div className={`text-sm py-2 px-2 rounded ${
      type === 'BUY' ? 'bg-green-50' : 'bg-red-50'
    }`}>
      <div className="grid grid-cols-4 gap-4">
        <div className="font-medium">{price}</div>
        <div>{amount}</div>
        <div>{total}</div>
        <div>
          {isMyOrder ? (
            <button
              onClick={handleCancelOrder}
              className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              Cancel
            </button>
          ) : (
            type === 'SELL' && (
              <button
                onClick={() => setShowBuyForm(!showBuyForm)}
                className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
              >
                {showBuyForm ? 'Hide' : 'Buy'}
              </button>
            )
          )}
        </div>
      </div>
      
      {/* Buy form for sell orders */}
      {showBuyForm && type === 'SELL' && !isMyOrder && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="flex space-x-2">
            <input
              type="number"
              min="1"
              max={amount}
              value={buyAmount}
              onChange={(e) => setBuyAmount(e.target.value)}
              placeholder={`Amount (max: ${amount})`}
              className="flex-1 text-xs border border-gray-300 rounded px-2 py-1"
            />
            <button
              onClick={handleBuyFromSellOrder}
              disabled={!buyAmount || parseInt(buyAmount) <= 0 || parseInt(buyAmount) > parseInt(amount)}
              className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300"
            >
              Confirm
            </button>
          </div>
          {buyAmount && (
            <div className="text-xs mt-1">
              Total cost: {fromWei(order.price * BigInt(parseInt(buyAmount) || 0), { includeUnits: false })} ETH
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Order Management Display Component
function OrderManagementDisplay({
  address,
  marketplaceTransaction
}: {
  address?: `0x${string}`;
  marketplaceTransaction: ReturnType<typeof useEnhancedTransactionState>;
}) {
  const { marketplace } = useContracts()
  const [activeOrders, setActiveOrders] = useState<any[]>([])
  const [completedOrders, setCompletedOrders] = useState<any[]>([])
  const [cancelledOrders, setCancelledOrders] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeOrderTab, setActiveOrderTab] = useState<'active' | 'completed' | 'cancelled'>('active')

  // Get user's orders
  const { data: userOrders } = marketplace.useGetUserOrders(address)
  
  // Filter orders by status
  useEffect(() => {
    if (userOrders) {
      console.log('All user orders:', userOrders)
      
      const active = userOrders.filter(order => order.status === 0) // Status 0 is ACTIVE
      const filled = userOrders.filter(order => order.status === 1) // Status 1 is FILLED
      const cancelled = userOrders.filter(order => order.status === 2) // Status 2 is CANCELLED
      
      console.log('Active orders:', active)
      console.log('Completed orders:', filled)
      console.log('Cancelled orders:', cancelled)
      
      setActiveOrders(active)
      setCompletedOrders(filled)
      setCancelledOrders(cancelled)
      setIsLoading(false)
    }
  }, [userOrders])

  const handleCancelOrder = async (orderId: bigint) => {
    try {
      marketplaceTransaction.setTransactionSubmitting(
        'Cancel Order',
        `Cancelling order #${orderId.toString()}...`
      )
      await marketplace.cancelOrder(orderId)
    } catch (error) {
      marketplaceTransaction.setTransactionError(
        error instanceof Error ? error.message : 'Order cancellation failed',
        'Cancel Order Failed'
      )
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-gray-600">Loading your orders...</p>
      </div>
    )
  }

  const totalOrders = activeOrders.length + completedOrders.length + cancelledOrders.length

  return (
    <div className="space-y-6">
      {/* Order Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-blue-600">{totalOrders}</div>
              <div className="text-sm text-blue-700">Total Orders</div>
            </div>
            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-yellow-600">{activeOrders.length}</div>
              <div className="text-sm text-yellow-700">Active Orders</div>
            </div>
            <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-green-600">{completedOrders.length}</div>
              <div className="text-sm text-green-700">Completed</div>
            </div>
            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <div className="bg-red-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-red-600">{cancelledOrders.length}</div>
              <div className="text-sm text-red-700">Cancelled</div>
            </div>
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Order Tabs */}
      <div className="flex items-center justify-between border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'active', label: 'Active Orders', count: activeOrders.length, color: 'yellow' },
            { id: 'completed', label: 'Completed', count: completedOrders.length, color: 'green' },
            { id: 'cancelled', label: 'Cancelled', count: cancelledOrders.length, color: 'red' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveOrderTab(tab.id as typeof activeOrderTab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeOrderTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-2 py-1 rounded-full text-xs ${
                tab.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                tab.color === 'green' ? 'bg-green-100 text-green-700' :
                'bg-red-100 text-red-700'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
        
        {/* Refresh Button */}
        <button
          onClick={() => window.location.reload()}
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1 pb-2"
          title="Refresh orders"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh</span>
        </button>
      </div>

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-yellow-800 mb-2">Debug Info:</h3>
          <div className="grid grid-cols-3 gap-4 text-xs text-yellow-700">
            <div>Active (status=0): {activeOrders.length}</div>
            <div>Completed (status=1): {completedOrders.length}</div>
            <div>Cancelled (status=2): {cancelledOrders.length}</div>
          </div>
        </div>
      )}

      {/* Order Content */}
      <div className="bg-white border rounded-lg overflow-hidden">
        {/* Active Orders */}
        {activeOrderTab === 'active' && (
          <OrderTable 
            orders={activeOrders}
            type="active"
            onCancelOrder={handleCancelOrder}
            marketplaceTransaction={marketplaceTransaction}
          />
        )}

        {/* Completed Orders */}
        {activeOrderTab === 'completed' && (
          <OrderTable 
            orders={completedOrders}
            type="completed"
          />
        )}

        {/* Cancelled Orders */}
        {activeOrderTab === 'cancelled' && (
          <OrderTable 
            orders={cancelledOrders}
            type="cancelled"
          />
        )}
      </div>
    </div>
  )
}

// Order Table Component
function OrderTable({ 
  orders, 
  type, 
  onCancelOrder,
  marketplaceTransaction
}: { 
  orders: any[]
  type: 'active' | 'completed' | 'cancelled'
  onCancelOrder?: (orderId: bigint) => void
  marketplaceTransaction?: ReturnType<typeof useEnhancedTransactionState>
}) {
  const getStatusColor = (type: string) => {
    switch (type) {
      case 'active': return 'bg-yellow-50'
      case 'completed': return 'bg-green-50'
      case 'cancelled': return 'bg-red-50'
      default: return 'bg-gray-50'
    }
  }

  const getStatusText = (type: string) => {
    switch (type) {
      case 'active': return 'Pending Execution'
      case 'completed': return 'Filled & Executed'
      case 'cancelled': return 'Cancelled by User'
      default: return 'Unknown'
    }
  }

  const formatDate = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleString()
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
          {type === 'active' && (
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          {type === 'completed' && (
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          {type === 'cancelled' && (
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>
        <p className="text-gray-500 text-lg font-medium">No {type} orders</p>
        <p className="text-gray-400 text-sm mt-1">{getStatusText(type)} orders will appear here</p>
      </div>
    )
  }

  return (
    <div>
      {/* Table Header */}
      <div className={`grid ${type === 'active' ? 'grid-cols-10' : 'grid-cols-9'} gap-4 text-sm font-medium text-gray-700 bg-gray-50 px-4 py-3 border-b`}>
        <div>Order ID</div>
        <div>Type</div>
        <div>Token ID</div>
        <div>Amount</div>
        <div>Filled</div>
        <div>Price (ETH)</div>
        <div>Total (ETH)</div>
        <div>Status</div>
        <div>Created</div>
        {type === 'active' && <div>Actions</div>}
      </div>
      
      {/* Table Rows */}
      {orders.map((order) => (
        <div 
          key={order.orderId.toString()} 
          className={`grid ${type === 'active' ? 'grid-cols-10' : 'grid-cols-9'} gap-4 text-sm py-3 px-4 border-b last:border-b-0 ${
            order.orderType === 0 ? 'bg-green-50' : 'bg-red-50'
          }`}
        >
          <div className="font-mono">#{order.orderId.toString()}</div>
          <div className={`font-medium ${order.orderType === 0 ? 'text-green-600' : 'text-red-600'}`}>
            {order.orderType === 0 ? 'BUY' : 'SELL'}
          </div>
          <div className="font-mono">#{order.tokenId.toString()}</div>
          <div>{order.amount.toString()}</div>
          <div className="space-y-1">
            <div className={type === 'completed' ? 'text-green-600 font-medium' : ''}>
              {order.filledAmount?.toString() || '0'}
              {type === 'active' && order.amount > 0 && (
                <span className="text-gray-500 text-xs ml-1">
                  ({Math.round((Number(order.filledAmount || 0) / Number(order.amount)) * 100)}%)
                </span>
              )}
            </div>
            {type === 'active' && order.amount > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-1">
                <div 
                  className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.round((Number(order.filledAmount || 0) / Number(order.amount)) * 100)}%` 
                  }}
                />
              </div>
            )}
          </div>
          <div className="font-mono">{fromWei(order.price, { includeUnits: false })}</div>
          <div className="font-mono font-medium">{fromWei(order.price * order.amount, { includeUnits: false })}</div>
          <div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              type === 'active' ? 'bg-yellow-100 text-yellow-700' :
              type === 'completed' ? 'bg-green-100 text-green-700' :
              'bg-red-100 text-red-700'
            }`}>
              {type === 'active' ? 'Pending' : type === 'completed' ? 'Filled' : 'Cancelled'}
            </span>
          </div>
          <div className="text-xs text-gray-500" title={formatDate(order.createdAt)}>
            {new Date(Number(order.createdAt) * 1000).toLocaleDateString()}
          </div>
          {type === 'active' && (
            <div>
              <button
                onClick={() => onCancelOrder?.(order.orderId)}
                disabled={marketplaceTransaction?.transaction.status === 'pending'}
                className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Cancel this order"
              >
                {marketplaceTransaction?.transaction.status === 'pending' ? 'Cancelling...' : 'Cancel'}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// Token Balance Card Component
function TokenBalanceCard({ 
  tokenId, 
  balance, 
  marketplaceTransaction,
  setCurrentTransactionType
}: { 
  tokenId: bigint; 
  balance: bigint;
  marketplaceTransaction: ReturnType<typeof useEnhancedTransactionState>;
  setCurrentTransactionType: (type: string) => void;
}) {
  const { token, marketplace } = useContracts()
  const { data: tokenInfo } = token.useGetTokenInfo(tokenId)
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [showActions, setShowActions] = useState(false)

  const handleDepositTokens = () => {
    if (!depositAmount) return
    try {
      setCurrentTransactionType('Token Deposit')
      marketplaceTransaction.setTransactionSubmitting(
        'Token Deposit',
        `Depositing ${depositAmount} tokens (ID: ${tokenId}) to marketplace...`
      )
      marketplace.depositTokens(tokenId, BigInt(depositAmount))
      setDepositAmount('')
    } catch (error) {
      marketplaceTransaction.setTransactionError(
        error instanceof Error ? error.message : 'Token deposit failed',
        'Token Deposit Failed'
      )
    }
  }

  const handleWithdrawTokens = () => {
    if (!withdrawAmount) return
    try {
      setCurrentTransactionType('Token Withdrawal')
      marketplaceTransaction.setTransactionSubmitting(
        'Token Withdrawal',
        `Withdrawing ${withdrawAmount} tokens (ID: ${tokenId}) from marketplace...`
      )
      marketplace.withdrawTokens(tokenId, BigInt(withdrawAmount))
      setWithdrawAmount('')
    } catch (error) {
      marketplaceTransaction.setTransactionError(
        error instanceof Error ? error.message : 'Token withdrawal failed',
        'Token Withdrawal Failed'
      )
    }
  }

  if (!tokenInfo) return null

  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <div className="flex justify-between items-center">
        <div>
          <div className="font-medium">{tokenInfo.name} (#{tokenId.toString()})</div>
          <div className="text-sm text-gray-600">{tokenInfo.companyName}</div>
        </div>
        <div className="text-right">
          <div className="font-medium text-green-600">{balance.toString()}</div>
          <div className="text-sm text-gray-600">available for trading</div>
        </div>
      </div>
      
      <div className="mt-2">
        <button
          onClick={() => setShowActions(!showActions)}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          {showActions ? 'Hide Actions' : 'Deposit/Withdraw'}
        </button>
      </div>

      {showActions && (
        <div className="mt-3 space-y-2">
          {/* Deposit Tokens */}
          <div className="flex space-x-2">
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="Amount to deposit"
              className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-gray-900"
            />
            <button
              onClick={handleDepositTokens}
              disabled={!depositAmount}
              className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
            >
              Deposit
            </button>
          </div>
          
          {/* Withdraw Tokens */}
          <div className="flex space-x-2">
            <input
              type="number"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="Amount to withdraw"
              className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-gray-900"
            />
            <button
              onClick={handleWithdrawTokens}
              disabled={!withdrawAmount}
              className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-300"
            >
              Withdraw
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

