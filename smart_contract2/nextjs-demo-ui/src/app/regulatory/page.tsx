/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment */
'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useRegulatoryManagement } from '../../contracts/hooks'
import { TransactionFeedback, useEnhancedTransactionState } from '../../components/TransactionFeedback'
import { WalletConnect } from '../../components/WalletConnect'
import { ClientOnly } from '../../components/ClientOnly'
import { PageLoadingFallback } from '../../components/PageLoadingFallback'
import { 
  type UserProfile, 
  type PlatformStatsResult, 
  type RegistrationFormState, 
  type RegulatoryTab,
  convertPlatformStats,
  getUserTypeDisplayName
} from '../../types/regulatory'
import { clsx } from 'clsx'

export default function RegulatoryPage() {
  return (
    <ClientOnly fallback={
      <PageLoadingFallback 
        title="Regulatory Management" 
        description="Loading regulatory contracts and user verification system..."
        className="max-w-4xl"
      />
    }>
      <RegulatoryContent />
    </ClientOnly>
  )
}

function RegulatoryContent() {
  const { address, isConnected } = useAccount()
  const regulatory = useRegulatoryManagement()
  const regulatoryTransaction = useEnhancedTransactionState()

  // Form states
  const [registrationForm, setRegistrationForm] = useState<RegistrationFormState>({
    ssiIdentifier: '',
    userType: 0 // 0 = Individual, 1 = Company
  })
  const [userManagementAddress, setUserManagementAddress] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)

  // Data states
  const [activeTab, setActiveTab] = useState<RegulatoryTab>('register')

  // Contract data hooks
  const { data: currentUserProfile } = regulatory.useGetUserProfile(address)
  const { data: platformStats } = regulatory.useGetPlatformStats()
  const { data: selectedUserProfile } = regulatory.useGetUserProfile(userManagementAddress as `0x${string}`)

  // Convert contract data
  const userProfile = currentUserProfile as UserProfile | undefined
  const selectedUserData = selectedUserProfile as UserProfile | undefined
  const platformStatsData = platformStats ? convertPlatformStats(platformStats as PlatformStatsResult) : null

  // Handle user registration
  const handleRegisterUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!registrationForm.ssiIdentifier.trim()) return

    try {
      const userTypeText = registrationForm.userType === 0 ? 'Individual' : 'Company'
      regulatoryTransaction.setTransactionSubmitting(
        'User Registration',
        `Registering ${userTypeText} user with SSI: ${registrationForm.ssiIdentifier}...`
      )
      regulatory.registerUser(registrationForm.ssiIdentifier, registrationForm.userType)
    } catch (error) {
      regulatoryTransaction.setTransactionError(
        error instanceof Error ? error.message : 'Registration failed',
        'User Registration Failed'
      )
    }
  }

  // Handle user verification
  const handleVerifyUser = async (userAddress: string) => {
    try {
      regulatoryTransaction.setTransactionSubmitting(
        'User Verification',
        `Verifying user ${userAddress.slice(0, 10)}...${userAddress.slice(-8)}...`
      )
      regulatory.verifyUser(userAddress as `0x${string}`)
    } catch (error) {
      regulatoryTransaction.setTransactionError(
        error instanceof Error ? error.message : 'Verification failed',
        'User Verification Failed'
      )
    }
  }

  // Handle user suspension
  const handleSuspendUser = async (userAddress: string) => {
    try {
      regulatoryTransaction.setTransactionSubmitting(
        'User Suspension',
        `Suspending user ${userAddress.slice(0, 10)}...${userAddress.slice(-8)}...`
      )
      regulatory.suspendUser(userAddress as `0x${string}`)
    } catch (error) {
      regulatoryTransaction.setTransactionError(
        error instanceof Error ? error.message : 'Suspension failed',
        'User Suspension Failed'
      )
    }
  }

  // Handle user unsuspension
  const handleUnsuspendUser = async (userAddress: string) => {
    try {
      regulatoryTransaction.setTransactionSubmitting(
        'User Unsuspension',
        `Unsuspending user ${userAddress.slice(0, 10)}...${userAddress.slice(-8)}...`
      )
      regulatory.unsuspendUser(userAddress as `0x${string}`)
    } catch (error) {
      regulatoryTransaction.setTransactionError(
        error instanceof Error ? error.message : 'Unsuspension failed',
        'User Unsuspension Failed'
      )
    }
  }

  // Watch for transaction hash from contract writes
  useEffect(() => {
    if (regulatory.data) {
      regulatoryTransaction.setTransactionHash(regulatory.data)
    }
  }, [regulatory.data, regulatoryTransaction.setTransactionHash])

  // Watch for contract errors
  useEffect(() => {
    if (regulatory.error) {
      regulatoryTransaction.setTransactionError(regulatory.error.message, 'Transaction Error')
    }
  }, [regulatory.error, regulatoryTransaction.setTransactionError])

  // Update selected user when address changes
  useEffect(() => {
    if (selectedUserData) {
      setSelectedUser(selectedUserData)
    } else {
      setSelectedUser(null)
    }
  }, [selectedUserData])

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Regulatory Management
        </h1>
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <p className="text-gray-600 mb-4">
            Please connect your wallet to access regulatory management features.
          </p>
          <WalletConnect />
        </div>
      </div>
    )
  }

  const handleRefresh = () => {
    window.location.reload()
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Regulatory Management
        </h1>
        
        {/* Manual refresh button */}
        <button
          onClick={handleRefresh}
          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          title="Refresh regulatory data"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Current User Status */}
      {userProfile && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">Your Profile</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-blue-700 font-medium">Type:</span>
              <span className="ml-2 text-blue-900">{getUserTypeDisplayName(Number(userProfile.userType))}</span>
            </div>
            <div>
              <span className="text-blue-700 font-medium">Verified:</span>
              <span className={clsx("ml-2", userProfile.isVerified ? "text-green-600" : "text-red-600")}>
                {userProfile.isVerified ? "Yes" : "No"}
              </span>
            </div>
            <div>
              <span className="text-blue-700 font-medium">Can Trade:</span>
              <span className={clsx("ml-2", userProfile.canTrade ? "text-green-600" : "text-red-600")}>
                {userProfile.canTrade ? "Yes" : "No"}
              </span>
            </div>
            <div>
              <span className="text-blue-700 font-medium">Status:</span>
              <span className={clsx("ml-2", userProfile.isSuspended ? "text-red-600" : "text-green-600")}>
                {userProfile.isSuspended ? "Suspended" : "Active"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'register', label: 'User Registration' },
            { id: 'verify', label: 'User Verification' },
            { id: 'manage', label: 'User Management' },
            { id: 'stats', label: 'Platform Statistics' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as RegulatoryTab)}
              className={clsx(
                'py-2 px-1 border-b-2 font-medium text-sm',
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* User Registration Tab */}
        {activeTab === 'register' && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Register New User</h2>
            
            <form onSubmit={handleRegisterUser} className="space-y-4">
              <div>
                <label htmlFor="ssiIdentifier" className="block text-sm font-medium text-gray-700 mb-1">
                  SSI Identifier
                </label>
                <input
                  type="text"
                  id="ssiIdentifier"
                  value={registrationForm.ssiIdentifier}
                  onChange={(e) => setRegistrationForm(prev => ({ ...prev, ssiIdentifier: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  placeholder="Enter SSI identifier"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">User Type</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="userType"
                      value={0}
                      checked={registrationForm.userType === 0}
                      onChange={() => setRegistrationForm(prev => ({ ...prev, userType: 0 }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Individual</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="userType"
                      value={1}
                      checked={registrationForm.userType === 1}
                      onChange={() => setRegistrationForm(prev => ({ ...prev, userType: 1 }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Company</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={regulatory.isPending || !registrationForm.ssiIdentifier.trim()}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {regulatory.isPending ? 'Registering...' : 'Register User'}
              </button>
            </form>
          </div>
        )}

        {/* User Verification Tab */}
        {activeTab === 'verify' && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">User Verification</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="verifyAddress" className="block text-sm font-medium text-gray-700 mb-1">
                  User Address to Verify
                </label>
                <input
                  type="text"
                  id="verifyAddress"
                  value={userManagementAddress}
                  onChange={(e) => setUserManagementAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  placeholder="0x..."
                />
              </div>

              {selectedUser && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">User Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">SSI ID:</span>
                      <span className="ml-2 text-gray-900">{selectedUser.ssiIdentifier}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Type:</span>
                      <span className="ml-2 text-gray-900">{getUserTypeDisplayName(Number(selectedUser.userType))}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Verified:</span>
                      <span className={clsx("ml-2", selectedUser.isVerified ? "text-green-600" : "text-red-600")}>
                        {selectedUser.isVerified ? "Yes" : "No"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Status:</span>
                      <span className={clsx("ml-2", selectedUser.isSuspended ? "text-red-600" : "text-green-600")}>
                        {selectedUser.isSuspended ? "Suspended" : "Active"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={() => handleVerifyUser(userManagementAddress)}
                disabled={regulatory.isPending || !userManagementAddress || !selectedUser || selectedUser.isVerified}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {regulatory.isPending ? 'Verifying...' : 'Verify User'}
              </button>
            </div>
          </div>
        )}

        {/* User Management Tab */}
        {activeTab === 'manage' && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">User Management</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="manageAddress" className="block text-sm font-medium text-gray-700 mb-1">
                  User Address to Manage
                </label>
                <input
                  type="text"
                  id="manageAddress"
                  value={userManagementAddress}
                  onChange={(e) => setUserManagementAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  placeholder="0x..."
                />
              </div>

              {selectedUser && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">User Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <span className="text-gray-600">SSI ID:</span>
                      <span className="ml-2 text-gray-900">{selectedUser.ssiIdentifier}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Type:</span>
                      <span className="ml-2 text-gray-900">{getUserTypeDisplayName(Number(selectedUser.userType))}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Verified:</span>
                      <span className={clsx("ml-2", selectedUser.isVerified ? "text-green-600" : "text-red-600")}>
                        {selectedUser.isVerified ? "Yes" : "No"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Can Trade:</span>
                      <span className={clsx("ml-2", selectedUser.canTrade ? "text-green-600" : "text-red-600")}>
                        {selectedUser.canTrade ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    {selectedUser.isSuspended ? (
                      <button
                        onClick={() => handleUnsuspendUser(userManagementAddress)}
                        disabled={regulatory.isPending}
                        className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {regulatory.isPending ? 'Processing...' : 'Unsuspend User'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSuspendUser(userManagementAddress)}
                        disabled={regulatory.isPending}
                        className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {regulatory.isPending ? 'Processing...' : 'Suspend User'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Platform Statistics Tab */}
        {activeTab === 'stats' && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Platform Statistics</h2>
            
            {platformStatsData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-blue-900">Total Users</h3>
                  <p className="text-3xl font-bold text-blue-600">{platformStatsData.totalUsers.toString()}</p>
                </div>
                
                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-green-900">Verified Users</h3>
                  <p className="text-3xl font-bold text-green-600">{platformStatsData.verifiedUsers.toString()}</p>
                </div>
                
                <div className="bg-purple-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-purple-900">Company Users</h3>
                  <p className="text-3xl font-bold text-purple-600">{platformStatsData.companyUsers.toString()}</p>
                </div>
                
                <div className="bg-indigo-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-indigo-900">Individual Users</h3>
                  <p className="text-3xl font-bold text-indigo-600">{platformStatsData.individualUsers.toString()}</p>
                </div>
                
                <div className="bg-red-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-red-900">Suspended Users</h3>
                  <p className="text-3xl font-bold text-red-600">{platformStatsData.suspendedUsers.toString()}</p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900">Verification Rate</h3>
                  <p className="text-3xl font-bold text-gray-600">
                    {platformStatsData.totalUsers > BigInt(0)
                      ? Math.round(Number(platformStatsData.verifiedUsers * BigInt(100) / platformStatsData.totalUsers))
                      : 0}%
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Loading platform statistics...</p>
              </div>
            )}
          </div>
        )}

        {/* Enhanced Transaction Feedback */}
        {regulatoryTransaction.transaction.status !== 'idle' && (
          <TransactionFeedback 
            transaction={regulatoryTransaction.transaction}
            className="mt-6"
            showImmediate={true}
          />
        )}
      </div>
    </div>
  )
}
