#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { buildMigration } from "./migrate.js";
import { MetadataResolver } from "./resolver.js";
import { buildDirectory } from "./indexer.js";

function flag(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

async function main(): Promise<void> {
  const cmd = process.argv[2];

  if (cmd === "migrate") {
    const dir = flag("dir");
    const out = flag("out");
    if (!dir) throw new Error("usage: migrate --dir <validator-info/testnet> [--out calls.json]");
    const calls = buildMigration(dir);
    const payload = calls.map((c) => ({ validatorId: c.validatorId, name: c.name, calldata: c.calldata }));
    if (out) {
      writeFileSync(out, JSON.stringify(payload, null, 2));
      console.log(`Wrote ${calls.length} setMetadata calls to ${out}`);
    } else {
      console.log(JSON.stringify(payload, null, 2));
    }
    return;
  }

  if (cmd === "resolve") {
    const rpc = flag("rpc");
    const registry = flag("registry") as `0x${string}` | undefined;
    const id = flag("id");
    if (!rpc || !registry || !id) throw new Error("usage: resolve --rpc <url> --registry <addr> --id <validatorId>");
    const resolver = new MetadataResolver({ rpcUrl: rpc, registryAddress: registry });
    console.log(JSON.stringify(await resolver.resolve(Number(id)), null, 2));
    return;
  }

  if (cmd === "index") {
    const rpc = flag("rpc");
    const registry = flag("registry") as `0x${string}` | undefined;
    const from = flag("from");
    const out = flag("out");
    if (!rpc || !registry) throw new Error("usage: index --rpc <url> --registry <addr> [--from <block>] [--out dir.json]");
    const dir = await buildDirectory({
      rpcUrl: rpc,
      registryAddress: registry,
      fromBlock: from ? BigInt(from) : undefined,
    });
    const text = JSON.stringify(dir, null, 2);
    if (out) {
      writeFileSync(out, text);
      console.log(`Wrote directory of ${dir.count} validators to ${out}`);
    } else {
      console.log(text);
    }
    return;
  }

  console.log(`mrc13: MRC-13 validator metadata tooling

Commands:
  migrate --dir <validator-info/testnet> [--out calls.json]
      Convert a validator-info directory into setMetadata calldata.

  resolve --rpc <url> --registry <addr> --id <validatorId>
      Resolve one validator's metadata (authority + sanitized record).

  index --rpc <url> --registry <addr> [--from <block>] [--out dir.json]
      Build a resolved validator directory from on-chain events.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
