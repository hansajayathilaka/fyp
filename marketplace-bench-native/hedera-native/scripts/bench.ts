import * as fs from "fs";
import * as path from "path";
import {
  AccountAllowanceApproveTransaction,
  AccountAllowanceDeleteTransaction,
  AccountId,
  Client,
  Hbar,
  NftId,
  PrivateKey,
  TokenId,
  TokenMintTransaction,
  TransactionId,
  TransactionResponse,
  TransferTransaction,
} from "@hashgraph/sdk";
import { CHAIN_NAME, getClient, LOCAL_OPERATOR_KEY } from "./client";

// `list` is deliberately not a selectable bench operation here -- see README's "operation
// mapping" section. Hedera has no on-ledger listing primitive; the AccountAllowanceApprove
// step already *is* the listing action, and it's benched once under "approve". Emitting a
// second, identically-shaped CSV under a "list" label would just be the same measurement
// wearing a different name, which is exactly the kind of fabricated row DESIGN.md's
// non-negotiables (#4) rule out.
type Operation = "mint" | "approve" | "buy" | "cancel";

interface BenchConfig {
  operation: Operation;
  batchSize: number;
  repeats: number;
  nodeCount?: number;
}

interface TxRecord {
  runId: string;
  chain: string;
  architecture: string;
  language: string;
  operation: string;
  nodeCount?: number;
  priceTier: string;
  warmup: boolean;
  txId: string;
  submittedAt: number;
  receivedAt?: number;
  confirmUnit: string;
  feeUnitsUsed: string;
  feeUnitPrice: string;
  feePaidNative: string;
  feeCurrency: string;
  status: "success" | "reverted" | "timeout";
}

interface DeploymentRecord {
  network: string;
  tokenId: string;
  operatorAccountId: string;
  marketplaceAccountId: string;
  marketplacePrivateKey: string;
  deployedAt: string;
}

interface Participant {
  accountId: string;
  privateKey: string;
}

interface SeedFixtures {
  network: string;
  tokenId: string;
  marketplaceAccountId: string;
  seededAt: string;
  participants: Participant[];
  unlistedSerials: { serial: string; owner: string }[];
  listings: { serial: string; seller: string; price: string }[];
}

const ADDRESSES_FILE = path.join(__dirname, "..", "deployment-addresses.json");
const FIXTURES_FILE = path.join(__dirname, "..", `seed-fixtures.${CHAIN_NAME}.json`);
const OUTPUT_DIR = path.join(__dirname, "..", "..", "bench-output");
const TIMEOUT_MS = Number(process.env.BENCH_TIMEOUT_MS ?? 60_000);

function readConfig(): BenchConfig {
  const operation = process.env.BENCH_OPERATION as Operation | undefined;
  if (!operation || !["mint", "approve", "buy", "cancel"].includes(operation)) {
    throw new Error(
      `BENCH_OPERATION must be one of mint|approve|buy|cancel (got "${operation}"). ` +
        `("list" is intentionally not a separate op here -- see README.)`
    );
  }
  return {
    operation,
    batchSize: Number(process.env.BENCH_BATCH_SIZE ?? 5),
    repeats: Number(process.env.BENCH_REPEATS ?? 5),
    nodeCount: process.env.BENCH_NODE_COUNT ? Number(process.env.BENCH_NODE_COUNT) : 1,
  };
}

function loadDeployment(): DeploymentRecord {
  if (!fs.existsSync(ADDRESSES_FILE)) {
    throw new Error(`No deployment-addresses.json found. Run deploy.ts first (${ADDRESSES_FILE}).`);
  }
  const deployments: Record<string, DeploymentRecord> = JSON.parse(
    fs.readFileSync(ADDRESSES_FILE, "utf-8")
  );
  const deployment = deployments[CHAIN_NAME];
  if (!deployment) {
    throw new Error(`No deployment recorded for "${CHAIN_NAME}". Run deploy.ts first.`);
  }
  return deployment;
}

function loadFixtures(): SeedFixtures {
  if (!fs.existsSync(FIXTURES_FILE)) {
    throw new Error(`No seed fixtures found. Run seed.ts first (${FIXTURES_FILE}).`);
  }
  return JSON.parse(fs.readFileSync(FIXTURES_FILE, "utf-8"));
}

/**
 * Times a single submitted transaction: submit -> await consensus receipt (bounded by
 * TIMEOUT_MS), mirroring marketplace-bench/scripts/bench.ts's timeTx. `receivedAt` is
 * stamped the moment the receipt (consensus-level finality) comes back -- *before* the
 * extra getRecord() call this function makes afterwards to read the actual fee charged, so
 * that fee-lookup latency never leaks into the measured submit->finality window.
 */
async function timeTx(
  runId: string,
  operation: Operation,
  warmup: boolean,
  nodeCount: number | undefined,
  client: Client,
  submit: () => Promise<TransactionResponse>
): Promise<TxRecord> {
  const base = {
    runId,
    chain: CHAIN_NAME,
    architecture: "dag",
    language: "native-hts-hcs",
    operation,
    nodeCount,
    priceTier: "",
    warmup,
    feeCurrency: "HBAR",
  };
  const submittedAt = Date.now();
  let txId = "";
  try {
    let timer: NodeJS.Timeout;
    const resp = await Promise.race([
      submit().finally(() => clearTimeout(timer)),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), TIMEOUT_MS);
      }),
    ]);
    if (resp === null) {
      return {
        ...base,
        txId,
        submittedAt,
        confirmUnit: "",
        feeUnitsUsed: "",
        feeUnitPrice: "",
        feePaidNative: "",
        status: "timeout",
      };
    }
    txId = resp.transactionId.toString();

    let receiptTimer: NodeJS.Timeout;
    const receiptOrTimeout = await Promise.race([
      resp
        .getReceipt(client)
        .then((r) => ({ ok: true as const, receipt: r }))
        .catch((err) => ({ ok: false as const, err })).finally(() => clearTimeout(receiptTimer)),
      new Promise<{ ok: null }>((resolve) => {
        receiptTimer = setTimeout(() => resolve({ ok: null }), TIMEOUT_MS);
      }),
    ]);

    if (receiptOrTimeout.ok === null) {
      return {
        ...base,
        txId,
        submittedAt,
        confirmUnit: "",
        feeUnitsUsed: "",
        feeUnitPrice: "",
        feePaidNative: "",
        status: "timeout",
      };
    }
    const receivedAt = Date.now();

    if (!receiptOrTimeout.ok) {
      return {
        ...base,
        txId,
        submittedAt,
        receivedAt,
        confirmUnit: "",
        feeUnitsUsed: "",
        feeUnitPrice: "",
        feePaidNative: "",
        status: "reverted",
      };
    }

    // Fetch the actual fee charged. Costs a small extra query, paid by the client's
    // operator, but it's the only way the SDK exposes `feePaidNative` -- receipts don't
    // carry a fee field. Deliberately done *after* stamping receivedAt (see docstring).
    let feePaidNative = "";
    let confirmUnit = "";
    try {
      const record = await resp.getRecord(client);
      feePaidNative = record.transactionFee.toTinybars().toString();
      confirmUnit = record.consensusTimestamp?.toString() ?? "";
    } catch {
      // Record lookup failing doesn't invalidate the (already-successful) receipt-based
      // timing/status -- leave feePaidNative/confirmUnit blank rather than mislabel status.
    }

    return {
      ...base,
      txId,
      submittedAt,
      receivedAt,
      confirmUnit,
      feeUnitsUsed: "",
      feeUnitPrice: "",
      feePaidNative,
      status: "success",
    };
  } catch (error) {
    return {
      ...base,
      txId,
      submittedAt,
      receivedAt: Date.now(),
      confirmUnit: "",
      feeUnitsUsed: "",
      feeUnitPrice: "",
      feePaidNative: "",
      status: "reverted",
    };
  }
}

function writeCsv(records: TxRecord[], operation: Operation) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(OUTPUT_DIR, `${CHAIN_NAME}-${operation}-${timestamp}.csv`);

  const headers: (keyof TxRecord)[] = [
    "runId",
    "chain",
    "architecture",
    "language",
    "operation",
    "nodeCount",
    "priceTier",
    "warmup",
    "txId",
    "submittedAt",
    "receivedAt",
    "confirmUnit",
    "feeUnitsUsed",
    "feeUnitPrice",
    "feePaidNative",
    "feeCurrency",
    "status",
  ];
  const lines = [headers.join(",")];
  for (const record of records) {
    lines.push(headers.map((h) => (record[h] ?? "")).join(","));
  }
  fs.writeFileSync(file, lines.join("\n") + "\n");
  console.log(`Wrote ${records.length} records to ${file}`);
  return file;
}

async function main() {
  const config = readConfig();
  console.log(
    `Benchmarking "${config.operation}" on "${CHAIN_NAME}": ` +
      `batchSize=${config.batchSize} repeats=${config.repeats}`
  );

  const deployment = loadDeployment();
  const client = getClient();
  const tokenId = TokenId.fromString(deployment.tokenId);
  const marketplaceId = AccountId.fromString(deployment.marketplaceAccountId);
  const marketplaceKey = PrivateKey.fromStringDer(deployment.marketplacePrivateKey);

  const totalNeeded = config.batchSize * config.repeats;
  const runId = `${CHAIN_NAME}-${config.operation}-${Date.now()}`;

  type Job = () => Promise<TransactionResponse>;
  const jobs: Job[] = [];

  if (config.operation === "mint") {
    // One serial per job, matching the Solidity harness's one-token-per-mint-call semantics
    // so the two datasets measure the same conceptual unit of work.
    //
    // Payer is deliberately the marketplace account, *not* the client's default operator
    // (0.0.2). Hedera treats low-numbered accounts (0.0.1-0.0.100, "system accounts" --
    // 0.0.2 is literally the network Treasury) as fee-exempt by protocol design, on any
    // Hedera network, not just this local one. Paying with 0.0.2 would make every mint
    // report feePaidNative=0 -- not a devnet misconfiguration like besuLocal's
    // min-gas-price=0, but the exact same *effect* DESIGN.md's cost-integrity section
    // warns about, so it gets the same fix: route the fee through a normal, non-exempt
    // account. The supply key (operator's key, per deploy.ts) still has to co-sign, since
    // that's what actually authorizes minting.
    for (let i = 0; i < totalNeeded; i++) {
      jobs.push(async () => {
        const tx = new TokenMintTransaction()
          .setTokenId(tokenId)
          .setMetadata([Buffer.from(`bench-mint-${Date.now()}-${i}`)])
          .setTransactionId(TransactionId.generate(marketplaceId))
          .freezeWith(client);
        const signed = await (await tx.sign(LOCAL_OPERATOR_KEY)).sign(marketplaceKey);
        return signed.execute(client);
      });
    }
  } else if (config.operation === "approve") {
    const fixtures = loadFixtures();
    const pool = [...fixtures.unlistedSerials];
    if (pool.length < totalNeeded) {
      throw new Error(
        `Not enough unlisted fixtures for approve bench: need ${totalNeeded}, have ${pool.length}. ` +
          `Re-run seed.ts with a larger SEED_UNLISTED_COUNT.`
      );
    }
    const keyByAccount = new Map(
      fixtures.participants.map((p) => [p.accountId, PrivateKey.fromStringDer(p.privateKey)])
    );
    for (let i = 0; i < totalNeeded; i++) {
      const { serial, owner } = pool[i];
      const ownerKey = keyByAccount.get(owner)!;
      const nftId = new NftId(tokenId, Number(serial));
      jobs.push(async () => {
        // The seller pays for their own approve/list action (mirrors the Solidity harness,
        // where the seller calls approve()/listItem() and pays their own gas), and it also
        // sidesteps the fee-exemption footgun described in the `mint` job above: without an
        // explicit transactionId here, freezeWith(client) would default the payer to the
        // client's operator (0.0.2, fee-exempt), and this transaction would silently report
        // feePaidNative=0 despite being real. The owner's signature is required either way
        // (it's their allowance being granted); making them the payer too costs nothing
        // extra and gets a real fee reading.
        const frozen = await new AccountAllowanceApproveTransaction()
          .approveTokenNftAllowance(nftId, owner, marketplaceId)
          .setTransactionId(TransactionId.generate(AccountId.fromString(owner)))
          .freezeWith(client)
          .sign(ownerKey);
        return frozen.execute(client);
      });
    }
  } else if (config.operation === "buy") {
    const fixtures = loadFixtures();
    // Front slice: `cancel` (below) draws from the tail of the same pool so a `buy` run and
    // a `cancel` run against the same seed data never fight over the same listings -- same
    // reasoning as marketplace-bench/scripts/bench.ts's tail-slice for cancel.
    const pool = fixtures.listings.slice(0, totalNeeded);
    if (pool.length < totalNeeded) {
      throw new Error(
        `Not enough active listings for buy bench: need ${totalNeeded}, have ${fixtures.listings.length}. ` +
          `Re-run seed.ts with a larger SEED_LISTING_COUNT (needs room for both buy and cancel pools).`
      );
    }
    const keyByAccount = new Map(
      fixtures.participants.map((p) => [p.accountId, PrivateKey.fromStringDer(p.privateKey)])
    );
    for (let i = 0; i < totalNeeded; i++) {
      const { serial, seller, price } = pool[i];
      // Round-robin the buyer, skipping self-purchase, same rationale as the Solidity harness.
      let buyerIndex = i % fixtures.participants.length;
      if (fixtures.participants[buyerIndex].accountId === seller) {
        buyerIndex = (buyerIndex + 1) % fixtures.participants.length;
      }
      const buyer = fixtures.participants[buyerIndex];
      const buyerId = AccountId.fromString(buyer.accountId);
      const buyerKey = keyByAccount.get(buyer.accountId)!;
      const sellerId = AccountId.fromString(seller);
      const nftId = new NftId(tokenId, Number(serial));
      const priceHbar = Hbar.fromTinybars(price);

      jobs.push(async () => {
        // The genuinely native-DAG-capability part of this leg: one atomic
        // TransferTransaction carries both the NFT leg (moved via the marketplace's
        // allowance from `approve`/list) and the HBAR payment leg. No contract call, no
        // separate escrow step -- Hedera's multi-party atomic transfer *is* the buy.
        // The marketplace account must be the transaction's *payer* -- Hedera requires an
        // approved-allowance transfer's spender to be the paying account, not merely a
        // co-signer (SPENDER_DOES_NOT_HAVE_ALLOWANCE otherwise, confirmed empirically
        // against this local network). This differs from the Solidity harness, where the
        // buyer calls buyItem() and pays gas directly -- here the marketplace account pays
        // the network fee as the party exercising the allowance, and the buyer co-signs to
        // authorize their own HBAR debit.
        const tx = new TransferTransaction()
          .addHbarTransfer(buyerId, priceHbar.negated())
          .addHbarTransfer(sellerId, priceHbar)
          .addApprovedNftTransfer(nftId, sellerId, buyerId)
          .setTransactionId(TransactionId.generate(marketplaceId))
          .freezeWith(client);
        const signed = await (await tx.sign(marketplaceKey)).sign(buyerKey);
        return signed.execute(client);
      });
    }
  } else {
    // cancel
    const fixtures = loadFixtures();
    if (fixtures.listings.length < 2 * totalNeeded) {
      throw new Error(
        `Not enough active listings for cancel bench: need ${totalNeeded} beyond the buy pool, ` +
          `have ${fixtures.listings.length} total. Re-run seed.ts with a larger SEED_LISTING_COUNT.`
      );
    }
    const pool = fixtures.listings.slice(fixtures.listings.length - totalNeeded);
    const keyByAccount = new Map(
      fixtures.participants.map((p) => [p.accountId, PrivateKey.fromStringDer(p.privateKey)])
    );
    for (const { serial, seller } of pool) {
      const sellerKey = keyByAccount.get(seller)!;
      const nftId = new NftId(tokenId, Number(serial));
      jobs.push(async () => {
        // Seller pays for their own cancel/revoke, same fee-exemption-avoidance reasoning
        // as the `approve` job above -- see its comment.
        const frozen = await new AccountAllowanceDeleteTransaction()
          .deleteAllTokenNftAllowances(nftId, seller)
          .setTransactionId(TransactionId.generate(AccountId.fromString(seller)))
          .freezeWith(client)
          .sign(sellerKey);
        return frozen.execute(client);
      });
    }
  }

  const records: TxRecord[] = [];
  for (let repeat = 0; repeat < config.repeats; repeat++) {
    const warmup = repeat === 0;
    const batch = jobs.slice(repeat * config.batchSize, (repeat + 1) * config.batchSize);
    const batchResults = await Promise.all(
      batch.map((job) => timeTx(runId, config.operation, warmup, config.nodeCount, client, job))
    );
    records.push(...batchResults);
    console.log(
      `Repeat ${repeat + 1}/${config.repeats}${warmup ? " (warmup)" : ""}: ` +
        `${batchResults.filter((r) => r.status === "success").length}/${batchResults.length} succeeded`
    );
  }

  writeCsv(records, config.operation);
  client.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
