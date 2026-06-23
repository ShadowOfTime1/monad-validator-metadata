// Optional observed-source layer for MRC-13: cross-check the objective fields a
// validator DECLARES in additionalInfo.infrastructure (provider/asn/region) against
// what the network actually shows. Additive and fully off-chain: the contract and
// MetadataResolver are untouched; the registry stays the declared record, and an
// observed source is a separate, optional input.
//
// The active set is fluid (validators rotate in/out, MIP-9 grows it over time), and
// infrastructure is sticky, so observations are keyed by the stable validatorId and a
// source persists them across rotation: a rotated-out validator keeps its last value
// with a confidence that decays by staleness rather than flipping to "unverified".
//
// provider/asn/region are vantage-invariant IP-derived facts: asn is the deterministic
// anchor, provider is human context, region is coarse IP-geo. Several sources can sit
// side by side and cross-confirm (each carries a `source` label).
import type { ResolvedValidator } from "./types.js";
import type { MetadataResolver } from "./resolver.js";

export interface ObservedInfra {
  validatorId: number;
  provider: string | null;
  asn: number | null;
  region: string | null;
  active: boolean;            // in the consensus set this epoch
  lastObservedEpoch: number;
  staleEpochs: number;        // 0 = observed this epoch
  confidence: number;         // 0..1, typically decayed by staleEpochs at the source
  source: string;             // e.g. "proofline", "monadpulse"
  observedAt: string;         // ISO-8601
}

// A vantage that reports observed infrastructure. ProofLine and others implement this;
// `getAll` returns the active set plus recently-rotated-out validators, with freshness.
export interface ObservedSource {
  readonly id: string;
  readonly coverage: "active-set" | "partial";
  get(validatorId: number): Promise<ObservedInfra | null>;
  getAll(): Promise<ObservedInfra[]>;
}

export type FieldStatus = "verified" | "disputed" | "unverified";

export interface FieldVerdict {
  declared: string | number | null;
  observed: string | number | null;
  status: FieldStatus;
  sources: string[];          // sources that contributed an observation for this field
  agreement: number;          // fraction of sources agreeing on the modal observed value
  confidence: number;         // mean confidence of the observations on the modal value
}

export interface InfraCrossCheck {
  validatorId: number;
  provider: FieldVerdict;
  asn: FieldVerdict;
  region: FieldVerdict;
}

export interface VerifiedValidator extends ResolvedValidator {
  infra?: InfraCrossCheck;    // present only when an ObservedSource is supplied
}

interface DeclaredInfra {
  provider: string | null;
  asn: number | null;
  region: string | null;
}

// additionalInfo is a JSON-by-convention string; read the reserved `infrastructure`
// object loosely (missing/garbage -> nulls, never throws).
export function parseDeclaredInfra(additionalInfo: string): DeclaredInfra {
  const empty: DeclaredInfra = { provider: null, asn: null, region: null };
  let infra: unknown;
  try {
    const root = JSON.parse(additionalInfo || "{}");
    infra = root && typeof root === "object" ? (root as Record<string, unknown>).infrastructure : undefined;
  } catch {
    return empty;
  }
  if (!infra || typeof infra !== "object") return empty;
  const o = infra as Record<string, unknown>;
  const asn =
    typeof o.asn === "number" ? o.asn
    : typeof o.asn === "string" && /^(AS)?\d+$/i.test(o.asn.trim()) ? Number(o.asn.trim().replace(/^AS/i, ""))
    : null;
  return {
    provider: typeof o.provider === "string" && o.provider.trim() ? o.provider.trim() : null,
    asn,
    region: typeof o.region === "string" && o.region.trim() ? o.region.trim() : null,
  };
}

// Normalize a provider name for comparison: lowercase, drop punctuation and common
// corporate suffixes, collapse whitespace. "Limestone Networks, Inc." and "Limestone
// Networks" both -> "limestone networks"; "OVH SAS" and "ovh" both -> "ovh".
function normProvider(s: string): string {
  return s
    .toLowerCase()
    .replace(/[.,]/g, " ")
    .replace(/\b(inc|llc|ltd|gmbh|sas|bv|srl|oy|ab|corp|co|company|plc)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function eqProvider(a: string, b: string): boolean {
  return normProvider(a) === normProvider(b);
}

function eqRegion(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

type Obs<T> = { value: T; source: string; confidence: number };

function collect<T>(observations: ObservedInfra[], pick: (o: ObservedInfra) => T | null): Obs<T>[] {
  const out: Obs<T>[] = [];
  for (const o of observations) {
    const v = pick(o);
    if (v !== null && v !== undefined && !(typeof v === "string" && v.trim() === "")) {
      out.push({ value: v, source: o.source, confidence: o.confidence });
    }
  }
  return out;
}

// The most common observed value (by `eq`), the fraction of observations agreeing with
// it, and the mean confidence of that agreeing group.
function modal<T>(obs: Obs<T>[], eq: (a: T, b: T) => boolean): { value: T; agreement: number; confidence: number } {
  const groups: Obs<T>[][] = [];
  for (const o of obs) {
    const g = groups.find((grp) => eq(grp[0].value, o.value));
    if (g) g.push(o);
    else groups.push([o]);
  }
  groups.sort((a, b) => b.length - a.length);
  const top = groups[0];
  const confidence = top.reduce((s, o) => s + o.confidence, 0) / top.length;
  return { value: top[0].value, agreement: top.length / obs.length, confidence };
}

function verdictFor<T extends string | number>(
  declared: T | null,
  observations: ObservedInfra[],
  pick: (o: ObservedInfra) => T | null,
  eq: (a: T, b: T) => boolean,
): FieldVerdict {
  const obs = collect(observations, pick);
  const sources = [...new Set(obs.map((o) => o.source))];
  if (obs.length === 0) {
    return { declared, observed: null, status: "unverified", sources: [], agreement: 0, confidence: 0 };
  }
  const m = modal(obs, eq);
  if (declared === null) {
    // Nothing declared to check; expose what we observed but leave it unverified.
    return { declared: null, observed: m.value, status: "unverified", sources, agreement: m.agreement, confidence: m.confidence };
  }
  const status: FieldStatus = eq(declared, m.value) ? "verified" : "disputed";
  return { declared, observed: m.value, status, sources, agreement: m.agreement, confidence: m.confidence };
}

// Pure: a declared record cross-checked against 0..N observations. Staleness lives in
// each ObservedInfra.confidence (decayed at the source), so it lowers a field's
// confidence without changing its status; a consumer can treat anything below a
// confidence threshold as effectively unverified.
export function crossCheckInfra(resolved: ResolvedValidator, observations: ObservedInfra[]): InfraCrossCheck {
  const declared = parseDeclaredInfra(resolved.metadata.additionalInfo);
  return {
    validatorId: resolved.validatorId,
    provider: verdictFor(declared.provider, observations, (o) => o.provider, eqProvider),
    asn: verdictFor(declared.asn, observations, (o) => o.asn, (a, b) => a === b),
    region: verdictFor(declared.region, observations, (o) => o.region, eqRegion),
  };
}

// Fan out across several observed sources and cross-check. Each source's value carries
// its own `source` label, so they cross-confirm rather than any single map being trusted.
export class ObservedRegistry {
  constructor(private readonly sources: ObservedSource[]) {}

  async observe(validatorId: number): Promise<ObservedInfra[]> {
    const results = await Promise.all(this.sources.map((s) => s.get(validatorId).catch(() => null)));
    return results.filter((r): r is ObservedInfra => r !== null);
  }

  async verify(resolver: MetadataResolver, validatorId: number): Promise<VerifiedValidator> {
    const [resolved, observations] = await Promise.all([resolver.resolve(validatorId), this.observe(validatorId)]);
    return { ...resolved, infra: crossCheckInfra(resolved, observations) };
  }
}
