// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @notice Benchmarking-only ERC-721. Minting is deliberately public and unrestricted
/// (no `Ownable`, no access control) so the harness can mint fixtures on any network
/// without re-keying an owner account per run — see plan §4.1. Not a production pattern.
///
/// Ported verbatim from ../../../marketplace-bench/contracts/MarketplaceItem.sol for the
/// Conflux Core Space (native CVM) leg — no source changes were required. Core Space's
/// CVM has been EVM-opcode-compatible since the Hydra hard fork; the only differences from
/// eSpace are protocol-level (storage collateral, address format, tx fields), not
/// contract-source-level. See ../README.md for what was actually verified.
contract MarketplaceItem is ERC721 {
    uint256 private _nextId;

    constructor(string memory name_, string memory symbol_) ERC721(name_, symbol_) {}

    function mint(address to) external returns (uint256 tokenId) {
        tokenId = ++_nextId;
        _safeMint(to, tokenId);
    }
}
