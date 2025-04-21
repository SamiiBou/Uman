// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract SocialVerificationRegistry {
    struct Record {
        uint64  timestamp;   // UNIX epoch
        bytes32 proofHash;   // keccak256 of the World ID proof + context
    }

    // user => provider => record
    mapping(address => mapping(string => Record)) public records;

    event SocialVerified(
        address indexed user,
        string  indexed provider,
        bytes32         proofHash,
        uint64          timestamp
    );

    /**
     * @dev Called by the user (or a relayer) after World‑ID + OAuth succeed.
     *
     * @param provider   e.g. "twitter","telegram","discord"
     * @param proofHash  keccak256 hash of (provider,userId,wallet,merkleRoot,nullifier)
     */
    function recordVerification(string calldata provider, bytes32 proofHash) external {
        require(bytes(provider).length > 0, "Provider required");
        require(records[msg.sender][provider].timestamp == 0, "Already recorded");

        records[msg.sender][provider] = Record({
            timestamp: uint64(block.timestamp),
            proofHash: proofHash
        });

        emit SocialVerified(msg.sender, provider, proofHash, uint64(block.timestamp));
    }
}
