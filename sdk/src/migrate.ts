import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { encodeFunctionData } from "viem";
import { registryAbi } from "./abi.registry.js";
import { EMPTY_METADATA, type Metadata } from "./types.js";

/**
 * Migration from the off-chain `validator-info` directory
 * (github.com/monad-developers/validator-info) to MRC-13 on-chain records.
 *
 * This is the bridge the MRC-13 draft does not specify but every operator needs:
 * it turns today's Discord-gated JSON directory (one `<secp>.json` per validator)
 * into ready-to-submit `setMetadata` calldata, so the existing ecosystem data
 * carries over instead of starting from an empty registry.
 *
 * Each validator submits only their OWN call (authorized by their own staking
 * key); this tool just prepares the calldata.
 */

/** Shape of a validator-info entry. */
export interface ValidatorInfoEntry {
  id: number;
  name?: string;
  secp?: string;
  bls?: string;
  website?: string;
  description?: string;
  logo?: string;
  x?: string;
}

export interface MigrationCall {
  validatorId: number;
  name: string;
  /** ABI-encoded calldata for setMetadata(validatorId, metadata). */
  calldata: `0x${string}`;
  metadata: Metadata;
}

/** Map one validator-info entry to an MRC-13 metadata record. */
export function entryToMetadata(entry: ValidatorInfoEntry): Metadata {
  const socials: Record<string, string> = {};
  if (entry.x) socials.x = entry.x;
  return {
    name: entry.name ?? "",
    website: entry.website ?? "",
    description: entry.description ?? "",
    logo: entry.logo ?? "",
    socials: Object.keys(socials).length ? JSON.stringify(socials) : "",
    additionalInfo: "",
  };
}

/** Build the setMetadata calldata for a single entry. */
export function buildCall(entry: ValidatorInfoEntry): MigrationCall {
  const metadata = entry.id !== undefined ? entryToMetadata(entry) : EMPTY_METADATA;
  const calldata = encodeFunctionData({
    abi: registryAbi,
    functionName: "setMetadata",
    args: [
      BigInt(entry.id),
      {
        name: metadata.name,
        website: metadata.website,
        description: metadata.description,
        logo: metadata.logo,
        socials: metadata.socials,
        additionalInfo: metadata.additionalInfo,
      },
    ],
  });
  return { validatorId: entry.id, name: metadata.name, calldata, metadata };
}

/** Read a validator-info directory (testnet/ or mainnet/) and build all calls. */
export function buildMigration(dir: string): MigrationCall[] {
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  const calls: MigrationCall[] = [];
  for (const f of files) {
    try {
      const entry = JSON.parse(readFileSync(join(dir, f), "utf8")) as ValidatorInfoEntry;
      if (typeof entry.id !== "number") continue;
      calls.push(buildCall(entry));
    } catch {
      // skip malformed files; the upstream repo's own validator runs on PRs
    }
  }
  calls.sort((a, b) => a.validatorId - b.validatorId);
  return calls;
}
