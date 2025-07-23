'use client'

import { useAccount } from 'wagmi'
import { useContractOwner } from '../../hooks/useContractOwner'
import { AdminBadge } from '../../components/AdminBadge'

export default function AdminTestPage() {
  const { address, isConnected } = useAccount()
  const { isOwner, ownerAddress, isLoading } = useContractOwner()

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Test Page</h1>
      
      <div className="space-y-6">
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">Connection Status</h2>
          <div className="space-y-2">
            <p><strong>Connected:</strong> {isConnected ? 'Yes' : 'No'}</p>
            <p><strong>Your Address:</strong> {address || 'Not connected'}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">Owner Status</h2>
          <div className="space-y-2">
            <p><strong>Loading:</strong> {isLoading ? 'Yes' : 'No'}</p>
            <p><strong>Contract Owner Address:</strong> {ownerAddress || 'Loading...'}</p>
            <p><strong>You are Owner:</strong> {isOwner ? 'Yes' : 'No'}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">Admin Badge Test</h2>
          <div className="flex items-center space-x-4">
            <span>Admin Badge:</span>
            <AdminBadge />
            {!isOwner && <span className="text-gray-500">(Only shows if you&apos;re the contract owner)</span>}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Instructions:</h3>
          <ol className="list-decimal list-inside text-blue-800 space-y-1">
            <li>Connect your wallet</li>
            <li>If you&apos;re the contract owner, you should see &quot;Admin&quot; badge</li>
            <li>The badge will also appear in the main navigation wallet dropdown</li>
          </ol>
        </div>
      </div>
    </div>
  )
}