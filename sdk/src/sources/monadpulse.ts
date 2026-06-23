// MonadPulse observed source: provider/asn/region derived from operator-signed gossip
// peer IPs (observed only; declared overrides excluded, the IP itself not published),
// persisted across rotation. Second independent vantage alongside ProofLine, so the two
// cross-confirm rather than trusting one map. Feed is already in the ObservedInfra shape.
//
// Feeds: https://monadpulse.xyz/observed/observed_testnet.json (mainnet: observed_mainnet.json)
//   { schema, currentEpoch, count, ..., validators: ObservedInfra[] }
import type { ObservedSource, ObservedInfra } from "../observed.js";

const DEFAULT_URL = "https://monadpulse.xyz/observed/observed_testnet.json";

interface MonadPulseFeed {
  validators: ObservedInfra[];
}

export interface MonadPulseSourceOptions {
  url?: string;
  // ms to cache the feed in-process; the feed itself refreshes hourly.
  cacheTtlMs?: number;
  fetchImpl?: typeof fetch;
}

export class MonadPulseSource implements ObservedSource {
  readonly id = "monadpulse";
  readonly coverage = "active-set" as const;

  private readonly url: string;
  private readonly cacheTtlMs: number;
  private readonly fetchImpl: typeof fetch;
  private cache: { at: number; data: ObservedInfra[] } | null = null;

  constructor(opts: MonadPulseSourceOptions = {}) {
    this.url = opts.url ?? DEFAULT_URL;
    this.cacheTtlMs = opts.cacheTtlMs ?? 60_000;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  async getAll(): Promise<ObservedInfra[]> {
    const now = Date.now();
    if (this.cache && now - this.cache.at < this.cacheTtlMs) return this.cache.data;
    const res = await this.fetchImpl(this.url);
    if (!res.ok) throw new Error(`MonadPulse feed ${res.status} from ${this.url}`);
    const feed = (await res.json()) as MonadPulseFeed;
    const data = Array.isArray(feed.validators) ? feed.validators : [];
    this.cache = { at: now, data };
    return data;
  }

  async get(validatorId: number): Promise<ObservedInfra | null> {
    const all = await this.getAll();
    return all.find((v) => v.validatorId === validatorId) ?? null;
  }
}
