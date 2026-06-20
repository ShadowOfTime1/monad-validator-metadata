import {
  createPublicClient,
  http,
  encodeFunctionData,
  decodeFunctionResult,
  type PublicClient,
  type Transport,
} from "viem";
import { registryAbi } from "./abi.registry.js";
import { stakingPrecompileAbi, STAKING_PRECOMPILE } from "./abi.staking.js";
import { sanitizeMetadata } from "./sanitize.js";
import { EMPTY_METADATA, type Metadata, type ResolvedValidator } from "./types.js";

export interface ResolverConfig {
  rpcUrl: string;
  registryAddress?: `0x${string}`;
}

// Read side of MRC-13. A record's trust root is the validator's authority
// address (the contract verifies it on every write), not the registry address,
// so resolve() returns both and a consumer can pin trust to the authority.
export class MetadataResolver {
  private client: PublicClient;
  readonly registryAddress: `0x${string}`;

  constructor(cfg: ResolverConfig) {
    this.client = createPublicClient({ transport: http(cfg.rpcUrl) as Transport });
    if (!cfg.registryAddress) {
      throw new Error("registryAddress is required (no canonical deployment configured yet for this chain).");
    }
    this.registryAddress = cfg.registryAddress;
  }

  async getMetadata(validatorId: number | bigint): Promise<Metadata> {
    const res = (await this.client.readContract({
      address: this.registryAddress,
      abi: registryAbi,
      functionName: "getMetadata",
      args: [BigInt(validatorId)],
    })) as Metadata;
    return res ?? EMPTY_METADATA;
  }

  async hasMetadata(validatorId: number | bigint): Promise<boolean> {
    return (await this.client.readContract({
      address: this.registryAddress,
      abi: registryAbi,
      functionName: "hasMetadata",
      args: [BigInt(validatorId)],
    })) as boolean;
  }

  // getValidator is nonpayable, so call via eth_call and decode the first return.
  async authorityOf(validatorId: number | bigint): Promise<`0x${string}` | null> {
    const data = encodeFunctionData({
      abi: stakingPrecompileAbi,
      functionName: "getValidator",
      args: [BigInt(validatorId)],
    });
    try {
      const { data: ret } = await this.client.call({ to: STAKING_PRECOMPILE, data });
      if (!ret) return null;
      const decoded = decodeFunctionResult({
        abi: stakingPrecompileAbi,
        functionName: "getValidator",
        data: ret,
      }) as readonly unknown[];
      const auth = decoded[0] as `0x${string}`;
      return auth === "0x0000000000000000000000000000000000000000" ? null : auth;
    } catch {
      return null;
    }
  }

  async resolve(validatorId: number | bigint): Promise<ResolvedValidator> {
    const [raw, has, authority] = await Promise.all([
      this.getMetadata(validatorId),
      this.hasMetadata(validatorId),
      this.authorityOf(validatorId),
    ]);
    const { value, warnings } = sanitizeMetadata(raw);
    return { validatorId: Number(validatorId), authority, metadata: value, hasMetadata: has, warnings };
  }

  async listValidatorIds(): Promise<number[]> {
    const ids: number[] = [];
    let start = 0;
    for (let guard = 0; guard < 10_000; guard++) {
      const data = encodeFunctionData({
        abi: stakingPrecompileAbi,
        functionName: "getConsensusValidatorSet",
        args: [start],
      });
      const { data: ret } = await this.client.call({ to: STAKING_PRECOMPILE, data });
      if (!ret) break;
      const [isDone, nextIndex, valIds] = decodeFunctionResult({
        abi: stakingPrecompileAbi,
        functionName: "getConsensusValidatorSet",
        data: ret,
      }) as [boolean, number, readonly bigint[]];
      for (const v of valIds) ids.push(Number(v));
      if (isDone || nextIndex <= start) break;
      start = nextIndex;
    }
    return ids;
  }

  async resolveAll(): Promise<ResolvedValidator[]> {
    const ids = await this.listValidatorIds();
    const out: ResolvedValidator[] = [];
    for (const id of ids) {
      const r = await this.resolve(id);
      if (r.hasMetadata) out.push(r);
    }
    return out;
  }
}
