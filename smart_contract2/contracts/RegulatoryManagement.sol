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
    }
    
    /**
     * @dev Pause the contract (emergency stop)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
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
}