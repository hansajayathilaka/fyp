/// Move analogue of
/// `../../../../marketplace-bench/contracts/Marketplace.sol` (list/buy/cancel over the
/// item type in `mpl_item.move`). Deliberately has no upgradability, marketplace fee %,
/// or auction logic, for the same reason the Solidity original doesn't: that complexity
/// would be a confound in a cost/latency dataset, not a feature.
///
/// Object model delta from Solidity, documented in full in ../../README.md:
/// - No `approve` step. Solidity's ERC-721 needs a separate `approve`/`isApprovedForAll`
///   transaction before `listItem` because the marketplace *contract* needs permission to
///   move a token it doesn't own. Sui has no such allowance concept: `list` takes the
///   `MarketplaceItem` by value, which only type-checks if the caller already owns it —
///   object ownership *is* the authorization. One transaction does the work of Solidity's
///   two (`approve` + `listItem`).
/// - No `active`/`NotActive` bookkeeping. Solidity's `Listing` struct has to carry an
///   `active: bool` flag and check it on every `buyItem`/`cancelListing`, because the
///   listing record persists in contract storage even after being consumed (there is
///   nothing that deletes it). A Sui `Listing` is a real object: `buy` and `cancel` both
///   destructure and delete it, so a double-buy or buy-after-cancel isn't a runtime check
///   that can be forgotten — it's a compile-time impossibility (the object, and the only
///   handle by which any function could reference it, no longer exists).
module marketplace::mpl_market;

use marketplace::mpl_item::MarketplaceItem;
use sui::coin::{Self, Coin};
use sui::event;
use sui::sui::SUI;

const EZeroPrice: u64 = 0;
const EWrongPrice: u64 = 1;
const ENotSeller: u64 = 2;
const ESelfPurchase: u64 = 3;

/// Shared object wrapping a listed item plus its price. Creating this *is* the listing
/// operation: the previously-owned `MarketplaceItem` moves from the seller's account into
/// this shared object's custody, escrow-style, in the same transaction.
public struct Listing has key {
    id: UID,
    item: MarketplaceItem,
    seller: address,
    price: u64,
}

public struct Listed has copy, drop {
    listing_id: address,
    seller: address,
    price: u64,
}

public struct Bought has copy, drop {
    listing_id: address,
    buyer: address,
    price: u64,
}

public struct Cancelled has copy, drop {
    listing_id: address,
}

/// list — wrap `item` (which the sender must already own — enforced by Move's ownership
/// typing, not a runtime check) in a new shared `Listing` at `price` MIST.
public fun list(item: MarketplaceItem, price: u64, ctx: &mut TxContext) {
    assert!(price > 0, EZeroPrice);
    let seller = ctx.sender();
    let listing = Listing { id: object::new(ctx), item, seller, price };
    event::emit(Listed { listing_id: object::uid_to_address(&listing.id), seller, price });
    transfer::share_object(listing);
}

/// buy — atomic pay-with-SUI-coin + object transfer in a single Move call / single Sui
/// transaction, the same atomicity guarantee `Marketplace.sol`'s payable `buyItem` gives,
/// but without a reentrancy guard: consuming `listing` by value deletes the shared object
/// before either transfer happens, so there is no state left to reenter into. Transfers
/// the purchased item directly to the buyer, matching `Marketplace.sol`'s
/// `safeTransferFrom(l.seller, msg.sender, tokenId)` — not returning it for further PTB
/// composition, since `buy` is always called as a standalone tx in this harness.
#[allow(lint(self_transfer))]
public fun buy(listing: Listing, payment: Coin<SUI>, ctx: &mut TxContext) {
    let Listing { id, item, seller, price } = listing;
    assert!(coin::value(&payment) == price, EWrongPrice);
    assert!(ctx.sender() != seller, ESelfPurchase);
    let listing_id = object::uid_to_address(&id);
    object::delete(id);
    transfer::public_transfer(payment, seller);
    transfer::public_transfer(item, ctx.sender());
    event::emit(Bought { listing_id, buyer: ctx.sender(), price });
}

/// cancel — seller reclaims the item, deleting the shared `Listing`.
public fun cancel(listing: Listing, ctx: &mut TxContext) {
    let Listing { id, item, seller, price: _ } = listing;
    assert!(seller == ctx.sender(), ENotSeller);
    let listing_id = object::uid_to_address(&id);
    object::delete(id);
    transfer::public_transfer(item, seller);
    event::emit(Cancelled { listing_id });
}
