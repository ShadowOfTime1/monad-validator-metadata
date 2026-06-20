/** The MRC-13 metadata record, as stored on-chain. */
export interface Metadata {
  name: string;
  website: string;
  description: string;
  logo: string;
  /** JSON string, suggested object keyed by platform: {"x": "...", "telegram": "..."} */
  socials: string;
  /** Open-schema JSON string for forward-compatible extensions (e.g. infrastructure). */
  additionalInfo: string;
}

export const EMPTY_METADATA: Metadata = {
  name: "",
  website: "",
  description: "",
  logo: "",
  socials: "",
  additionalInfo: "",
};

/** A validator's metadata resolved from the registry, with provenance. */
export interface ResolvedValidator {
  validatorId: number;
  /** Staking authority address that controls this record (root of trust). */
  authority: `0x${string}` | null;
  metadata: Metadata;
  /** True if a record has ever been written on-chain. */
  hasMetadata: boolean;
  /** Non-fatal sanitization warnings from inspecting the record. */
  warnings: string[];
}
