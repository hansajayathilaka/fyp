# DAG-based vs. Linear Blockchain Evaluation — Project Plan

Comparing a DAG-based DLT (Hedera or Conflux — see 2.1) against an Ethereum-family linear
blockchain using a single Solidity marketplace codebase, on cost, latency/finality, and throughput.

---

## 1. Objectives & Hypotheses

State these explicitly up front — they define what "better" means and stop the eval from
becoming an unfocused pile of numbers.

- **H1 (Cost):** Per-operation cost (listing, buying, cancelling) is lower and more predictable
  on Hedera than on the linear chain, especially under load.
- **H2 (Latency):** Time-to-confirmation and time-to-finality are lower and less variable on
  Hedera (aBFT gives fast deterministic finality vs. Ethereum's probabilistic/epoch-based finality).
- **H3 (Throughput):** Hedera sustains higher TPS under concurrent load at equivalent node count
  and hardware, before failure/queuing behavior degrades UX.
- **H4 (Fee elasticity):** Confirmation latency is sensitive to offered gas price on the linear
  chain, but effectively insensitive on Hedera (USD-fixed fee schedule, no priority auction).

Each result you report should map back to one of these, not just be "a graph."

## 2. Scope & Assumptions (confirm or correct)

- **Chains:** any DAG-structured DLT vs. any linear/chained blockchain, both EVM-compatible so one
  Solidity codebase and one deployment tool covers both. See **2.1** for the concrete candidates —
  this is a real methodological choice, not just picking a name.

### 2.1 DAG Chain Candidates (you're not locked to Hedera)

The decision that actually matters for a thesis: whether the DAG chain's fee mechanism is
**market-based like Ethereum** or **policy-fixed** — that's what determines which claim you're
allowed to make at the end.

| | **Hedera (hashgraph, aBFT)** | **Conflux eSpace (Tree-Graph/GHAST)** |
|---|---|---|
| Ledger structure | Gossip-about-gossip DAG of events | Tree-Graph DAG of blocks (explicitly literature-labeled "DAG-based blockchain") |
| Fee model | Fixed, USD-pegged, council-set — no priority auction | Market-based gas price, EIP-1559-style, same mechanics as Ethereum |
| Governance | Permissioned council of ~30 orgs | Permissionless, hybrid PoW+PoS |
| Local multi-node dev | Solo (Kubernetes/Kind) — actively replacing the old Local Node this month | `conflux-rust` official Docker image, documented multi-node independent-chain setup, no Kubernetes needed |
| Gas-price elasticity (H4) | Doesn't apply natively — reframed as "flat cost under load" | Applies directly and symmetrically to both chains |

**The methodological catch with Hedera:** if you find fees are more predictable on Hedera, that's
a finding about Hedera's *fee policy*, not a general property of DAG architecture — a fixed-price
council decision could exist on a linear chain too, and a market-priced DAG chain (Conflux) proves
it. If your claim is "DAG-based architecture enables X," you want the *only* thing that changes
between conditions to be the ledger/consensus structure — which argues for **Conflux** as the
cleaner isolation, since the gas market stays constant on both sides.

If your claim is narrower — "here is how a fixed-fee DAG network compares to a market-priced
linear one in practice" — **Hedera** is fine, and arguably more interesting, since the fee-policy
difference becomes a first-class result (H4) instead of a confound you have to explain away.

Either is defensible. Pick one, and match your H4 framing to it (Section 7) — a thesis panel will
likely ask you to justify the choice, so having this table ready is worth more than which option
you pick.

- **Token standard:** Assuming **ERC-721** for listed items (one listing = one unique token) —
  simplest, most standard pattern, and it's what Hedera's own official example templates use for
  this exact scenario. Swap to ERC-1155 if you specifically need batched/semi-fungible listings;
  the marketplace logic barely changes either way.
- **"Minimal contract"** = no upgradability, no marketplace fee %, no auction logic. Just
  list / buy / cancel. Complexity in the contract is a confound in a cost/latency benchmark, not a
  feature.
- **Solidity/EVM version parity:** confirm current max supported Solidity/EVM version on Hedera at
  build time before locking your `hardhat.config` — this has moved over time and older docs are
  inconsistent about the ceiling.

## 3. Repo Architecture & Build Checklist (network-agnostic — do this before picking a chain)

Full file tree:

```
marketplace-bench/
├── contracts/
│   ├── MarketplaceItem.sol      // ERC-721
│   └── Marketplace.sol          // list / buy / cancel
├── test/
│   ├── MarketplaceItem.test.ts
│   └── Marketplace.test.ts
├── scripts/
│   ├── deploy.ts                 // deploys both contracts, logs + persists addresses
│   ├── seed.ts                   // mints test tokens + approves marketplace, generates listing fixtures
│   └── bench.ts                  // benchmark harness (Section 6.1)
├── bench-output/                 // gitignored — raw per-run CSV lands here
├── hardhat.config.ts
├── .env.example
├── package.json
└── tsconfig.json
```

`hardhat.config.ts` networks — only `hardhat` (in-memory) and `localhost` are real right now;
everything chain-specific is a clearly marked placeholder:

```ts
networks: {
  hardhat: {},                    // in-memory, used for all of steps 1–11 below
  sepolia: { url: process.env.SEPOLIA_RPC_URL, accounts: [process.env.PRIVATE_KEY!] },
  // dagChain: { url: process.env.DAG_CHAIN_RPC_URL, accounts: [...] }  — fill in once §2.1 is decided
}
```

`.env.example`:
```
PRIVATE_KEY=
SEPOLIA_RPC_URL=
DAG_CHAIN_RPC_URL=      # placeholder — Hedera JSON-RPC relay or Conflux eSpace RPC, per §2.1
DAG_CHAIN_ID=           # placeholder
```

Because both chain families are accessed as plain ethers-compatible EVM endpoints, you don't need
either chain's native SDK (no `@hashgraph/sdk`, no Conflux-specific client) — everything is
`ethers` + a JSON-RPC URL. That's exactly what makes deferring the chain choice possible: nothing
below depends on which network you pick.

### Build checklist, in order

1. `npm init -y`; install `hardhat`, `@nomicfoundation/hardhat-toolbox`, `@openzeppelin/contracts`,
   `dotenv`.
2. `npx hardhat init` → TypeScript project.
3. Write `MarketplaceItem.sol` (spec: §4.1).
4. Write `Marketplace.sol` (spec: §4.2).
5. `npx hardhat compile` — resolve any compiler errors, pin the solc version in config so it can't
   silently drift between now and when you deploy to a real chain later.
6. Write unit tests against the matrix in §4.4.
7. `npx hardhat test` on the built-in in-memory network. Don't move past this step until the full
   matrix is green — every bug caught here is one you don't have to debug against a real testnet
   later with real latency in the loop.
8. Write `deploy.ts`, deploy to the in-memory `hardhat` network first, sanity-check logged
   addresses and that `Marketplace` was constructed with the right `MarketplaceItem` address.
9. Write `seed.ts` — mints N tokens, approves the marketplace, creates M active listings. You need
   this because `buyItem` benchmark runs need existing listings to buy; don't hand-roll this per
   run.
10. Write `bench.ts` (§6.1) and validate it end-to-end against the local in-memory network — you
    won't get real cross-chain numbers, but you will confirm the harness's timing, CSV output, and
    error handling are all correct before it ever touches a network with real latency or real
    faucet-limited funds.
11. Only now: resolve §2.1 (chain choice), fill in the `dagChain` network block, and move to
    Track A public testnet deployment.

Steps 1–10 require zero network decision — that's the actual point of sequencing it this way.

## 4. Contracts — Full Specification

### 4.1 `MarketplaceItem.sol` (ERC-721)

- Inherits OpenZeppelin `ERC721` only — no `Ownable`, no access control on minting.
- **Deliberately public, unrestricted `mint`:** anyone can call it. This is a benchmarking-tool
  decision, not a production pattern — call it out explicitly in your thesis methodology so it
  reads as intentional. The alternative (owner-only mint) would mean re-keying an "owner" account
  per network and per seed run, which adds operational friction with zero benefit to what you're
  actually measuring.
- No `tokenURI`/metadata wiring — irrelevant to gas/latency measurement, pure noise if included.

```solidity
contract MarketplaceItem is ERC721 {
    uint256 private _nextId;
    constructor(string memory name_, string memory symbol_) ERC721(name_, symbol_) {}
    function mint(address to) external returns (uint256 tokenId) {
        tokenId = ++_nextId;
        _safeMint(to, tokenId);
    }
}
```

### 4.2 `Marketplace.sol`

- Inherits OpenZeppelin `ReentrancyGuard`. `buyItem` does an external NFT transfer plus a native
  currency transfer — keep the guard even in a "minimal" contract; skipping it is exactly the kind
  of shortcut that would force a mid-benchmark patch and contaminate your gas dataset.
- Custom errors instead of `require` strings — smaller bytecode, cheaper reverts, and cleaner
  revert-reason data for your harness's failure-rate metric.

```solidity
struct Listing { address seller; uint256 price; bool active; }

error NotOwner();
error NotApproved();
error ZeroPrice();
error AlreadyListed();
error NotActive();
error WrongPrice();
error NotSeller();
error SelfPurchase();

contract Marketplace is ReentrancyGuard {
    IERC721 public immutable item;
    mapping(uint256 => Listing) public listings;

    event Listed(uint256 indexed tokenId, address indexed seller, uint256 price);
    event Bought(uint256 indexed tokenId, address indexed buyer, uint256 price);
    event Cancelled(uint256 indexed tokenId);

    constructor(address itemAddress) { item = IERC721(itemAddress); }

    function listItem(uint256 tokenId, uint256 price) external {
        if (item.ownerOf(tokenId) != msg.sender) revert NotOwner();
        if (price == 0) revert ZeroPrice();
        if (item.getApproved(tokenId) != address(this) &&
            !item.isApprovedForAll(msg.sender, address(this))) revert NotApproved();
        listings[tokenId] = Listing(msg.sender, price, true);
        emit Listed(tokenId, msg.sender, price);
    }

    function buyItem(uint256 tokenId) external payable nonReentrant {
        Listing memory l = listings[tokenId];
        if (!l.active) revert NotActive();
        if (msg.value != l.price) revert WrongPrice();
        if (msg.sender == l.seller) revert SelfPurchase();
        listings[tokenId].active = false;                    // effects before interactions
        item.safeTransferFrom(l.seller, msg.sender, tokenId);
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
```

### 4.3 Design Decisions & Cross-Chain Gotchas (state these explicitly in your methodology)

- **Direct transfer, not pull-payment escrow:** simpler, one fewer transaction type to benchmark.
  Flag it as a simplification, not the production-recommended pattern.
- **Zero marketplace fee:** keeps cost measurement to exactly list/buy/cancel gas, with no fee-split
  arithmetic adding noise to the numbers.
- **`.call` instead of `.transfer`/`.send` for the payment:** `.transfer`/`.send` hard-code a
  2300-gas stipend that behaves inconsistently across different EVM implementations — using `.call`
  with an explicit success check is the current best practice and avoids a subtle chain-specific
  failure mode.
- **Approval is a third transaction type:** the seller must call `item.approve(marketplaceAddress,
  tokenId)` (or `setApprovalForAll`) before `listItem` will succeed. Include this approval tx in
  your cost/latency dataset even though it's technically a call on the token contract, not the
  marketplace — it's part of the real user flow and skipping it would understate total UX cost.
- **Account-model and decimal divergences to handle in shared code, not per-chain forks:** some DAG
  chains (e.g. Hedera) layer EVM-style ECDSA accounts over a different native account model, and
  may present native-currency values at 18 decimals over the EVM-compatible RPC even though the
  native unit uses fewer decimals internally. Keep all contract and harness logic in wei-equivalent
  18-decimal terms and let the RPC layer handle translation — don't special-case this per chain.
- **Solidity/EVM version parity:** confirm the current max supported Solidity/EVM version on
  whichever DAG chain you pick before locking `hardhat.config`'s solc version — this has moved over
  time and older docs are often stale on the ceiling.

### 4.4 Test Matrix (green on the local network before touching anything else)

**Happy path**
- mint → approve → list → buy: ownership transfers, seller receives payment, listing flips inactive
- mint → approve → list → cancel: listing inactive, item still owned by seller

**Revert path**
- `listItem` without prior approval → `NotApproved`
- `listItem` by non-owner → `NotOwner`
- `listItem` with price `0` → `ZeroPrice`
- `buyItem` with wrong `msg.value` → `WrongPrice`
- `buyItem` on an inactive/already-sold listing → `NotActive`
- `buyItem` on your own listing → `SelfPurchase`
- `cancelListing` by non-seller → `NotSeller`
- `cancelListing` on an already-inactive listing → `NotActive`

## 5. Two-Track Experimental Design

This is the fix for the exact problem you flagged (public testnets don't give you control over
node count/hardware, so TPS claims from them are confounded).

### Track A — Public Testnets (Sepolia + Hedera Testnet)
Purpose: **real-world cost and latency numbers** you can defend as "what a user would actually
see today." Not for TPS/throughput claims — you don't control the other traffic on these networks.

### Track B — Controlled Local Clusters (matched node count + hardware)
Purpose: **throughput and node-count-sensitivity claims**, isolated from public network noise.

- **If using Conflux:** both sides become plain Docker Compose deployments — the official
  `conflux-rust` image supports running an independent multi-node chain (a bootnode plus N peers,
  configured via `devnode.toml`), and Besu/Geth multi-validator setups follow the same pattern on
  the linear side. Same orchestration tool, same resource-limiting mechanism
  (`deploy.resources.limits` in Compose) on both sides — no cross-runtime asymmetry to reason
  about. Operationally the simpler path.
- **If using Hedera:** Solo (Kubernetes-native via Kind) deploys a multi-consensus-node local
  network and has documented load-testing tooling. Workable, but resource parity now has to be
  enforced across two different runtimes (Kind-managed pods vs. Compose containers) — set explicit,
  matching CPU/memory limits on both sides rather than relying on "similar" defaults.
- **Linear side (either path):** Hyperledger Besu running IBFT2.0 (or Geth + Clique) as a
  multi-validator PoA cluster via Docker Compose — N validator containers, deterministic block
  time you control. (Besu is a nice thematic aside if you go the Hedera route, since Hedera's own
  EVM execution layer is itself Besu-derived — not required for the eval either way.)
- **Node count as a variable:** run each track at 3 and 4 nodes minimum, so you can report
  throughput as a function of cluster size, not just a single point estimate.

## 6. Metrics & Instrumentation

Define "transaction time" precisely before you start collecting data — this single decision
changes your story:

- **Time-to-receipt** (submission → tx included, `eth_getTransactionReceipt` returns): fast on
  both chains, most comparable to "what a user waits for." If you're on Hedera, cross-check this
  against the Mirror Node REST API, which gives higher-precision consensus timestamps than the
  JSON-RPC relay alone.
- **Time-to-finality** (submission → irreversible): near-immediate on Hedera (aBFT); materially
  longer on Ethereum PoS (multi-epoch finality, distinct from block inclusion time). Report both,
  don't collapse them into one number — that's where a lot of DAG-vs-blockchain comparisons
  overstate their case.
- **Cost per op:** `gasUsed × effectiveGasPrice` in native token, converted to a common USD basis
  at time of tx (fetch the exchange rate at execution, don't use a static conversion).
- **Throughput:** transactions accepted per second under N concurrent senders, plus failure/
  revert rate as load increases (this is where the linear chain's mempool congestion behavior vs.
  the DAG chain's own throttling should visibly diverge).

### 6.1 Benchmark Harness (`scripts/bench.ts`) — build and validate against the local Hardhat network first

**Config shape:**
```ts
interface BenchConfig {
  network: string;
  operation: 'mint' | 'approve' | 'list' | 'buy' | 'cancel';
  batchSize: number;
  repeats: number;
  priceTierGwei?: number;   // only meaningful on the linear chain / a market-priced DAG chain
  nodeCount?: number;       // Track B only, informational tag on the output rows
}
```

**Signer/account pool — do this, don't skip it:** for concurrent throughput runs, pre-fund and use
multiple signer accounts, one nonce sequence per account, rather than firing many transactions from
a single account. A single account serializes on its own nonce and will understate real network
throughput — this is an easy mistake that quietly invalidates a TPS result.

**Per-transaction record:**
```ts
interface TxRecord {
  runId: string; chain: string; operation: string; nodeCount?: number; priceTier?: number;
  warmup: boolean;
  txHash: string;
  submittedAt: number;      // ms epoch, immediately before the send
  receivedAt?: number;      // ms epoch, immediately after tx.wait() resolves
  blockNumber?: number;
  gasUsed?: string;
  effectiveGasPrice?: string;
  status: 'success' | 'reverted' | 'timeout';
}
```

**Timing method:** `Date.now()` (or `performance.now()`) immediately before the send and
immediately after the awaited `tx.wait()` resolves. If the run is against Hedera, cross-check a
sample against the Mirror Node REST API's consensus timestamp, which is more precise than the
relay-reported block time.

**Timeout handling:** cap each transaction's wait at a fixed ceiling (e.g. 60s) and mark it
`timeout` rather than letting one stalled transaction block the whole batch — public testnets
occasionally stall, and one hang shouldn't cost you a full run.

**Warm-up tagging:** the harness itself tags the first run of every condition `warmup: true`, so
your analysis code filters it out programmatically instead of relying on manual bookkeeping later.

**Output:** append each record as a row to `bench-output/{chain}-{operation}-{timestamp}.csv`. Flat
files are enough at this scale — no DB needed — and CSV feeds directly into pandas for the
Section 8/9 analysis.

Validate this whole harness against the local in-memory `hardhat` network before it ever touches a
real testnet — you won't get meaningful cross-chain numbers from that run, but you will catch bugs
in timing, CSV output, nonce handling, and error handling for free.

## 7. Fee-Price Sensitivity (redesigned per the note above)

- **On the linear chain:** legitimate experiment — submit identical batches at multiple
  `maxFeePerGas`/`maxPriorityFeePerGas` tiers, measure confirmation latency vs. price paid.
- **On Hedera:** there's no priority lane to buy, so re-frame this axis as *fixed-cost throughput
  under load* instead — submit the same batches and show latency/cost stay flat regardless of
  concurrent network activity. Presenting this as "Hedera has no price-latency curve" is itself a
  result, not a null one.
- **If you chose Conflux instead:** skip the reframing — its gas market means the same price-tier
  experiment applies symmetrically to both chains, and H4 becomes a direct, apples-to-apples
  price-elasticity comparison rather than a workaround.

## 8. Statistical Methodology (thesis-level rigor)

- **Sample size:** n≥30 transactions per condition (chain × operation × node-count × price-tier)
  as a floor for the usual asymptotic-normality assumptions to be reasonable; n=100–500 per
  condition is achievable on Track B, where you control the environment, and will noticeably
  strengthen your results chapter. Track A is naturally limited by faucet/rate limits — state that
  limitation explicitly rather than padding numbers to look uniform.
- **Repeats:** ≥5 independent runs per condition, first run discarded as warm-up (cold cache/
  connection effects), remaining runs pooled or reported with run-to-run variance shown.
- **Tests:** latency and cost distributions are typically right-skewed (a long tail of occasional
  slow confirmations), so don't default to a t-test on raw means. Use **Mann-Whitney U** for
  pairwise chain comparisons and **Kruskal-Wallis** for comparisons across node counts (>2 groups);
  report **median and IQR** alongside the mean so the tail doesn't get hidden.
- **Effect size, not just p-value:** at large n, small differences become "significant" without
  being practically meaningful — report an effect size (e.g., rank-biserial correlation alongside
  Mann-Whitney U) so a reader can judge magnitude, not just significance.
- **Confidence intervals:** bootstrap 95% CIs on your headline latency/cost medians — more
  defensible under viva questioning than a bare point estimate.
- **Confounds:** control for time-of-day on Track A (public testnet congestion varies) — either
  run both chains' batches interleaved in the same window, or log ambient network conditions
  alongside your data. Track B doesn't have this problem, which is exactly why it exists as a
  separate track.
- Check with your supervisor early on expected sample sizes and whether your department has a
  preferred statistical framework — this section should match faculty norms, not just general
  best practice.

## 9. Reporting

- Latency: box/violin plots per chain per condition (distribution, not just mean — tail latency
  matters more for UX claims than average).
- Cost: bar chart per operation type, USD-normalized.
- Throughput: TPS vs. concurrent senders, one line per chain per node count.
- Price sensitivity: latency vs. gas price scatter for the linear chain only, with the Hedera
  flat-cost line as a reference overlay.

## 10. Suggested Phases

1. **Contracts + harness, network-agnostic** — work through the full checklist in §3 (steps 1–10)
   end to end against the local in-memory Hardhat network. Nothing here requires a chain decision.
2. **Resolve §2.1** (Hedera vs. Conflux) and fill in the `dagChain` network config.
3. Track A data collection (public testnets) — cheapest real-network step, validates the harness
   against actual latency and real faucet constraints.
4. Track B environment build (matched-node local cluster on both sides, per §5).
5. Track B data collection across node counts.
6. Analysis + report generation (§8, §9).

## 11. Remaining Decision

Confirmed: bachelor's final-year thesis, full statistical rigor (§8 as written applies), and
implementation comes before the chain decision (§10 phase 1 before phase 2). The one open call is
the DAG chain pick in **§2.1** — Hedera vs. Conflux — since it changes what claim H4 is allowed to
make, and it only needs to be resolved once §3's checklist is green against the local network.
