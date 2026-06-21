# monad-validator-metadata

A reference implementation of MRC-13, the Validator Metadata Registry proposed by
Đorđe Mijović on the Monad forum
([topic 497](https://forum.monad.xyz/t/validator-metadata-registry/497), draft
2026-06-16). It's an on-chain place for human-readable validator metadata that
each validator writes for itself.

The staking precompile only carries consensus data: validator ids, authority
addresses, stake, commission. It has no names, logos, or links. Today that gap is
filled by the off-chain
[validator-info](https://github.com/monad-developers/validator-info) repo, a
PR-and-Discord-gated JSON directory. It works, but it puts the labeling in
whoever curates the list, and every wallet, explorer, and dashboard re-solves
identity on its own. MRC-13 moves the metadata on-chain, written by each
validator's own staking authority.

This repo implements that proposal, contract plus tooling, so the draft can be
judged against running code instead of prose. I run a Monad validator and the
[MonadPulse](https://monadpulse.xyz) analytics stack and commented in support of
MRC-13 on the forum; this is my own implementation of someone else's proposal,
not a competing standard. Corrections welcome.

## Layout

- `src/ValidatorMetadataRegistry.sol`: the registry, authorizing writes via the staking precompile
- `src/IValidatorMetadata.sol`, `src/IStakingPrecompile.sol`: the MRC-13 interface and the precompile surface used
- `sdk/`: TypeScript/viem reader, validator-info migration, and an events indexer

## Authorization

A write to validator N is allowed only if `msg.sender` is the authority address
the staking precompile (`0x...1000`) reports for N. That's the same staking-keyed
check the monad-version-agent / VersionRegistry already use on-chain, here applied
to metadata. The authority can also delegate write access to another key (multisig,
governance, an ops key) with `setWriter`, so routine updates don't touch the
staking key.

## The open questions from topic 497

The forum thread raised three; this implementation takes a position on each.

- Discovery and address fragmentation: the SDK publishes one canonical registry
  address per chain, but the trust root is the authority address the contract
  verifies, not the registry address. A resolver pins trust to the authority, so
  any honest deployment is interchangeable.
- Conflicting registries: the above settles it. The same authority check
  everywhere yields the same guarantee, so there's no canonical registry to fight
  over.
- Phishing: the contract stores raw bytes and promises nothing about display. The
  SDK has `sanitizeMetadata()`, which strips zero-width and bidi spoofing
  characters, blocks non-http(s) URLs, and flags invalid JSON. A wallet or
  explorer should run it before rendering.

## Build and test

```bash
git clone --recurse-submodules https://github.com/ShadowOfTime1/monad-validator-metadata
cd monad-validator-metadata

forge test                          # 11 contract tests against a mock precompile
cd sdk && npm install && npm test   # 7 SDK tests
```

## Migrating the existing directory

Against a local checkout of validator-info:

```bash
cd sdk
npm run mrc13 -- migrate --dir ../../validator-info/testnet --out testnet-calls.json
```

This produces setMetadata calldata for every entry currently in the directory
(271 on testnet, 220 on mainnet). Each validator submits only their own call,
signed by their own staking key.

## Deploy

```bash
forge script script/Deploy.s.sol --rpc-url <monad-rpc> --broadcast --private-key <key>
```

The constructor takes the staking precompile address; `Deploy.s.sol` wires
`0x...1000`. After deploying, set the address in `sdk/src/chains.ts`.

## Status

Implementation of a draft RFC. The interface tracks topic 497 as of 2026-06-16
and will follow it if the proposal changes.

Deployed on Monad testnet (chainId 10143) at
`0x3f084CAF88F8894f6c83cf40b9cA7e792D9F221B`. Validator 267 (shadowoftime) has a
live record there, written by its own staking authority, as a working example.

## License

MIT
