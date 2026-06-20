import { defineChain } from "viem";

export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: ["https://testnet-rpc.monad.xyz"] } },
});

export const monadMainnet = defineChain({
  id: 143,
  name: "Monad",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.monad.xyz"] } },
});

// Canonical registry address per chainId, filled in after deployment. Note the
// trust root is the validator's authority address (checked on-chain), not this
// address, so a different honest deployment gives the same guarantee.
export const CANONICAL_REGISTRY: Record<number, `0x${string}` | undefined> = {
  10143: undefined,
  143: undefined,
};
