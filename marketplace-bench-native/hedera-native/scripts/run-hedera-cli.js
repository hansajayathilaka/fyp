#!/usr/bin/env node
/**
 * Thin wrapper around the (locally installed, patched) `hedera` CLI that fixes a
 * relative-path footgun in `@hashgraph/hedera-local` 2.40.2: `StartState.onStart()` saves
 * `process.cwd()`, `shell.cd()`s into the *installed package's own directory* (so its
 * bundled `docker-compose.yml` resolves as a bare relative filename), runs `docker compose
 * ... up -d` from there, and only `cd`s back to the original cwd afterwards.
 *
 * That means `--composedir ./docker/overrides/` -- a path relative to *our* project, where
 * docker/overrides/port-collisions.yml actually lives -- gets resolved relative to
 * `node_modules/@hashgraph/hedera-local/` instead, where it doesn't exist. The CLI silently
 * finds nothing there (`getUserComposeFiles` just returns `[]` if the directory doesn't
 * exist) and starts the *unmodified* stock compose, which still tries to publish the ports
 * this leg's override exists to free up (see docker/overrides/port-collisions.yml's header
 * comment) -- so `docker compose up -d` fails or fights over ports 8545/8546/9000/9001 with
 * besuLocal/confluxLocal/sui, instead of failing loudly.
 *
 * Fix: always pass an *absolute* --composedir, which resolves correctly regardless of which
 * directory the CLI internally `cd`s into.
 */
const path = require("path");
const { spawnSync } = require("child_process");

const args = process.argv.slice(2);
const command = args[0];
if (!command) {
  console.error("Usage: node run-hedera-cli.js <start|restart|stop> [...extra args]");
  process.exit(1);
}

const hederaBin = path.join(__dirname, "..", "node_modules", ".bin", process.platform === "win32" ? "hedera.cmd" : "hedera");
const overridesDir = path.join(__dirname, "..", "docker", "overrides");

const finalArgs = [...args];
if (command === "start" || command === "restart") {
  finalArgs.push("--composedir", overridesDir + path.sep);
}

console.log(`[run-hedera-cli] ${hederaBin} ${finalArgs.join(" ")}`);
// shell:true is required on Windows to execute the .cmd shim npm generates for bin
// scripts (spawnSync throws EINVAL trying to exec a .cmd file directly); harmless on
// POSIX, where it just runs the shim through /bin/sh.
const result = spawnSync(hederaBin, finalArgs, { stdio: "inherit", shell: true });
if (result.error) {
  console.error(result.error);
  process.exit(1);
}
process.exit(result.status ?? 1);
