# Track B — conflux-rust cluster (DAG side, if Conflux is chosen)

Independent multi-node Conflux devnet via Docker Compose, per plan §5 — no Kubernetes
needed, which is the operational advantage over the Hedera Solo path (see
`../hedera-solo/README.md`).

## Usage

1. `cp devnode.toml.template conf/bootnode.toml` and likewise for `peer0.toml`,
   `peer1.toml`, `peer2.toml`; fill in each node's `public_address` /
   `jsonrpc_http_port` / `jsonrpc_ws_port`.
2. `docker compose up bootnode` first, read its logs for the node's `cfxnode://` id, and
   set `bootnodes = "cfxnode://<id>@bootnode:32323"` in each peer's config.
3. `docker compose up` for the full cluster.

eSpace (EVM-compatible) JSON-RPC is exposed on `localhost:8545` from the bootnode. For a
known-working single-node config to adapt per-peer (dev mode, chain IDs, the
`cancun_opcodes_transition_number` opcode fix, genesis funding), see
`../local/conflux/conflux.toml` — it's the same `conflux-rust` image, live-tested, just
one node instead of a bootnode+peers topology.

## Node count

4 nodes total here (bootnode + 3 peers), matching the Besu cluster's 4 validators. For
the 3-node condition, drop `peer-2`.

## Resource parity

Same `cpus: 2` / `memory: 2G` limits as `../besu/docker-compose.yml`, so a throughput
difference is attributable to consensus/ledger structure, not hardware.

## Status

Phase 4 scaffolding, node-count variable specifically. `../local/conflux/` runs this same
image in single-node dev mode and is live-tested (genesis funding, opcode transitions,
eSpace RPC — all confirmed working, see `../../RUNBOOK.md`). The bootnode+peers topology
in *this* directory hasn't been brought up and confirmed forming consensus — `mode =
"dev"` (single-node auto-mining) and a real multi-node peer-discovery topology are
different code paths in conflux-rust, so the single-node validation doesn't carry over
automatically. Bringing this cluster up and collecting Track B throughput-vs-node-count
data (plan §10 phase 5) is follow-up work.
