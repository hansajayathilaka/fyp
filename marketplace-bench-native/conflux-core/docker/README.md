# Node

This leg deliberately does **not** have its own `docker-compose.yml`. Per
`../../docs/DESIGN.md`'s non-negotiable #1 and the task's own instructions, it reuses the
existing, unmodified `conflux-local` service already defined in
`../../../marketplace-bench/docker/local/docker-compose.yml` — the same physical
`conflux-rust` dev-mode node the eSpace leg (`marketplace-bench`) talks to on port `8546`.
This leg talks to the **same node's CoreSpace RPC**, already published on host port
`12537` by that same compose file (see its comment block: "Conflux CoreSpace RPC
(bootstrap use only) -> http://localhost:12537" — "bootstrap use only" turned out to be an
undersell, since this whole leg runs entirely against it).

Bring it up (from the repo root):

```bash
docker compose -f ../../../marketplace-bench/docker/local/docker-compose.yml up -d conflux-local
```

Tear down **`conflux-local` only** — never a bare `down -v` against this compose file.
That file also defines `besu-local` and `geth-local` (the linear-chain legs, owned by other
agents/the orchestrator, sharing this same Docker daemon); a scopeless `down`/`down -v`
stops/wipes **all three** services and their volumes, not just this leg's. (This bit
during development of this leg — recorded here so it isn't repeated: an earlier `down -v` run without a service name took out `besu-local`'s container and
volume as a side effect, mid an unrelated benchmark run. Recreated by the orchestrator;
not a mistake to repeat.)

```bash
# Stop just conflux-local, containers only, no data loss:
docker compose -f ../../../marketplace-bench/docker/local/docker-compose.yml stop conflux-local

# Remove just the conflux-local container (data volume untouched — `rm -v` only removes
# *anonymous* volumes, and conflux-local-data is a named volume, so this is safe):
docker compose -f ../../../marketplace-bench/docker/local/docker-compose.yml rm -f -v conflux-local

# Only if you deliberately want to wipe conflux-local's chain data (re-fund/re-deploy
# needed afterward) — targets the named volume directly, nothing besu/geth own:
docker volume rm local_conflux-local-data
```

No file under `marketplace-bench/` was modified to make this leg work — see
`../README.md` for what *was* built specifically for Core Space (contracts, scripts, this
note).
