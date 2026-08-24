#!/usr/bin/env bash
# Generates an IBFT2.0 genesis file + one key pair per validator, via the official Besu
# image, into ./networkFiles. Re-run after changing NODE_COUNT.
#
# Usage: ./generate-genesis.sh [nodeCount]
set -euo pipefail

NODE_COUNT="${1:-4}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_DIR="${SCRIPT_DIR}/networkFiles"

# Git-for-Windows' MSYS runtime auto-rewrites any argument that looks like a leading-slash
# absolute path (e.g. "/config/ibftConfigFile.json") into a Windows path before exec'ing
# docker.exe, which mangles the *container-side* half of `-v host:/config` and any
# --config-file=/config/... flag. Disable that globally for this script and, when running
# under that MSYS runtime, resolve the host side of bind mounts to a real Windows path
# (`pwd -W`) ourselves instead — this combination is what actually mounts correctly.
export MSYS_NO_PATHCONV=1
DOCKER_SCRIPT_DIR="$(cd "${SCRIPT_DIR}" && pwd -W 2>/dev/null || echo "${SCRIPT_DIR}")"

# Prefer python3, but fall back to python/py — on some environments (e.g. Windows with
# only the python.org installer, no Microsoft Store python3 alias) `python3` resolves to
# a non-functional App Execution Alias stub rather than a real interpreter.
PYTHON_BIN="python3"
if ! command -v python3 >/dev/null 2>&1 || ! python3 --version >/dev/null 2>&1; then
  if command -v python >/dev/null 2>&1 && python --version >/dev/null 2>&1; then
    PYTHON_BIN="python"
  elif command -v py >/dev/null 2>&1; then
    PYTHON_BIN="py"
  fi
fi

rm -rf "${OUT_DIR}"
# NOTE: do not pre-create OUT_DIR — `besu operator generate-blockchain-config --to`
# refuses to write into a directory that already exists (even empty), so it has to
# create it itself.

# Same 20 well-known Hardhat dev accounts as docker/local/ (see hardhat.config.ts's
# DEV_ACCOUNTS) — funded here via genesis alloc, same pattern, same addresses.
ALLOC_JSON=$("${PYTHON_BIN}" - <<'PYEOF'
import json
addresses = [
    "f39Fd6e51aad88F6F4ce6aB8827279cffFb92266", "70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", "90F79bf6EB2c4f870365E785982E1f101E93b906",
    "15d34AAf54267DB7D7c367839AAf71A00a2C6A65", "9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
    "976EA74026E726554dB657fA54763abd0C3a0aa9", "14dC79964da2C08b23698B3D3cc7Ca32193d9955",
    "23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f", "a0Ee7A142d267C1f36714E4a8F75612F20a79720",
    "Bcd4042DE499D14e55001CcbB24a551F3b954096", "71bE63f3384f5fb98995898A86B02Fb2426c5788",
    "FABB0ac9d68B0B445fB7357272Ff202C5651694a", "1CBd3b2770909D4e10f157cABC84C7264073C9Ec",
    "dF3e18d64BC6A983f673Ab319CCaE4f1a57C7097", "cd3B766CCDd6AE721141F452C550Ca635964ce71",
    "2546BcD3c84621e976D8185a91A922aE77ECEc30", "bDA5747bFD65F08deb54cb465eB87D40e51B197E",
    "dD2FD4581271e230360230F9337D5c0430Bf44C0", "8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199",
]
print(json.dumps({a: {"balance": "0x21e19e0c9bab2400000000"} for a in addresses}))
PYEOF
)

cat > "${SCRIPT_DIR}/ibftConfigFile.json" <<EOF
{
  "genesis": {
    "config": {
      "chainId": 4004,
      "londonBlock": 0,
      "zeroBaseFee": true,
      "shanghaiTime": 0,
      "cancunTime": 0,
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
    "coinbase": "0x0000000000000000000000000000000000000000",
    "alloc": ${ALLOC_JSON}
  },
  "blockchain": {
    "nodes": {
      "generate": true,
      "count": ${NODE_COUNT}
    }
  }
}
EOF

# NOTE: `--to` must NOT point directly at a path under the bind-mounted /config volume —
# on Docker Desktop for Windows, `operator generate-blockchain-config` reliably fails with
# "Output directory already exists" (a filesystem-metadata quirk of the Windows bind mount,
# reproducible even against a brand-new, never-before-existing directory; confirmed to work
# fine when writing to the container's own filesystem instead). Work around it by writing to
# a container-local path, then copying the result onto the bind mount.
docker run --rm \
  --entrypoint sh \
  -v "${DOCKER_SCRIPT_DIR}:/config" \
  hyperledger/besu:latest \
  -c "besu operator generate-blockchain-config \
        --config-file=/config/ibftConfigFile.json \
        --to=/tmp/networkFiles \
        --private-key-file-name=key \
      && cp -r /tmp/networkFiles /config/networkFiles"

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
