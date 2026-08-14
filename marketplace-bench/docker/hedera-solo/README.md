# Track B — Hedera Solo cluster (DAG side, if Hedera is chosen)

Solo deploys a multi-consensus-node local Hedera network via Kubernetes (Kind), not
Docker Compose (plan §5) — this directory is documentation, not a Compose scaffold like
`../conflux/`, because the runtime is genuinely different.

## Why this path is different from Conflux's

- Requires `kind` + `kubectl` + `helm`, in addition to Docker (Kind runs Kubernetes
  nodes as Docker containers).
- Resource parity with the Besu cluster (`../besu/`) has to be enforced across two
  different runtimes: Kind-managed pods vs. Compose containers. Set explicit, matching
  CPU/memory requests+limits on both sides — don't rely on each tool's defaults being
  "similar" (plan §5's explicit warning).
- Hedera's EVM execution layer is itself Besu-derived, which is a nice thematic aside if
  you go this route, though not required for the evaluation either way.

## Setup (outline — follow Solo's own docs for exact commands, since this tooling was
actively being migrated off the old "Local Node" at the time the plan was written)

1. Install `kind`, `kubectl`, `helm`, and the `@hashgraph/solo` CLI.
2. `kind create cluster` — size the cluster's Docker resource allocation to match the
   Besu cluster's per-node `cpus: 2` / `memory: 2G` limits, multiplied by your node count.
3. Use Solo to stand up a multi-consensus-node network (`solo node setup` / `solo network
   deploy` per Solo's current docs — command names have moved across Solo versions).
4. Solo's local network exposes a JSON-RPC relay; point `hardhat.config.ts`'s `dagChain`
   network at it once you have the URL (`DAG_CHAIN_RPC_URL`, `DAG_CHAIN_ID=296` matches
   Hedera Testnet's chain ID — confirm the local network's chain ID separately, it may
   differ).
5. For load testing, Solo has documented tooling of its own — check whether it covers
   what `../../scripts/bench.ts` needs, or whether pointing `bench.ts` at the relay
   directly (as with any other network) is simpler; the harness has no Hedera-specific
   code path, so the latter should just work.

## Status

Not scaffolded as runnable config in this repo (unlike `../besu/` and `../conflux/`),
since Solo requires a Kubernetes control plane this environment doesn't have provisioned
and its CLI surface was described as being actively replaced at plan-writing time. This
is follow-up work only if Hedera (not Conflux) is the chain decision in
`../../docs/chain-decision.md`.
