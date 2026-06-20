// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ValidatorMetadataRegistry} from "../src/ValidatorMetadataRegistry.sol";
import {IStakingPrecompile} from "../src/IStakingPrecompile.sol";

/// @notice Deploys the registry pointed at the real Monad staking precompile.
/// @dev Usage:
///   forge script script/Deploy.s.sol --rpc-url <monad-rpc> --broadcast \
///       --private-key <key>
contract Deploy is Script {
    address constant STAKING_PRECOMPILE = 0x0000000000000000000000000000000000001000;

    function run() external returns (ValidatorMetadataRegistry registry) {
        vm.startBroadcast();
        registry = new ValidatorMetadataRegistry(IStakingPrecompile(STAKING_PRECOMPILE));
        vm.stopBroadcast();
        console.log("ValidatorMetadataRegistry deployed at:", address(registry));
    }
}
