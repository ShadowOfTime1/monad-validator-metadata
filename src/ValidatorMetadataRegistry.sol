// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IValidatorMetadata} from "./IValidatorMetadata.sol";
import {IStakingPrecompile} from "./IStakingPrecompile.sol";

// Reference implementation of MRC-13 (forum topic 497).
//
// On-chain registry of validator metadata. A validator writes its own record;
// the only thing allowed to write for validator N is the authority address the
// staking precompile reports for N (or a key that authority has delegated). No
// curated list, no Discord gate. Same staking-keyed identity check the
// monad-version-agent / VersionRegistry already use, just for metadata.
contract ValidatorMetadataRegistry is IValidatorMetadata {
    // Immutable so tests can pass a mock; mainnet/testnet pass 0x...1000.
    IStakingPrecompile public immutable staking;

    string public constant VERSION = "MRC-13-ref/1.0.0";

    mapping(uint64 => Metadata) private _metadata;
    mapping(uint64 => bool) private _exists;
    mapping(uint64 => mapping(address => bool)) private _delegates;

    error NotAuthorized(uint64 validatorId, address caller);
    error UnknownValidator(uint64 validatorId);
    error UnknownField(string field);

    constructor(IStakingPrecompile staking_) {
        staking = staking_;
    }

    // Not view: the precompile's getValidator is a state-touching call.
    function authorityOf(uint64 validatorId) public returns (address) {
        (address authAddress,,,,,,,,,,,) = staking.getValidator(validatorId);
        if (authAddress == address(0)) revert UnknownValidator(validatorId);
        return authAddress;
    }

    function _authorize(uint64 validatorId, address caller) private returns (bool) {
        if (_delegates[validatorId][caller]) return true;
        return caller == authorityOf(validatorId);
    }

    modifier onlyAuthorized(uint64 validatorId) {
        if (!_authorize(validatorId, msg.sender)) revert NotAuthorized(validatorId, msg.sender);
        _;
    }

    // Let the authority hand write access to another key (multisig, ops key,
    // governance) so updating metadata doesn't mean touching the staking key.
    // Only the authority itself can change this.
    function setWriter(uint64 validatorId, address writer, bool authorized) external {
        if (msg.sender != authorityOf(validatorId)) revert NotAuthorized(validatorId, msg.sender);
        _delegates[validatorId][writer] = authorized;
        emit WriterAuthorized(validatorId, writer, authorized);
    }

    function isWriter(uint64 validatorId, address writer) external view returns (bool) {
        return _delegates[validatorId][writer];
    }

    function setMetadata(uint64 validatorId, Metadata calldata data) external onlyAuthorized(validatorId) {
        _metadata[validatorId] = data;
        _exists[validatorId] = true;
        emit MetadataUpdated(validatorId, msg.sender, "*");
    }

    function updateMetadataField(uint64 validatorId, string calldata field, string calldata value)
        external
        onlyAuthorized(validatorId)
    {
        Metadata storage m = _metadata[validatorId];
        bytes32 key = keccak256(bytes(field));
        if (key == keccak256("name")) m.name = value;
        else if (key == keccak256("website")) m.website = value;
        else if (key == keccak256("description")) m.description = value;
        else if (key == keccak256("logo")) m.logo = value;
        else if (key == keccak256("socials")) m.socials = value;
        else if (key == keccak256("additionalInfo")) m.additionalInfo = value;
        else revert UnknownField(field);
        _exists[validatorId] = true;
        emit MetadataUpdated(validatorId, msg.sender, field);
    }

    function getMetadata(uint64 validatorId) external view returns (Metadata memory) {
        return _metadata[validatorId];
    }

    function getName(uint64 validatorId) external view returns (string memory) {
        return _metadata[validatorId].name;
    }

    function hasMetadata(uint64 validatorId) external view returns (bool) {
        return _exists[validatorId];
    }
}
