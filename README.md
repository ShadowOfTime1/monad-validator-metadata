# monad-validator-metadata

A reference implementation of **MRC-13 — Validator Metadata Registry**
([Đorđe Mijović, Monad forum topic 497](https://forum.monad.xyz/t/validator-metadata-registry/497),
draft 2026-06-15): an on-chain, self-sovereign registry for human-readable Monad
validator metadata.

The staking precompile exposes only consensus data — validator ids, authority
addresses, stake, commission. It deliberately carries no names, logos, or links.
Today that gap is filled by the off-chain
[`validator-info`](https://github.com/monad-developers/validator-info) repository:
a PR + Discord-gated JSON directory. It works, but it concentrates labeling power
in whoever curates the list, and every wallet, explorer, and dashboard re-solves
identity on its own.

MRC-13 proposes moving that metadata on-chain, written by each validator's own
staking authority. This repo is a working implementation of that proposal —
contract, SDK, migration, and indexer — built so the draft can be evaluated
against running code instead of prose.

> I run a Monad validator and the [MonadPulse](https://monadpulse.xyz) analytics
> stack, and I commented in support of MRC-13 on the forum. This is my
> independent reference implementation of someone else's proposal, offered as a
> public good — not a competing standard. Feedback and corrections welcome.

## What's here

| Component | Path | What it does |
|---|---|---|
| Registry contract | [`src/ValidatorMetadataRegistry.sol`](src/ValidatorMetadataRegistry.sol) | Implements the `IValidatorMetadata` interface; authorizes writes against the staking precompile |
| Interfaces | [`src/IValidatorMetadata.sol`](src/IValidatorMetadata.sol), [`src/IStakingPrecompile.sol`](src/IStakingPrecompile.sol) | The MRC-13 interface and the minimal staking-precompile surface used |
| Resolver SDK | [`sdk/`](sdk/) | TypeScript/viem reader: `resolve()`, set enumeration, anti-phishing sanitization |
| Migration | [`sdk/src/migrate.ts`](sdk/src/migrate.ts) | Converts the existing `validator-info` directory into `setMetadata` calldata |
| Indexer | [`sdk/src/indexer.ts`](sdk/src/indexer.ts) | Rebuilds a resolved validator directory from on-chain events |

## Authorization model

A write to validator `id` is allowed only if `msg.sender` is the **authority
address** that the staking precompile
(`0x0000000000000000000000000000000000001000`) reports for that validator — the
same staking-keyed identity proof already used on-chain by the
`monad-version-agent` / VersionRegistry pattern, applied here to metadata instead
of version. The authority can additionally delegate write access to another key
(multisig, governance contract, hot ops key) via `setWriter`, so routine metadata
updates never require touching the staking key.

## Resolving the open questions from topic 497

The forum thread surfaced three open questions; this implementation takes a
concrete position on each:

- **Discovery / address fragmentation** — the SDK publishes one canonical
  registry address per chain. But the root of trust is the *authority address*
  the contract verifies, not the registry address, so any honest deployment is
  interchangeable. A resolver pins trust to the authority, not the location.
- **Conflict resolution between registries** — resolved by the above: identical
  authority checks across deployments yield identical guarantees, so there is no
  "canonical registry" to fight over.
- **Phishing** — the contract stores raw bytes and makes no display promises.
  The SDK ships a `sanitizeMetadata()` that strips zero-width/bidi spoofing
  characters and control codes, blocks non-`http(s)` URL schemes, and flags
  invalid JSON — what a wallet/explorer should run before rendering a record.

## Build & test

```bash
# Contract
forge test            # 11 tests, against a mock staking precompile

# SDK
cd sdk && npm install && npm test   # 7 tests (migration + sanitization)
```

## Migrating the existing directory

Run against a local checkout of `validator-info`:

```bash
cd sdk
npm run mrc13 -- migrate --dir ../../validator-info/testnet --out testnet-calls.json
```

This produces ready-to-submit `setMetadata` calldata for all **271 testnet** and
**220 mainnet** entries currently in the directory. Each validator submits only
their own call, authorized by their own staking key.

## Deploy

```bash
forge script script/Deploy.s.sol --rpc-url <monad-rpc> --broadcast --private-key <key>
```

The constructor takes the staking precompile address; `Deploy.s.sol` wires the
canonical `0x…1000`. After deployment, set the address in
[`sdk/src/chains.ts`](sdk/src/chains.ts) `CANONICAL_REGISTRY`.

## Status

Reference implementation of a **draft** RFC. The interface tracks MRC-13 topic
497 as of 2026-06-15; if the proposal evolves, this follows it. Not yet deployed
to a public network.

## License

MIT
