// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title RegulatoryManagement
 * @dev Contract for managing user registration, verification, and permissions with SSI integration
 */
contract RegulatoryManagement is Ownable, ReentrancyGuard, Pausable {
    
    // User types supported by the platform
    enum UserType {
        Individual,
        Company
    }
    
    // User profile structure with essential fields
    struct UserProfile {
        address userAddress;        // Ethereum address
        string ssiIdentifier;      // SSI system identifier
        UserType userType;         // Individual or Company
        bool isVerified;           // Simple verification status
        bool canTrade;             // Trading permission flag
        bool canCreateTokens;      // Token creation permission flag
        bool isSuspended;          // Suspension status
        uint256 registrationDate;  // Registration timestamp
    }
    
    // Mapping from user address to user profile
    mapping(address => UserProfile) public userProfiles;
    
    // Mapping to check if SSI identifier is already used
    mapping(string => bool) public ssiIdentifierUsed;
    
    // Mapping to check if user is registered
    mapping(address => bool) public isUserRegistered;
    
    // Events
    event UserRegistered(
        address indexed userAddress,
        string ssiIdentifier,
        UserType userType,
        uint256 registrationDate
    );
    
    event UserVerified(address indexed userAddress, uint256 verificationDate);
    event UserSuspended(address indexed userAddress, uint256 suspensionDate);
    event UserUnsuspended(address indexed userAddress, uint256 unsuspensionDate);
    event PermissionsUpdated(address indexed userAddress, bool canTrade, bool canCreateTokens);
    event ContractPaused(uint256 timestamp);
    event ContractUnpaused(uint256 timestamp);
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @dev Verify a registered user (admin only)
     * @param userAddress The address of the user to verify
     */
    function verifyUser(address userAddress) external onlyOwner whenNotPaused {
        require(isUserRegistered[userAddress], "User not registered");
        require(!userProfiles[userAddress].isSuspended, "Cannot verify suspended user");
        require(!userProfiles[userAddress].isVerified, "User already verified");
        
        userProfiles[userAddress].isVerified = true;
        userProfiles[userAddress].canTrade = true;
        
        // Company users can create tokens after verification
        if (userProfiles[userAddress].userType == UserType.Company) {
            userProfiles[userAddress].canCreateTokens = true;
        }
        
        emit UserVerified(userAddress, block.timestamp);
        emit PermissionsUpdated(userAddress, true, userProfiles[userAddress].canCreateTokens);
    }
    
    /**
     * @dev Suspend a user (admin only)
     * @param userAddress The address of the user to suspend
     */
    function suspendUser(address userAddress) external onlyOwner whenNotPaused {
        require(isUserRegistered[userAddress], "User not registered");
        require(!userProfiles[userAddress].isSuspended, "User already suspended");
        
        userProfiles[userAddress].isSuspended = true;
        userProfiles[userAddress].canTrade = false;
        userProfiles[userAddress].canCreateTokens = false;
        
        emit UserSuspended(userAddress, block.timestamp);
        emit PermissionsUpdated(userAddress, false, false);
    }
    
    /**
     * @dev Unsuspend a user (admin only)
     * @param userAddress The address of the user to unsuspend
     */
    function unsuspendUser(address userAddress) external onlyOwner whenNotPaused {
        require(isUserRegistered[userAddress], "User not registered");
        require(userProfiles[userAddress].isSuspended, "User not suspended");
        
        userProfiles[userAddress].isSuspended = false;
        
        // Restore permissions if user is verified
        if (userProfiles[userAddress].isVerified) {
            userProfiles[userAddress].canTrade = true;
            if (userProfiles[userAddress].userType == UserType.Company) {
                userProfiles[userAddress].canCreateTokens = true;
            }
        }
        
        emit UserUnsuspended(userAddress, block.timestamp);
        emit PermissionsUpdated(userAddress, userProfiles[userAddress].canTrade, userProfiles[userAddress].canCreateTokens);
    }
    
    /**
     * @dev Pause the contract (emergency stop)
     */
    function pause() external onlyOwner {
        _pause();
        emit ContractPaused(block.timestamp);
    }
    
    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
        emit ContractUnpaused(block.timestamp);
    }
    
    /**
     * @dev Register a new user with SSI identifier
     * @param ssiIdentifier The SSI identifier for the user
     * @param userType The type of user (Individual or Company)
     */
    function registerUser(string memory ssiIdentifier, UserType userType) external nonReentrant whenNotPaused {
        require(bytes(ssiIdentifier).length > 0, "SSI identifier cannot be empty");
        require(!isUserRegistered[msg.sender], "User already registered");
        require(!ssiIdentifierUsed[ssiIdentifier], "SSI identifier already used");
        
        // Create user profile
        UserProfile memory newProfile = UserProfile({
            userAddress: msg.sender,
            ssiIdentifier: ssiIdentifier,
            userType: userType,
            isVerified: false,
            canTrade: false,
            canCreateTokens: false,
            isSuspended: false,
            registrationDate: block.timestamp
        });
        
        // Store user profile
        userProfiles[msg.sender] = newProfile;
        isUserRegistered[msg.sender] = true;
        ssiIdentifierUsed[ssiIdentifier] = true;
        allUsers.push(msg.sender);
        
        emit UserRegistered(msg.sender, ssiIdentifier, userType, block.timestamp);
    }
    
    /**
     * @dev Get user profile information
     * @param userAddress The address of the user
     * @return UserProfile The user's profile
     */
    function getUserProfile(address userAddress) external view returns (UserProfile memory) {
        require(isUserRegistered[userAddress], "User not registered");
        return userProfiles[userAddress];
    }
    
    /**
     * @dev Check if a user is registered
     * @param userAddress The address to check
     * @return bool True if user is registered
     */
    function isRegistered(address userAddress) external view returns (bool) {
        return isUserRegistered[userAddress];
    }
    
    /**
     * @dev Check if a user can trade
     * @param userAddress The address to check
     * @return bool True if user can trade
     */
    function canUserTrade(address userAddress) external view returns (bool) {
        if (!isUserRegistered[userAddress]) {
            return false;
        }
        return userProfiles[userAddress].canTrade && !userProfiles[userAddress].isSuspended;
    }
    
    /**
     * @dev Check if a user can create tokens
     * @param userAddress The address to check
     * @return bool True if user can create tokens
     */
    function canUserCreateTokens(address userAddress) external view returns (bool) {
        if (!isUserRegistered[userAddress]) {
            return false;
        }
        return userProfiles[userAddress].canCreateTokens && !userProfiles[userAddress].isSuspended;
    }
    
    /**
     * @dev Check if a user is verified
     * @param userAddress The address to check
     * @return bool True if user is verified
     */
    function isUserVerified(address userAddress) external view returns (bool) {
        if (!isUserRegistered[userAddress]) {
            return false;
        }
        return userProfiles[userAddress].isVerified;
    }
    
    /**
     * @dev Check if a user is suspended
     * @param userAddress The address to check
     * @return bool True if user is suspended
     */
    function isUserSuspended(address userAddress) external view returns (bool) {
        if (!isUserRegistered[userAddress]) {
            return false;
        }
        return userProfiles[userAddress].isSuspended;
    }
    
    /**
     * @dev Get user type
     * @param userAddress The address to check
     * @return UserType The user's type
     */
    function getUserType(address userAddress) external view returns (UserType) {
        require(isUserRegistered[userAddress], "User not registered");
        return userProfiles[userAddress].userType;
    }
    
    // Array to track all registered users for frontend queries
    address[] public allUsers;
    
    /**
     * @dev Get all registered users
     * @return address[] Array of all registered user addresses
     */
    function getAllUsers() external view returns (address[] memory) {
        return allUsers;
    }
    
    /**
     * @dev Get total number of registered users
     * @return uint256 Total number of users
     */
    function getTotalUsers() external view returns (uint256) {
        return allUsers.length;
    }
    
    /**
     * @dev Get platform statistics
     * @return totalUsers Total number of registered users
     * @return verifiedUsers Number of verified users
     * @return companyUsers Number of company users
     * @return individualUsers Number of individual users
     * @return suspendedUsers Number of suspended users
     */
    function getPlatformStats() external view returns (
        uint256 totalUsers,
        uint256 verifiedUsers,
        uint256 companyUsers,
        uint256 individualUsers,
        uint256 suspendedUsers
    ) {
        totalUsers = allUsers.length;
        
        for (uint256 i = 0; i < allUsers.length; i++) {
            UserProfile memory profile = userProfiles[allUsers[i]];
            
            if (profile.isVerified) {
                verifiedUsers++;
            }
            
            if (profile.userType == UserType.Company) {
                companyUsers++;
            } else {
                individualUsers++;
            }
            
            if (profile.isSuspended) {
                suspendedUsers++;
            }
        }
    }
    
    /**
     * @dev Get users by type
     * @param userType The type of users to retrieve
     * @return address[] Array of user addresses of the specified type
     */
    function getUsersByType(UserType userType) external view returns (address[] memory) {
        // Count users of the specified type
        uint256 count = 0;
        for (uint256 i = 0; i < allUsers.length; i++) {
            if (userProfiles[allUsers[i]].userType == userType) {
                count++;
            }
        }
        
        // Create array and populate
        address[] memory usersOfType = new address[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < allUsers.length; i++) {
            if (userProfiles[allUsers[i]].userType == userType) {
                usersOfType[index] = allUsers[i];
                index++;
            }
        }
        
        return usersOfType;
    }
    
    /**
     * @dev Get verified users only
     * @return address[] Array of verified user addresses
     */
    function getVerifiedUsers() external view returns (address[] memory) {
        // Count verified users
        uint256 count = 0;
        for (uint256 i = 0; i < allUsers.length; i++) {
            if (userProfiles[allUsers[i]].isVerified && !userProfiles[allUsers[i]].isSuspended) {
                count++;
            }
        }
        
        // Create array and populate
        address[] memory verifiedUsers = new address[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < allUsers.length; i++) {
            if (userProfiles[allUsers[i]].isVerified && !userProfiles[allUsers[i]].isSuspended) {
                verifiedUsers[index] = allUsers[i];
                index++;
            }
        }
        
        return verifiedUsers;
    }
}