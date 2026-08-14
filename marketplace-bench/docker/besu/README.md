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
validator. `generate-static-nodes.sh` derives each node's enode URL from its public key
and writes `static-nodes.json` into every node directory so the containers find each
other by their compose service hostname (`besu-0`, `besu-1`, ...).

RPC is exposed on `localhost:8545` (besu-0 only) — point `hardhat.config.ts`'s
`sepolia`-equivalent Track B network entry at it, or add a dedicated `besuLocal` network
block with `url: "http://localhost:8545"`.

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

This is Phase 4 scaffolding: the Compose file and generation scripts are syntax-validated
(`docker compose config`) but a live multi-validator consensus run has not been executed
in this environment — bringing the cluster up, confirming IBFT2.0 block production, and
collecting Track B throughput data (plan §10 phases 4-5) is follow-up work once the
chain decision in `../../docs/chain-decision.md` is resolved.
