// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

error NotOwner();
error NotApproved();
error ZeroPrice();
error AlreadyListed();
error NotActive();
error WrongPrice();
error NotSeller();
error SelfPurchase();

/// @notice Minimal list/buy/cancel marketplace for a cost & latency benchmark. Deliberately
/// has no upgradability, fee %, or auction logic — that complexity would be a confound in a
/// cost/latency dataset, not a feature (plan §2.1). Direct transfer on purchase, not a
/// pull-payment escrow, and zero marketplace fee, for the same reason (plan §4.3).
contract Marketplace is ReentrancyGuard {
    struct Listing {
        address seller;
        uint256 price;
        bool active;
    }

    IERC721 public immutable item;
    mapping(uint256 => Listing) public listings;

    event Listed(uint256 indexed tokenId, address indexed seller, uint256 price);
    event Bought(uint256 indexed tokenId, address indexed buyer, uint256 price);
    event Cancelled(uint256 indexed tokenId);

    constructor(address itemAddress) {
        item = IERC721(itemAddress);
    }

    function listItem(uint256 tokenId, uint256 price) external {
        if (item.ownerOf(tokenId) != msg.sender) revert NotOwner();
        if (price == 0) revert ZeroPrice();
        if (listings[tokenId].active) revert AlreadyListed();
        if (
            item.getApproved(tokenId) != address(this) &&
            !item.isApprovedForAll(msg.sender, address(this))
        ) revert NotApproved();

        listings[tokenId] = Listing(msg.sender, price, true);
        emit Listed(tokenId, msg.sender, price);
    }

    function buyItem(uint256 tokenId) external payable nonReentrant {
        Listing memory l = listings[tokenId];
        if (!l.active) revert NotActive();
        if (msg.value != l.price) revert WrongPrice();
        if (msg.sender == l.seller) revert SelfPurchase();

        listings[tokenId].active = false; // effects before interactions

        item.safeTransferFrom(l.seller, msg.sender, tokenId);

        // .call instead of .transfer/.send — the 2300-gas stipend those hard-code behaves
        // inconsistently across EVM implementations (plan §4.3).
        (bool ok, ) = payable(l.seller).call{value: msg.value}("");
        require(ok, "payment failed");

        emit Bought(tokenId, msg.sender, l.price);
    }

    function cancelListing(uint256 tokenId) external {
        if (listings[tokenId].seller != msg.sender) revert NotSeller();
        if (!listings[tokenId].active) revert NotActive();

        listings[tokenId].active = false;
        emit Cancelled(tokenId);
    }
}
