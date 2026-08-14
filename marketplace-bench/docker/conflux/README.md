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

eSpace (EVM-compatible) JSON-RPC is exposed on `localhost:8545` from the bootnode —
point `hardhat.config.ts`'s `dagChain` network at it (`DAG_CHAIN_RPC_URL=http://localhost:8545`,
`DAG_CHAIN_ID=71` to match `devnode.toml.template`'s `evm_chain_id`, or set your own).

## Node count

4 nodes total here (bootnode + 3 peers), matching the Besu cluster's 4 validators. For
the 3-node condition, drop `peer-2`.

## Resource parity

Same `cpus: 2` / `memory: 2G` limits as `../besu/docker-compose.yml`, so a throughput
difference is attributable to consensus/ledger structure, not hardware.

## Status

Phase 4 scaffolding: Compose syntax is validated (`docker compose config`), but a live
cluster hasn't been brought up in this environment, and `devnode.toml`'s config keys
should be checked against the pinned `conflux-rust` image's current docs before use —
conflux-rust's config surface has changed across releases (same caveat the plan raises
for Solidity/EVM version ceilings). Bringing the cluster up and collecting Track B data
is follow-up work once the chain decision in `../../docs/chain-decision.md` is resolved.
