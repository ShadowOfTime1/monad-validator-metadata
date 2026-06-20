// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IValidatorMetadata — MRC-13 Validator Metadata Registry interface.
/// @notice Reference interface for MRC-13 (Đorđe Mijović, Monad forum topic 497,
///         "Validator Metadata Registry", draft 2026-06-15). Provides the
///         human-readable identity layer the staking precompile deliberately
///         omits (it exposes only consensus data: ids, authority, stake,
///         commission). Metadata is keyed by validator id and written by the
///         validator's own authority address — self-sovereign, no curated list.
interface IValidatorMetadata {
    /// @dev `socials` and `additionalInfo` are JSON-convention strings so the
    ///      schema can evolve without a contract upgrade. `socials` is suggested
    ///      to be an object keyed by platform ("x", "telegram", ...).
    ///      `additionalInfo` is open schema — e.g. declared infrastructure
    ///      ("provider", "asn", "region") for observed-vs-declared analysis.
    struct Metadata {
        string name;
        string website;
        string description;
        string logo;
        string socials;
        string additionalInfo;
    }

    /// @notice Emitted on every write. `field` is "*" for a full setMetadata.
    event MetadataUpdated(uint64 indexed validatorId, address indexed writer, string field);

    /// @notice Authorized-writer set changes for a validator.
    event WriterAuthorized(uint64 indexed validatorId, address indexed writer, bool authorized);

    /// @notice Write the entire metadata record for a validator.
    function setMetadata(uint64 validatorId, Metadata calldata data) external;

    /// @notice Update a single field. `field` ∈ {name,website,description,logo,socials,additionalInfo}.
    function updateMetadataField(uint64 validatorId, string calldata field, string calldata value) external;

    /// @notice Full metadata record (empty struct if never set).
    function getMetadata(uint64 validatorId) external view returns (Metadata memory);

    /// @notice Convenience getter for the most-requested field.
    function getName(uint64 validatorId) external view returns (string memory);

    /// @notice Whether a record has ever been written for this validator.
    function hasMetadata(uint64 validatorId) external view returns (bool);
}
