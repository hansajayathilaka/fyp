# hedera-native: Hedera Token Service + native atomic transfers

The Hedera leg of `marketplace-bench-native`. Unlike `confluxCore` (Solidity compiled for
the Conflux VM) and `sui` (Move), Hedera's approach here has **no smart-contract VM
involved at all** — not even a native one. The marketplace lifecycle is implemented
entirely with Hedera's chain-level, native services:

- **Hedera Token Service (HTS)** for the NFT collection (create, mint, transfer,
  allowance-approve, allowance-delete) — these are protobuf transaction types the
  consensus nodes execute directly, not contract bytecode.
- A single atomic **`TransferTransaction`** for the buy step, carrying both the NFT leg
  and the HBAR payment leg in one multi-party, multi-asset transaction.

Everything is driven from Node/TypeScript via `@hashgraph/sdk` against a local
`hedera-local-node` network (consensus node + mirror node). No EVM, no JSON-RPC relay, no
Solidity — this is the most radical departure from the EVM-shim pattern anywhere in this
comparison, which is the point: Hedera Hashgraph is a genuine DAG consensus algorithm, but
its EVM-compatible Smart Contract Service (what a "Hedera" row in the *original*
`marketplace-bench` would have measured) is just another EVM-compatibility shim, no
different in kind from Conflux eSpace. This leg measures the thing that's actually
Hedera-native instead.

## Operation mapping

| Harness op | Hedera transaction | Notes |
|---|---|---|
| `mint` | `TokenMintTransaction` | One serial minted per bench transaction (matches `MarketplaceItem.mint()`'s one-token-per-call semantics for a fair per-op comparison). Mints always go to the token's treasury account (the operator) — HTS has no "mint directly to recipient" — ownership is reassigned to a seller separately, as an untimed seeding step, not part of what's measured. |
| `approve` | `AccountAllowanceApproveTransaction` (per-serial NFT allowance to the marketplace account) | Signed by the NFT's current owner (the seller), authorizing the marketplace account as spender for that one serial. |
| `list` | **not benched as a separate operation** | Hedera has no on-ledger "listing" primitive — no order book, no price stored anywhere on-chain. The allowance grant above *is* the listing action (per `marketplace-bench-native/docs/DESIGN.md`'s own guidance: "the `approve` step *is* the list step here"). Benching it twice under two op names would just duplicate one measurement under a second label, which is indistinguishable from fabricating a listing transaction that doesn't exist — DESIGN.md's non-negotiables explicitly rule that out. Price is tracked off-chain, in `seed-fixtures.hedera.json`, purely so `bench.ts`'s `buy` job knows what HBAR amount to move; it is never written to the ledger. |
| `buy` | **one atomic `TransferTransaction`** carrying an approved NFT leg (`addApprovedNftTransfer`, exercising the allowance from `approve`) *and* an HBAR leg (`addHbarTransfer` debit/credit) | **This is the genuinely native DAG capability worth calling out.** Besu and Conflux Core both need a *contract call* (`Marketplace.buyItem`) to make pay+transfer atomic — the atomicity is a property of EVM call semantics, enforced by a contract. Hedera gets the same atomicity for free from the protocol's own multi-party transaction model: arbitrary numbers of HBAR/HTS-token/NFT transfers, from arbitrary accounts, either all apply or none do, with **no contract and no bytecode anywhere**. There is no equivalent to this in the other three chains in this comparison — Sui's `buy` still needs a Move call, Conflux Core's needs a CVM call. The **marketplace account is the transaction's payer** here, not the buyer: Hedera requires an approved-allowance transfer's spender to be the paying account, not merely a co-signer (confirmed empirically against this local network — a buyer-pays version fails with `SPENDER_DOES_NOT_HAVE_ALLOWANCE`, since the network checks the *payer* against the allowance record, not just the signature set). The buyer co-signs to authorize their own HBAR debit. This is a real, small divergence from the Solidity harness's gas-payer semantics (there, the buyer always pays gas) — a native consequence of Hedera's allowance model, not a design choice made for convenience. |
| `cancel` | `AccountAllowanceDeleteTransaction` (`deleteAllTokenNftAllowances`) | Signed by the seller, revoking the allowance granted in `approve`/`list`. |

Rows are only ever written to CSV under `mint`, `approve`, `buy`, `cancel` —
`bench.ts` rejects `BENCH_OPERATION=list` outright with an error explaining why, rather
than silently producing a duplicate/misleading dataset.

## What "the marketplace" is, without a contract

There's no `Marketplace.sol` equivalent deployed anywhere. Instead, `deploy.ts` creates a
plain Hedera account (`marketplaceAccountId` in `deployment-addresses.json`) that plays the
*role* the contract used to play:

- It's the account sellers grant an HTS NFT allowance to (`approve`/`list`).
- It co-signs the atomic `buy` transaction as the approved spender, authorizing the NFT leg.
- It never takes custody of the NFT or the HBAR — the atomic transfer moves both directly
  between seller and buyer in one step. The marketplace account's only "job" is holding the
  allowance and lending its signature to authorize spending it, which is a much thinner
  trust model than a contract holding funds in escrow.

## Local network

[`hashgraph/hedera-local-node`](https://github.com/hashgraph/hedera-local-node) (npm
package `@hashgraph/hedera-local`, CLI binary `hedera`), pinned to `2.40.2` in
`package.json`. This brings up, via its own bundled docker-compose:

- A single **consensus node** (gRPC `127.0.0.1:50211`, node account `0.0.3`) — the actual
  Hashgraph DAG consensus algorithm running locally, pre-funded well-known operator account
  `0.0.2`.
- A **mirror node** (gRPC `127.0.0.1:5600`, REST `127.0.0.1:5551`) that this leg's scripts
  never query directly (receipts/records come straight from the consensus node via the SDK)
  but which the CLI itself depends on for its own health checks.
- A JSON-RPC relay, `mirror-node-web3` (EVM `eth_call`/debug support), and a Mirror Node
  Explorer UI — none of which this track uses (see "Why 3 ports are disabled" below).

No `.env`, no generated secrets: operator account `0.0.2` and its private key are a fixed,
publicly documented dev credential baked into every `hedera-local-node` install (see
`docker-compose.yml`'s `OPERATOR_ID_MAIN`/`OPERATOR_KEY_MAIN`), exactly analogous to
Hardhat's public test mnemonic that `marketplace-bench` already commits for
`besuLocal`/`confluxLocal`. It only ever holds fake, locally-genesis'd HBAR.

### Why 3 of the stock compose's ports are disabled

`hedera-local-node`'s stock `docker-compose.yml` publishes three host ports that collide
with services this repo's other tracks already own (see
`marketplace-bench-native/docs/DESIGN.md`'s port table):

| Port | Stock service | Collides with |
|---|---|---|
| `8545` | `mirror-node-web3` (EVM `eth_call`/debug) | `besuLocal`'s Besu JSON-RPC |
| `8546` | `json-rpc-relay-ws` | `confluxLocal`'s eSpace RPC |
| `9000`/`9001` | `minio` (record-stream object storage) | the `sui` leg's `sui-local` container |

None of these are needed by this track — everything here talks to the consensus/mirror
nodes directly via `@hashgraph/sdk`, never through JSON-RPC/EVM (deliberately: that's the
shim this whole comparison exists to avoid). `docker/overrides/port-collisions.yml` strips
`web3`/`relay`/`relay-ws`'s host port publishes entirely and remaps `minio` to
`19000`/`19001`. It's picked up via the CLI's `--composedir` flag, but **only when passed
as an absolute path** — `npm run node:start`/`node:restart` go through
`scripts/run-hedera-cli.js` instead of invoking `hedera` directly, specifically to pass
that absolute path. See that script's header comment: the CLI internally `cd`s into its own
`node_modules` package directory before building the `docker compose` command, so a
relative `--composedir` (what the CLI's own `--help` output suggests) silently resolves
against the wrong directory and the override never applies.

Separately, the CLI's own preflight check hardcodes `8545` as a "necessary" port and
refuses to start if anything is already bound there — *even though*, after the override
above, `hedera-local-node`'s own compose no longer needs it. `scripts/patch-hedera-local-ports.js`
(run automatically via `npm install`'s `postinstall`) does a narrow, idempotent edit of the
installed CLI's `constants.js` to drop `8545` from that hardcoded list. See that script's
header comment for the full rationale.

## Cost integrity (feePaidNative)

Hedera fees are flat, USD-pegged, and computed from a fee schedule the network imports on
startup ("Importing fees..." in the local-node startup log) — there's no `--min-gas-price=0`
footgun the way there is for `besuLocal` (see `marketplace-bench/RUNBOOK.md` §6). Every
operation's `feePaidNative` in this leg's CSVs comes from `TransactionRecord.transactionFee`
(the actual tinybar amount charged for that specific transaction, read via an extra
`getRecord()` query after the timed receipt comes back).

**A real, different zero-fee footgun was found and fixed during validation, though.** Hedera
treats low-numbered accounts (`0.0.1`-`0.0.100`, "system accounts" — `0.0.2` is literally the
network Treasury) as fee-exempt by protocol design, on *any* Hedera network, not just this
local one. The first bench run used the client's default operator (`0.0.2`) as the payer for
`mint`/`approve`/`cancel` (via the SDK's implicit "unfrozen transaction defaults to the
client operator as payer" behavior), and every single one of those rows came back with
`feePaidNative=0` — a real, protocol-accurate zero, but exactly the misleading kind
`DESIGN.md`'s cost-integrity section warns against, since it would read as "these operations
are free" rather than "this specific payer is exempt." Only `buy` (which already had to name
an explicit non-operator payer for allowance-authorization reasons — see the operation
mapping table above) came back with a real fee in that first pass, which is what surfaced the
discrepancy. Fixed by explicitly setting a non-exempt payer for every benched transaction
(the seller for `approve`/`cancel`, the marketplace account for `mint` — see the comments at
each job in `scripts/bench.ts`); the actual HTS authorization requirements (who has to *sign*)
were untouched, only who pays the network fee changed. Confirmed non-zero, per-operation, in
the final run (`BATCH_SIZE=5 REPEATS=6`, 30 rows each, 120/120 succeeded):

| Operation | feePaidNative (tinybars) | ≈ HBAR |
|---|---|---|
| `mint` | 17,168,083 | 0.172 |
| `approve` | 68,243,991 | 0.682 |
| `buy` | 1,156,637 | 0.012 |
| `cancel` | 68,357,967 | 0.684 |

Every row in every CSV under `bench-output/hedera-*.csv` carries an identical
`feePaidNative` for its operation (Hedera's flat fee schedule doesn't vary charge by
payload the way EVM gas does), all non-zero. `feeUnitsUsed`/`feeUnitPrice` are left blank
per `DESIGN.md`: Hedera has no gas/gasPrice-style metering unit to report there.

## Known gaps

- **`hedera-local-node` is officially deprecated.** The CLI prints a deprecation notice on
  every run: the project is being archived in favor of `@hashgraph/solo`
  (see `marketplace-bench/docker/hedera-solo/README.md` for this repo's prior notes on
  Solo, which targets the EVM/Smart-Contract-Service path this track deliberately avoids
  anyway). It was still the current, documented way to get a local consensus+mirror node at
  the time this leg was built, and it worked end-to-end.
- **Single node.** Like `besuLocal`/`confluxCore`, this is the 1-node baseline
  (`nodeCount=1`). `hedera-local-node` supports a `--multinode` flag for a multi-consensus-node
  local network; not exercised here.
- **`getRecord()` costs a small extra fee**, paid by the operator account, on top of every
  successfully-confirmed transaction — necessary to read `feePaidNative` at all (receipts
  don't carry a fee field). This is not included in the benched transaction's own
  `feePaidNative` and does not affect the measured submit-to-receipt latency (see
  `scripts/bench.ts`'s `timeTx` docstring for exactly where the query is inserted relative
  to the timing window).
- **`confirmUnit`** is the transaction's consensus timestamp (`TransactionRecord.consensusTimestamp`),
  Hedera's actual native ordering/finality unit — Hashgraph doesn't have a block number in
  the way a chain-structured ledger does; consensus timestamp is the idiomatic choice
  (per `DESIGN.md`'s "whatever's idiomatic" instruction).
- **`network-node`'s config bind-mount can come up stale on first `docker compose up -d`
  under Docker Desktop for Windows.** During validation, `network-node` sat at
  `health: starting` indefinitely; `docker logs network-node` showed its entrypoint's
  `waitForFile` check timing out on `application.properties` even though the file existed
  (and was non-empty) on the host, in the exact directory Docker reported as bind-mounted.
  `docker exec network-node ls .../data/config/` confirmed the container's view of that
  directory was genuinely missing the files hedera-local-node had already generated on the
  host — a stale/incomplete bind-mount snapshot, not a timing race (a plain `docker restart
  network-node` reproduced the identical failure; only `docker compose up -d
  --force-recreate --no-deps network-node`, which tears down and remounts the container
  fresh, picked up the current host files). Root cause looks like Docker Desktop's Windows
  file-sharing layer, not a hedera-local-node or consensus-node bug — but if you hit the
  same symptom, `--force-recreate --no-deps network-node` (targeted at that one container,
  never the whole stack) is the fix; see `RUNBOOK.md`'s troubleshooting section.
- **HTS requires explicit token association before an account can receive a token**
  (`TOKEN_NOT_ASSOCIATED_TO_ACCOUNT` otherwise) — unlike ERC-721, where any address can
  receive an NFT with zero setup. `seed.ts` sets `setMaxAutomaticTokenAssociations(-1)` on
  every participant account it creates so the treasury→participant ownership-assignment
  transfers (and the marketplace account, for future-proofing) don't need a separate
  `TokenAssociateTransaction` per account.
- **An approved-allowance transfer's spender must be the transaction's *payer*, not merely
  a co-signer** (`SPENDER_DOES_NOT_HAVE_ALLOWANCE` otherwise) — found empirically while
  building `buy`'s atomic `TransferTransaction`: a buyer-pays version (mirroring the
  Solidity harness's gas-payer convention exactly) failed every time, because Hedera checks
  the allowance record against the transaction's payer account, not its signature set. Fixed
  by making the marketplace account (the allowance's spender) the payer, with the buyer
  co-signing to authorize their own HBAR debit — see the operation-mapping table above.
