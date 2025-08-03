'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRegulatoryManagement } from '../contracts/hooks'
import { type UserProfile, getUserTypeDisplayName } from '../types/regulatory'
import { clsx } from 'clsx'

interface UserSearchProps {
  onUserSelect: (address: string, profile?: UserProfile) => void
  placeholder?: string
  className?: string
  showFullProfile?: boolean
}

export function UserSearch({ 
  onUserSelect, 
  placeholder = "Search users by address or SSI identifier...",
  className,
  showFullProfile = false
}: UserSearchProps) {
  const regulatory = useRegulatoryManagement()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({})

  // Data fetching
  const { data: allUsers } = regulatory.useGetAllUsers()

  // Search and filter users
  const searchResults = useMemo(() => {
    if (!searchTerm.trim() || !allUsers || !Array.isArray(allUsers)) {
      return []
    }

    const searchLower = searchTerm.toLowerCase()
    return (allUsers as string[]).filter(userAddress => {
      const profile = userProfiles[userAddress]
      return (
        userAddress.toLowerCase().includes(searchLower) ||
        profile?.ssiIdentifier?.toLowerCase().includes(searchLower)
      )
    }).slice(0, 10) // Limit to 10 results
  }, [searchTerm, allUsers, userProfiles])

  // Load user profiles for search results - removed the unused effect

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)
    setIsOpen(value.trim().length > 0)
    setSelectedIndex(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || searchResults.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : searchResults.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
          handleSelectUser(searchResults[selectedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        setSelectedIndex(-1)
        break
    }
  }

  const handleSelectUser = (userAddress: string) => {
    setSearchTerm(userAddress)
    setIsOpen(false)
    setSelectedIndex(-1)
    onUserSelect(userAddress, userProfiles[userAddress])
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  return (
    <div className={clsx("relative", className)}>
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => searchTerm.trim() && setIsOpen(true)}
          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
          placeholder={placeholder}
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Search Results Dropdown */}
      {isOpen && searchResults.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {searchResults.map((userAddress, index) => {
            const profile = userProfiles[userAddress]
            return (
              <div
                key={userAddress}
                onClick={() => handleSelectUser(userAddress)}
                className={clsx(
                  'px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0',
                  index === selectedIndex
                    ? 'bg-blue-50 text-blue-900'
                    : 'hover:bg-gray-50'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-sm font-medium">
                        {formatAddress(userAddress)}
                      </span>
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
                    
                    {showFullProfile && profile && (
                      <div className="mt-1 text-sm text-gray-600">
                        <div>SSI: {profile.ssiIdentifier}</div>
                        <div>Type: {getUserTypeDisplayName(Number(profile.userType))}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* No Results */}
      {isOpen && searchTerm.trim() && searchResults.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
          <div className="px-4 py-3 text-sm text-gray-500 text-center">
            No users found matching "{searchTerm}"
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}

// Individual User Profile Component for detailed display
interface UserProfileCardProps {
  userAddress: string
  className?: string
}

export function UserProfileCard({ userAddress, className }: UserProfileCardProps) {
  const regulatory = useRegulatoryManagement()
  const { data: userProfile, isLoading } = regulatory.useGetUserProfile(userAddress as `0x${string}`)
  
  const profile = userProfile as UserProfile | undefined

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 10)}...${addr.slice(-8)}`
  }

  const formatDate = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleString()
  }

  if (isLoading) {
    return (
      <div className={clsx("bg-white rounded-lg border p-4", className)}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded w-full"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className={clsx("bg-white rounded-lg border p-4", className)}>
        <div className="text-center text-gray-500">
          User not found or not registered
        </div>
      </div>
    )
  }

  return (
    <div className={clsx("bg-white rounded-lg border p-4", className)}>
      <div className="space-y-4">
        {/* Header */}
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {formatAddress(userAddress)}
            </h3>
            {profile.isVerified && (
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                Verified
              </span>
            )}
            {profile.isSuspended && (
              <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                Suspended
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 font-mono">{userAddress}</p>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600 font-medium">SSI Identifier:</span>
            <div className="text-gray-900 mt-1">{profile.ssiIdentifier}</div>
          </div>
          <div>
            <span className="text-gray-600 font-medium">User Type:</span>
            <div className="text-gray-900 mt-1">
              {getUserTypeDisplayName(Number(profile.userType))}
            </div>
          </div>
          <div>
            <span className="text-gray-600 font-medium">Can Trade:</span>
            <div className={clsx("mt-1", profile.canTrade ? "text-green-600" : "text-red-600")}>
              {profile.canTrade ? "Yes" : "No"}
            </div>
          </div>
          <div>
            <span className="text-gray-600 font-medium">Can Create Tokens:</span>
            <div className={clsx("mt-1", profile.canCreateTokens ? "text-green-600" : "text-red-600")}>
              {profile.canCreateTokens ? "Yes" : "No"}
            </div>
          </div>
          <div className="col-span-2">
            <span className="text-gray-600 font-medium">Registration Date:</span>
            <div className="text-gray-900 mt-1">{formatDate(profile.registrationDate)}</div>
          </div>
        </div>

        {/* Status Summary */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center space-x-4 text-sm">
            <div className={clsx(
              "flex items-center space-x-1",
              profile.isVerified ? "text-green-600" : "text-yellow-600"
            )}>
              <div className={clsx(
                "w-2 h-2 rounded-full",
                profile.isVerified ? "bg-green-400" : "bg-yellow-400"
              )} />
              <span>{profile.isVerified ? "Validated" : "Pending Validation"}</span>
            </div>
            <div className={clsx(
              "flex items-center space-x-1",
              profile.isSuspended ? "text-red-600" : "text-green-600"
            )}>
              <div className={clsx(
                "w-2 h-2 rounded-full",
                profile.isSuspended ? "bg-red-400" : "bg-green-400"
              )} />
              <span>{profile.isSuspended ? "Suspended" : "Active"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}