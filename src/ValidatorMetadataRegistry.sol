// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IValidatorMetadata} from "./IValidatorMetadata.sol";
import {IStakingPrecompile} from "./IStakingPrecompile.sol";

/// @title ValidatorMetadataRegistry — reference implementation of MRC-13.
/// @author ShadowOfTime1
/// @notice Self-sovereign, on-chain registry of human-readable validator
///         metadata. Writes are authorized against the validator's authority
///         address as reported by the Monad staking precompile, so no curated
///         off-chain list or Discord gate is required. This mirrors the
///         staking-keyed identity-proof pattern already used by the on-chain
///         VersionRegistry / monad-version-agent, applied here to metadata.
///
///         Implements MRC-13 (Đorđe Mijović, forum topic 497) and resolves the
///         open questions raised in that thread:
///           - authorization: msg.sender == staking authority (or a delegate it
///             explicitly authorizes — multisig/governance/ops key), so updating
///             metadata never requires touching the staking key;
///           - discovery: a single canonical deployment per chain (this contract),
///             with resolvers trusting the authority address, not the registry
///             address, as the root of trust;
///           - phishing: the contract stores raw bytes only and makes no display
///             promises; sanitization is a consumer responsibility (see SDK).
contract ValidatorMetadataRegistry is IValidatorMetadata {
    /// @notice The staking precompile used to resolve authority addresses.
    /// @dev Immutable so tests can inject a mock; production deploys pass
    ///      0x0000000000000000000000000000000000001000.
    IStakingPrecompile public immutable staking;

    /// @notice Human label for this implementation.
    string public constant VERSION = "MRC-13-ref/1.0.0";

    mapping(uint64 => Metadata) private _metadata;
    mapping(uint64 => bool) private _exists;
    /// @dev validatorId => writer => authorized. Authority is always implicitly authorized.
    mapping(uint64 => mapping(address => bool)) private _delegates;

    error NotAuthorized(uint64 validatorId, address caller);
    error UnknownValidator(uint64 validatorId);
    error UnknownField(string field);

    constructor(IStakingPrecompile staking_) {
        staking = staking_;
    }

    // ---------------------------------------------------------------------
    // Authorization
    // ---------------------------------------------------------------------

    /// @notice The authority address for a validator, per the staking precompile.
    /// @dev Not `view`: the precompile's getValidator is a state-touching call.
    function authorityOf(uint64 validatorId) public returns (address) {
        (address authAddress,,,,,,,,,,,) = staking.getValidator(validatorId);
        if (authAddress == address(0)) revert UnknownValidator(validatorId);
        return authAddress;
    }

    /// @notice True if `caller` may write metadata for `validatorId`.
    function _authorize(uint64 validatorId, address caller) private returns (bool) {
        if (_delegates[validatorId][caller]) return true;
        return caller == authorityOf(validatorId);
    }

    modifier onlyAuthorized(uint64 validatorId) {
        if (!_authorize(validatorId, msg.sender)) revert NotAuthorized(validatorId, msg.sender);
        _;
    }

    /// @notice Authority may delegate (or revoke) write access to another key
    ///         (multisig, governance contract, hot ops key) without exposing the
    ///         staking key. Only the staking authority itself can change this.
    function setWriter(uint64 validatorId, address writer, bool authorized) external {
        if (msg.sender != authorityOf(validatorId)) revert NotAuthorized(validatorId, msg.sender);
        _delegates[validatorId][writer] = authorized;
        emit WriterAuthorized(validatorId, writer, authorized);
    }

    function isWriter(uint64 validatorId, address writer) external view returns (bool) {
        return _delegates[validatorId][writer];
    }

    // ---------------------------------------------------------------------
    // Writes
    // ---------------------------------------------------------------------

    /// @inheritdoc IValidatorMetadata
    function setMetadata(uint64 validatorId, Metadata calldata data) external onlyAuthorized(validatorId) {
        _metadata[validatorId] = data;
        _exists[validatorId] = true;
        emit MetadataUpdated(validatorId, msg.sender, "*");
    }

    /// @inheritdoc IValidatorMetadata
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

    // ---------------------------------------------------------------------
    // Reads
    // ---------------------------------------------------------------------

    /// @inheritdoc IValidatorMetadata
    function getMetadata(uint64 validatorId) external view returns (Metadata memory) {
        return _metadata[validatorId];
    }

    /// @inheritdoc IValidatorMetadata
    function getName(uint64 validatorId) external view returns (string memory) {
        return _metadata[validatorId].name;
    }

    /// @inheritdoc IValidatorMetadata
    function hasMetadata(uint64 validatorId) external view returns (bool) {
        return _exists[validatorId];
    }
}
