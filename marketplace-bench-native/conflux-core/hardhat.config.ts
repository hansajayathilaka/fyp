import { HardhatUserConfig } from "hardhat/config";

// Hardhat is used here ONLY as a Solidity compiler front end (`npx hardhat compile`) —
// no hardhat-ethers, no hardhat network config, no `hardhat run`. Deployment/seeding/
// benchmarking talk to Conflux CoreSpace directly via `js-conflux-sdk` (scripts/*.ts run
// as plain ts-node scripts, not `hardhat run` tasks), because Core Space's account/tx
// model (base32 `cfx:` addresses, `epochHeight`, `storageLimit`) has no ethers/hardhat
// network-provider equivalent. See README.md "Why plain Hardhat + js-conflux-sdk" for the
// rationale (a maintained `@confluxdap/hardhat-conflux` or similar plugin does not exist
// on the npm registry as of this writing — verified via `npm view`; the only hit,
// `hardhat-conflux@0.1.1`, is a single ancient release with no changelog, so it was not
// used).
//
// Same solc version/settings as ../../marketplace-bench/hardhat.config.ts so the compiled
// bytecode is directly comparable to the besuLocal/eSpace legs. Conflux Core Space's CVM
// has been EVM-opcode-compatible since the Hydra hard fork, and this devnet's
// docker/local/conflux/conflux.toml explicitly enables `cancun_opcodes_transition_number`
// (PUSH0/MCOPY, which OpenZeppelin 5.x needs) — confirmed empirically in this repo by
// deploying this exact bytecode to CoreSpace (see README.md "CVM-specific adjustments").
const SOLC_VERSION = "0.8.28";

const config: HardhatUserConfig = {
  solidity: {
    version: SOLC_VERSION,
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "cancun",
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
