# Track B — Besu IBFT2.0 cluster (linear-chain side)

Multi-validator Hyperledger Besu cluster via Docker Compose, per plan §5. Deterministic
block time (`blockperiodseconds`), you control node count and hardware.

## Usage

```bash
./generate-genesis.sh 4       # or 3, for the other node-count condition
./generate-static-nodes.sh
docker compose up
```

`generate-genesis.sh` shells out to the official `hyperledger/besu` image's
`operator generate-blockchain-config` command — no local Besu install needed, only
Docker. It writes `./networkFiles/genesis.json` and one `node<i>/{key,key.pub}` per
validator, pre-funds the same 20 well-known dev accounts `../local/` uses (via genesis
`alloc`), and enables Shanghai/Cancun opcodes at genesis (`shanghaiTime`/`cancunTime: 0`)
— without that, contracts compiled with `evmVersion: "cancun"` (required by OpenZeppelin
5.x's use of `MCOPY`) fail to deploy with `Invalid opcode: 0x5f`, which is what
`../local/besu/genesis.json` hit first; this script bakes in the fix.
`generate-static-nodes.sh` derives each node's enode URL from its public key and writes
`static-nodes.json` into every node directory so the containers find each other by their
compose service hostname (`besu-0`, `besu-1`, ...).

RPC is exposed on `localhost:8545` (besu-0 only). For the single-node, already-wired-up
version of this same chain, use `../local/` and `hardhat.config.ts`'s `besuLocal` network
instead — see `../../RUNBOOK.md`. This directory is for the node-count-sensitivity
variable specifically (plan §5), once you need more than one validator.

## Node count

`docker-compose.yml` defines `besu-0..besu-3` (4 validators). For the 3-node condition,
regenerate genesis/static-nodes for `nodeCount=3` and comment out (or `docker compose up
besu-0 besu-1 besu-2`) the fourth service.

## Resource parity

Each validator is capped at `cpus: 2`, `memory: 2G` via the `x-besu-resources` anchor —
match these exactly on whichever DAG-chain cluster runs alongside it (see
`../conflux/README.md` or `../hedera-solo/README.md`) so throughput results aren't
confounded by uneven hardware.

## Status

Phase 4 scaffolding, node-count variable specifically. The single-validator case (this
same genesis/config approach, `nodeCount=1`) is exactly what `../local/besu/` runs and is
live-tested — see `../../RUNBOOK.md`. The multi-validator case (3-4 nodes, this
directory's default) shares that same config generation path but hasn't been brought up
and confirmed producing blocks in this environment; bringing it up and collecting Track B
throughput-vs-node-count data (plan §10 phase 5) is follow-up work.
