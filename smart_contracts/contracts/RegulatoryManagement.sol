// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title RegulatoryManagement
 * @dev Central authority for user verification and compliance management
 * @notice This contract manages KYC, trading limits, and marketplace authorization
 */
contract RegulatoryManagement is Ownable, ReentrancyGuard, Pausable {
    
    // Structs
    struct TradingLimits {
        uint256 dailyLimit;
        uint256 monthlyLimit;
        uint256 dailySpent;
        uint256 monthlySpent;
        uint256 lastDailyReset;
        uint256 lastMonthlyReset;
        bool isActive;
    }
    
    struct UserProfile {
        bool isRegistered;
        bool isVerified;
        bool canTrade;
        string userType; // "individual", "institution", "company"
        uint256 registrationTime;
        uint256 verificationTime;
        string riskCategory; // "low", "medium", "high"
        string jurisdiction; // User's jurisdiction for regulatory compliance
        bytes32 ssiIdentifier; // Reference to SSI system identity
    }
    
    // State variables
    mapping(address => TradingLimits) public tradingLimits;
    mapping(address => UserProfile) public userProfiles;
    mapping(address => bool) public authorizedVerifiers;
    mapping(address => bool) public authorizedMarketplaces;
    mapping(address => mapping(uint256 => uint256)) public dailyTradingVolume;
    mapping(address => mapping(uint256 => uint256)) public monthlyTradingVolume;
    
    // Constants
    uint256 public constant DEFAULT_DAILY_LIMIT = 50000 ether; // 50,000 ETH
    uint256 public constant DEFAULT_MONTHLY_LIMIT = 200000 ether; // 200,000 ETH
    uint256 public constant SECONDS_PER_DAY = 86400;
    uint256 public constant SECONDS_PER_MONTH = 2592000; // 30 days
    
    // Events
    event UserRegistered(address indexed user, string userType, bytes32 ssiIdentifier, uint256 timestamp);
    event UserVerified(address indexed user, address indexed verifier, uint256 timestamp);
    event TradingLimitsUpdated(address indexed user, uint256 dailyLimit, uint256 monthlyLimit);
    event VerifierAuthorized(address indexed verifier, address indexed authorizer);
    event VerifierRevoked(address indexed verifier, address indexed revoker);
    event MarketplaceAuthorized(address indexed marketplace, address indexed authorizer);
    event MarketplaceRevoked(address indexed marketplace, address indexed revoker);
    event TradingVolumeRecorded(address indexed user, uint256 amount, uint256 timestamp);
    event TradingPermissionGranted(address indexed user, uint256 timestamp);
    event TradingPermissionRevoked(address indexed user, uint256 timestamp);
    event JurisdictionUpdated(address indexed user, string oldJurisdiction, string newJurisdiction);
    
    constructor() Ownable(msg.sender) {
        // Owner is automatically an authorized verifier
        authorizedVerifiers[msg.sender] = true;
        emit VerifierAuthorized(msg.sender, msg.sender);
    }
    
    // Modifiers
    modifier onlyAuthorizedVerifier() {
        require(authorizedVerifiers[msg.sender], "Only authorized verifiers can perform this action");
        _;
    }
    
    modifier onlyAuthorizedMarketplace() {
        require(authorizedMarketplaces[msg.sender], "Only authorized marketplaces can perform this action");
        _;
    }
    
    modifier onlyVerifiedUser(address user) {
        require(userProfiles[user].isVerified, "User must be verified");
        _;
    }
    
    // User Registration Functions
    function registerUser(
        string memory _userType,
        string memory _riskCategory,
        string memory _jurisdiction,
        bytes32 _ssiIdentifier
    ) external whenNotPaused nonReentrant {
        require(!userProfiles[msg.sender].isRegistered, "User already registered");
        require(bytes(_userType).length > 0, "User type cannot be empty");
        require(bytes(_riskCategory).length > 0, "Risk category cannot be empty");
        require(bytes(_jurisdiction).length > 0, "Jurisdiction cannot be empty");
        require(_ssiIdentifier != bytes32(0), "SSI identifier cannot be empty");
        
        userProfiles[msg.sender] = UserProfile({
            isRegistered: true,
            isVerified: false,
            canTrade: false,
            userType: _userType,
            registrationTime: block.timestamp,
            verificationTime: 0,
            riskCategory: _riskCategory,
            jurisdiction: _jurisdiction,
            ssiIdentifier: _ssiIdentifier
        });
        
        // Set default trading limits
        tradingLimits[msg.sender] = TradingLimits({
            dailyLimit: DEFAULT_DAILY_LIMIT,
            monthlyLimit: DEFAULT_MONTHLY_LIMIT,
            dailySpent: 0,
            monthlySpent: 0,
            lastDailyReset: block.timestamp,
            lastMonthlyReset: block.timestamp,
            isActive: true
        });
        
        emit UserRegistered(msg.sender, _userType, _ssiIdentifier, block.timestamp);
    }
    
    // Verification Functions (called after SSI verification)
    function verifyUser(address _user) external onlyAuthorizedVerifier whenNotPaused nonReentrant {
        require(userProfiles[_user].isRegistered, "User must be registered");
        require(!userProfiles[_user].isVerified, "User already verified");
        
        userProfiles[_user].isVerified = true;
        userProfiles[_user].verificationTime = block.timestamp;
        userProfiles[_user].canTrade = true;
        
        emit UserVerified(_user, msg.sender, block.timestamp);
        emit TradingPermissionGranted(_user, block.timestamp);
    }
    
    function updateJurisdiction(address _user, string memory _newJurisdiction) external onlyAuthorizedVerifier whenNotPaused {
        require(userProfiles[_user].isRegistered, "User must be registered");
        require(bytes(_newJurisdiction).length > 0, "Jurisdiction cannot be empty");
        
        string memory oldJurisdiction = userProfiles[_user].jurisdiction;
        userProfiles[_user].jurisdiction = _newJurisdiction;
        
        emit JurisdictionUpdated(_user, oldJurisdiction, _newJurisdiction);
    }
    
    // Trading Limit Functions
    function updateTradingLimits(
        address _user,
        uint256 _dailyLimit,
        uint256 _monthlyLimit
    ) external onlyAuthorizedVerifier whenNotPaused {
        require(userProfiles[_user].isVerified, "User must be verified");
        require(_dailyLimit > 0, "Daily limit must be greater than 0");
        require(_monthlyLimit > 0, "Monthly limit must be greater than 0");
        require(_monthlyLimit >= _dailyLimit, "Monthly limit must be >= daily limit");
        
        tradingLimits[_user].dailyLimit = _dailyLimit;
        tradingLimits[_user].monthlyLimit = _monthlyLimit;
        
        emit TradingLimitsUpdated(_user, _dailyLimit, _monthlyLimit);
    }
    
    function checkTradingLimit(address _user, uint256 _amount) external view returns (bool) {
        if (!userProfiles[_user].canTrade) return false;
        
        TradingLimits memory limits = tradingLimits[_user];
        if (!limits.isActive) return false;
        
        // Check daily limit
        uint256 daysPassed = (block.timestamp - limits.lastDailyReset) / SECONDS_PER_DAY;
        uint256 currentDailySpent = daysPassed > 0 ? 0 : limits.dailySpent;
        if (currentDailySpent + _amount > limits.dailyLimit) return false;
        
        // Check monthly limit
        uint256 monthsPassed = (block.timestamp - limits.lastMonthlyReset) / SECONDS_PER_MONTH;
        uint256 currentMonthlySpent = monthsPassed > 0 ? 0 : limits.monthlySpent;
        if (currentMonthlySpent + _amount > limits.monthlyLimit) return false;
        
        return true;
    }
    
    function recordTradingVolume(address _user, uint256 _amount) external onlyAuthorizedMarketplace whenNotPaused {
        require(userProfiles[_user].canTrade, "User cannot trade");
        require(_amount > 0, "Amount must be greater than 0");
        
        TradingLimits storage limits = tradingLimits[_user];
        
        // Update daily tracking
        uint256 daysPassed = (block.timestamp - limits.lastDailyReset) / SECONDS_PER_DAY;
        if (daysPassed > 0) {
            limits.dailySpent = _amount;
            limits.lastDailyReset = block.timestamp;
        } else {
            limits.dailySpent += _amount;
        }
        
        // Update monthly tracking
        uint256 monthsPassed = (block.timestamp - limits.lastMonthlyReset) / SECONDS_PER_MONTH;
        if (monthsPassed > 0) {
            limits.monthlySpent = _amount;
            limits.lastMonthlyReset = block.timestamp;
        } else {
            limits.monthlySpent += _amount;
        }
        
        emit TradingVolumeRecorded(_user, _amount, block.timestamp);
    }
    
    // Authorization Functions
    function authorizeVerifier(address _verifier) external onlyOwner {
        require(_verifier != address(0), "Invalid verifier address");
        require(!authorizedVerifiers[_verifier], "Verifier already authorized");
        
        authorizedVerifiers[_verifier] = true;
        emit VerifierAuthorized(_verifier, msg.sender);
    }
    
    function revokeVerifier(address _verifier) external onlyOwner {
        require(authorizedVerifiers[_verifier], "Verifier not authorized");
        require(_verifier != owner(), "Cannot revoke owner");
        
        authorizedVerifiers[_verifier] = false;
        emit VerifierRevoked(_verifier, msg.sender);
    }
    
    function authorizeMarketplace(address _marketplace) external onlyOwner {
        require(_marketplace != address(0), "Invalid marketplace address");
        require(!authorizedMarketplaces[_marketplace], "Marketplace already authorized");
        
        authorizedMarketplaces[_marketplace] = true;
        emit MarketplaceAuthorized(_marketplace, msg.sender);
    }
    
    function revokeMarketplace(address _marketplace) external onlyOwner {
        require(authorizedMarketplaces[_marketplace], "Marketplace not authorized");
        
        authorizedMarketplaces[_marketplace] = false;
        emit MarketplaceRevoked(_marketplace, msg.sender);
    }
    
    // Permission Functions
    function revokeTradingPermission(address _user) external onlyAuthorizedVerifier whenNotPaused {
        require(userProfiles[_user].canTrade, "User already cannot trade");
        
        userProfiles[_user].canTrade = false;
        emit TradingPermissionRevoked(_user, block.timestamp);
    }
    
    function grantTradingPermission(address _user) external onlyAuthorizedVerifier whenNotPaused {
        require(userProfiles[_user].isVerified, "User must be verified");
        require(!userProfiles[_user].canTrade, "User already can trade");
        
        userProfiles[_user].canTrade = true;
        emit TradingPermissionGranted(_user, block.timestamp);
    }
    
    // View Functions
    function isVerifiedUser(address _user) external view returns (bool) {
        return userProfiles[_user].isVerified;
    }
    
    function canUserTrade(address _user) external view returns (bool) {
        return userProfiles[_user].canTrade;
    }
    
    function isAuthorizedMarketplace(address _marketplace) external view returns (bool) {
        return authorizedMarketplaces[_marketplace];
    }
    
    function getUserProfile(address _user) external view returns (UserProfile memory) {
        return userProfiles[_user];
    }
    
    function getTradingLimits(address _user) external view returns (TradingLimits memory) {
        return tradingLimits[_user];
    }
    
    function getUserSSIIdentifier(address _user) external view returns (bytes32) {
        return userProfiles[_user].ssiIdentifier;
    }
    
    function getUserJurisdiction(address _user) external view returns (string memory) {
        return userProfiles[_user].jurisdiction;
    }
    
    // Emergency Functions
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}
