/// Benchmarking-only NFT-like object type. Move analogue of
/// `../../../../marketplace-bench/contracts/MarketplaceItem.sol` (a minimal public-mint
/// ERC-721). Minting is deliberately public and unrestricted for the same reason as the
/// Solidity original: the harness needs to mint fixtures on any funded account without
/// re-keying an owner/minter per run.
///
/// Object model note: there is no `_nextId` storage slot to increment the way Solidity's
/// contract has one, because Move/Sui has no contract-global mutable storage — all state
/// lives in objects. `ItemCounter` is a shared object created once at publish time
/// (`init`) that plays the same role; every `mint` call takes a mutable reference to it.
module marketplace::mpl_item;

/// The NFT-equivalent object. `key` makes it a first-class Sui object with its own UID
/// (the object ID doubles as the "token id" — there is no separate integer token id the
/// way ERC-721 has one, the object ID *is* the identity). `store` lets it be wrapped
/// inside the `Listing` object in `mpl_market`.
public struct MarketplaceItem has key, store {
    id: UID,
    /// Monotonic mint sequence number, kept only for human-readable parity with the
    /// Solidity contract's integer `tokenId` — not used as an identifier on-chain.
    item_seq: u64,
}

/// Shared counter object, created once in `init`. Using a shared object here (rather than
/// e.g. an owned object held by a deployer) means any account can mint concurrently,
/// matching the Solidity contract's unrestricted `mint(address to)`.
public struct ItemCounter has key {
    id: UID,
    next_seq: u64,
}

fun init(ctx: &mut TxContext) {
    transfer::share_object(ItemCounter { id: object::new(ctx), next_seq: 1 });
}

/// Mint a new item to the calling account. Solidity's `mint(address to)` allows minting
/// to an arbitrary recipient; Sui's PTB model makes "mint to self, then transfer" the
/// idiomatic two-step for minting-to-others, so this mirrors the harness's actual usage
/// (`item.connect(signer).mint(signer.address)` — always mints to the caller). Transfers
/// directly to the caller (matching the Solidity original's imperative
/// `_safeMint(to, tokenId)`) rather than returning the object for further PTB composition
/// — that composability isn't needed here, `mint` is always called as a standalone tx.
#[allow(lint(self_transfer))]
public fun mint(counter: &mut ItemCounter, ctx: &mut TxContext) {
    let item_seq = counter.next_seq;
    counter.next_seq = item_seq + 1;
    let item = MarketplaceItem { id: object::new(ctx), item_seq };
    transfer::public_transfer(item, ctx.sender());
}
