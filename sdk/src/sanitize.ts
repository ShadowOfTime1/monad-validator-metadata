import type { Metadata } from "./types.js";

/**
 * Consumer-side sanitization for untrusted on-chain metadata.
 *
 * The registry stores raw bytes and makes no display guarantees (see MRC-13
 * topic 497, "phishing-vector guidance" raised by the community). Anything an
 * arbitrary validator can write is attacker-controlled: a name with zero-width
 * characters that impersonates another validator, a `logo` pointing at a
 * `javascript:` URL, a `website` that is actually a wallet drainer. This module
 * is what a wallet/explorer/dashboard should run before rendering a record.
 *
 * It does not mutate trust — it flags risk and returns a display-safe copy.
 */

const MAX = { name: 64, website: 256, description: 512, logo: 256, socials: 4096, additionalInfo: 8192 } as const;

/** C0 (0x00–0x1F) and C1 (0x7F–0x9F) control characters. */
function isControl(cp: number): boolean {
  return (cp >= 0x00 && cp <= 0x1f) || (cp >= 0x7f && cp <= 0x9f);
}

/** Zero-width and bidirectional-override characters used to spoof/hide text. */
function isInvisible(cp: number): boolean {
  return (
    (cp >= 0x200b && cp <= 0x200f) || // zero-width + LRM/RLM
    (cp >= 0x202a && cp <= 0x202e) || // bidi embeddings/overrides
    (cp >= 0x2060 && cp <= 0x206f) || // word joiner & invisible operators
    cp === 0xfeff // zero-width no-break space / BOM
  );
}

export interface SanitizeResult {
  value: Metadata;
  warnings: string[];
}

function safeUrl(url: string, field: string, warnings: string[]): string {
  if (url === "") return "";
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    warnings.push(`${field}: not a valid URL`);
    return "";
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    warnings.push(`${field}: blocked non-http(s) scheme "${parsed.protocol}"`);
    return "";
  }
  return parsed.toString();
}

function cleanText(s: string, field: keyof typeof MAX, warnings: string[]): string {
  let strippedInvisible = false;
  let strippedControl = false;
  let out = "";
  for (const ch of s) {
    const cp = ch.codePointAt(0)!;
    if (isInvisible(cp)) {
      strippedInvisible = true;
      continue;
    }
    if (isControl(cp)) {
      strippedControl = true;
      continue;
    }
    out += ch;
  }
  if (strippedInvisible) warnings.push(`${field}: contained invisible/bidi characters (possible spoofing)`);
  if (strippedControl) warnings.push(`${field}: contained control characters`);

  const max = MAX[field];
  if (out.length > max) {
    warnings.push(`${field}: truncated from ${out.length} to ${max} chars`);
    out = out.slice(0, max);
  }
  return out.trim();
}

function checkJson(s: string, field: string, warnings: string[]): void {
  if (s === "") return;
  try {
    JSON.parse(s);
  } catch {
    warnings.push(`${field}: not valid JSON`);
  }
}

/** Produce a display-safe copy of a metadata record plus any risk warnings. */
export function sanitizeMetadata(raw: Metadata): SanitizeResult {
  const warnings: string[] = [];
  const value: Metadata = {
    name: cleanText(raw.name, "name", warnings),
    website: safeUrl(cleanText(raw.website, "website", warnings), "website", warnings),
    description: cleanText(raw.description, "description", warnings),
    logo: safeUrl(cleanText(raw.logo, "logo", warnings), "logo", warnings),
    socials: cleanText(raw.socials, "socials", warnings),
    additionalInfo: cleanText(raw.additionalInfo, "additionalInfo", warnings),
  };
  checkJson(value.socials, "socials", warnings);
  checkJson(value.additionalInfo, "additionalInfo", warnings);
  return { value, warnings };
}
