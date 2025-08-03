'use client'

import { useState, useMemo } from 'react'
import { useAccount } from 'wagmi'
import { useRegulatoryManagement } from '../contracts/hooks'
import { useContractOwner } from '../hooks/useContractOwner'
import { clsx } from 'clsx'
import { type UserProfile, getUserTypeDisplayName } from '../types/regulatory'
import { UserQuickActions, UserDetailsModal } from './UserQuickActions'
import { useEnhancedTransactionState, TransactionFeedback } from './TransactionFeedback'

interface UserManagementProps {
  onUserSelect?: (address: string) => void
  selectedAddress?: string
}

export function UserManagement({ onUserSelect, selectedAddress }: UserManagementProps) {
  const { address: currentAddress } = useAccount()
  const { isOwner } = useContractOwner()
  const regulatory = useRegulatoryManagement()

  // State
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'active' | 'individual' | 'company' | 'verified' | 'suspended'>('active')
  const [sortBy, setSortBy] = useState<'address' | 'registration' | 'type' | 'status'>('registration')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedUserForModal, setSelectedUserForModal] = useState<string | null>(null)

  // Transaction state for user management actions
  const userManagementTransaction = useEnhancedTransactionState()

  // Data fetching
  const { data: allUsers, isLoading: isLoadingUsers } = regulatory.useGetAllUsers()
  const { data: verifiedUsers } = regulatory.useGetVerifiedUsers()
  const { data: individualUsers } = regulatory.useGetUsersByType(0)
  const { data: companyUsers } = regulatory.useGetUsersByType(1)
  const { data: platformStats } = regulatory.useGetPlatformStats()

  // Calculate active users (non-suspended) - we'll need to filter this from all users
  const activeUsers = useMemo(() => {
    // For now, we'll handle this in the filteredUsers logic since we need to check each user's profile
    // This is a placeholder that will be used in the filter tabs count
    return allUsers || []
  }, [allUsers])

  // Filter and search users
  const filteredUsers = useMemo(() => {
    if (!allUsers || !Array.isArray(allUsers)) return []

    let filtered = [...allUsers] as string[]

    // Apply type filter
    switch (filterType) {
      case 'active':
        // For active users, we'll filter out suspended users in the UserCard component
        // by not rendering suspended users when this filter is active
        filtered = [...allUsers] as string[]
        break
      case 'individual':
        filtered = individualUsers && Array.isArray(individualUsers) ? [...individualUsers] as string[] : []
        break
      case 'company':
        filtered = companyUsers && Array.isArray(companyUsers) ? [...companyUsers] as string[] : []
        break
      case 'verified':
        filtered = verifiedUsers && Array.isArray(verifiedUsers) ? [...verifiedUsers] as string[] : []
        break
      case 'suspended':
        // For suspended users, we'll need to check each user's profile
        // This is handled in the UserCard component
        break
    }

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(userAddress =>
        userAddress.toLowerCase().includes(searchLower)
      )
    }

    return filtered
  }, [allUsers, individualUsers, companyUsers, verifiedUsers, filterType, searchTerm])

  const handleUserClick = (userAddress: string) => {
    if (onUserSelect) {
      onUserSelect(userAddress)
    }
  }

  const handleSort = (newSortBy: typeof sortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(newSortBy)
      setSortOrder('desc')
    }
  }

  if (isLoadingUsers) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="text-center py-8">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading users...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">All Registered Users</h2>
        <div className="text-sm text-gray-600">
          {filteredUsers.length} of {allUsers?.length || 0} users
        </div>
      </div>

      {/* Platform Stats Summary */}
      {platformStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-lg font-bold text-blue-600">{(platformStats as any)[0]?.toString() || '0'}</div>
            <div className="text-xs text-blue-700">Total Users</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-lg font-bold text-green-600">{(platformStats as any)[1]?.toString() || '0'}</div>
            <div className="text-xs text-green-700">Verified</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3">
            <div className="text-lg font-bold text-purple-600">{(platformStats as any)[2]?.toString() || '0'}</div>
            <div className="text-xs text-purple-700">Companies</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3">
            <div className="text-lg font-bold text-red-600">{(platformStats as any)[4]?.toString() || '0'}</div>
            <div className="text-xs text-red-700">Suspended</div>
          </div>
        </div>
      )}

      {/* Search and Filter Controls */}
      <div className="space-y-4 mb-6">
        {/* Search Input */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="userSearch" className="block text-sm font-medium text-gray-700 mb-1">
              Search Users
            </label>
            <div className="relative">
              <input
                type="text"
                id="userSearch"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                placeholder="Search by wallet address..."
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Sort Controls */}
          <div className="sm:w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [newSortBy, newSortOrder] = e.target.value.split('-') as [typeof sortBy, typeof sortOrder]
                setSortBy(newSortBy)
                setSortOrder(newSortOrder)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
            >
              <option value="registration-desc">Newest First</option>
              <option value="registration-asc">Oldest First</option>
              <option value="address-asc">Address A-Z</option>
              <option value="address-desc">Address Z-A</option>
            </select>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'active', label: 'Active Users', count: (allUsers?.length || 0) - (platformStats ? Number((platformStats as any)[4]?.toString() || '0') : 0) },
            { id: 'all', label: 'All Users', count: allUsers?.length || 0 },
            { id: 'individual', label: 'Individual', count: individualUsers?.length || 0 },
            { id: 'company', label: 'Company', count: companyUsers?.length || 0 },
            { id: 'verified', label: 'Verified', count: verifiedUsers?.length || 0 },
            { id: 'suspended', label: 'Suspended', count: platformStats ? Number((platformStats as any)[4]?.toString() || '0') : 0 },
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setFilterType(filter.id as typeof filterType)}
              className={clsx(
                'px-3 py-1 rounded-full text-sm font-medium transition-colors',
                filterType === filter.id
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
              )}
            >
              {filter.label} ({filter.count})
            </button>
          ))}
        </div>
      </div>

      {/* Users List */}
      <div className="space-y-3">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <p className="text-gray-600">No users found</p>
            {searchTerm && (
              <p className="text-sm text-gray-500 mt-1">
                Try adjusting your search terms or filters
              </p>
            )}
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="hidden md:grid md:grid-cols-12 gap-4 px-4 py-2 bg-gray-50 rounded-lg text-sm font-medium text-gray-700">
              <div className="col-span-3">Address</div>
              <div className="col-span-2">SSI Identifier</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Registration</div>
              <div className="col-span-1">Actions</div>
            </div>

            {/* User Cards */}
            {filteredUsers.map((userAddress) => (
              <UserCard
                key={userAddress}
                userAddress={userAddress}
                isSelected={selectedAddress === userAddress}
                isCurrentUser={userAddress === currentAddress}
                isAdmin={isOwner}
                onClick={() => handleUserClick(userAddress)}
                onViewDetails={() => setSelectedUserForModal(userAddress)}
                transactionState={userManagementTransaction}
                filterType={filterType}
              />
            ))}
          </>
        )}
      </div>

      {/* Transaction Feedback for User Management Actions */}
      {userManagementTransaction.transaction.status !== 'idle' && (
        <div className="mt-6">
          <TransactionFeedback
            transaction={userManagementTransaction.transaction}
            showImmediate={true}
          />
        </div>
      )}

      {/* User Details Modal */}
      {selectedUserForModal && (
        <UserDetailsModal
          userAddress={selectedUserForModal}
          isOpen={!!selectedUserForModal}
          onClose={() => setSelectedUserForModal(null)}
        />
      )}
    </div>
  )
}

interface UserCardProps {
  userAddress: string
  isSelected: boolean
  isCurrentUser: boolean
  isAdmin: boolean
  onClick: () => void
  onViewDetails: () => void
  transactionState: ReturnType<typeof useEnhancedTransactionState>
  filterType: 'all' | 'active' | 'individual' | 'company' | 'verified' | 'suspended'
}

function UserCard({ userAddress, isSelected, isCurrentUser, isAdmin, onClick, onViewDetails, transactionState, filterType }: UserCardProps) {
  const regulatory = useRegulatoryManagement()
  const { data: userProfile, isLoading } = regulatory.useGetUserProfile(userAddress as `0x${string}`)

  const profile = userProfile as UserProfile | undefined

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const formatFullAddress = (addr: string) => {
    return `${addr.slice(0, 10)}...${addr.slice(-8)}`
  }

  const formatDate = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString()
  }

  const formatDateTime = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleString()
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  if (isLoading) {
    return (
      <div className="p-4 border border-gray-200 rounded-lg bg-white">
        <div className="animate-pulse">
          <div className="flex items-center space-x-2 mb-2">
            <div className="h-4 bg-gray-200 rounded w-32"></div>
            <div className="h-4 bg-gray-200 rounded w-16"></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  // Filter logic based on user profile and filter type
  if (profile) {
    // Hide suspended users when 'active' filter is selected
    if (filterType === 'active' && profile.isSuspended) {
      return null
    }
    // Show only suspended users when 'suspended' filter is selected
    if (filterType === 'suspended' && !profile.isSuspended) {
      return null
    }
  }

  return (
    <>
      {/* Mobile Card View */}
      <div
        onClick={onClick}
        className={clsx(
          'md:hidden p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md',
          isSelected
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-200 hover:border-gray-300 bg-white'
        )}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* Address and badges */}
            <div className="flex items-center space-x-2 mb-2">
              <span className="font-mono text-sm text-gray-900">
                {formatAddress(userAddress)}
              </span>
              {isCurrentUser && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                  You
                </span>
              )}
              {profile?.isVerified && (
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                  Verified
                </span>
              )}
              {profile?.isSuspended && (
                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                  Suspended
                </span>
              )}
            </div>

            {/* User details */}
            {profile ? (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">SSI ID:</span>
                  <span className="ml-2 text-gray-900">{profile.ssiIdentifier}</span>
                </div>
                <div>
                  <span className="text-gray-600">Type:</span>
                  <span className="ml-2 text-gray-900">
                    {getUserTypeDisplayName(Number(profile.userType))}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Can Trade:</span>
                  <span className={clsx("ml-2", profile.canTrade ? "text-green-600" : "text-red-600")}>
                    {profile.canTrade ? "Yes" : "No"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Registered:</span>
                  <span className="ml-2 text-gray-900">
                    {formatDate(profile.registrationDate)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">User not registered</div>
            )}
          </div>

          {/* Action indicator */}
          <div className="ml-4 flex-shrink-0">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Desktop Table Row */}
      <div
        onClick={onClick}
        className={clsx(
          'hidden md:grid md:grid-cols-12 gap-4 p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md',
          isSelected
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-200 hover:border-gray-300 bg-white'
        )}
      >
        {/* Address Column */}
        <div className="col-span-3 flex items-center space-x-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  copyToClipboard(userAddress)
                }}
                className="font-mono text-sm text-gray-900 hover:text-blue-600 transition-colors"
                title="Click to copy full address"
              >
                {formatFullAddress(userAddress)}
              </button>
              {isCurrentUser && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                  You
                </span>
              )}
            </div>
          </div>
        </div>

        {/* SSI Identifier Column */}
        <div className="col-span-2 flex items-center">
          <span className="text-sm text-gray-900 truncate">
            {profile?.ssiIdentifier || 'Loading...'}
          </span>
        </div>

        {/* Type Column */}
        <div className="col-span-2 flex items-center">
          <span className="text-sm text-gray-900">
            {profile ? getUserTypeDisplayName(Number(profile.userType)) : 'Loading...'}
          </span>
        </div>

        {/* Status Column */}
        <div className="col-span-2 flex items-center space-x-2">
          {profile ? (
            <>
              {profile.isVerified ? (
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                  Verified
                </span>
              ) : (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                  Pending
                </span>
              )}
              {profile.isSuspended && (
                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                  Suspended
                </span>
              )}
              {!profile.canTrade && !profile.isSuspended && (
                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                  No Trade
                </span>
              )}
            </>
          ) : (
            <span className="text-sm text-gray-500">Loading...</span>
          )}
        </div>

        {/* Registration Date Column */}
        <div className="col-span-2 flex items-center">
          <span className="text-sm text-gray-600" title={profile ? formatDateTime(profile.registrationDate) : ''}>
            {profile ? formatDate(profile.registrationDate) : 'Loading...'}
          </span>
        </div>

        {/* Actions Column */}
        <div className="col-span-1 flex items-center justify-end">
          <div className="flex items-center space-x-2">
            {/* Quick Actions for Admin */}
            {isAdmin && profile && (
              <UserQuickActions
                userAddress={userAddress}
                userProfile={profile}
                className="hidden lg:flex"
                transactionState={transactionState}
              />
            )}

            {/* View Details Button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onViewDetails()
              }}
              className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
              title="View Details"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}