// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ValidatorMetadataRegistry} from "../src/ValidatorMetadataRegistry.sol";
import {IValidatorMetadata} from "../src/IValidatorMetadata.sol";
import {MockStakingPrecompile} from "./mocks/MockStakingPrecompile.sol";

contract ValidatorMetadataRegistryTest is Test {
    ValidatorMetadataRegistry registry;
    MockStakingPrecompile staking;

    uint64 constant VAL = 267;
    address authority = makeAddr("authority");
    address stranger = makeAddr("stranger");
    address delegate = makeAddr("delegate");

    event MetadataUpdated(uint64 indexed validatorId, address indexed writer, string field);
    event WriterAuthorized(uint64 indexed validatorId, address indexed writer, bool authorized);

    function setUp() public {
        staking = new MockStakingPrecompile();
        registry = new ValidatorMetadataRegistry(staking);
        staking.setAuthority(VAL, authority);
    }

    function _sample() internal pure returns (IValidatorMetadata.Metadata memory) {
        return IValidatorMetadata.Metadata({
            name: "shadowoftime",
            website: "https://shadowoftime.dev",
            description: "Independent Monad validator.",
            logo: "https://github.com/ShadowOfTime1.png",
            socials: '{"x":"https://x.com/RomanKarpenk"}',
            additionalInfo: '{"provider":"OVH","region":"AU"}'
        });
    }

    // --- writes by authority -------------------------------------------------

    function test_AuthorityCanSetMetadata() public {
        vm.expectEmit(true, true, false, true);
        emit MetadataUpdated(VAL, authority, "*");
        vm.prank(authority);
        registry.setMetadata(VAL, _sample());

        assertTrue(registry.hasMetadata(VAL));
        assertEq(registry.getName(VAL), "shadowoftime");
        IValidatorMetadata.Metadata memory m = registry.getMetadata(VAL);
        assertEq(m.website, "https://shadowoftime.dev");
        assertEq(m.additionalInfo, '{"provider":"OVH","region":"AU"}');
    }

    function test_StrangerCannotSetMetadata() public {
        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(ValidatorMetadataRegistry.NotAuthorized.selector, VAL, stranger)
        );
        registry.setMetadata(VAL, _sample());
    }

    function test_UnknownValidatorReverts() public {
        uint64 ghost = 9999;
        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(ValidatorMetadataRegistry.UnknownValidator.selector, ghost)
        );
        registry.setMetadata(ghost, _sample());
    }

    // --- field updates -------------------------------------------------------

    function test_UpdateEachField() public {
        vm.startPrank(authority);
        registry.updateMetadataField(VAL, "name", "newname");
        registry.updateMetadataField(VAL, "website", "https://new.example");
        registry.updateMetadataField(VAL, "description", "desc2");
        registry.updateMetadataField(VAL, "logo", "https://logo");
        registry.updateMetadataField(VAL, "socials", '{"telegram":"@x"}');
        registry.updateMetadataField(VAL, "additionalInfo", '{"asn":"16276"}');
        vm.stopPrank();

        IValidatorMetadata.Metadata memory m = registry.getMetadata(VAL);
        assertEq(m.name, "newname");
        assertEq(m.website, "https://new.example");
        assertEq(m.description, "desc2");
        assertEq(m.logo, "https://logo");
        assertEq(m.socials, '{"telegram":"@x"}');
        assertEq(m.additionalInfo, '{"asn":"16276"}');
    }

    function test_UpdateUnknownFieldReverts() public {
        vm.prank(authority);
        vm.expectRevert(
            abi.encodeWithSelector(ValidatorMetadataRegistry.UnknownField.selector, "bogus")
        );
        registry.updateMetadataField(VAL, "bogus", "x");
    }

    function test_UpdateFieldByStrangerReverts() public {
        vm.prank(stranger);
        vm.expectRevert();
        registry.updateMetadataField(VAL, "name", "x");
    }

    // --- delegation ----------------------------------------------------------

    function test_AuthorityCanDelegateWrite() public {
        vm.expectEmit(true, true, false, true);
        emit WriterAuthorized(VAL, delegate, true);
        vm.prank(authority);
        registry.setWriter(VAL, delegate, true);
        assertTrue(registry.isWriter(VAL, delegate));

        vm.prank(delegate);
        registry.updateMetadataField(VAL, "name", "by-delegate");
        assertEq(registry.getName(VAL), "by-delegate");
    }

    function test_RevokedDelegateCannotWrite() public {
        vm.startPrank(authority);
        registry.setWriter(VAL, delegate, true);
        registry.setWriter(VAL, delegate, false);
        vm.stopPrank();

        vm.prank(delegate);
        vm.expectRevert();
        registry.updateMetadataField(VAL, "name", "x");
    }

    function test_StrangerCannotDelegate() public {
        vm.prank(stranger);
        vm.expectRevert();
        registry.setWriter(VAL, delegate, true);
    }

    // --- reads default -------------------------------------------------------

    function test_UnsetValidatorReadsEmpty() public view {
        assertFalse(registry.hasMetadata(VAL));
        assertEq(registry.getName(VAL), "");
        IValidatorMetadata.Metadata memory m = registry.getMetadata(VAL);
        assertEq(bytes(m.website).length, 0);
    }

    function test_VersionString() public view {
        assertEq(registry.VERSION(), "MRC-13-ref/1.0.0");
    }
}
