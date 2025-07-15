// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "./RegulatoryManagement.sol";
import "./RegulatedERC1155Token.sol";

/**
 * @title RegulatedMarketplace
 * @dev Trading platform for regulated ERC1155 tokens with escrow system
 * @notice This contract facilitates secure trading of tokenized shares with regulatory compliance
 */
contract RegulatedMarketplace is Ownable, ReentrancyGuard, Pausable, ERC1155Holder {
    
    // Structs
    struct Listing {
        uint256 listingId;
        address seller;
        address tokenContract;
        uint256 tokenId;
        uint256 amount;
        uint256 pricePerToken;
        uint256 totalPrice;
        uint256 creationTime;
        uint256 expirationTime;
        bool isActive;
        bool isSold;
        string listingType; // "fixed", "auction"
        uint256 minBidAmount;
        address highestBidder;
        uint256 highestBid;
        uint256 bidCount;
    }
    
    struct Bid {
        uint256 bidId;
        uint256 listingId;
        address bidder;
        uint256 amount;
        uint256 timestamp;
        bool isActive;
        bool isWithdrawn;
    }
    
    struct TradeHistory {
        uint256 tradeId;
        address buyer;
        address seller;
        address tokenContract;
        uint256 tokenId;
        uint256 amount;
        uint256 pricePerToken;
        uint256 totalPrice;
        uint256 timestamp;
        uint256 tradingFee;
    }
    
    // State variables
    RegulatoryManagement public immutable regulatoryContract;
    
    mapping(uint256 => Listing) public listings;
    mapping(uint256 => Bid) public bids;
    mapping(uint256 => TradeHistory) public tradeHistory;
    mapping(address => uint256[]) public userListings;
    mapping(address => uint256[]) public userBids;
    mapping(address => uint256[]) public userTrades;
    mapping(address => mapping(address => mapping(uint256 => uint256))) public escrowBalance;
    mapping(address => uint256) public pendingWithdrawals;
    
    uint256 public nextListingId = 1;
    uint256 public nextBidId = 1;
    uint256 public nextTradeId = 1;
    
    uint256 public tradingFeePercentage = 250; // 2.5% (basis points)
    uint256 public constant MAX_TRADING_FEE = 1000; // 10% max
    uint256 public constant BASIS_POINTS = 10000;
    
    address public feeRecipient;
    uint256 public totalFeesCollected;
    
    // Events
    event ListingCreated(
        uint256 indexed listingId,
        address indexed seller,
        address indexed tokenContract,
        uint256 tokenId,
        uint256 amount,
        uint256 pricePerToken,
        uint256 totalPrice,
        string listingType,
        uint256 timestamp
    );
    
    event ListingCancelled(
        uint256 indexed listingId,
        address indexed seller,
        uint256 timestamp
    );
    
    event BidPlaced(
        uint256 indexed bidId,
        uint256 indexed listingId,
        address indexed bidder,
        uint256 amount,
        uint256 timestamp
    );
    
    event BidWithdrawn(
        uint256 indexed bidId,
        address indexed bidder,
        uint256 amount,
        uint256 timestamp
    );
    
    event TokensPurchased(
        uint256 indexed listingId,
        uint256 indexed tradeId,
        address indexed buyer,
        address seller,
        address tokenContract,
        uint256 tokenId,
        uint256 amount,
        uint256 totalPrice,
        uint256 tradingFee,
        uint256 timestamp
    );
    
    event AuctionEnded(
        uint256 indexed listingId,
        address indexed winner,
        uint256 winningBid,
        uint256 timestamp
    );
    
    event TradingFeeUpdated(uint256 oldFee, uint256 newFee);
    event FeeRecipientUpdated(address oldRecipient, address newRecipient);
    event EmergencyWithdrawal(address indexed user, uint256 amount);
    
    constructor(
        address _regulatoryContract,
        address _feeRecipient
    ) Ownable(msg.sender) {
        require(_regulatoryContract != address(0), "Invalid regulatory contract");
        require(_feeRecipient != address(0), "Invalid fee recipient");
        
        regulatoryContract = RegulatoryManagement(_regulatoryContract);
        feeRecipient = _feeRecipient;
    }
    
    // Modifiers
    modifier onlyVerifiedUser() {
        require(regulatoryContract.isVerifiedUser(msg.sender), "User must be verified");
        require(regulatoryContract.canUserTrade(msg.sender), "User cannot trade");
        _;
    }
    
    modifier listingExists(uint256 _listingId) {
        require(_listingId > 0 && _listingId < nextListingId, "Listing does not exist");
        _;
    }
    
    modifier bidExists(uint256 _bidId) {
        require(_bidId > 0 && _bidId < nextBidId, "Bid does not exist");
        _;
    }
    
    modifier onlyListingSeller(uint256 _listingId) {
        require(listings[_listingId].seller == msg.sender, "Only seller can perform this action");
        _;
    }
    
    // Listing Functions
    function createFixedPriceListing(
        address _tokenContract,
        uint256 _tokenId,
        uint256 _amount,
        uint256 _pricePerToken,
        uint256 _expirationTime
    ) external onlyVerifiedUser whenNotPaused nonReentrant returns (uint256) {
        require(_tokenContract != address(0), "Invalid token contract");
        require(_amount > 0, "Amount must be greater than 0");
        require(_pricePerToken > 0, "Price must be greater than 0");
        require(_expirationTime > block.timestamp, "Expiration must be in the future");
        
        IERC1155 tokenContract = IERC1155(_tokenContract);
        require(tokenContract.balanceOf(msg.sender, _tokenId) >= _amount, "Insufficient token balance");
        require(tokenContract.isApprovedForAll(msg.sender, address(this)), "Marketplace not approved");
        
        uint256 listingId = nextListingId++;
        uint256 totalPrice = _amount * _pricePerToken;
        
        listings[listingId] = Listing({
            listingId: listingId,
            seller: msg.sender,
            tokenContract: _tokenContract,
            tokenId: _tokenId,
            amount: _amount,
            pricePerToken: _pricePerToken,
            totalPrice: totalPrice,
            creationTime: block.timestamp,
            expirationTime: _expirationTime,
            isActive: true,
            isSold: false,
            listingType: "fixed",
            minBidAmount: 0,
            highestBidder: address(0),
            highestBid: 0,
            bidCount: 0
        });
        
        userListings[msg.sender].push(listingId);
        
        // Transfer tokens to escrow
        tokenContract.safeTransferFrom(msg.sender, address(this), _tokenId, _amount, "");
        escrowBalance[msg.sender][_tokenContract][_tokenId] += _amount;
        
        emit ListingCreated(
            listingId,
            msg.sender,
            _tokenContract,
            _tokenId,
            _amount,
            _pricePerToken,
            totalPrice,
            "fixed",
            block.timestamp
        );
        
        return listingId;
    }
    
    function createAuctionListing(
        address _tokenContract,
        uint256 _tokenId,
        uint256 _amount,
        uint256 _minBidAmount,
        uint256 _expirationTime
    ) external onlyVerifiedUser whenNotPaused nonReentrant returns (uint256) {
        require(_tokenContract != address(0), "Invalid token contract");
        require(_amount > 0, "Amount must be greater than 0");
        require(_minBidAmount > 0, "Minimum bid must be greater than 0");
        require(_expirationTime > block.timestamp, "Expiration must be in the future");
        
        IERC1155 tokenContract = IERC1155(_tokenContract);
        require(tokenContract.balanceOf(msg.sender, _tokenId) >= _amount, "Insufficient token balance");
        require(tokenContract.isApprovedForAll(msg.sender, address(this)), "Marketplace not approved");
        
        uint256 listingId = nextListingId++;
        
        listings[listingId] = Listing({
            listingId: listingId,
            seller: msg.sender,
            tokenContract: _tokenContract,
            tokenId: _tokenId,
            amount: _amount,
            pricePerToken: 0,
            totalPrice: 0,
            creationTime: block.timestamp,
            expirationTime: _expirationTime,
            isActive: true,
            isSold: false,
            listingType: "auction",
            minBidAmount: _minBidAmount,
            highestBidder: address(0),
            highestBid: 0,
            bidCount: 0
        });
        
        userListings[msg.sender].push(listingId);
        
        // Transfer tokens to escrow
        tokenContract.safeTransferFrom(msg.sender, address(this), _tokenId, _amount, "");
        escrowBalance[msg.sender][_tokenContract][_tokenId] += _amount;
        
        emit ListingCreated(
            listingId,
            msg.sender,
            _tokenContract,
            _tokenId,
            _amount,
            0,
            0,
            "auction",
            block.timestamp
        );
        
        return listingId;
    }
    
    function cancelListing(uint256 _listingId) external listingExists(_listingId) onlyListingSeller(_listingId) nonReentrant {
        Listing storage listing = listings[_listingId];
        require(listing.isActive, "Listing is not active");
        require(!listing.isSold, "Listing already sold");
        
        listing.isActive = false;
        
        // Return tokens from escrow
        IERC1155 tokenContract = IERC1155(listing.tokenContract);
        tokenContract.safeTransferFrom(address(this), msg.sender, listing.tokenId, listing.amount, "");
        escrowBalance[msg.sender][listing.tokenContract][listing.tokenId] -= listing.amount;
        
        // If auction, refund all bids
        if (keccak256(abi.encodePacked(listing.listingType)) == keccak256(abi.encodePacked("auction"))) {
            _refundAllBids(_listingId);
        }
        
        emit ListingCancelled(_listingId, msg.sender, block.timestamp);
    }
    
    // Purchase Functions
    function purchaseTokens(uint256 _listingId) external payable onlyVerifiedUser whenNotPaused nonReentrant listingExists(_listingId) {
        Listing storage listing = listings[_listingId];
        require(listing.isActive, "Listing is not active");
        require(!listing.isSold, "Listing already sold");
        require(block.timestamp <= listing.expirationTime, "Listing has expired");
        require(keccak256(abi.encodePacked(listing.listingType)) == keccak256(abi.encodePacked("fixed")), "Not a fixed price listing");
        require(msg.value >= listing.totalPrice, "Insufficient payment");
        require(msg.sender != listing.seller, "Cannot buy your own listing");
        
        // Check trading limits
        require(regulatoryContract.checkTradingLimit(msg.sender, listing.totalPrice), "Trading limit exceeded");
        
        // Calculate fees
        uint256 tradingFee = (listing.totalPrice * tradingFeePercentage) / BASIS_POINTS;
        uint256 sellerAmount = listing.totalPrice - tradingFee;
        
        // Update listing
        listing.isActive = false;
        listing.isSold = true;
        
        // Create trade record
        uint256 tradeId = nextTradeId++;
        tradeHistory[tradeId] = TradeHistory({
            tradeId: tradeId,
            buyer: msg.sender,
            seller: listing.seller,
            tokenContract: listing.tokenContract,
            tokenId: listing.tokenId,
            amount: listing.amount,
            pricePerToken: listing.pricePerToken,
            totalPrice: listing.totalPrice,
            timestamp: block.timestamp,
            tradingFee: tradingFee
        });
        
        userTrades[msg.sender].push(tradeId);
        userTrades[listing.seller].push(tradeId);
        
        // Transfer tokens from escrow to buyer
        IERC1155 tokenContract = IERC1155(listing.tokenContract);
        tokenContract.safeTransferFrom(address(this), msg.sender, listing.tokenId, listing.amount, "");
        escrowBalance[listing.seller][listing.tokenContract][listing.tokenId] -= listing.amount;
        
        // Transfer payments
        payable(listing.seller).transfer(sellerAmount);
        payable(feeRecipient).transfer(tradingFee);
        totalFeesCollected += tradingFee;
        
        // Refund excess payment
        if (msg.value > listing.totalPrice) {
            payable(msg.sender).transfer(msg.value - listing.totalPrice);
        }
        
        // Record trading volume
        regulatoryContract.recordTradingVolume(msg.sender, listing.totalPrice);
        
        emit TokensPurchased(
            _listingId,
            tradeId,
            msg.sender,
            listing.seller,
            listing.tokenContract,
            listing.tokenId,
            listing.amount,
            listing.totalPrice,
            tradingFee,
            block.timestamp
        );
    }
    
    // Bidding Functions
    function placeBid(uint256 _listingId) external payable onlyVerifiedUser whenNotPaused nonReentrant listingExists(_listingId) {
        Listing storage listing = listings[_listingId];
        require(listing.isActive, "Listing is not active");
        require(!listing.isSold, "Listing already sold");
        require(block.timestamp <= listing.expirationTime, "Listing has expired");
        require(keccak256(abi.encodePacked(listing.listingType)) == keccak256(abi.encodePacked("auction")), "Not an auction listing");
        require(msg.sender != listing.seller, "Cannot bid on your own listing");
        require(msg.value >= listing.minBidAmount, "Bid below minimum amount");
        require(msg.value > listing.highestBid, "Bid must be higher than current highest bid");
        
        // Check trading limits
        require(regulatoryContract.checkTradingLimit(msg.sender, msg.value), "Trading limit exceeded");
        
        // Refund previous highest bidder
        if (listing.highestBidder != address(0)) {
            pendingWithdrawals[listing.highestBidder] += listing.highestBid;
        }
        
        // Create bid record
        uint256 bidId = nextBidId++;
        bids[bidId] = Bid({
            bidId: bidId,
            listingId: _listingId,
            bidder: msg.sender,
            amount: msg.value,
            timestamp: block.timestamp,
            isActive: true,
            isWithdrawn: false
        });
        
        userBids[msg.sender].push(bidId);
        
        // Update listing
        listing.highestBidder = msg.sender;
        listing.highestBid = msg.value;
        listing.bidCount++;
        
        emit BidPlaced(bidId, _listingId, msg.sender, msg.value, block.timestamp);
    }
    
    function endAuction(uint256 _listingId) external listingExists(_listingId) nonReentrant {
        Listing storage listing = listings[_listingId];
        require(listing.isActive, "Listing is not active");
        require(!listing.isSold, "Listing already sold");
        require(block.timestamp > listing.expirationTime, "Auction has not ended yet");
        require(keccak256(abi.encodePacked(listing.listingType)) == keccak256(abi.encodePacked("auction")), "Not an auction listing");
        
        listing.isActive = false;
        
        if (listing.highestBidder != address(0)) {
            // Auction has winner
            listing.isSold = true;
            
            // Calculate fees
            uint256 tradingFee = (listing.highestBid * tradingFeePercentage) / BASIS_POINTS;
            uint256 sellerAmount = listing.highestBid - tradingFee;
            
            // Create trade record
            uint256 tradeId = nextTradeId++;
            tradeHistory[tradeId] = TradeHistory({
                tradeId: tradeId,
                buyer: listing.highestBidder,
                seller: listing.seller,
                tokenContract: listing.tokenContract,
                tokenId: listing.tokenId,
                amount: listing.amount,
                pricePerToken: listing.highestBid / listing.amount,
                totalPrice: listing.highestBid,
                timestamp: block.timestamp,
                tradingFee: tradingFee
            });
            
            userTrades[listing.highestBidder].push(tradeId);
            userTrades[listing.seller].push(tradeId);
            
            // Transfer tokens from escrow to winner
            IERC1155 tokenContract = IERC1155(listing.tokenContract);
            tokenContract.safeTransferFrom(address(this), listing.highestBidder, listing.tokenId, listing.amount, "");
            escrowBalance[listing.seller][listing.tokenContract][listing.tokenId] -= listing.amount;
            
            // Transfer payments
            payable(listing.seller).transfer(sellerAmount);
            payable(feeRecipient).transfer(tradingFee);
            totalFeesCollected += tradingFee;
            
            // Record trading volume
            regulatoryContract.recordTradingVolume(listing.highestBidder, listing.highestBid);
            
            emit AuctionEnded(_listingId, listing.highestBidder, listing.highestBid, block.timestamp);
            
            emit TokensPurchased(
                _listingId,
                tradeId,
                listing.highestBidder,
                listing.seller,
                listing.tokenContract,
                listing.tokenId,
                listing.amount,
                listing.highestBid,
                tradingFee,
                block.timestamp
            );
        } else {
            // No bids, return tokens to seller
            IERC1155 tokenContract = IERC1155(listing.tokenContract);
            tokenContract.safeTransferFrom(address(this), listing.seller, listing.tokenId, listing.amount, "");
            escrowBalance[listing.seller][listing.tokenContract][listing.tokenId] -= listing.amount;
            
            emit AuctionEnded(_listingId, address(0), 0, block.timestamp);
        }
    }
    
    // Withdrawal Functions
    function withdrawBid() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "No pending withdrawals");
        
        pendingWithdrawals[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }
    
    function _refundAllBids(uint256 _listingId) internal {
        Listing storage listing = listings[_listingId];
        if (listing.highestBidder != address(0)) {
            pendingWithdrawals[listing.highestBidder] += listing.highestBid;
        }
    }
    
    // Admin Functions
    function setTradingFee(uint256 _newFeePercentage) external onlyOwner {
        require(_newFeePercentage <= MAX_TRADING_FEE, "Fee too high");
        uint256 oldFee = tradingFeePercentage;
        tradingFeePercentage = _newFeePercentage;
        emit TradingFeeUpdated(oldFee, _newFeePercentage);
    }
    
    function setFeeRecipient(address _newFeeRecipient) external onlyOwner {
        require(_newFeeRecipient != address(0), "Invalid fee recipient");
        address oldRecipient = feeRecipient;
        feeRecipient = _newFeeRecipient;
        emit FeeRecipientUpdated(oldRecipient, _newFeeRecipient);
    }
    
    // View Functions
    function getListing(uint256 _listingId) external view returns (Listing memory) {
        require(_listingId > 0 && _listingId < nextListingId, "Listing does not exist");
        return listings[_listingId];
    }
    
    function getBid(uint256 _bidId) external view returns (Bid memory) {
        require(_bidId > 0 && _bidId < nextBidId, "Bid does not exist");
        return bids[_bidId];
    }
    
    function getTradeHistory(uint256 _tradeId) external view returns (TradeHistory memory) {
        require(_tradeId > 0 && _tradeId < nextTradeId, "Trade does not exist");
        return tradeHistory[_tradeId];
    }
    
    function getUserListings(address _user) external view returns (uint256[] memory) {
        return userListings[_user];
    }
    
    function getUserBids(address _user) external view returns (uint256[] memory) {
        return userBids[_user];
    }
    
    function getUserTrades(address _user) external view returns (uint256[] memory) {
        return userTrades[_user];
    }
    
    function getActiveListings() external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 1; i < nextListingId; i++) {
            if (listings[i].isActive && !listings[i].isSold && block.timestamp <= listings[i].expirationTime) {
                count++;
            }
        }
        
        uint256[] memory activeListings = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 1; i < nextListingId; i++) {
            if (listings[i].isActive && !listings[i].isSold && block.timestamp <= listings[i].expirationTime) {
                activeListings[index] = i;
                index++;
            }
        }
        
        return activeListings;
    }
    
    function getPendingWithdrawal(address _user) external view returns (uint256) {
        return pendingWithdrawals[_user];
    }
    
    function getEscrowBalance(address _user, address _tokenContract, uint256 _tokenId) external view returns (uint256) {
        return escrowBalance[_user][_tokenContract][_tokenId];
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
    
    // ERC1155 Receiver
    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes memory
    ) public virtual override returns (bytes4) {
        return this.onERC1155Received.selector;
    }
    
    function onERC1155BatchReceived(
        address,
        address,
        uint256[] memory,
        uint256[] memory,
        bytes memory
    ) public virtual override returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }
}
