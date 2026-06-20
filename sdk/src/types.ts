// The MRC-13 record as stored on-chain. socials/additionalInfo are JSON strings.
export interface Metadata {
  name: string;
  website: string;
  description: string;
  logo: string;
  socials: string;
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

export interface ResolvedValidator {
  validatorId: number;
  // Staking authority that controls this record (the trust root).
  authority: `0x${string}` | null;
  metadata: Metadata;
  hasMetadata: boolean;
  warnings: string[];
}
