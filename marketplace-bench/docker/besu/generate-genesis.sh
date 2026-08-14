#!/usr/bin/env bash
# Generates an IBFT2.0 genesis file + one key pair per validator, via the official Besu
# image, into ./networkFiles. Re-run after changing NODE_COUNT.
#
# Usage: ./generate-genesis.sh [nodeCount]
set -euo pipefail

NODE_COUNT="${1:-4}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_DIR="${SCRIPT_DIR}/networkFiles"

rm -rf "${OUT_DIR}"
mkdir -p "${OUT_DIR}"

cat > "${SCRIPT_DIR}/ibftConfigFile.json" <<EOF
{
  "genesis": {
    "config": {
      "chainId": 4004,
      "berlinBlock": 0,
      "ibft2": {
        "blockperiodseconds": 2,
        "epochlength": 30000,
        "requesttimeoutseconds": 4
      }
    },
    "nonce": "0x0",
    "timestamp": "0x58ee40ba",
    "gasLimit": "0x1fffffffffffff",
    "difficulty": "0x1",
    "coinbase": "0x0000000000000000000000000000000000000000"
  },
  "blockchain": {
    "nodes": {
      "generate": true,
      "count": ${NODE_COUNT}
    }
  }
}
EOF

docker run --rm \
  -v "${SCRIPT_DIR}:/config" \
  hyperledger/besu:latest \
  operator generate-blockchain-config \
  --config-file=/config/ibftConfigFile.json \
  --to=/config/networkFiles \
  --private-key-file-name=key

# Besu names each key dir by validator address, which isn't known in advance — re-lay
# them out as node0..nodeN-1 so docker-compose.yml can mount fixed, predictable paths.
i=0
for addr_dir in "${OUT_DIR}/keys"/*/; do
  node_dir="${OUT_DIR}/node${i}"
  mkdir -p "${node_dir}"
  cp "${addr_dir}/key" "${node_dir}/key"
  cp "${addr_dir}/key.pub" "${node_dir}/key.pub"
  i=$((i + 1))
done

echo "Generated genesis + ${NODE_COUNT} validator keys under ${OUT_DIR}"
echo "Node dirs: ${OUT_DIR}/node0 .. node$((NODE_COUNT - 1)), each with key/key.pub"
