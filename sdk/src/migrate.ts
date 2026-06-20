import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { encodeFunctionData } from "viem";
import { registryAbi } from "./abi.registry.js";
import { EMPTY_METADATA, type Metadata } from "./types.js";

// Turn the existing off-chain validator-info directory
// (github.com/monad-developers/validator-info, one <secp>.json per validator)
// into setMetadata calldata, so existing data carries over instead of starting
// from an empty registry. Each validator submits their own call, signed by
// their own staking key; this just prepares the calldata.

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
  calldata: `0x${string}`;
  metadata: Metadata;
}

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

export function buildMigration(dir: string): MigrationCall[] {
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  const calls: MigrationCall[] = [];
  for (const f of files) {
    try {
      const entry = JSON.parse(readFileSync(join(dir, f), "utf8")) as ValidatorInfoEntry;
      if (typeof entry.id !== "number") continue;
      calls.push(buildCall(entry));
    } catch {
      // skip malformed files; the upstream repo validates entries on PR
    }
  }
  calls.sort((a, b) => a.validatorId - b.validatorId);
  return calls;
}
