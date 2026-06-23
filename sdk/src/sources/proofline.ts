// ProofLine observed source: provider/asn/region for the active set derived from live
// gossip peer endpoints (IP -> ASN -> provider), persisted across rotation. The public
// feed is already in the ObservedInfra shape, so this is a thin fetch + cache.
//
// Feed: https://prooflines.org/monad/observed/observed.json
//   { schema, currentEpoch, activeSetSize, ..., validators: ObservedInfra[] }
import type { ObservedSource, ObservedInfra } from "../observed.js";

const DEFAULT_URL = "https://prooflines.org/monad/observed/observed.json";

interface ProofLineFeed {
  validators: ObservedInfra[];
}

export interface ProofLineSourceOptions {
  url?: string;
  // ms to cache the feed in-process; the feed itself refreshes per epoch.
  cacheTtlMs?: number;
  fetchImpl?: typeof fetch;
}

export class ProofLineSource implements ObservedSource {
  readonly id = "proofline";
  readonly coverage = "active-set" as const;

  private readonly url: string;
  private readonly cacheTtlMs: number;
  private readonly fetchImpl: typeof fetch;
  private cache: { at: number; data: ObservedInfra[] } | null = null;

  constructor(opts: ProofLineSourceOptions = {}) {
    this.url = opts.url ?? DEFAULT_URL;
    this.cacheTtlMs = opts.cacheTtlMs ?? 60_000;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  async getAll(): Promise<ObservedInfra[]> {
    const now = Date.now();
    if (this.cache && now - this.cache.at < this.cacheTtlMs) return this.cache.data;
    const res = await this.fetchImpl(this.url);
    if (!res.ok) throw new Error(`ProofLine feed ${res.status} from ${this.url}`);
    const feed = (await res.json()) as ProofLineFeed;
    const data = Array.isArray(feed.validators) ? feed.validators : [];
    this.cache = { at: now, data };
    return data;
  }

  async get(validatorId: number): Promise<ObservedInfra | null> {
    const all = await this.getAll();
    return all.find((v) => v.validatorId === validatorId) ?? null;
  }
}
