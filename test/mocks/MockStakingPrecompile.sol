// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IStakingPrecompile} from "../../src/IStakingPrecompile.sol";

// Test double for the staking precompile: set an authority per validator id
// and a validator set to enumerate.
contract MockStakingPrecompile is IStakingPrecompile {
    mapping(uint64 => address) public auth;
    uint64[] public set;

    function setAuthority(uint64 validatorId, address authAddress) external {
        auth[validatorId] = authAddress;
    }

    function setValidatorSet(uint64[] calldata ids) external {
        delete set;
        for (uint256 i = 0; i < ids.length; i++) set.push(ids[i]);
    }

    function getValidator(uint64 validatorId)
        external
        view
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
        )
    {
        authAddress = auth[validatorId];
        flags = 0;
        stake = 0;
        accRewardPerToken = 0;
        commission = 0;
        unclaimedRewards = 0;
        consensusStake = 0;
        consensusCommission = 0;
        snapshotStake = 0;
        snapshotCommission = 0;
        secpPubkey = "";
        blsPubkey = "";
    }

    function getConsensusValidatorSet(uint32 startIndex)
        external
        view
        returns (bool isDone, uint32 nextIndex, uint64[] memory valIds)
    {
        uint256 total = set.length;
        if (startIndex >= total) {
            return (true, uint32(total), new uint64[](0));
        }
        uint256 end = total;
        uint256 n = end - startIndex;
        valIds = new uint64[](n);
        for (uint256 i = 0; i < n; i++) valIds[i] = set[startIndex + i];
        return (true, uint32(end), valIds);
    }
}
