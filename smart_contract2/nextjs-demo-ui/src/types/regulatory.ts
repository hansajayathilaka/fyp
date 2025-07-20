// Regulatory Management Types
// Based on typechain-types from the parent hardhat project

// User Profile from RegulatoryManagement contract
export interface UserProfile {
  userAddress: string;
  ssiIdentifier: string;
  userType: bigint; // 0 = Individual, 1 = Company
  isVerified: boolean;
  canTrade: boolean;
  canCreateTokens: boolean;
  isSuspended: boolean;
  registrationDate: bigint;
}

// Platform statistics tuple returned by getPlatformStats()
export type PlatformStatsResult = readonly [
  totalUsers: bigint,
  verifiedUsers: bigint,
  companyUsers: bigint,
  individualUsers: bigint,
  suspendedUsers: bigint
];

// Converted platform statistics for UI display
export interface PlatformStats {
  totalUsers: bigint;
  verifiedUsers: bigint;
  companyUsers: bigint;
  individualUsers: bigint;
  suspendedUsers: bigint;
}

// User types enum
export enum UserType {
  Individual = 0,
  Company = 1
}

// Helper function to convert platform stats tuple to object
export function convertPlatformStats(stats: PlatformStatsResult): PlatformStats {
  return {
    totalUsers: stats[0],
    verifiedUsers: stats[1],
    companyUsers: stats[2],
    individualUsers: stats[3],
    suspendedUsers: stats[4]
  };
}

// Helper function to get user type display name
export function getUserTypeDisplayName(userType: number): string {
  return userType === 0 ? 'Individual' : 'Company';
}

// Transaction state for UI feedback
export interface TransactionState {
  hash?: `0x${string}`;
  status: 'idle' | 'pending' | 'success' | 'error';
  error?: string;
}

// Form state for user registration
export interface RegistrationFormState {
  ssiIdentifier: string;
  userType: 0 | 1;
}

// Tab types for the regulatory interface
export type RegulatoryTab = 'register' | 'verify' | 'manage' | 'stats';