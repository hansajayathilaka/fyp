// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./RegulatoryManagement.sol";

/**
 * @title RegulatedERC1155Token
 * @dev Multi-token standard for share certificates with regulatory compliance
 * @notice This contract manages tokenized shares with regulatory compliance integration
 */
contract RegulatedERC1155Token is ERC1155, Ownable, ReentrancyGuard, Pausable {
    using Strings for uint256;
    
    // Structs
    struct TokenInfo {
        string name;
        string symbol;
        string description;
        string companyName;
        string industry;
        uint256 totalSupply;
        uint256 maxSupply;
        uint256 creationTime;
        address creator;
        bool isActive;
        string metadataURI;
        uint256 dividendYield;
        uint256 parValue;
        string stockClass; // "common", "preferred", "warrant"
    }
    
    struct CompanyInfo {
        string companyName;
        string registrationNumber;
        string industry;
        string country;
        address companyAddress;
        bool isVerified;
        uint256 registrationTime;
        address verifiedBy;
    }
    
    // State variables
    RegulatoryManagement public immutable regulatoryContract;
    
    mapping(uint256 => TokenInfo) public tokenInfo;
    mapping(address => CompanyInfo) public companyInfo;
    mapping(uint256 => mapping(address => uint256)) public tokenHoldings;
    mapping(address => bool) public authorizedMinters;
    mapping(address => bool) public authorizedCompanies;
    
    uint256 public nextTokenId = 1;
    uint256 public totalTokenTypes = 0;
    
    // Events
    event TokenCreated(
        uint256 indexed tokenId,
        string name,
        string symbol,
        address indexed creator,
        uint256 maxSupply,
        uint256 timestamp
    );
    event TokenMinted(
        uint256 indexed tokenId,
        address indexed to,
        uint256 amount,
        uint256 timestamp
    );
    event TokenBurned(
        uint256 indexed tokenId,
        address indexed from,
        uint256 amount,
        uint256 timestamp
    );
    event CompanyRegistered(
        address indexed company,
        string companyName,
        string registrationNumber,
        uint256 timestamp
    );
    event CompanyVerified(
        address indexed company,
        address indexed verifier,
        uint256 timestamp
    );
    event MinterAuthorized(address indexed minter, address indexed authorizer);
    event MinterRevoked(address indexed minter, address indexed revoker);
    event TokenMetadataUpdated(uint256 indexed tokenId, string newMetadataURI);
    event DividendYieldUpdated(uint256 indexed tokenId, uint256 newYield);
    
    constructor(
        address _regulatoryContract,
        string memory _baseURI
    ) ERC1155(_baseURI) Ownable(msg.sender) {
        require(_regulatoryContract != address(0), "Invalid regulatory contract address");
        regulatoryContract = RegulatoryManagement(_regulatoryContract);
        authorizedMinters[msg.sender] = true;
        emit MinterAuthorized(msg.sender, msg.sender);
    }
    
    // Modifiers
    modifier onlyVerifiedUser(address user) {
        require(regulatoryContract.isVerifiedUser(user), "User must be verified");
        _;
    }
    
    modifier onlyAuthorizedMinter() {
        require(authorizedMinters[msg.sender], "Not authorized to mint");
        _;
    }
    
    modifier onlyAuthorizedCompany() {
        require(authorizedCompanies[msg.sender], "Company not authorized");
        _;
    }
    
    modifier onlyAuthorizedMarketplace() {
        require(regulatoryContract.isAuthorizedMarketplace(msg.sender), "Not authorized marketplace");
        _;
    }
    
    modifier tokenExists(uint256 tokenId) {
        require(tokenId > 0 && tokenId < nextTokenId, "Token does not exist");
        _;
    }
    
    // Company Registration Functions
    function registerCompany(
        string memory _companyName,
        string memory _registrationNumber,
        string memory _industry,
        string memory _country
    ) external whenNotPaused nonReentrant {
        require(bytes(_companyName).length > 0, "Company name cannot be empty");
        require(bytes(_registrationNumber).length > 0, "Registration number cannot be empty");
        require(!companyInfo[msg.sender].isVerified, "Company already registered");
        
        companyInfo[msg.sender] = CompanyInfo({
            companyName: _companyName,
            registrationNumber: _registrationNumber,
            industry: _industry,
            country: _country,
            companyAddress: msg.sender,
            isVerified: false,
            registrationTime: block.timestamp,
            verifiedBy: address(0)
        });
        
        emit CompanyRegistered(msg.sender, _companyName, _registrationNumber, block.timestamp);
    }
    
    function verifyCompany(address _company) external onlyOwner {
        require(companyInfo[_company].registrationTime > 0, "Company not registered");
        require(!companyInfo[_company].isVerified, "Company already verified");
        
        companyInfo[_company].isVerified = true;
        companyInfo[_company].verifiedBy = msg.sender;
        authorizedCompanies[_company] = true;
        
        emit CompanyVerified(_company, msg.sender, block.timestamp);
    }
    
    // Token Creation Functions
    function createToken(
        string memory _name,
        string memory _symbol,
        string memory _description,
        string memory _companyName,
        string memory _industry,
        uint256 _maxSupply,
        string memory _metadataURI,
        uint256 _dividendYield,
        uint256 _parValue,
        string memory _stockClass
    ) external onlyAuthorizedCompany whenNotPaused nonReentrant returns (uint256) {
        require(bytes(_name).length > 0, "Token name cannot be empty");
        require(bytes(_symbol).length > 0, "Token symbol cannot be empty");
        require(_maxSupply > 0, "Max supply must be greater than 0");
        require(companyInfo[msg.sender].isVerified, "Company must be verified");
        
        uint256 tokenId = nextTokenId;
        nextTokenId++;
        totalTokenTypes++;
        
        tokenInfo[tokenId] = TokenInfo({
            name: _name,
            symbol: _symbol,
            description: _description,
            companyName: _companyName,
            industry: _industry,
            totalSupply: 0,
            maxSupply: _maxSupply,
            creationTime: block.timestamp,
            creator: msg.sender,
            isActive: true,
            metadataURI: _metadataURI,
            dividendYield: _dividendYield,
            parValue: _parValue,
            stockClass: _stockClass
        });
        
        emit TokenCreated(tokenId, _name, _symbol, msg.sender, _maxSupply, block.timestamp);
        return tokenId;
    }
    
    // Minting Functions
    function mintToken(
        uint256 _tokenId,
        address _to,
        uint256 _amount
    ) external onlyAuthorizedMinter whenNotPaused nonReentrant tokenExists(_tokenId) {
        require(_to != address(0), "Cannot mint to zero address");
        require(_amount > 0, "Amount must be greater than 0");
        require(regulatoryContract.isVerifiedUser(_to), "Recipient must be verified");
        require(tokenInfo[_tokenId].isActive, "Token is not active");
        require(
            tokenInfo[_tokenId].totalSupply + _amount <= tokenInfo[_tokenId].maxSupply,
            "Would exceed max supply"
        );
        
        tokenInfo[_tokenId].totalSupply += _amount;
        tokenHoldings[_tokenId][_to] += _amount;
        
        _mint(_to, _tokenId, _amount, "");
        
        emit TokenMinted(_tokenId, _to, _amount, block.timestamp);
    }
    
    function batchMintTokens(
        uint256[] memory _tokenIds,
        address _to,
        uint256[] memory _amounts
    ) external onlyAuthorizedMinter whenNotPaused nonReentrant {
        require(_to != address(0), "Cannot mint to zero address");
        require(_tokenIds.length == _amounts.length, "Arrays length mismatch");
        require(regulatoryContract.isVerifiedUser(_to), "Recipient must be verified");
        
        for (uint256 i = 0; i < _tokenIds.length; i++) {
            uint256 tokenId = _tokenIds[i];
            uint256 amount = _amounts[i];
            
            require(tokenId > 0 && tokenId < nextTokenId, "Token does not exist");
            require(amount > 0, "Amount must be greater than 0");
            require(tokenInfo[tokenId].isActive, "Token is not active");
            require(
                tokenInfo[tokenId].totalSupply + amount <= tokenInfo[tokenId].maxSupply,
                "Would exceed max supply"
            );
            
            tokenInfo[tokenId].totalSupply += amount;
            tokenHoldings[tokenId][_to] += amount;
            
            emit TokenMinted(tokenId, _to, amount, block.timestamp);
        }
        
        _mintBatch(_to, _tokenIds, _amounts, "");
    }
    
    // Burning Functions
    function burnToken(
        uint256 _tokenId,
        uint256 _amount
    ) external whenNotPaused nonReentrant tokenExists(_tokenId) {
        require(_amount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender, _tokenId) >= _amount, "Insufficient balance");
        
        tokenInfo[_tokenId].totalSupply -= _amount;
        tokenHoldings[_tokenId][msg.sender] -= _amount;
        
        _burn(msg.sender, _tokenId, _amount);
        
        emit TokenBurned(_tokenId, msg.sender, _amount, block.timestamp);
    }
    
    // Transfer Override with Regulatory Compliance
    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal override {
        // Allow minting (from == address(0)) and burning (to == address(0))
        if (from == address(0) || to == address(0)) {
            super._update(from, to, ids, values);
            return;
        }
        
        // Allow transfers to/from authorized marketplaces (for escrow)
        if (regulatoryContract.isAuthorizedMarketplace(from) || regulatoryContract.isAuthorizedMarketplace(to)) {
            // For marketplace transfers, only check the non-marketplace party
            address userAddress = regulatoryContract.isAuthorizedMarketplace(from) ? to : from;
            require(regulatoryContract.isVerifiedUser(userAddress), "User must be verified");
            require(regulatoryContract.canUserTrade(userAddress), "User cannot trade");
            
            // Calculate total value for trading limit check (only for the user)
            uint256 totalValue = 0;
            for (uint256 i = 0; i < ids.length; i++) {
                totalValue += values[i] * tokenInfo[ids[i]].parValue;
            }
            
            require(regulatoryContract.checkTradingLimit(userAddress, totalValue), "Trading limit exceeded");
        } else {
            // For regular user-to-user transfers, check both parties
            require(regulatoryContract.isVerifiedUser(from), "Sender must be verified");
            require(regulatoryContract.isVerifiedUser(to), "Recipient must be verified");
            require(regulatoryContract.canUserTrade(from), "Sender cannot trade");
            require(regulatoryContract.canUserTrade(to), "Recipient cannot trade");
            
            // Calculate total value for trading limit check
            uint256 totalValue = 0;
            for (uint256 i = 0; i < ids.length; i++) {
                totalValue += values[i] * tokenInfo[ids[i]].parValue;
            }
            
            require(regulatoryContract.checkTradingLimit(from, totalValue), "Trading limit exceeded");
        }
        
        // Update token holdings
        for (uint256 i = 0; i < ids.length; i++) {
            tokenHoldings[ids[i]][from] -= values[i];
            tokenHoldings[ids[i]][to] += values[i];
        }
        
        super._update(from, to, ids, values);
    }
    
    // Metadata Functions
    function updateTokenMetadata(
        uint256 _tokenId,
        string memory _newMetadataURI
    ) external onlyAuthorizedMinter tokenExists(_tokenId) {
        require(bytes(_newMetadataURI).length > 0, "Metadata URI cannot be empty");
        
        tokenInfo[_tokenId].metadataURI = _newMetadataURI;
        emit TokenMetadataUpdated(_tokenId, _newMetadataURI);
    }
    
    function updateDividendYield(
        uint256 _tokenId,
        uint256 _newYield
    ) external onlyAuthorizedMinter tokenExists(_tokenId) {
        tokenInfo[_tokenId].dividendYield = _newYield;
        emit DividendYieldUpdated(_tokenId, _newYield);
    }
    
    function uri(uint256 _tokenId) public view override returns (string memory) {
        require(_tokenId > 0 && _tokenId < nextTokenId, "Token does not exist");
        
        string memory tokenURI = tokenInfo[_tokenId].metadataURI;
        return bytes(tokenURI).length > 0 ? tokenURI : string(abi.encodePacked(super.uri(_tokenId), _tokenId.toString()));
    }
    
    // Authorization Functions
    function authorizeMinter(address _minter) external onlyOwner {
        require(_minter != address(0), "Invalid minter address");
        require(!authorizedMinters[_minter], "Minter already authorized");
        
        authorizedMinters[_minter] = true;
        emit MinterAuthorized(_minter, msg.sender);
    }
    
    function revokeMinter(address _minter) external onlyOwner {
        require(authorizedMinters[_minter], "Minter not authorized");
        require(_minter != owner(), "Cannot revoke owner");
        
        authorizedMinters[_minter] = false;
        emit MinterRevoked(_minter, msg.sender);
    }
    
    // Admin Functions
    function deactivateToken(uint256 _tokenId) external onlyOwner tokenExists(_tokenId) {
        tokenInfo[_tokenId].isActive = false;
    }
    
    function activateToken(uint256 _tokenId) external onlyOwner tokenExists(_tokenId) {
        tokenInfo[_tokenId].isActive = true;
    }
    
    // View Functions
    function getTokenInfo(uint256 _tokenId) external view returns (TokenInfo memory) {
        require(_tokenId > 0 && _tokenId < nextTokenId, "Token does not exist");
        return tokenInfo[_tokenId];
    }
    
    function getCompanyInfo(address _company) external view returns (CompanyInfo memory) {
        return companyInfo[_company];
    }
    
    function getTokenHolding(uint256 _tokenId, address _holder) external view returns (uint256) {
        return tokenHoldings[_tokenId][_holder];
    }
    
    function getTotalSupply(uint256 _tokenId) external view returns (uint256) {
        require(_tokenId > 0 && _tokenId < nextTokenId, "Token does not exist");
        return tokenInfo[_tokenId].totalSupply;
    }
    
    function getMaxSupply(uint256 _tokenId) external view returns (uint256) {
        require(_tokenId > 0 && _tokenId < nextTokenId, "Token does not exist");
        return tokenInfo[_tokenId].maxSupply;
    }
    
    function isTokenActive(uint256 _tokenId) external view returns (bool) {
        require(_tokenId > 0 && _tokenId < nextTokenId, "Token does not exist");
        return tokenInfo[_tokenId].isActive;
    }
    
    function getAllTokenIds() external view returns (uint256[] memory) {
        uint256[] memory tokenIds = new uint256[](totalTokenTypes);
        for (uint256 i = 0; i < totalTokenTypes; i++) {
            tokenIds[i] = i + 1;
        }
        return tokenIds;
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
    
    // Support interfaces
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
