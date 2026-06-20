import { createPublicClient, http, parseAbiItem, type Transport } from "viem";
import { MetadataResolver } from "./resolver.js";
import type { ResolvedValidator } from "./types.js";

const METADATA_UPDATED = parseAbiItem(
  "event MetadataUpdated(uint64 indexed validatorId, address indexed writer, string field)",
);

export interface IndexOptions {
  rpcUrl: string;
  registryAddress: `0x${string}`;
  fromBlock?: bigint;
  toBlock?: bigint;
}

export interface Directory {
  registry: `0x${string}`;
  generatedAtBlock: string;
  count: number;
  validators: ResolvedValidator[];
}

// Rebuild a validator directory from MetadataUpdated logs. This is the on-chain
// equivalent of validator-info's consolidated JSON, except anyone can regenerate
// it from the chain with no curator.
export async function buildDirectory(opts: IndexOptions): Promise<Directory> {
  const client = createPublicClient({ transport: http(opts.rpcUrl) as Transport });
  const latest = await client.getBlockNumber();
  const toBlock = opts.toBlock ?? latest;

  const logs = await client.getLogs({
    address: opts.registryAddress,
    event: METADATA_UPDATED,
    fromBlock: opts.fromBlock ?? 0n,
    toBlock,
  });

  const ids = new Set<number>();
  for (const log of logs) {
    const id = log.args.validatorId;
    if (id !== undefined) ids.add(Number(id));
  }

  const resolver = new MetadataResolver({ rpcUrl: opts.rpcUrl, registryAddress: opts.registryAddress });
  const validators: ResolvedValidator[] = [];
  for (const id of [...ids].sort((a, b) => a - b)) {
    const r = await resolver.resolve(id);
    if (r.hasMetadata) validators.push(r);
  }

  return {
    registry: opts.registryAddress,
    generatedAtBlock: toBlock.toString(),
    count: validators.length,
    validators,
  };
}
