'use client'

import { useState } from 'react'
import { useRegulatoryManagement } from '../contracts/hooks'
import { useContractOwner } from '../hooks/useContractOwner'
import { type UserProfile, getUserTypeDisplayName } from '../types/regulatory'
import { clsx } from 'clsx'

interface UserQuickActionsProps {
  userAddress: string
  userProfile?: UserProfile
  onActionComplete?: () => void
  className?: string
}

export function UserQuickActions({ 
  userAddress, 
  userProfile, 
  onActionComplete,
  className 
}: UserQuickActionsProps) {
  const { isOwner } = useContractOwner()
  const regulatory = useRegulatoryManagement()
  const [isProcessing, setIsProcessing] = useState(false)

  if (!isOwner || !userProfile) {
    return null
  }

  const handleVerifyUser = async () => {
    if (isProcessing) return
    
    try {
      setIsProcessing(true)
      await regulatory.verifyUser(userAddress as `0x${string}`)
      onActionComplete?.()
    } catch (error) {
      console.error('Failed to verify user:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSuspendUser = async () => {
    if (isProcessing) return
    
    try {
      setIsProcessing(true)
      await regulatory.suspendUser(userAddress as `0x${string}`)
      onActionComplete?.()
    } catch (error) {
      console.error('Failed to suspend user:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleUnsuspendUser = async () => {
    if (isProcessing) return
    
    try {
      setIsProcessing(true)
      await regulatory.unsuspendUser(userAddress as `0x${string}`)
      onActionComplete?.()
    } catch (error) {
      console.error('Failed to unsuspend user:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className={clsx("flex items-center space-x-2", className)}>
      {/* Verify User */}
      {!userProfile.isVerified && !userProfile.isSuspended && (
        <button
          onClick={handleVerifyUser}
          disabled={isProcessing}
          className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Verify User"
        >
          {isProcessing ? 'Verifying...' : 'Verify'}
        </button>
      )}

      {/* Suspend/Unsuspend User */}
      {userProfile.isSuspended ? (
        <button
          onClick={handleUnsuspendUser}
          disabled={isProcessing}
          className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Unsuspend User"
        >
          {isProcessing ? 'Processing...' : 'Unsuspend'}
        </button>
      ) : (
        <button
          onClick={handleSuspendUser}
          disabled={isProcessing}
          className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Suspend User"
        >
          {isProcessing ? 'Processing...' : 'Suspend'}
        </button>
      )}
    </div>
  )
}

interface UserDetailsModalProps {
  userAddress: string
  isOpen: boolean
  onClose: () => void
}

export function UserDetailsModal({ userAddress, isOpen, onClose }: UserDetailsModalProps) {
  const regulatory = useRegulatoryManagement()
  const { data: userProfile, isLoading } = regulatory.useGetUserProfile(userAddress as `0x${string}`)
  
  const profile = userProfile as UserProfile | undefined

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 10)}...${addr.slice(-8)}`
  }

  const formatDateTime = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleString()
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">User Details</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading user profile...</p>
            </div>
          ) : profile ? (
            <div className="space-y-6">
              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Wallet Address</label>
                <div className="flex items-center space-x-2">
                  <code className="flex-1 px-3 py-2 bg-gray-50 border rounded-md text-sm font-mono">
                    {userAddress}
                  </code>
                  <button
                    onClick={() => copyToClipboard(userAddress)}
                    className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                    title="Copy address"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Profile Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SSI Identifier</label>
                  <div className="px-3 py-2 bg-gray-50 border rounded-md text-sm">
                    {profile.ssiIdentifier}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User Type</label>
                  <div className="px-3 py-2 bg-gray-50 border rounded-md text-sm">
                    {getUserTypeDisplayName(Number(profile.userType))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Registration Date</label>
                  <div className="px-3 py-2 bg-gray-50 border rounded-md text-sm">
                    {formatDateTime(profile.registrationDate)}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <div className="flex items-center space-x-2">
                    {profile.isVerified ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                        Verified
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                        Pending Verification
                      </span>
                    )}
                    {profile.isSuspended && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                        Suspended
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Permissions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Permissions</label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <div className={clsx(
                      "w-3 h-3 rounded-full",
                      profile.canTrade ? "bg-green-400" : "bg-red-400"
                    )} />
                    <span className="text-sm text-gray-700">Can Trade</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={clsx(
                      "w-3 h-3 rounded-full",
                      profile.canCreateTokens ? "bg-green-400" : "bg-red-400"
                    )} />
                    <span className="text-sm text-gray-700">Can Create Tokens</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="pt-4 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-3">Admin Actions</label>
                <UserQuickActions 
                  userAddress={userAddress}
                  userProfile={profile}
                  onActionComplete={onClose}
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">User profile not found or not registered.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}