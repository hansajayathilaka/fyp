#!/usr/bin/env bash
# Builds static-nodes.json (peer discovery) from the key.pub files written by
# generate-genesis.sh, and drops a self-excluding copy into every node's data directory so
# each validator finds the others.
#
# Uses each validator's fixed IP (docker-compose.yml's besu-net, 172.28.0.10 + index) —
# NOT the compose service hostname (besu-0, besu-1, ...). Besu's StaticNodesParser
# requires the enode's host component to be a literal IP address; a DNS hostname fails
# startup with "Illegal static enode supplied" / "incorrectly formatted enode element"
# (confirmed empirically). If docker-compose.yml's besu-net subnet/addresses change,
# update BASE_IP_PREFIX/BASE_IP_LAST_OCTET below to match.
#
# Run this after generate-genesis.sh and before `docker compose up`.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_DIR="${SCRIPT_DIR}/networkFiles"
P2P_PORT=30303
BASE_IP_PREFIX="172.28.0."
BASE_IP_LAST_OCTET=10

# Same python3/python/py fallback as generate-genesis.sh (used only for pretty-printing;
# falls back to unformatted JSON if none of these are usable).
PYTHON_BIN="python3"
if ! command -v python3 >/dev/null 2>&1 || ! python3 --version >/dev/null 2>&1; then
  if command -v python >/dev/null 2>&1 && python --version >/dev/null 2>&1; then
    PYTHON_BIN="python"
  elif command -v py >/dev/null 2>&1; then
    PYTHON_BIN="py"
  fi
fi

nodes=("${OUT_DIR}"/node*/)
entries=()
i=0
for node_dir in "${nodes[@]}"; do
  pubkey="$(tr -d '\n' < "${node_dir}/key.pub")"
  pubkey="${pubkey#0x}"
  ip="${BASE_IP_PREFIX}$((BASE_IP_LAST_OCTET + i))"
  entries+=("enode://${pubkey}@${ip}:${P2P_PORT}")
  i=$((i + 1))
done

# Besu rejects a static-nodes.json that contains the node's own enode ("Illegal static
# enode supplied") — each node's file must list its peers only, not itself. Write a
# separate, self-excluding file per node rather than copying one shared list everywhere.
total=${#entries[@]}
i=0
for node_dir in "${nodes[@]}"; do
  peer_entries=()
  for ((j = 0; j < total; j++)); do
    if [ "$j" -ne "$i" ]; then
      peer_entries+=("\"${entries[$j]}\"")
    fi
  done
  json="[$(IFS=,; echo "${peer_entries[*]}")]"
  # Pretty-print via python for readability, then strip any \r — on Windows, python's
  # text-mode stdout writes CRLF line endings, and Besu's StaticNodesParser chokes on the
  # trailing \r (reported as "Illegal static enode supplied" / "incorrectly formatted
  # enode element", since it ends up glued onto the port number).
  if formatted=$(echo "${json}" | "${PYTHON_BIN:-python3}" -m json.tool 2>/dev/null); then
    printf '%s\n' "${formatted}" | tr -d '\r' > "${node_dir}/static-nodes.json"
  else
    printf '%s\n' "${json}" | tr -d '\r' > "${node_dir}/static-nodes.json"
  fi
  i=$((i + 1))
done

echo "Wrote static-nodes.json (${total} nodes, each peer-list self-excluded) into each node directory."
