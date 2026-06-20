// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// MRC-13 Validator Metadata Registry interface.
// Spec: Monad forum topic 497 (Đorđe Mijović), draft 2026-06-15.
//
// The staking precompile only exposes consensus data (ids, authority, stake,
// commission). This is the human-readable layer on top of it, keyed by
// validator id and written by the validator's own authority address.
interface IValidatorMetadata {
    // socials and additionalInfo are JSON strings so the schema can grow without
    // a new contract. socials is an object keyed by platform ("x", "telegram").
    // additionalInfo is free-form, e.g. {"provider","asn","region"}.
    struct Metadata {
        string name;
        string website;
        string description;
        string logo;
        string socials;
        string additionalInfo;
    }

    // field is "*" for a full setMetadata write.
    event MetadataUpdated(uint64 indexed validatorId, address indexed writer, string field);
    event WriterAuthorized(uint64 indexed validatorId, address indexed writer, bool authorized);

    function setMetadata(uint64 validatorId, Metadata calldata data) external;

    // field must be one of name, website, description, logo, socials, additionalInfo.
    function updateMetadataField(uint64 validatorId, string calldata field, string calldata value) external;

    function getMetadata(uint64 validatorId) external view returns (Metadata memory);

    function getName(uint64 validatorId) external view returns (string memory);

    function hasMetadata(uint64 validatorId) external view returns (bool);
}
