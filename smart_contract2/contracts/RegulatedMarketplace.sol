// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "./RegulatoryManagement.sol";
import "./RegulatedERC1155Token.sol";

/**
 * @title RegulatedMarketplace
 * @dev Marketplace contract for trading regulated ERC1155 tokens with balance management
 */
contract RegulatedMarketplace is Ownable, ReentrancyGuard, Pausable, IERC1155Receiver {
    
    // Reference to the regulatory management contract
    RegulatoryManagement public regulatoryManagement;
    
    // Reference to the token contract
    RegulatedERC1155Token public tokenContract;
    
    // User ETH balances in the marketplace
    mapping(address => uint256) public ethBalances;
    
    // User token balances in the marketplace: user => tokenId => balance
    mapping(address => mapping(uint256 => uint256)) public tokenBalances;
    
    // Order management
    enum OrderType { BUY, SELL }
    enum OrderStatus { ACTIVE, FILLED, CANCELLED }
    
    struct Order {
        uint256 orderId;           // Unique order identifier
        address trader;            // Order creator address
        uint256 tokenId;           // Token being traded
        uint256 amount;            // Order amount
        uint256 price;             // Price per token in wei
        uint256 filledAmount;      // Amount already filled
        OrderType orderType;       // BUY or SELL
        OrderStatus status;        // Order status
        uint256 createdAt;         // Creation timestamp
    }
    
    // Order storage
    mapping(uint256 => Order) public orders;
    uint256 private _orderIdCounter;
    
    // Order books: tokenId => orderId[]
    mapping(uint256 => uint256[]) public buyOrderBook;
    mapping(uint256 => uint256[]) public sellOrderBook;
    
    // User orders: user => orderId[]
    mapping(address => uint256[]) public userOrders;
    
    // Fee system
    uint256 public tradingFeePercentage; // Fee percentage in basis points (e.g., 100 = 1%)
    uint256 public collectedFees; // Total fees collected in ETH
    
    // Constants for fee calculation
    uint256 private constant MAX_FEE_PERCENTAGE = 1000; // Maximum 10% fee
    uint256 private constant BASIS_POINTS = 10000; // 100% = 10000 basis points
    
    // Compliance monitoring
    struct TradingActivity {
        address user;
        uint256 tokenId;
        uint256 amount;
        uint256 price;
        bool isBuyOrder;
        uint256 timestamp;
        uint256 orderId;
    }
    
    // Trading activity logs
    TradingActivity[] public tradingActivities;
    mapping(address => uint256[]) public userTradingActivities; // user => activity indices
    
    // Compliance statistics
    mapping(address => uint256) public userTotalTrades;
    mapping(address => uint256) public userTotalVolume; // in ETH
    
    // Events for balance management
    event ETHDeposited(address indexed user, uint256 amount, uint256 newBalance);
    event ETHWithdrawn(address indexed user, uint256 amount, uint256 newBalance);
    event TokensDeposited(address indexed user, uint256 indexed tokenId, uint256 amount, uint256 newBalance);
    event TokensWithdrawn(address indexed user, uint256 indexed tokenId, uint256 amount, uint256 newBalance);
    
    // Events for order management
    event OrderPlaced(
        uint256 indexed orderId,
        address indexed trader,
        uint256 indexed tokenId,
        uint256 amount,
        uint256 price,
        OrderType orderType
    );
    event OrderCancelled(uint256 indexed orderId, address indexed trader);
    event OrderFilled(
        uint256 indexed orderId,
        address indexed trader,
        uint256 filledAmount,
        uint256 remainingAmount
    );
    event OrderBookUpdated(
        uint256 indexed tokenId,
        uint256 totalBuyOrders,
        uint256 totalSellOrders,
        uint256 highestBuyPrice,
        uint256 lowestSellPrice
    );
    event TradeExecuted(
        uint256 indexed buyOrderId,
        uint256 indexed sellOrderId,
        address indexed buyer,
        address seller,
        uint256 tokenId,
        uint256 amount,
        uint256 price,
        uint256 timestamp
    );
    
    // Fee system events
    event TradingFeeUpdated(uint256 oldFeePercentage, uint256 newFeePercentage);
    event FeeCollected(uint256 indexed buyOrderId, uint256 indexed sellOrderId, uint256 feeAmount);
    event FeesWithdrawn(address indexed owner, uint256 amount);
    
    // Compliance monitoring events
    event TradingActivityLogged(
        address indexed user,
        uint256 indexed tokenId,
        uint256 amount,
        uint256 price,
        bool isBuyOrder,
        uint256 orderId,
        uint256 timestamp
    );
    event SuspiciousActivityDetected(address indexed user, string reason);
    event ComplianceViolation(address indexed user, string violation);
    
    // Additional events for frontend integration
    event ContractPaused(uint256 timestamp);
    event ContractUnpaused(uint256 timestamp);
    event TradingPaused(uint256 timestamp);
    event UserStatsUpdated(address indexed user, uint256 totalTrades, uint256 totalVolume);
    event MarketplaceInitialized(address regulatoryManagement, address tokenContract, uint256 tradingFeePercentage);
    
    /**
     * @dev Constructor
     * @param _regulatoryManagement Address of the regulatory management contract
     * @param _tokenContract Address of the token contract
     */
    constructor(
        address _regulatoryManagement,
        address _tokenContract
    ) Ownable(msg.sender) {
        require(_regulatoryManagement != address(0), "Invalid regulatory management address");
        require(_tokenContract != address(0), "Invalid token contract address");
        
        regulatoryManagement = RegulatoryManagement(_regulatoryManagement);
        tokenContract = RegulatedERC1155Token(_tokenContract);
        
        // Initialize with 0.5% trading fee (50 basis points)
        tradingFeePercentage = 50;
        
        emit MarketplaceInitialized(_regulatoryManagement, _tokenContract, tradingFeePercentage);
    }
    
    /**
     * @dev Modifier to check if user can trade with enhanced compliance checks
     */
    modifier onlyVerifiedTrader() {
        require(
            regulatoryManagement.canUserTrade(msg.sender),
            "User not authorized to trade"
        );
        require(
            !regulatoryManagement.isUserSuspended(msg.sender),
            "User is suspended"
        );
        _;
    }
    
    /**
     * @dev Modifier to perform compliance checks before trading
     */
    modifier complianceCheck(address user) {
        // Check if user is suspended (additional safety check)
        require(!regulatoryManagement.isUserSuspended(user), "User is suspended");
        
        // Check if user is verified
        require(regulatoryManagement.isUserVerified(user), "User not verified");
        
        _;
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
     * @dev Emergency pause for trading only (allows withdrawals)
     */
    function pauseTrading() external onlyOwner {
        _pause();
        emit TradingPaused(block.timestamp);
    }
    
    /**
     * @dev Deposit ETH to the marketplace
     */
    function depositETH() external payable onlyVerifiedTrader nonReentrant whenNotPaused {
        require(msg.value > 0, "Deposit amount must be greater than zero");
        
        ethBalances[msg.sender] += msg.value;
        
        emit ETHDeposited(msg.sender, msg.value, ethBalances[msg.sender]);
    }
    
    /**
     * @dev Withdraw ETH from the marketplace
     * @param amount Amount of ETH to withdraw in wei
     */
    function withdrawETH(uint256 amount) external onlyVerifiedTrader nonReentrant {
        require(amount > 0, "Withdrawal amount must be greater than zero");
        require(ethBalances[msg.sender] >= amount, "Insufficient ETH balance");
        
        ethBalances[msg.sender] -= amount;
        
        // Transfer ETH to user
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "ETH transfer failed");
        
        emit ETHWithdrawn(msg.sender, amount, ethBalances[msg.sender]);
    }
    
    /**
     * @dev Deposit tokens to the marketplace
     * @param tokenId Token ID to deposit
     * @param amount Amount of tokens to deposit
     */
    function depositTokens(uint256 tokenId, uint256 amount) external onlyVerifiedTrader nonReentrant whenNotPaused {
        require(amount > 0, "Deposit amount must be greater than zero");
        require(
            tokenContract.balanceOf(msg.sender, tokenId) >= amount,
            "Insufficient token balance"
        );
        
        // Use marketplace transfer function to bypass normal transfer restrictions
        tokenContract.marketplaceTransfer(msg.sender, address(this), tokenId, amount);
        
        // Update marketplace balance
        tokenBalances[msg.sender][tokenId] += amount;
        
        emit TokensDeposited(msg.sender, tokenId, amount, tokenBalances[msg.sender][tokenId]);
    }
    
    /**
     * @dev Withdraw tokens from the marketplace
     * @param tokenId Token ID to withdraw
     * @param amount Amount of tokens to withdraw
     */
    function withdrawTokens(uint256 tokenId, uint256 amount) external onlyVerifiedTrader nonReentrant {
        require(amount > 0, "Withdrawal amount must be greater than zero");
        require(
            tokenBalances[msg.sender][tokenId] >= amount,
            "Insufficient token balance in marketplace"
        );
        
        // Update marketplace balance
        tokenBalances[msg.sender][tokenId] -= amount;
        
        // Use marketplace transfer function to bypass normal transfer restrictions
        tokenContract.marketplaceTransfer(address(this), msg.sender, tokenId, amount);
        
        emit TokensWithdrawn(msg.sender, tokenId, amount, tokenBalances[msg.sender][tokenId]);
    }
    
    /**
     * @dev Get user's ETH balance in the marketplace
     * @param user Address of the user
     * @return uint256 ETH balance in wei
     */
    function getUserETHBalance(address user) external view returns (uint256) {
        return ethBalances[user];
    }
    
    /**
     * @dev Get user's token balance in the marketplace
     * @param user Address of the user
     * @param tokenId Token ID to query
     * @return uint256 Token balance
     */
    function getUserTokenBalance(address user, uint256 tokenId) external view returns (uint256) {
        return tokenBalances[user][tokenId];
    }
    
    /**
     * @dev Get user's complete balance information
     * @param user Address of the user
     * @return ethBalance User's ETH balance
     * @return tokenIds Array of token IDs the user has balances for
     * @return tokenBalanceAmounts Array of token balances corresponding to tokenIds
     */
    function getUserBalance(address user) external view returns (
        uint256 ethBalance,
        uint256[] memory tokenIds,
        uint256[] memory tokenBalanceAmounts
    ) {
        ethBalance = ethBalances[user];
        
        // Get all token IDs from the token contract
        uint256[] memory allTokenIds = tokenContract.getAllTokens();
        
        // Count how many tokens the user has balances for
        uint256 count = 0;
        for (uint256 i = 0; i < allTokenIds.length; i++) {
            if (tokenBalances[user][allTokenIds[i]] > 0) {
                count++;
            }
        }
        
        // Create arrays for tokens with non-zero balances
        tokenIds = new uint256[](count);
        tokenBalanceAmounts = new uint256[](count);
        
        uint256 index = 0;
        for (uint256 i = 0; i < allTokenIds.length; i++) {
            uint256 balance = tokenBalances[user][allTokenIds[i]];
            if (balance > 0) {
                tokenIds[index] = allTokenIds[i];
                tokenBalanceAmounts[index] = balance;
                index++;
            }
        }
    }
    
    /**
     * @dev Required function to receive ERC1155 tokens
     */
    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external pure override returns (bytes4) {
        return this.onERC1155Received.selector;
    }
    
    /**
     * @dev Required function to receive batch ERC1155 tokens
     */
    function onERC1155BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external pure override returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }
    
    /**
     * @dev Place a buy order
     * @param tokenId Token ID to buy
     * @param amount Amount of tokens to buy
     * @param price Price per token in wei
     * @return orderId The ID of the created order
     */
    function placeBuyOrder(uint256 tokenId, uint256 amount, uint256 price) 
        external 
        onlyVerifiedTrader 
        complianceCheck(msg.sender)
        nonReentrant 
        whenNotPaused
        returns (uint256) 
    {
        require(amount > 0, "Amount must be greater than zero");
        require(price > 0, "Price must be greater than zero");
        
        // Check if token exists
        require(_tokenExists(tokenId), "Token does not exist");
        
        // Calculate total cost
        uint256 totalCost = amount * price;
        require(ethBalances[msg.sender] >= totalCost, "Insufficient ETH balance");
        
        // Lock ETH in escrow
        ethBalances[msg.sender] -= totalCost;
        
        // Create order
        uint256 orderId = ++_orderIdCounter;
        orders[orderId] = Order({
            orderId: orderId,
            trader: msg.sender,
            tokenId: tokenId,
            amount: amount,
            price: price,
            filledAmount: 0,
            orderType: OrderType.BUY,
            status: OrderStatus.ACTIVE,
            createdAt: block.timestamp
        });
        
        // Add to order book and user orders
        buyOrderBook[tokenId].push(orderId);
        userOrders[msg.sender].push(orderId);
        
        emit OrderPlaced(orderId, msg.sender, tokenId, amount, price, OrderType.BUY);
        
        // Log trading activity for compliance monitoring
        _logTradingActivity(msg.sender, tokenId, amount, price, true, orderId);
        
        // Try to match the order immediately
        _matchOrders(tokenId);
        _emitOrderBookUpdate(tokenId);
        
        return orderId;
    }
    
    /**
     * @dev Place a sell order
     * @param tokenId Token ID to sell
     * @param amount Amount of tokens to sell
     * @param price Price per token in wei
     * @return orderId The ID of the created order
     */
    function placeSellOrder(uint256 tokenId, uint256 amount, uint256 price) 
        external 
        onlyVerifiedTrader 
        complianceCheck(msg.sender)
        nonReentrant 
        whenNotPaused
        returns (uint256) 
    {
        require(amount > 0, "Amount must be greater than zero");
        require(price > 0, "Price must be greater than zero");
        
        // Check if token exists
        require(_tokenExists(tokenId), "Token does not exist");
        
        // Check if user has enough tokens
        require(tokenBalances[msg.sender][tokenId] >= amount, "Insufficient token balance");
        
        // Lock tokens in escrow
        tokenBalances[msg.sender][tokenId] -= amount;
        
        // Create order
        uint256 orderId = ++_orderIdCounter;
        orders[orderId] = Order({
            orderId: orderId,
            trader: msg.sender,
            tokenId: tokenId,
            amount: amount,
            price: price,
            filledAmount: 0,
            orderType: OrderType.SELL,
            status: OrderStatus.ACTIVE,
            createdAt: block.timestamp
        });
        
        // Add to order book and user orders
        sellOrderBook[tokenId].push(orderId);
        userOrders[msg.sender].push(orderId);
        
        emit OrderPlaced(orderId, msg.sender, tokenId, amount, price, OrderType.SELL);
        
        // Log trading activity for compliance monitoring
        _logTradingActivity(msg.sender, tokenId, amount, price, false, orderId);
        
        // Try to match the order immediately
        _matchOrders(tokenId);
        _emitOrderBookUpdate(tokenId);
        
        return orderId;
    }
    
    /**
     * @dev Cancel an active order
     * @param orderId ID of the order to cancel
     */
    function cancelOrder(uint256 orderId) external onlyVerifiedTrader nonReentrant {
        require(orderId > 0 && orderId <= _orderIdCounter, "Invalid order ID");
        
        Order storage order = orders[orderId];
        require(order.trader == msg.sender, "Only order creator can cancel");
        require(order.status == OrderStatus.ACTIVE, "Order is not active");
        
        // Calculate remaining amount
        uint256 remainingAmount = order.amount - order.filledAmount;
        require(remainingAmount > 0, "Order already fully filled");
        
        // Update order status
        order.status = OrderStatus.CANCELLED;
        
        // Return locked funds/tokens
        if (order.orderType == OrderType.BUY) {
            uint256 refundAmount = remainingAmount * order.price;
            ethBalances[msg.sender] += refundAmount;  // Refund the normalized amount
        } else {
            tokenBalances[msg.sender][order.tokenId] += remainingAmount;
        }
        
        emit OrderCancelled(orderId, msg.sender);
        _emitOrderBookUpdate(order.tokenId);
    }
    
    /**
     * @dev Get order information
     * @param orderId ID of the order
     * @return Order The order details
     */
    function getOrder(uint256 orderId) external view returns (Order memory) {
        require(orderId > 0 && orderId <= _orderIdCounter, "Invalid order ID");
        return orders[orderId];
    }
    
    /**
     * @dev Get active buy orders for a token sorted by price (highest first)
     * @param tokenId Token ID to query
     * @return Order[] Array of active buy orders sorted by price descending
     */
    function getBuyOrders(uint256 tokenId) external view returns (Order[] memory) {
        uint256[] memory orderIds = buyOrderBook[tokenId];
        
        // Count active orders
        uint256 activeCount = 0;
        for (uint256 i = 0; i < orderIds.length; i++) {
            if (orders[orderIds[i]].status == OrderStatus.ACTIVE) {
                activeCount++;
            }
        }
        
        // Create array of active orders
        Order[] memory activeOrders = new Order[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < orderIds.length; i++) {
            if (orders[orderIds[i]].status == OrderStatus.ACTIVE) {
                activeOrders[index] = orders[orderIds[i]];
                index++;
            }
        }
        
        // Sort buy orders by price (highest first) using bubble sort
        for (uint256 i = 0; i < activeOrders.length; i++) {
            for (uint256 j = 0; j < activeOrders.length - i - 1; j++) {
                if (activeOrders[j].price < activeOrders[j + 1].price) {
                    Order memory temp = activeOrders[j];
                    activeOrders[j] = activeOrders[j + 1];
                    activeOrders[j + 1] = temp;
                }
            }
        }
        
        return activeOrders;
    }
    
    /**
     * @dev Get active sell orders for a token sorted by price (lowest first)
     * @param tokenId Token ID to query
     * @return Order[] Array of active sell orders sorted by price ascending
     */
    function getSellOrders(uint256 tokenId) external view returns (Order[] memory) {
        uint256[] memory orderIds = sellOrderBook[tokenId];
        
        // Count active orders
        uint256 activeCount = 0;
        for (uint256 i = 0; i < orderIds.length; i++) {
            if (orders[orderIds[i]].status == OrderStatus.ACTIVE) {
                activeCount++;
            }
        }
        
        // Create array of active orders
        Order[] memory activeOrders = new Order[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < orderIds.length; i++) {
            if (orders[orderIds[i]].status == OrderStatus.ACTIVE) {
                activeOrders[index] = orders[orderIds[i]];
                index++;
            }
        }
        
        // Sort sell orders by price (lowest first) using bubble sort
        for (uint256 i = 0; i < activeOrders.length; i++) {
            for (uint256 j = 0; j < activeOrders.length - i - 1; j++) {
                if (activeOrders[j].price > activeOrders[j + 1].price) {
                    Order memory temp = activeOrders[j];
                    activeOrders[j] = activeOrders[j + 1];
                    activeOrders[j + 1] = temp;
                }
            }
        }
        
        return activeOrders;
    }
    
    /**
     * @dev Get user's orders
     * @param user Address of the user
     * @return Order[] Array of user's orders
     */
    function getUserOrders(address user) external view returns (Order[] memory) {
        uint256[] memory orderIds = userOrders[user];
        Order[] memory userOrderList = new Order[](orderIds.length);
        
        for (uint256 i = 0; i < orderIds.length; i++) {
            userOrderList[i] = orders[orderIds[i]];
        }
        
        return userOrderList;
    }
    
    /**
     * @dev Get complete order book for a token (both buy and sell orders)
     * @param tokenId Token ID to query
     * @return buyOrders Array of active buy orders sorted by price descending
     * @return sellOrders Array of active sell orders sorted by price ascending
     */
    function getOrderBook(uint256 tokenId) external view returns (
        Order[] memory buyOrders,
        Order[] memory sellOrders
    ) {
        // Get buy orders (sorted by price descending)
        uint256[] memory buyOrderIds = buyOrderBook[tokenId];
        uint256 activeBuyCount = 0;
        for (uint256 i = 0; i < buyOrderIds.length; i++) {
            if (orders[buyOrderIds[i]].status == OrderStatus.ACTIVE) {
                activeBuyCount++;
            }
        }
        
        buyOrders = new Order[](activeBuyCount);
        uint256 buyIndex = 0;
        for (uint256 i = 0; i < buyOrderIds.length; i++) {
            if (orders[buyOrderIds[i]].status == OrderStatus.ACTIVE) {
                buyOrders[buyIndex] = orders[buyOrderIds[i]];
                buyIndex++;
            }
        }
        
        // Sort buy orders by price (highest first)
        for (uint256 i = 0; i < buyOrders.length; i++) {
            for (uint256 j = 0; j < buyOrders.length - i - 1; j++) {
                if (buyOrders[j].price < buyOrders[j + 1].price) {
                    Order memory temp = buyOrders[j];
                    buyOrders[j] = buyOrders[j + 1];
                    buyOrders[j + 1] = temp;
                }
            }
        }
        
        // Get sell orders (sorted by price ascending)
        uint256[] memory sellOrderIds = sellOrderBook[tokenId];
        uint256 activeSellCount = 0;
        for (uint256 i = 0; i < sellOrderIds.length; i++) {
            if (orders[sellOrderIds[i]].status == OrderStatus.ACTIVE) {
                activeSellCount++;
            }
        }
        
        sellOrders = new Order[](activeSellCount);
        uint256 sellIndex = 0;
        for (uint256 i = 0; i < sellOrderIds.length; i++) {
            if (orders[sellOrderIds[i]].status == OrderStatus.ACTIVE) {
                sellOrders[sellIndex] = orders[sellOrderIds[i]];
                sellIndex++;
            }
        }
        
        // Sort sell orders by price (lowest first)
        for (uint256 i = 0; i < sellOrders.length; i++) {
            for (uint256 j = 0; j < sellOrders.length - i - 1; j++) {
                if (sellOrders[j].price > sellOrders[j + 1].price) {
                    Order memory temp = sellOrders[j];
                    sellOrders[j] = sellOrders[j + 1];
                    sellOrders[j + 1] = temp;
                }
            }
        }
    }
    
    /**
     * @dev Get order book statistics for a token
     * @param tokenId Token ID to query
     * @return totalBuyOrders Number of active buy orders
     * @return totalSellOrders Number of active sell orders
     * @return highestBuyPrice Highest buy order price (0 if no buy orders)
     * @return lowestSellPrice Lowest sell order price (0 if no sell orders)
     * @return totalBuyVolume Total volume of all buy orders
     * @return totalSellVolume Total volume of all sell orders
     */
    function getOrderBookStats(uint256 tokenId) external view returns (
        uint256 totalBuyOrders,
        uint256 totalSellOrders,
        uint256 highestBuyPrice,
        uint256 lowestSellPrice,
        uint256 totalBuyVolume,
        uint256 totalSellVolume
    ) {
        // Analyze buy orders
        uint256[] memory buyOrderIds = buyOrderBook[tokenId];
        for (uint256 i = 0; i < buyOrderIds.length; i++) {
            Order memory order = orders[buyOrderIds[i]];
            if (order.status == OrderStatus.ACTIVE) {
                totalBuyOrders++;
                uint256 remainingAmount = order.amount - order.filledAmount;
                totalBuyVolume += remainingAmount;
                
                if (highestBuyPrice == 0 || order.price > highestBuyPrice) {
                    highestBuyPrice = order.price;
                }
            }
        }
        
        // Analyze sell orders
        uint256[] memory sellOrderIds = sellOrderBook[tokenId];
        for (uint256 i = 0; i < sellOrderIds.length; i++) {
            Order memory order = orders[sellOrderIds[i]];
            if (order.status == OrderStatus.ACTIVE) {
                totalSellOrders++;
                uint256 remainingAmount = order.amount - order.filledAmount;
                totalSellVolume += remainingAmount;
                
                if (lowestSellPrice == 0 || order.price < lowestSellPrice) {
                    lowestSellPrice = order.price;
                }
            }
        }
    }
    
    /**
     * @dev Get user's active orders only
     * @param user Address of the user
     * @return Order[] Array of user's active orders
     */
    function getUserActiveOrders(address user) external view returns (Order[] memory) {
        uint256[] memory orderIds = userOrders[user];
        
        // Count active orders
        uint256 activeCount = 0;
        for (uint256 i = 0; i < orderIds.length; i++) {
            if (orders[orderIds[i]].status == OrderStatus.ACTIVE) {
                activeCount++;
            }
        }
        
        // Create array of active orders
        Order[] memory activeOrders = new Order[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < orderIds.length; i++) {
            if (orders[orderIds[i]].status == OrderStatus.ACTIVE) {
                activeOrders[index] = orders[orderIds[i]];
                index++;
            }
        }
        
        return activeOrders;
    }
    
    /**
     * @dev Manually trigger order matching for a specific token
     * @param tokenId Token ID to match orders for
     * @dev This function can be called by anyone to trigger matching
     */
    function matchOrders(uint256 tokenId) external nonReentrant whenNotPaused {
        require(_tokenExists(tokenId), "Token does not exist");
        _matchOrders(tokenId);
        _emitOrderBookUpdate(tokenId);
    }
    
    /**
     * @dev Check if two orders can be matched
     * @param buyOrderId Buy order ID
     * @param sellOrderId Sell order ID
     * @return canMatch True if orders can be matched
     * @return tradeAmount Amount that can be traded
     * @return tradePrice Price at which trade would execute
     */
    function canOrdersMatch(uint256 buyOrderId, uint256 sellOrderId) external view returns (
        bool canMatch,
        uint256 tradeAmount,
        uint256 tradePrice
    ) {
        require(buyOrderId > 0 && buyOrderId <= _orderIdCounter, "Invalid buy order ID");
        require(sellOrderId > 0 && sellOrderId <= _orderIdCounter, "Invalid sell order ID");
        
        Order memory buyOrder = orders[buyOrderId];
        Order memory sellOrder = orders[sellOrderId];
        
        // Check basic conditions
        if (buyOrder.status != OrderStatus.ACTIVE || 
            sellOrder.status != OrderStatus.ACTIVE ||
            buyOrder.orderType != OrderType.BUY ||
            sellOrder.orderType != OrderType.SELL ||
            buyOrder.tokenId != sellOrder.tokenId ||
            buyOrder.trader == sellOrder.trader) {
            return (false, 0, 0);
        }
        
        // Check price compatibility
        if (buyOrder.price < sellOrder.price) {
            return (false, 0, 0);
        }
        
        // Calculate trade amount
        uint256 buyRemaining = buyOrder.amount - buyOrder.filledAmount;
        uint256 sellRemaining = sellOrder.amount - sellOrder.filledAmount;
        tradeAmount = buyRemaining < sellRemaining ? buyRemaining : sellRemaining;
        
        if (tradeAmount == 0) {
            return (false, 0, 0);
        }
        
        // Trade executes at sell order price
        tradePrice = sellOrder.price;
        canMatch = true;
    }
    
    /**
     * @dev Set trading fee percentage (only owner)
     * @param _feePercentage Fee percentage in basis points (e.g., 100 = 1%)
     */
    function setTradingFeePercentage(uint256 _feePercentage) external onlyOwner {
        require(_feePercentage <= MAX_FEE_PERCENTAGE, "Fee percentage too high");
        
        uint256 oldFeePercentage = tradingFeePercentage;
        tradingFeePercentage = _feePercentage;
        
        emit TradingFeeUpdated(oldFeePercentage, _feePercentage);
    }
    
    /**
     * @dev Get current trading fee percentage
     * @return uint256 Fee percentage in basis points
     */
    function getTradingFeePercentage() external view returns (uint256) {
        return tradingFeePercentage;
    }
    
    /**
     * @dev Get total collected fees
     * @return uint256 Total fees collected in ETH
     */
    function getCollectedFees() external view returns (uint256) {
        return collectedFees;
    }
    
    /**
     * @dev Withdraw collected fees (only owner)
     * @param amount Amount of fees to withdraw in wei
     */
    function withdrawFees(uint256 amount) external onlyOwner nonReentrant {
        require(amount > 0, "Withdrawal amount must be greater than zero");
        require(collectedFees >= amount, "Insufficient collected fees");
        
        collectedFees -= amount;
        
        // Transfer fees to owner
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Fee transfer failed");
        
        emit FeesWithdrawn(owner(), amount);
    }
    
    /**
     * @dev Withdraw all collected fees (only owner)
     */
    function withdrawAllFees() external onlyOwner nonReentrant {
        require(collectedFees > 0, "No fees to withdraw");
        
        uint256 amount = collectedFees;
        collectedFees = 0;
        
        // Transfer all fees to owner
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Fee transfer failed");
        
        emit FeesWithdrawn(owner(), amount);
    }
    
    /**
     * @dev Calculate trading fee for a given trade amount
     * @param tradeValue Total value of the trade in ETH
     * @return uint256 Fee amount in ETH
     */
    function calculateTradingFee(uint256 tradeValue) public view returns (uint256) {
        if (tradingFeePercentage == 0) {
            return 0;
        }
        // Trade value is already in wei, no need to normalize
        return (tradeValue * tradingFeePercentage) / BASIS_POINTS;
    }
    
    /**
     * @dev Get user's trading statistics
     * @param user Address of the user
     * @return totalTrades Total number of trades
     * @return totalVolume Total trading volume in ETH
     * @return isVerified Whether user is verified
     * @return isSuspended Whether user is suspended
     */
    function getUserTradingStats(address user) external view returns (
        uint256 totalTrades,
        uint256 totalVolume,
        bool isVerified,
        bool isSuspended
    ) {
        totalTrades = userTotalTrades[user];
        totalVolume = userTotalVolume[user];
        isVerified = regulatoryManagement.isUserVerified(user);
        isSuspended = regulatoryManagement.isUserSuspended(user);
    }
    
    /**
     * @dev Get user's trading activity history
     * @param user Address of the user
     * @return TradingActivity[] Array of user's trading activities
     */
    function getUserTradingHistory(address user) external view returns (TradingActivity[] memory) {
        uint256[] memory activityIndices = userTradingActivities[user];
        TradingActivity[] memory activities = new TradingActivity[](activityIndices.length);
        
        for (uint256 i = 0; i < activityIndices.length; i++) {
            activities[i] = tradingActivities[activityIndices[i]];
        }
        
        return activities;
    }
    
    /**
     * @dev Get recent trading activities (last N activities)
     * @param count Number of recent activities to return
     * @return TradingActivity[] Array of recent trading activities
     */
    function getRecentTradingActivities(uint256 count) external view returns (TradingActivity[] memory) {
        uint256 totalActivities = tradingActivities.length;
        if (totalActivities == 0) {
            return new TradingActivity[](0);
        }
        
        uint256 returnCount = count > totalActivities ? totalActivities : count;
        TradingActivity[] memory recentActivities = new TradingActivity[](returnCount);
        
        for (uint256 i = 0; i < returnCount; i++) {
            recentActivities[i] = tradingActivities[totalActivities - returnCount + i];
        }
        
        return recentActivities;
    }
    
    /**
     * @dev Get total number of trading activities
     * @return uint256 Total number of trading activities
     */
    function getTotalTradingActivities() external view returns (uint256) {
        return tradingActivities.length;
    }
    
    /**
     * @dev Check if user has suspicious trading patterns (admin function)
     * @param user Address of the user to check
     * @return bool True if suspicious activity detected
     * @return string Reason for suspicion
     */
    function checkSuspiciousActivity(address user) external view returns (bool, string memory) {
        uint256 totalTrades = userTotalTrades[user];
        uint256 totalVolume = userTotalVolume[user];
        
        // Simple suspicious activity checks
        if (totalTrades > 100) {
            return (true, "Excessive trading frequency");
        }
        
        if (totalVolume > 1000 ether) {
            return (true, "Unusually high trading volume");
        }
        
        // Check for rapid trading (more than 10 trades in recent activities)
        uint256[] memory userActivities = userTradingActivities[user];
        if (userActivities.length >= 10) {
            uint256 recentCount = 0;
            uint256 currentTime = block.timestamp;
            
            // Check last 10 activities within 1 hour
            for (uint256 i = userActivities.length - 10; i < userActivities.length; i++) {
                if (currentTime - tradingActivities[userActivities[i]].timestamp <= 3600) {
                    recentCount++;
                }
            }
            
            if (recentCount >= 10) {
                return (true, "Rapid trading pattern detected");
            }
        }
        
        return (false, "No suspicious activity detected");
    }
    
    /**
     * @dev Emergency suspend user for compliance violations (admin only)
     * @param user Address of the user to suspend
     * @param reason Reason for suspension
     */
    function emergencySuspendUser(address user, string memory reason) external onlyOwner {
        require(regulatoryManagement.isRegistered(user), "User not registered");
        require(!regulatoryManagement.isUserSuspended(user), "User already suspended");
        
        // This function would typically call the regulatory management contract
        // For now, we emit an event for compliance tracking
        emit ComplianceViolation(user, reason);
        emit SuspiciousActivityDetected(user, reason);
    }
    
    /**
     * @dev Internal function to log trading activity for compliance monitoring
     * @param user Address of the user
     * @param tokenId Token ID being traded
     * @param amount Amount being traded
     * @param price Price per token
     * @param isBuyOrder True if buy order, false if sell order
     * @param orderId Order ID
     */
    function _logTradingActivity(
        address user,
        uint256 tokenId,
        uint256 amount,
        uint256 price,
        bool isBuyOrder,
        uint256 orderId
    ) internal {
        TradingActivity memory activity = TradingActivity({
            user: user,
            tokenId: tokenId,
            amount: amount,
            price: price,
            isBuyOrder: isBuyOrder,
            timestamp: block.timestamp,
            orderId: orderId
        });
        
        uint256 activityIndex = tradingActivities.length;
        tradingActivities.push(activity);
        userTradingActivities[user].push(activityIndex);
        
        emit TradingActivityLogged(user, tokenId, amount, price, isBuyOrder, orderId, block.timestamp);
    }
    
    /**
     * @dev Internal function to update user trading statistics
     * @param user Address of the user
     * @param tradeVolume Volume of the trade in ETH
     */
    function _updateTradingStats(address user, uint256 tradeVolume) internal {
        userTotalTrades[user]++;
        // tradeVolume is already in wei, add it directly
        userTotalVolume[user] += tradeVolume;
        
        emit UserStatsUpdated(user, userTotalTrades[user], userTotalVolume[user]);
    }
    
    /**
     * @dev Check if a token exists (internal helper)
     * @param tokenId Token ID to check
     * @return bool True if token exists
     */
    function _tokenExists(uint256 tokenId) internal view returns (bool) {
        try tokenContract.getTokenInfo(tokenId) returns (RegulatedERC1155Token.TokenMetadata memory) {
            return true;
        } catch {
            return false;
        }
    }
    
    /**
     * @dev Internal function to match orders automatically
     * @param tokenId Token ID to match orders for
     */
    function _matchOrders(uint256 tokenId) internal {
        uint256[] memory buyOrderIds = buyOrderBook[tokenId];
        uint256[] memory sellOrderIds = sellOrderBook[tokenId];
        
        // Continue matching until no more matches are possible
        bool matchFound = true;
        while (matchFound) {
            matchFound = false;
            
            // Find the best buy order (highest price)
            uint256 bestBuyOrderId = 0;
            uint256 bestBuyPrice = 0;
            for (uint256 i = 0; i < buyOrderIds.length; i++) {
                Order storage buyOrder = orders[buyOrderIds[i]];
                if (buyOrder.status == OrderStatus.ACTIVE && 
                    buyOrder.amount > buyOrder.filledAmount &&
                    buyOrder.price > bestBuyPrice) {
                    bestBuyPrice = buyOrder.price;
                    bestBuyOrderId = buyOrderIds[i];
                }
            }
            
            // Find the best sell order (lowest price)
            uint256 bestSellOrderId = 0;
            uint256 bestSellPrice = type(uint256).max;
            for (uint256 i = 0; i < sellOrderIds.length; i++) {
                Order storage sellOrder = orders[sellOrderIds[i]];
                if (sellOrder.status == OrderStatus.ACTIVE && 
                    sellOrder.amount > sellOrder.filledAmount &&
                    sellOrder.price < bestSellPrice) {
                    bestSellPrice = sellOrder.price;
                    bestSellOrderId = sellOrderIds[i];
                }
            }
            
            // Check if we can match (buy price >= sell price)
            if (bestBuyOrderId != 0 && bestSellOrderId != 0 && bestBuyPrice >= bestSellPrice) {
                Order storage buyOrder = orders[bestBuyOrderId];
                Order storage sellOrder = orders[bestSellOrderId];
                
                // Prevent self-trading
                if (buyOrder.trader != sellOrder.trader) {
                    // Calculate trade amount (minimum of remaining amounts)
                    uint256 buyRemaining = buyOrder.amount - buyOrder.filledAmount;
                    uint256 sellRemaining = sellOrder.amount - sellOrder.filledAmount;
                    uint256 tradeAmount = buyRemaining < sellRemaining ? buyRemaining : sellRemaining;
                    
                    if (tradeAmount > 0) {
                        _executeTrade(
                            bestBuyOrderId,
                            bestSellOrderId,
                            tradeAmount,
                            tokenId
                        );
                        matchFound = true;
                    }
                }
            }
        }
    }
    
    /**
     * @dev Internal function to execute a trade between two orders
     * @param buyOrderId Buy order ID
     * @param sellOrderId Sell order ID
     * @param tradeAmount Amount to trade
     * @param tokenId Token ID being traded
     */
    function _executeTrade(
        uint256 buyOrderId,
        uint256 sellOrderId,
        uint256 tradeAmount,
        uint256 tokenId
    ) internal {
        Order storage buyOrder = orders[buyOrderId];
        Order storage sellOrder = orders[sellOrderId];
        
        // Execute the trade at the sell order price (better for buyer)
        uint256 tradePrice = sellOrder.price;
        uint256 totalCost = tradeAmount * tradePrice;
        
        // Calculate trading fee
        uint256 tradingFee = calculateTradingFee(totalCost);
        
        // Update order filled amounts
        buyOrder.filledAmount += tradeAmount;
        sellOrder.filledAmount += tradeAmount;
        
        // Transfer tokens from escrow to buyer
        tokenBalances[buyOrder.trader][tokenId] += tradeAmount;
        
        // Handle ETH transfers with fee deduction
        // Buyer gets refund for price difference if buy price was higher
        uint256 buyerCost = tradeAmount * buyOrder.price;
        if (buyerCost > totalCost) {
            ethBalances[buyOrder.trader] += (buyerCost - totalCost);
        }
        
        // Seller receives ETH minus trading fee
        uint256 sellerReceives = totalCost - tradingFee;
        ethBalances[sellOrder.trader] += sellerReceives;
        
        // Collect trading fee
        if (tradingFee > 0) {
            collectedFees += tradingFee;
            emit FeeCollected(buyOrderId, sellOrderId, tradingFee);
        }
        
        // Update trading statistics for compliance monitoring
        _updateTradingStats(buyOrder.trader, totalCost);
        _updateTradingStats(sellOrder.trader, totalCost);
        
        // Update order status if fully filled
        if (buyOrder.filledAmount >= buyOrder.amount) {
            buyOrder.status = OrderStatus.FILLED;
        }
        if (sellOrder.filledAmount >= sellOrder.amount) {
            sellOrder.status = OrderStatus.FILLED;
        }
        
        // Emit events
        emit OrderFilled(
            buyOrderId,
            buyOrder.trader,
            buyOrder.filledAmount,
            buyOrder.amount - buyOrder.filledAmount
        );
        
        emit OrderFilled(
            sellOrderId,
            sellOrder.trader,
            sellOrder.filledAmount,
            sellOrder.amount - sellOrder.filledAmount
        );
        
        emit TradeExecuted(
            buyOrderId,
            sellOrderId,
            buyOrder.trader,
            sellOrder.trader,
            tokenId,
            tradeAmount,
            tradePrice,
            block.timestamp
        );
    }
    
    /**
     * @dev Internal helper to emit order book update events
     * @param tokenId Token ID for which to emit the update
     */
    function _emitOrderBookUpdate(uint256 tokenId) internal {
        (
            uint256 totalBuyOrders,
            uint256 totalSellOrders,
            uint256 highestBuyPrice,
            uint256 lowestSellPrice,
            ,
        ) = this.getOrderBookStats(tokenId);
        
        emit OrderBookUpdated(
            tokenId,
            totalBuyOrders,
            totalSellOrders,
            highestBuyPrice,
            lowestSellPrice
        );
    }
    
    /**
     * @dev Get marketplace statistics
     * @return totalOrders Total number of orders placed
     * @return activeOrders Number of active orders
     * @return totalTrades Total number of completed trades
     * @return totalVolume Total trading volume in ETH
     * @return totalFeesCollected Total fees collected
     */
    function getMarketplaceStats() external view returns (
        uint256 totalOrders,
        uint256 activeOrders,
        uint256 totalTrades,
        uint256 totalVolume,
        uint256 totalFeesCollected
    ) {
        totalOrders = _orderIdCounter;
        totalFeesCollected = collectedFees;
        
        // Count active orders and calculate total volume
        for (uint256 i = 1; i <= _orderIdCounter; i++) {
            if (orders[i].status == OrderStatus.ACTIVE) {
                activeOrders++;
            }
            if (orders[i].status == OrderStatus.FILLED) {
                totalTrades++;
                totalVolume += orders[i].filledAmount * orders[i].price;
            }
        }
    }
    
    /**
     * @dev Get all orders for a specific token
     * @param tokenId Token ID to query
     * @return Order[] Array of all orders (active, filled, cancelled) for the token
     */
    function getAllOrdersForToken(uint256 tokenId) external view returns (Order[] memory) {
        // Count total orders for this token
        uint256 count = 0;
        for (uint256 i = 1; i <= _orderIdCounter; i++) {
            if (orders[i].tokenId == tokenId) {
                count++;
            }
        }
        
        // Create array and populate
        Order[] memory tokenOrders = new Order[](count);
        uint256 index = 0;
        for (uint256 i = 1; i <= _orderIdCounter; i++) {
            if (orders[i].tokenId == tokenId) {
                tokenOrders[index] = orders[i];
                index++;
            }
        }
        
        return tokenOrders;
    }
    
    /**
     * @dev Get recent orders (last N orders)
     * @param count Number of recent orders to return
     * @return Order[] Array of recent orders
     */
    function getRecentOrders(uint256 count) external view returns (Order[] memory) {
        if (_orderIdCounter == 0) {
            return new Order[](0);
        }
        
        uint256 returnCount = count > _orderIdCounter ? _orderIdCounter : count;
        Order[] memory recentOrders = new Order[](returnCount);
        
        for (uint256 i = 0; i < returnCount; i++) {
            recentOrders[i] = orders[_orderIdCounter - i];
        }
        
        return recentOrders;
    }
    
    /**
     * @dev Get orders by status
     * @param status Order status to filter by
     * @return Order[] Array of orders with the specified status
     */
    function getOrdersByStatus(OrderStatus status) external view returns (Order[] memory) {
        // Count orders with specified status
        uint256 count = 0;
        for (uint256 i = 1; i <= _orderIdCounter; i++) {
            if (orders[i].status == status) {
                count++;
            }
        }
        
        // Create array and populate
        Order[] memory statusOrders = new Order[](count);
        uint256 index = 0;
        for (uint256 i = 1; i <= _orderIdCounter; i++) {
            if (orders[i].status == status) {
                statusOrders[index] = orders[i];
                index++;
            }
        }
        
        return statusOrders;
    }
    
    /**
     * @dev Get comprehensive user trading data
     * @param user Address of the user
     * @return ethBalance User's ETH balance in marketplace
     * @return tokenIds Array of token IDs user has balances for
     * @return tokenBalanceAmounts Array of token balances
     * @return activeOrdersCount Number of active orders
     * @return totalTradesCount Total completed trades
     * @return totalVolumeTraded Total volume traded in ETH
     */
    function getComprehensiveUserData(address user) external view returns (
        uint256 ethBalance,
        uint256[] memory tokenIds,
        uint256[] memory tokenBalanceAmounts,
        uint256 activeOrdersCount,
        uint256 totalTradesCount,
        uint256 totalVolumeTraded
    ) {
        // Get balance data
        (ethBalance, tokenIds, tokenBalanceAmounts) = this.getUserBalance(user);
        
        // Get trading stats
        totalTradesCount = userTotalTrades[user];
        totalVolumeTraded = userTotalVolume[user];
        
        // Count active orders
        uint256[] memory userOrderIds = userOrders[user];
        for (uint256 i = 0; i < userOrderIds.length; i++) {
            if (orders[userOrderIds[i]].status == OrderStatus.ACTIVE) {
                activeOrdersCount++;
            }
        }
    }
    
    /**
     * @dev Get market depth for a token (aggregated order book data)
     * @param tokenId Token ID to query
     * @param levels Number of price levels to return
     * @return buyPrices Array of buy price levels
     * @return buyVolumes Array of buy volumes at each price level
     * @return sellPrices Array of sell price levels
     * @return sellVolumes Array of sell volumes at each price level
     */
    function getMarketDepth(uint256 tokenId, uint256 levels) external view returns (
        uint256[] memory buyPrices,
        uint256[] memory buyVolumes,
        uint256[] memory sellPrices,
        uint256[] memory sellVolumes
    ) {
        // Get sorted orders
        (Order[] memory buyOrders, Order[] memory sellOrders) = this.getOrderBook(tokenId);
        
        // Initialize arrays
        buyPrices = new uint256[](levels);
        buyVolumes = new uint256[](levels);
        sellPrices = new uint256[](levels);
        sellVolumes = new uint256[](levels);
        
        // Aggregate buy orders by price level
        uint256 buyLevel = 0;
        for (uint256 i = 0; i < buyOrders.length && buyLevel < levels; i++) {
            uint256 price = buyOrders[i].price;
            uint256 volume = buyOrders[i].amount - buyOrders[i].filledAmount;
            
            if (buyLevel == 0 || buyPrices[buyLevel - 1] != price) {
                buyPrices[buyLevel] = price;
                buyVolumes[buyLevel] = volume;
                buyLevel++;
            } else {
                buyVolumes[buyLevel - 1] += volume;
            }
        }
        
        // Aggregate sell orders by price level
        uint256 sellLevel = 0;
        for (uint256 i = 0; i < sellOrders.length && sellLevel < levels; i++) {
            uint256 price = sellOrders[i].price;
            uint256 volume = sellOrders[i].amount - sellOrders[i].filledAmount;
            
            if (sellLevel == 0 || sellPrices[sellLevel - 1] != price) {
                sellPrices[sellLevel] = price;
                sellVolumes[sellLevel] = volume;
                sellLevel++;
            } else {
                sellVolumes[sellLevel - 1] += volume;
            }
        }
    }
    
    /**
     * @dev Check if contract supports interface
     */
    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return interfaceId == type(IERC1155Receiver).interfaceId;
    }
}