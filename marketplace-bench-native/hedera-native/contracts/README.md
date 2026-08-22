# n/a

No contracts in this leg, by design — see `../README.md`. Every operation is a native
Hedera Token Service / Consensus Service transaction (`TokenCreateTransaction`,
`TokenMintTransaction`, `AccountAllowanceApproveTransaction`, `TransferTransaction`,
`AccountAllowanceDeleteTransaction`), executed directly via `@hashgraph/sdk`. There is no
smart-contract VM anywhere in this leg's path, native or EVM-compatible — that's the whole
point of measuring Hedera through HTS instead of through its Smart Contract Service.

Per `marketplace-bench-native/docs/DESIGN.md`'s directory layout, this directory is kept
present but empty (marked "n/a for hedera-native" there) for structural parity with
`conflux-core/contracts/` and `sui-move/contracts/`.
