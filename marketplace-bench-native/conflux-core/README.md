# Conflux Core Space leg (native CVM, no eSpace/EVM shim)

Status: **built and run end-to-end against a real local `conflux-rust` dev-mode node.**
See "Results" below for row counts from the actual run in this repo.

## What this is

`../../marketplace-bench` benchmarks Conflux through **eSpace** — an EVM-compatibility
space bolted onto Conflux's native Tree-Graph/GHAST DAG ledger, reached with `ethers`
exactly like any other EVM chain. This leg instead talks to Conflux **Core Space**, the
chain's native execution environment: the same physical `conflux-rust` node, same
consensus, same ledger — but a different account model, RPC surface, and SDK
(`js-conflux-sdk`, not `ethers`), and (nominally) a different VM: the **CVM**, not the
EVM eSpace exposes.

The point of this leg is to test the suspicion recorded in `../docs/DESIGN.md`: that
eSpace's EVM-translation layer, not the underlying DAG consensus, is what's actually being
measured in the original comparison, and that removing the shim might reveal a real DAG
efficiency advantage (or might not — that's an empirical question this leg's data answers,
see the top-level comparison report for the actual analysis).

## What was built

```
conflux-core/
├── contracts/           MarketplaceItem.sol, Marketplace.sol — ported verbatim
├── docker/README.md     pointer to the existing shared conflux-local node (no fork)
├── scripts/
│   ├── accounts.ts               shared dev-account private keys + RPC/network config
│   ├── fund-conflux-core.ts      one-time CoreSpace funding step (see "Funding" below)
│   ├── deploy.ts                 deploys both contracts via js-conflux-sdk
│   ├── seed.ts                   mints/approves/lists fixtures
│   └── bench.ts                  timed mint/approve/list/buy/cancel runs -> CSV
├── hardhat.config.ts    compile-only Hardhat config (see below)
├── package.json / tsconfig.json
├── deployment-addresses.json     written by deploy.ts (gitignored-style scratch state)
├── seed-fixtures.confluxCore.json
├── RUNBOOK.md
└── README.md             this file
```

## Contracts: what changed for CVM

**Nothing in the Solidity source.** `contracts/MarketplaceItem.sol` and
`contracts/Marketplace.sol` are byte-for-byte the same contract logic as
`../../marketplace-bench/contracts/*.sol` (comments updated to note the port, logic
untouched) — same `0.8.28` compiler, same `optimizer`/`evmVersion: "cancun"` settings.
They compiled cleanly with plain Hardhat (`npx hardhat compile` — "Compiled 19 Solidity
files successfully (evm target: cancun)") and **deployed and executed successfully against
Core Space with zero source changes**, confirmed empirically in this repo (see
`deployment-addresses.json` and the bench CSVs in `../bench-output/`).

This works because Core Space's CVM has been EVM-opcode-compatible since the Hydra hard
fork, and `../../marketplace-bench/docker/local/conflux/conflux.toml` — the *same* node
this leg's RPC calls hit — already enables `cancun_opcodes_transition_number` (PUSH0,
MCOPY; OpenZeppelin 5.x needs both) at height 10, long since passed in dev mode. Opcode
support is a chain-height-gated VM property shared by both spaces on one ledger, not a
Core-Space-specific compiler limitation — there is no separate "CVM dialect" of Solidity to
target, contrary to what the task brief anticipated might be needed.

What *is* different, and is a genuine protocol-level (not source-level) CVM property, is
**storage collateral**: every `TransactionReceipt` from this node carries a
`storageCollateralized` field (observed non-zero on every `mint`, e.g. `0xc0` = 192 bytes
of new storage collateralized for one ERC-721 mint) alongside `gasUsed`/`gasFee`. This CFX
is *locked*, not spent — refundable when the storage it backs is freed (`storageReleased`
in the same receipts shows prior collateral being returned as token ownership records
change hands during `buy`). The benchmark's `feePaidNative` column deliberately reports
`gasFee` only (the genuinely non-refundable cost), not `gasFee + storageCollateralized` —
folding in refundable collateral would overstate real cost the same way a naive zero-gas
reading would understate it. This has no eSpace/EVM analogue; it's argued about in
`../docs/DESIGN.md`'s cost-integrity section only in the "don't let a fee column come out
zero" direction, but the opposite failure mode (overstating cost by counting collateral as
spent) is just as real, hence flagging it explicitly here.

## Why plain Hardhat + `js-conflux-sdk`, not a Conflux Hardhat plugin

The task brief suggested investigating `@confluxdap/hardhat-conflux` or similar. That
package **does not exist on the npm registry** (`npm view @confluxdap/hardhat-conflux`
→ 404, verified against the live registry while building this leg). The only Conflux
Hardhat plugin that does exist, `hardhat-conflux@0.1.1` (linked from `js-conflux-sdk`'s own
README), is a single old release with no changelog and no evidence of maintenance against
current Hardhat/Solidity versions — not worth the dependency risk for a benchmark that
needs to keep working.

Given the opcode-compatibility finding above, no Conflux-specific compiler is actually
needed: `hardhat.config.ts` here is used **only** as a Solidity compiler front end
(`npx hardhat compile`, matching `../../marketplace-bench/hardhat.config.ts`'s
solc version/settings exactly). No `hardhat-ethers`, no Hardhat network config, no
`hardhat run` — `scripts/*.ts` are plain `ts-node` scripts that read the compiled
ABI+bytecode straight out of `artifacts/` and talk to CoreSpace directly through
`js-conflux-sdk`'s `Conflux`/`Contract` classes, because Core Space's account/tx model
(base32 `cfx:`/`net1024:`-prefixed addresses, `epochHeight`, `storageLimit`) has no
ethers/Hardhat-network-provider equivalent to plug into.

## Funding: verified, and simpler than eSpace's

The task asked to verify whether CoreSpace needs a funding step at all, given
`genesis_secrets` funds CoreSpace natively. Verified: **yes, still needed, but much
simpler than eSpace's.**

- `genesis_secrets.txt` (`../../marketplace-bench/docker/local/conflux/genesis_secrets.txt`)
  lists exactly **one** private key, and funds **only that one CoreSpace account** — 10,000
  CFX at genesis (confirmed via `cfx_getBalance` against a fresh container). That key
  happens to be `DEV_ACCOUNTS[0]` in `scripts/accounts.ts` (same well-known Hardhat test
  key the eSpace leg's funder uses).
- The other 19 well-known dev accounts this leg round-robins across for concurrent
  sends/sellers start at **zero** CoreSpace balance and need `scripts/fund-conflux-core.ts`
  once per fresh chain.
- Unlike eSpace's funding step (`../../marketplace-bench/scripts/fund-conflux-espace.ts`),
  this does **not** need the `CrossSpaceCall` internal contract — that machinery exists
  specifically to move value *between* CoreSpace and eSpace. Funding *within* CoreSpace is
  a plain native `cfx_sendTransaction` transfer, one per recipient, no internal-contract
  indirection. `scripts/fund-conflux-core.ts` is correspondingly ~40 lines shorter in
  substance than its eSpace counterpart.

## Account model differences worth knowing

- **Address format**: Core Space addresses are base32, network-prefixed
  (`net1024:aak39z...` for this devnet's `chain_id`/`networkId` 1024; `cfxtest:`/`cfx:` on
  public networks), with a type bit baked in (user/contract/builtin) — not the same string
  as the eSpace/EVM `0x...` address for the same private key, even though both are
  deterministic functions of the same secp256k1 keypair. `scripts/accounts.ts` reuses the
  eSpace leg's exact private keys for that reason (one key, two address encodings, useful
  for cross-leg bookkeeping) — see its comment for the derivation note.
- Contract call return values and `TransactionReceipt.contractCreated` render Core Space
  addresses at different verbosity (`net1024:acen...` vs.
  `NET1024:TYPE.CONTRACT:ACEN...`) for the same address; `deploy.ts`/`bench.ts` normalize
  with `js-conflux-sdk`'s `address.simplifyCfxAddress` before comparing — an easy
  false-negative trap if skipped (hit this during development: the deploy sanity check
  failed on a real, correct deployment until the normalization was added).
- `js-conflux-sdk`'s `PendingTransaction.executed()` **throws** on a reverted transaction
  (`outcomeStatus !== 0`) rather than returning a receipt with a failure status the way
  ethers does — `bench.ts`'s `timeTx` polls `getTransactionReceipt` directly instead of
  using `.executed()`, so `reverted` and `timeout` are both captured as CSV rows rather
  than uncaught exceptions.
- **`js-conflux-sdk`'s auto-populated `gas`/`storageLimit` have zero safety margin.** The
  first full 5-operation run produced real, on-chain `VmError(ExceedStorageLimit)`
  reverts on 7 of 30 `buy` transactions (confirmed via `cfx_getTransactionReceipt`'s
  `txExecErrorMsg` — a genuine chain-level revert, not a script bug at the RPC layer).
  Root cause, found by reading `populateTransaction` in `js-conflux-sdk`'s own source
  (`node_modules/js-conflux-sdk/src/rpc/cfx.js`): when `gas`/`storageLimit` aren't passed
  explicitly, the SDK sets them to the *raw* `cfx_estimateGasAndCollateral` output with no
  padding at all. `buy` is the most storage-heavy call here (NFT ownership transfer + two
  ERC-721 balance updates + a native-CFX payment call via `.call{value:}`), and that
  estimate — a static call against a state snapshot — occasionally undershot the real
  execution's requirement by the time the transaction actually landed, especially for the
  highest-nonce account. This is a known Conflux integration gotcha (Conflux's own
  wallet/portal tooling pads estimates before sending, for the same reason), not a bug in
  the contract or the chain. **Fixed** in `bench.ts` via a `padLimits()` helper that
  explicitly calls `estimateGasAndCollateral` and pads the result (gas ×1.3, storageLimit
  ×2 + a 64-byte floor) before passing both through as explicit overrides — which also
  skips the SDK's own redundant internal estimate call, so it's not an extra RPC round
  trip. After the fix, a full rerun of all five operations (`BATCH_SIZE=5 REPEATS=6`, 30
  tx each) completed with **zero reverts and zero timeouts** — see "Results" below.

## Operation mapping

All five operations from `../docs/DESIGN.md` have a faithful Core Space equivalent — no
operations were skipped for this leg:

| Operation | Core Space call |
|---|---|
| `mint` | `MarketplaceItem.mint(address)` |
| `approve` | `MarketplaceItem.approve(marketplace, tokenId)` (ERC-721 allowance) |
| `list` | `Marketplace.listItem(tokenId, price)` |
| `buy` | `Marketplace.buyItem(tokenId)` (payable, CFX value) |
| `cancel` | `Marketplace.cancelListing(tokenId)` |

## CSV schema mapping (`../docs/DESIGN.md`)

- `chain` = `confluxCore`, `architecture` = `dag`, `language` = `solidity-cvm`,
  `feeCurrency` = `CFX` (all hardcoded in `bench.ts`, not inferred).
- `confirmUnit` = the transaction receipt's `epochNumber` — Core Space's ordering unit
  (epochs, not blocks; a Core Space epoch can contain multiple Tree-Graph blocks, which is
  the DAG structure this whole comparison exists to measure the effect of).
- `feeUnitsUsed` / `feeUnitPrice` = receipt `gasUsed` / `effectiveGasPrice` (Drip, CFX's
  wei-equivalent smallest unit).
- `feePaidNative` = receipt `gasFee` (Drip) — deliberately **excludes**
  `storageCollateralized` (locked, refundable collateral, not a spent fee) — see
  "Contracts: what changed for CVM" above.
- `priceTier` — populated only when `BENCH_PRICE_TIER_GDRIP` is set (this leg's analogue
  of the eSpace harness's `BENCH_PRICE_TIER_GWEI`); empty otherwise, per schema.

## Cost integrity (`../docs/DESIGN.md`'s non-negotiable, `RUNBOOK.md` §6-style caveat)

**Verified non-zero, by direct RPC call before any script ran:**
`cfx_gasPrice` against this devnet returned `0x3b9aca00` = 1,000,000,000 Drip = 1 Gdrip —
`js-conflux-sdk`'s own `CONST.MIN_GAS_PRICE` floor, and *not* a client-side fallback
masking a zero on-chain policy (confirmed by querying the raw RPC directly, before
`js-conflux-sdk` ever touched the connection). Every transaction in this leg's CSVs carries
a real, non-zero `feeUnitPrice`/`feePaidNative` — there is no besuLocal-style
`--min-gas-price=0` problem on the CoreSpace side of this devnet. See `RUNBOOK.md` §6 for
the full comparison against besuLocal's genesis, which *does* still have that problem (that
caveat belongs to the besu leg, not this one, but is worth restating here since the two
CSVs get compared directly).

## Known gaps

- Only the 1-node/1-validator local devnet baseline was run (matches
  `../docs/DESIGN.md`'s `nodeCount` convention for the other three legs) — no multi-node
  Core Space cluster was stood up, mirroring the eSpace leg's own "Beyond this baseline"
  caveat in `../../marketplace-bench/RUNBOOK.md`.
- No `BENCH_PRICE_TIER_GDRIP` fee-elasticity sweep was run as part of the committed CSVs
  (the harness supports it — see `RUNBOOK.md` — but the requested run was the single
  default-price pass matching the task's example command).

## Results

Full run against a fresh 1-node local `conflux-local` devnet, `SEED_TOKEN_COUNT=100
SEED_LISTING_COUNT=65`, `BENCH_BATCH_SIZE=5 BENCH_REPEATS=6` (30 tx per operation, 1
warmup repeat excluded from the stats below, n=25 per operation) — all after the
`padLimits` fix (see "Account model differences worth knowing" above):

| Operation | Rows (incl. warmup) | Reverted | Timeout | Avg latency (submit→receipt) | Avg fee |
|---|---|---|---|---|---|
| `mint` | 30 | 0 | 0 | 2537 ms | 0.0000472 CFX |
| `approve` | 30 | 0 | 0 | 2480 ms | 0.0000331 CFX |
| `list` | 30 | 0 | 0 | 2541 ms | 0.0000506 CFX |
| `buy` | 30 | 0 | 0 | 2481 ms | 0.0000910 CFX |
| `cancel` | 30 | 0 | 0 | 2478 ms | 0.0000312 CFX |

150 rows total across the 5 CSVs, zero reverts, zero timeouts. Every `feePaidNative` value
is non-zero (see "Cost integrity" above). Files:

```
../bench-output/confluxCore-mint-2026-08-22T03-50-25-707Z.csv
../bench-output/confluxCore-approve-2026-08-22T03-50-43-098Z.csv
../bench-output/confluxCore-list-2026-08-22T03-52-30-390Z.csv
../bench-output/confluxCore-buy-2026-08-22T03-52-47-631Z.csv
../bench-output/confluxCore-cancel-2026-08-22T03-53-04-719Z.csv
```

See `RUNBOOK.md` for the exact commands to reproduce from a clean slate. Note: an earlier
run (before the `padLimits` fix) is not included — those CSVs were deleted and replaced by
this clean run once the root cause was found and fixed, per DESIGN.md's "real measurements
only" — no partial/broken run was left mixed into the final data.
