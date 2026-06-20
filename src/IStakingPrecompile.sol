// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Just the parts of the Monad staking precompile this registry needs.
// Precompile lives at 0x0000000000000000000000000000000000001000.
// Full reference: https://docs.monad.xyz/developer-essentials/staking/staking-precompile
interface IStakingPrecompile {
    // First return value (authAddress) is the account with authority over the
    // validator's stake. That's the identity we check before allowing a write.
    function getValidator(uint64 validatorId)
        external
        returns (
            address authAddress,
            uint64 flags,
            uint256 stake,
            uint256 accRewardPerToken,
            uint256 commission,
            uint256 unclaimedRewards,
            uint256 consensusStake,
            uint256 consensusCommission,
            uint256 snapshotStake,
            uint256 snapshotCommission,
            bytes memory secpPubkey,
            bytes memory blsPubkey
        );

    function getConsensusValidatorSet(uint32 startIndex)
        external
        returns (bool isDone, uint32 nextIndex, uint64[] memory valIds);
}
