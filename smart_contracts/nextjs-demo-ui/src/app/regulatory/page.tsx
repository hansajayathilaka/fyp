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
import { UserManagement } from '../../components/UserManagement'
import { UserSearch, UserProfileCard } from '../../components/UserSearch'
import { SSISignIn } from '../../components/SSISignIn'
import { clsx } from 'clsx'

export default function RegulatoryPage() {
  return (
    <ClientOnly fallback={
      <PageLoadingFallback 
        title="Regulatory Management" 
        description="Loading regulatory contracts and user validation system..."
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

  // Handle SSI sign-in success
  const handleSSISignInSuccess = async (ssiData: { identifier: string; userType: number }) => {
    try {
      const userTypeText = ssiData.userType === 0 ? 'Individual' : 'Company'
      regulatoryTransaction.setTransactionSubmitting(
        'User Registration',
        `Registering ${userTypeText} user with SSI: ${ssiData.identifier}...`
      )
      
      // Update form state for display purposes
      setRegistrationForm({
        ssiIdentifier: ssiData.identifier,
        userType: ssiData.userType
      })
      
      regulatory.registerUser(ssiData.identifier, ssiData.userType)
    } catch (error) {
      regulatoryTransaction.setTransactionError(
        error instanceof Error ? error.message : 'Registration failed',
        'User Registration Failed'
      )
    }
  }

  // Handle SSI sign-in error
  const handleSSISignInError = (error: string) => {
    regulatoryTransaction.setTransactionError(error, 'SSI Sign-in Failed')
  }

  // Handle user validation
  const handleValidateUser = async (userAddress: string) => {
    try {
      regulatoryTransaction.setTransactionSubmitting(
        'User Validation',
        `Validating user ${userAddress.slice(0, 10)}...${userAddress.slice(-8)}...`
      )
      regulatory.verifyUser(userAddress as `0x${string}`)
    } catch (error) {
      regulatoryTransaction.setTransactionError(
        error instanceof Error ? error.message : 'Validation failed',
        'User Validation Failed'
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

  // Show limited interface for non-connected users (SSI registration only)
  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Regulatory Management
        </h1>
        
        {/* SSI Registration Section for Non-Connected Users */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Register with SSI</h2>
          
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-gray-600 mb-6">
                Use your Self-Sovereign Identity (SSI) to register on the platform. 
                Your identity will be validated through our secure SSI provider.
              </p>
              
              <SSISignIn
                onSignInSuccess={handleSSISignInSuccess}
                onSignInError={handleSSISignInError}
                disabled={regulatory.isPending}
              />
            </div>

            {/* Show registration details after SSI sign-in */}
            {registrationForm.ssiIdentifier && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">Registration Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700 font-medium">SSI Identifier:</span>
                    <span className="ml-2 text-blue-900">{registrationForm.ssiIdentifier}</span>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">User Type:</span>
                    <span className="ml-2 text-blue-900">
                      {registrationForm.userType === 0 ? 'Individual' : 'Company'}
                    </span>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 text-sm">
                    <strong>Next Step:</strong> Connect your wallet below to complete the registration process and access all platform features.
                  </p>
                </div>
              </div>
            )}

            {/* Information about SSI */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">About SSI Registration</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Your identity is validated through a secure, decentralized process</li>
                <li>• No personal data is stored on our servers</li>
                <li>• You maintain full control over your identity credentials</li>
                <li>• Registration is required for trading and platform access</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Wallet Connection Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Connect Wallet</h2>
          <p className="text-gray-600 mb-4">
            After SSI registration, connect your wallet to complete the process and access all regulatory management features.
          </p>
          <WalletConnect />
        </div>

        {/* Transaction Feedback */}
        {regulatoryTransaction.transaction.status !== 'idle' && (
          <div className="mt-6">
            <TransactionFeedback 
              transaction={regulatoryTransaction.transaction}
              className="mt-6"
              showImmediate={true}
            />
          </div>
        )}
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
              <span className="text-blue-700 font-medium">Validated:</span>
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
            { id: 'users', label: 'All Users' },
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
            
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-gray-600 mb-6">
                  Use your Self-Sovereign Identity (SSI) to register on the platform. 
                  Your identity will be validated through our secure SSI provider.
                </p>
                
                <SSISignIn
                  onSignInSuccess={handleSSISignInSuccess}
                  onSignInError={handleSSISignInError}
                  disabled={regulatory.isPending}
                />
              </div>

              {/* Show registration details after SSI sign-in */}
              {registrationForm.ssiIdentifier && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-medium text-blue-900 mb-2">Registration Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-blue-700 font-medium">SSI Identifier:</span>
                      <span className="ml-2 text-blue-900">{registrationForm.ssiIdentifier}</span>
                    </div>
                    <div>
                      <span className="text-blue-700 font-medium">User Type:</span>
                      <span className="ml-2 text-blue-900">
                        {registrationForm.userType === 0 ? 'Individual' : 'Company'}
                      </span>
                    </div>
                  </div>
                  
                  {regulatory.isPending && (
                    <div className="mt-4 flex items-center space-x-2 text-blue-700">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm">Processing registration...</span>
                    </div>
                  )}
                </div>
              )}

              {/* Information about SSI */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">About SSI Registration</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Your identity is validated through a secure, decentralized process</li>
                  <li>• No personal data is stored on our servers</li>
                  <li>• You maintain full control over your identity credentials</li>
                  <li>• Registration is required for trading and platform access</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* All Users Tab */}
        {activeTab === 'users' && (
          <UserManagement 
            onUserSelect={setUserManagementAddress}
            selectedAddress={userManagementAddress}
          />
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
                  <h3 className="text-lg font-semibold text-green-900">Validated Users</h3>
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
                  <h3 className="text-lg font-semibold text-gray-900">Validation Rate</h3>
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
