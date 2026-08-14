// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @notice Benchmarking-only ERC-721. Minting is deliberately public and unrestricted
/// (no `Ownable`, no access control) so the harness can mint fixtures on any network
/// without re-keying an owner account per run — see plan §4.1. Not a production pattern.
contract MarketplaceItem is ERC721 {
    uint256 private _nextId;

    constructor(string memory name_, string memory symbol_) ERC721(name_, symbol_) {}

    function mint(address to) external returns (uint256 tokenId) {
        tokenId = ++_nextId;
        _safeMint(to, tokenId);
    }
}
