// Staking precompile (0x...1000), only the reads the resolver needs.
export const stakingPrecompileAbi = [
  {
    type: "function",
    name: "getValidator",
    stateMutability: "nonpayable",
    inputs: [{ name: "validatorId", type: "uint64" }],
    outputs: [
      { name: "authAddress", type: "address" },
      { name: "flags", type: "uint64" },
      { name: "stake", type: "uint256" },
      { name: "accRewardPerToken", type: "uint256" },
      { name: "commission", type: "uint256" },
      { name: "unclaimedRewards", type: "uint256" },
      { name: "consensusStake", type: "uint256" },
      { name: "consensusCommission", type: "uint256" },
      { name: "snapshotStake", type: "uint256" },
      { name: "snapshotCommission", type: "uint256" },
      { name: "secpPubkey", type: "bytes" },
      { name: "blsPubkey", type: "bytes" },
    ],
  },
  {
    type: "function",
    name: "getConsensusValidatorSet",
    stateMutability: "nonpayable",
    inputs: [{ name: "startIndex", type: "uint32" }],
    outputs: [
      { name: "isDone", type: "bool" },
      { name: "nextIndex", type: "uint32" },
      { name: "valIds", type: "uint64[]" },
    ],
  },
] as const;

export const STAKING_PRECOMPILE = "0x0000000000000000000000000000000000001000" as const;
