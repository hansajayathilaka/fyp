# marketplace-bench-native: design contract

## Why this exists

`../marketplace-bench` compares Besu (linear, Solidity/EVM) against Conflux **eSpace**
and Hedera **Smart Contract Service** — both of which are EVM-compatibility shims
bolted onto DAG-based ledgers. That comparison showed no DAG advantage, because the
EVM translation layer is the bottleneck being measured, not the underlying DAG
consensus. This track removes the shim: each DAG chain is exercised through its own
**native** execution environment and SDK, in its own native contract language where
one exists. Besu stays as the linear baseline (Solidity/EVM already *is* native for a
linear EVM chain — no shim to remove).

`../marketplace-bench` is not modified by this work. This is a new, additive,
sibling comparison living entirely under `marketplace-bench-native/`.

## The four legs

| Chain | Architecture | Native language / interface | Node source |
|---|---|---|---|
| `besuLocal` | Linear (IBFT2.0) | Solidity / EVM | reuse `../marketplace-bench` as-is, unmodified, rerun fresh for this track's timeframe |
| `confluxCore` | DAG (Tree-Graph/GHAST) | Solidity compiled for the **Conflux VM** (not EVM), deployed via `js-conflux-sdk` against **CoreSpace** RPC (not eSpace) | reuse the *existing, unmodified* `conflux-local` container in `../marketplace-bench/docker/local/docker-compose.yml` — its CoreSpace RPC (`12537`) is already exposed, just unused by the existing track |
| `sui` | DAG (Narwhal-Bullshark consensus DAG + object-DAG ownership, parallel execution) | **Move** | `sui-test-validator` — prebuilt image if available, else build from the `MystenLabs/sui` repo |
| `hedera` | DAG (Hashgraph) | **Native Hedera Token Service (HTS) + Consensus Service (HCS)** — no smart-contract VM, chain-level token/consensus primitives | `hashgraph/hedera-local-node` docker-compose (all prebuilt images) |

Each DAG leg is built and run by its own subagent, in its own subdirectory, so the
three efforts don't collide on files, ports, or containers.

## Operation set

The existing harness measures `mint | approve | list | buy | cancel` as five discrete
Solidity calls. Move and native-Hedera can't express identical semantics, so each
chain maps the *same conceptual marketplace lifecycle* onto its own native primitives.
Missing operations are fine — the analysis step handles partial coverage per chain,
it does not require all four chains to report all five operations.

- **mint** — create the NFT/asset. Conflux Core: `MarketplaceItem.mint` (ERC-721,
  CVM). Sui: `mpl_item::mint` (Move object create + transfer to sender). Hedera:
  `TokenMintTransaction` on an HTS NFT collection.
- **approve** — grant transfer rights to the marketplace program, if the chain's
  model needs a separate approval step. Conflux Core: ERC-721 `approve`. Sui: not
  applicable (object ownership model has no allowance step) — omit. Hedera:
  `AccountAllowanceApproveTransaction` (HTS NFT allowance).
- **list** — publish a sell order at a price. Conflux Core: `Marketplace.listItem`.
  Sui: `mpl_market::list` (Move call wrapping the object in a `Listing` shared
  object). Hedera: no on-ledger listing primitive — model as an off-chain-priced
  allowance grant (the `approve` step *is* the list step here) or omit and note the
  limitation; do not fabricate a fake listing transaction.
- **buy** — atomic pay + transfer. Conflux Core: `Marketplace.buyItem` (payable
  call). Sui: `mpl_market::buy` (Move call, native SUI coin as payment argument).
  Hedera: `TransferTransaction` with both the NFT and HBAR/HTS-fungible legs in one
  atomic transaction (Hedera's native atomic multi-party transfer — this is the
  closest real equivalent and is worth calling out in the report as a genuine native
  DAG capability with no linear-chain analogue in this harness).
- **cancel** — revoke a listing. Conflux Core: `Marketplace.cancelListing`. Sui:
  `mpl_market::cancel` (reclaim the shared `Listing` object). Hedera:
  `AccountAllowanceDeleteTransaction` (revoke the allowance from `approve`/`list`).

Document the actual mapping used, and any operation a chain skips and why, in that
chain's own `README.md`. Do not force-fit an operation that doesn't have a faithful
native equivalent.

## CSV schema (must match exactly — this is what `analysis/analyze.py` consumes)

One row per timed transaction, one file per `(chain, operation)` run, written to
`marketplace-bench-native/bench-output/{chain}-{operation}-{timestamp}.csv`:

```
runId,chain,architecture,language,operation,nodeCount,priceTier,warmup,txId,submittedAt,receivedAt,confirmUnit,feeUnitsUsed,feeUnitPrice,feePaidNative,feeCurrency,status
```

- `chain` — `confluxCore` / `sui` / `hedera` / `besuLocal` (must match the existing
  besu track's `network.name` exactly, so the two data sets join cleanly).
- `architecture` — `dag` or `linear`.
- `language` — `solidity-evm` / `solidity-cvm` / `move` / `native-hts-hcs`.
- `operation` — one of `mint|approve|list|buy|cancel` (per the mapping above; omit
  rows for operations a chain doesn't support, don't invent placeholder rows).
- `nodeCount` — informational tag, matches the existing harness's convention (this
  is the 1-node/1-validator baseline unless stated otherwise).
- `priceTier` — leave empty unless the chain has a comparable fee-market knob.
- `warmup` — `true` for the first repeat (excluded from analysis), else `false`.
- `txId` — the chain's native transaction identifier (hash / digest / consensus
  timestamp+account-id — whatever that chain calls it).
- `submittedAt` / `receivedAt` — unix ms, client-side wall clock, timed the same way
  as `bench.ts`'s `timeTx`: start at submit, stop when finality/receipt is observed
  (bounded by a timeout — reuse `BENCH_TIMEOUT_MS=60000` as the default).
- `confirmUnit` — that chain's ordering/finality unit number: block number (besu),
  epoch/block number (Conflux Core), checkpoint sequence number (Sui), or consensus
  round/timestamp (Hedera). Whatever's idiomatic — document which in that chain's
  README.
- `feeUnitsUsed` / `feeUnitPrice` — chain's own fee-metering units (gas/gasPrice for
  Conflux Core; Move's `gasUsed`/`gasPrice` in MIST for Sui; leave empty for Hedera,
  which has flat USD-pegged fees, not a metered unit — use `feePaidNative` instead).
- `feePaidNative` — actual cost charged, in the chain's smallest native unit (wei
  equivalent / MIST / tinybar). This is the field the cost comparison is built on.
  **Do not let this come out to zero by accident** — that was the exact bug that
  invalidated the existing besu-vs-conflux-eSpace cost numbers (min-gas-price=0 local
  genesis). Every local devnet here must have a real, non-zero, documented fee
  policy, or the report must caveat it as loudly as `RUNBOOK.md` §6 already does for
  besuLocal.
- `feeCurrency` — `CFX` / `SUI` / `HBAR` / `ETH` (besu).
- `status` — `success | reverted | timeout`, same semantics as the existing harness.

## Directory layout per chain

Each of `conflux-core/`, `sui-move/`, `hedera-native/` is self-contained:

```
<chain>/
├── README.md          status, what was built, native-vs-EVM delta, known gaps
├── contracts/          Move modules / Solidity-for-CVM / (n/a for hedera-native)
├── docker/              compose or config for that chain's local node
├── scripts/              deploy.*, seed.*, bench.*  (language matches the chain's own tooling)
└── RUNBOOK.md          exact commands, start to CSV output, mirroring the existing
                          marketplace-bench/RUNBOOK.md structure
```

## Non-negotiables for every subagent

1. **Never modify anything under `../marketplace-bench/`.** Read it for reference
   only. If you need the Conflux node, bring up the existing
   `docker/local/docker-compose.yml` service — don't copy/fork/edit it.
2. **Don't touch other chains' subdirectories** (`conflux-core/`, `sui-move/`,
   `hedera-native/` are three separate work orders — stay in your own).
3. **Don't `git commit`.** The orchestrator reviews and commits once everything
   lands.
4. **Real measurements only.** If a step can't be completed (image won't build,
   SDK call unsupported), say so plainly in that chain's README under "known gaps"
   — do not fabricate numbers or silently skip the cost caveat.
5. Use ports that don't collide with the existing track (`8545` besu eSpace, `8546`
   conflux eSpace, `8549` geth, `12537` conflux CoreSpace already reserved). Sui and
   Hedera's own tool defaults (Sui: `9000`/`9123`/`9184`; Hedera local node's own
   default range) are fine as-is.
