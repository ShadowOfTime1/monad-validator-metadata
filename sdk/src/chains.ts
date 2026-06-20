import { defineChain } from "viem";

/** Monad testnet (chainId 10143). */
export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: ["https://testnet-rpc.monad.xyz"] } },
});

/** Monad mainnet (chainId 143). */
export const monadMainnet = defineChain({
  id: 143,
  name: "Monad",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.monad.xyz"] } },
});

/**
 * Canonical registry deployments, by chainId.
 *
 * DISCOVERY CONVENTION (resolving the open question in MRC-13 topic 497):
 * the registry address is published here, in the SDK, per chain — a single
 * canonical deployment rather than a free-for-all of addresses. But the root of
 * trust is NOT this address: it is the validator's staking *authority address*,
 * which the contract verifies on every write. A consumer that trusts a different
 * registry only needs the same authority check to get the same guarantee. Filled
 * in once deployed.
 */
export const CANONICAL_REGISTRY: Record<number, `0x${string}` | undefined> = {
  10143: undefined, // monad-testnet — set after deployment
  143: undefined, // monad-mainnet — set after deployment
};
