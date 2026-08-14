#!/usr/bin/env bash
# Builds static-nodes.json (peer discovery) from the key.pub files written by
# generate-genesis.sh, and drops a copy into every node's data directory so each
# validator finds the others by their docker-compose service hostname.
#
# Run this after generate-genesis.sh and before `docker compose up`.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_DIR="${SCRIPT_DIR}/networkFiles"
P2P_PORT=30303

nodes=("${OUT_DIR}"/node*/)
entries=()
i=0
for node_dir in "${nodes[@]}"; do
  pubkey="$(tr -d '\n' < "${node_dir}/key.pub")"
  pubkey="${pubkey#0x}"
  entries+=("\"enode://${pubkey}@besu-${i}:${P2P_PORT}\"")
  i=$((i + 1))
done

json="[$(IFS=,; echo "${entries[*]}")]"
echo "${json}" | python3 -m json.tool > /tmp/static-nodes.json 2>/dev/null || echo "${json}" > /tmp/static-nodes.json

for node_dir in "${nodes[@]}"; do
  cp /tmp/static-nodes.json "${node_dir}/static-nodes.json"
done

echo "Wrote static-nodes.json (${#entries[@]} peers) into each node directory."
