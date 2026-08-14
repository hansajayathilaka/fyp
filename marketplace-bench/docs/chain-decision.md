# DAG Chain Pick (§2.1)

Status: **resolved as Conflux for the local comparison** (see `RUNBOOK.md`). Track A
(public testnets, plan §10 phase 3) is a separate decision — Hedera is still on the table
there if a fixed-fee-vs-market-fee comparison becomes the more interesting result to
report; nothing below forecloses that.

## The choice

| | **Hedera (hashgraph, aBFT)** | **Conflux eSpace (Tree-Graph/GHAST)** |
|---|---|---|
| Ledger structure | Gossip-about-gossip DAG of events | Tree-Graph DAG of blocks |
| Fee model | Fixed, USD-pegged, council-set — no priority auction | Market-based gas price, EIP-1559-style |
| Governance | Permissioned council of ~30 orgs | Permissionless, hybrid PoW+PoS |
| Local multi-node dev | Solo (Kubernetes/Kind) | `conflux-rust` Docker image, no Kubernetes needed |
| H4 (fee elasticity) | Doesn't apply natively — reframed as "flat cost under load" | Applies directly, symmetric with the linear chain |

## Why it matters

If the thesis claim is **"DAG-based architecture enables X,"** the only thing that should
differ between conditions is the ledger/consensus structure — which argues for
**Conflux**, since the gas market stays constant on both sides and isolates the DAG-vs-
linear variable cleanly.

If the claim is narrower — **"here is how a fixed-fee DAG network compares to a
market-priced linear one in practice"** — **Hedera** is fine, and arguably more
interesting, since the fee-policy difference becomes a first-class result (H4) instead of
a confound to explain away.

Either is defensible; a thesis panel will likely ask for this justification, which is why
this table lives in the repo rather than only in the original plan document.

**Resolution for the local comparison (`docker/local/`, see `RUNBOOK.md`): Conflux.**
The isolation argument above was the deciding factor — running both chains locally with
identical gas mechanics means H4 becomes a direct, apples-to-apples price-elasticity
comparison (plan §7's non-reframed case) rather than something requiring the Hedera
fixed-fee caveat. Conflux's Docker-only local setup (no Kubernetes) also made it the
faster path to a working comparison, which mattered given everything here had to run
without any external infrastructure.

## What's already wired up for either choice

- `hardhat.config.ts` has a `dagChain` network block that activates once `PRIVATE_KEY`,
  `DAG_CHAIN_RPC_URL`, and (optionally) `DAG_CHAIN_ID` are set in `.env` — see
  `.env.example` for the known RPC endpoints/chain IDs for both Hedera Testnet and
  Conflux eSpace Testnet.
- `deploy.ts` / `seed.ts` / `bench.ts` take `--network dagChain` with no code changes —
  they only depend on an ethers-compatible JSON-RPC endpoint, never a chain-specific SDK.
- `docker/` (Phase 4 scaffolding) has a Compose template for each side of Track B so the
  choice only changes which template you bring up, not the harness.

## To resolve this decision

1. Pick Hedera or Conflux (see table above).
2. Fill in `DAG_CHAIN_RPC_URL` / `DAG_CHAIN_ID` in `.env` (values are in `.env.example`
   comments).
3. Confirm the current max supported Solidity/EVM version on the chosen chain against
   `hardhat.config.ts`'s `SOLC_VERSION` / `evmVersion` (plan §2.1, §4.3 — this has moved
   over time and older docs are inconsistent about the ceiling).
4. Proceed to Track A testnet deployment (plan §10 phase 3).
