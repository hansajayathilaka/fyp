#!/usr/bin/env node
/**
 * Post-install patch for @hashgraph/hedera-local.
 *
 * The CLI's preflight check (state/InitState.js -> DockerService.isPortInUse) refuses to
 * start if any port in the hardcoded `NECESSARY_PORTS` list (build/constants.js) is
 * already bound on the host -- *regardless* of what the actual merged docker-compose
 * config will publish. Port 8545 is in that hardcoded list because hedera-local-node's
 * stock compose ships a `mirror-node-web3` (EVM eth_call/debug) service bound to 8545.
 *
 * This repo's besuLocal (marketplace-bench, unmodified) already owns host port 8545 --
 * see marketplace-bench-native/docs/DESIGN.md's port table. This track's own
 * docker/overrides/port-collisions.yml removes web3's `ports:` publish entirely (we
 * never call it -- this whole track talks to the consensus/mirror nodes natively via
 * the Hedera SDK, never through JSON-RPC/EVM), so 8545 genuinely never gets bound by
 * anything this leg starts. The CLI's preflight check just doesn't know that, because it
 * reads a static list instead of the actual merged compose file.
 *
 * Rather than fork/vendor the whole CLI (whose image-tag/env-var resolution logic is
 * substantial and would be its own maintenance burden), this script does a narrow,
 * idempotent edit of the installed package's constants.js to drop 8545 from
 * NECESSARY_PORTS. Runs automatically via `npm install`'s postinstall hook.
 */
const fs = require("fs");
const path = require("path");

const target = path.join(
  __dirname,
  "..",
  "node_modules",
  "@hashgraph",
  "hedera-local",
  "build",
  "constants.js"
);

if (!fs.existsSync(target)) {
  console.warn(
    `[patch-hedera-local-ports] ${target} not found -- skipping (is @hashgraph/hedera-local installed?)`
  );
  process.exit(0);
}

const original = fs.readFileSync(target, "utf-8");
// Note: "exports.NECESSARY_PORTS = " (without the array bracket) also appears earlier in
// this file as part of a bundled `void 0` destructuring-export preamble line, so the
// marker must include the opening bracket to land on the real assignment.
const marker = "exports.NECESSARY_PORTS = [";
const lineStart = original.indexOf(marker);
if (lineStart === -1) {
  console.warn(
    "[patch-hedera-local-ports] NECESSARY_PORTS export not found -- package version may have changed shape. Leaving file untouched; you may need to update this patch script."
  );
  process.exit(0);
}

const lineEnd = original.indexOf(";", lineStart);
const currentLine = original.slice(lineStart, lineEnd + 1);

if (!currentLine.includes("8545")) {
  console.log("[patch-hedera-local-ports] Already patched (8545 not present). Nothing to do.");
  process.exit(0);
}

const patchedLine = currentLine.replace(/8545,\s*/, "").replace(/,\s*8545/, "");
const patched = original.slice(0, lineStart) + patchedLine + original.slice(lineEnd + 1);
fs.writeFileSync(target, patched, "utf-8");
console.log(
  `[patch-hedera-local-ports] Removed port 8545 from NECESSARY_PORTS preflight check ` +
    `(it's reserved by besuLocal in this repo and never published by our compose override).`
);
console.log(`[patch-hedera-local-ports] ${currentLine.trim()} -> ${patchedLine.trim()}`);
