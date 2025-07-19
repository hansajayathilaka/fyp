// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "./RegulatoryManagement.sol";

/**
 * @title RegulatedERC1155Token
 * @dev ERC1155 token contract for company shares with regulatory compliance
 */
contract RegulatedERC1155Token is ERC1155, Ownable, ReentrancyGuard, Pausable {
    
    // Token metadata structure with essential information
    struct TokenMetadata {
        string name;               // Token name
        string symbol;             // Token symbol
        string companyName;        // Issuing company name
        uint256 currentSupply;     // Current minted supply
        uint256 maxSupply;         // Maximum supply limit
        uint256 initialPrice;      // Initial price in wei
        address creator;           // Token creator address
        uint256 createdAt;         // Creation timestamp
        bool isActive;             // Active status flag
    }
    
    // Reference to the regulatory management contract
    RegulatoryManagement public regulatoryManagement;
    
    // Token counter for generating unique token IDs
    uint256 private _tokenIdCounter;
    
    // Mapping from token ID to token metadata
    mapping(uint256 => TokenMetadata) public tokenMetadata;
    
    // Array to track all created token IDs
    uint256[] public allTokenIds;
    
    // Events
    event TokenCreated(
        uint256 indexed tokenId,
        address indexed creator,
        string name,
        string symbol,
        string companyName,
        uint256 maxSupply,
        uint256 initialPrice,
        uint256 createdAt
    );
    
    event TokenMinted(
        uint256 indexed tokenId,
        address indexed to,
        uint256 amount,
        uint256 newTotalSupply
    );
    
    event TokenStatusChanged(
        uint256 indexed tokenId,
        bool isActive
    );
    
    /**
     * @dev Constructor
     * @param _regulatoryManagement Address of the regulatory management contract
     * @param _uri Base URI for token metadata
     */
    constructor(
        address _regulatoryManagement,
        string memory _uri
    ) ERC1155(_uri) Ownable(msg.sender) {
        require(_regulatoryManagement != address(0), "Invalid regulatory management address");
        regulatoryManagement = RegulatoryManagement(_regulatoryManagement);
        _tokenIdCounter = 1; // Start token IDs from 1
    }
    
    /**
     * @dev Modifier to check if user can create tokens
     */
    modifier onlyTokenCreator() {
        require(
            regulatoryManagement.canUserCreateTokens(msg.sender),
            "Only verified company users can create tokens"
        );
        _;
    }
    
    /**
     * @dev Modifier to check if token exists
     */
    modifier tokenExists(uint256 tokenId) {
        require(_tokenExists(tokenId), "Token does not exist");
        _;
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
     * @dev Create a new token type
     * @param name Token name
     * @param symbol Token symbol
     * @param companyName Issuing company name
     * @param maxSupply Maximum supply limit
     * @param initialPrice Initial price in wei
     * @return tokenId The ID of the created token
     */
    function createToken(
        string memory name,
        string memory symbol,
        string memory companyName,
        uint256 maxSupply,
        uint256 initialPrice
    ) external onlyTokenCreator nonReentrant whenNotPaused returns (uint256) {
        require(bytes(name).length > 0, "Token name cannot be empty");
        require(bytes(symbol).length > 0, "Token symbol cannot be empty");
        require(bytes(companyName).length > 0, "Company name cannot be empty");
        require(maxSupply > 0, "Max supply must be greater than zero");
        require(initialPrice > 0, "Initial price must be greater than zero");
        
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        // Create token metadata
        TokenMetadata memory metadata = TokenMetadata({
            name: name,
            symbol: symbol,
            companyName: companyName,
            currentSupply: 0,
            maxSupply: maxSupply,
            initialPrice: initialPrice,
            creator: msg.sender,
            createdAt: block.timestamp,
            isActive: true
        });
        
        // Store metadata
        tokenMetadata[tokenId] = metadata;
        allTokenIds.push(tokenId);
        
        emit TokenCreated(
            tokenId,
            msg.sender,
            name,
            symbol,
            companyName,
            maxSupply,
            initialPrice,
            block.timestamp
        );
        
        return tokenId;
    }
    
    /**
     * @dev Get token information
     * @param tokenId The token ID to query
     * @return TokenMetadata The token's metadata
     */
    function getTokenInfo(uint256 tokenId) external view tokenExists(tokenId) returns (TokenMetadata memory) {
        return tokenMetadata[tokenId];
    }
    
    /**
     * @dev Get all created token IDs
     * @return uint256[] Array of all token IDs
     */
    function getAllTokens() external view returns (uint256[] memory) {
        return allTokenIds;
    }
    
    /**
     * @dev Get total number of created tokens
     * @return uint256 Total number of tokens
     */
    function getTotalTokenTypes() external view returns (uint256) {
        return allTokenIds.length;
    }
    
    /**
     * @dev Check if a token is active
     * @param tokenId The token ID to check
     * @return bool True if token is active
     */
    function isTokenActive(uint256 tokenId) external view tokenExists(tokenId) returns (bool) {
        return tokenMetadata[tokenId].isActive;
    }
    
    /**
     * @dev Mint tokens to a specified address
     * @param to Address to mint tokens to
     * @param tokenId Token ID to mint
     * @param amount Amount of tokens to mint
     */
    function mintToken(address to, uint256 tokenId, uint256 amount) external tokenExists(tokenId) nonReentrant whenNotPaused {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than zero");
        require(tokenMetadata[tokenId].isActive, "Token is not active");
        
        // Check if caller is the token creator or contract owner
        require(
            msg.sender == tokenMetadata[tokenId].creator || msg.sender == owner(),
            "Only token creator or contract owner can mint"
        );
        
        // Check supply limits
        uint256 newTotalSupply = tokenMetadata[tokenId].currentSupply + amount;
        require(
            newTotalSupply <= tokenMetadata[tokenId].maxSupply,
            "Minting would exceed maximum supply"
        );
        
        // Update current supply
        tokenMetadata[tokenId].currentSupply = newTotalSupply;
        
        // Mint the tokens
        _mint(to, tokenId, amount, "");
        
        emit TokenMinted(tokenId, to, amount, newTotalSupply);
    }
    
    /**
     * @dev Set token active status (only token creator or contract owner)
     * @param tokenId Token ID to update
     * @param isActive New active status
     */
    function setTokenStatus(uint256 tokenId, bool isActive) external tokenExists(tokenId) {
        require(
            msg.sender == tokenMetadata[tokenId].creator || msg.sender == owner(),
            "Only token creator or contract owner can change status"
        );
        
        tokenMetadata[tokenId].isActive = isActive;
        emit TokenStatusChanged(tokenId, isActive);
    }
    
    /**
     * @dev Get current supply of a token
     * @param tokenId Token ID to query
     * @return uint256 Current supply
     */
    function getCurrentSupply(uint256 tokenId) external view tokenExists(tokenId) returns (uint256) {
        return tokenMetadata[tokenId].currentSupply;
    }
    
    /**
     * @dev Get maximum supply of a token
     * @param tokenId Token ID to query
     * @return uint256 Maximum supply
     */
    function getMaxSupply(uint256 tokenId) external view tokenExists(tokenId) returns (uint256) {
        return tokenMetadata[tokenId].maxSupply;
    }
    
    /**
     * @dev Get remaining supply that can be minted
     * @param tokenId Token ID to query
     * @return uint256 Remaining supply
     */
    function getRemainingSupply(uint256 tokenId) external view tokenExists(tokenId) returns (uint256) {
        return tokenMetadata[tokenId].maxSupply - tokenMetadata[tokenId].currentSupply;
    }
    
    /**
     * @dev Marketplace transfer function for authorized transfers
     * @param from Address to transfer from
     * @param to Address to transfer to
     * @param id Token ID to transfer
     * @param amount Amount to transfer
     */
    function marketplaceTransfer(
        address from,
        address to,
        uint256 id,
        uint256 amount
    ) external tokenExists(id) whenNotPaused {
        require(from != address(0), "Transfer from zero address");
        require(to != address(0), "Transfer to zero address");
        require(amount > 0, "Amount must be greater than zero");
        require(tokenMetadata[id].isActive, "Token is not active");
        
        // Only allow marketplace contract to call this function
        require(msg.sender == owner() || _isMarketplaceContract(msg.sender), "Only marketplace can call this function");
        
        // For marketplace transfers, we need to check trading permissions differently
        // If transferring to marketplace (deposit), check sender can trade
        // If transferring from marketplace (withdrawal), check recipient can trade
        if (to == msg.sender) { // Transfer to marketplace (deposit)
            require(
                regulatoryManagement.canUserTrade(from),
                "Sender not authorized to trade"
            );
        } else if (from == msg.sender) { // Transfer from marketplace (withdrawal)
            require(
                regulatoryManagement.canUserTrade(to),
                "Recipient not authorized to trade"
            );
        } else {
            // For other transfers, both parties must be able to trade
            require(
                regulatoryManagement.canUserTrade(from),
                "Sender not authorized to trade"
            );
            require(
                regulatoryManagement.canUserTrade(to),
                "Recipient not authorized to trade"
            );
        }
        
        // Prevent self-trading (but allow marketplace operations)
        require(from != to, "Cannot transfer to self");
        
        // Check balance
        require(balanceOf(from, id) >= amount, "Insufficient balance");
        
        // Perform the transfer
        _safeTransferFrom(from, to, id, amount, "");
    }
    
    /**
     * @dev Check if an address is a marketplace contract
     * @param contractAddress Address to check
     * @return bool True if it's a marketplace contract
     */
    function _isMarketplaceContract(address contractAddress) internal view returns (bool) {
        // For now, we'll check if the contract has the marketplace interface
        // In a more complex system, we might maintain a registry of approved marketplaces
        try IERC165(contractAddress).supportsInterface(type(IERC1155Receiver).interfaceId) returns (bool supported) {
            return supported;
        } catch {
            return false;
        }
    }
    
    /**
     * @dev Override safeTransferFrom to include basic validation
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public override whenNotPaused {
        require(_tokenExists(id), "Token does not exist");
        require(tokenMetadata[id].isActive, "Token is not active");
        
        // Check if both users can trade (basic validation)
        require(
            regulatoryManagement.canUserTrade(from),
            "Sender not authorized to trade"
        );
        require(
            regulatoryManagement.canUserTrade(to),
            "Recipient not authorized to trade"
        );
        
        // Prevent self-trading
        require(from != to, "Cannot transfer to self");
        
        super.safeTransferFrom(from, to, id, amount, data);
    }
    
    /**
     * @dev Override safeBatchTransferFrom to include basic validation
     */
    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) public override whenNotPaused {
        require(from != to, "Cannot transfer to self");
        
        // Check if both users can trade
        require(
            regulatoryManagement.canUserTrade(from),
            "Sender not authorized to trade"
        );
        require(
            regulatoryManagement.canUserTrade(to),
            "Recipient not authorized to trade"
        );
        
        // Validate all tokens exist and are active
        for (uint256 i = 0; i < ids.length; i++) {
            require(_tokenExists(ids[i]), "Token does not exist");
            require(tokenMetadata[ids[i]].isActive, "Token is not active");
        }
        
        super.safeBatchTransferFrom(from, to, ids, amounts, data);
    }
    
    /**
     * @dev Helper function to check if token exists (internal use)
     * @param tokenId Token ID to check
     * @return bool True if token exists
     */
    function _tokenExists(uint256 tokenId) internal view returns (bool) {
        return tokenId > 0 && tokenId < _tokenIdCounter;
    }
}