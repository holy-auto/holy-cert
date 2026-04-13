// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title LedraAnchor
 * @notice Stores SHA-256 hashes of certificate images for tamper-proof verification.
 * @dev Deployed on Polygon PoS. Gas cost per anchor: ~45,000 gas (~$0.001).
 *
 * Usage:
 *   1. Ledra backend calls `anchor(hash)` after image upload
 *   2. Anyone can verify via `isAnchored(hash)` (read-only, no gas)
 *   3. Event logs provide full audit trail
 */
contract LedraAnchor {
    /// @notice Emitted when a new hash is anchored.
    event Anchored(bytes32 indexed hash, address indexed sender, uint256 timestamp);

    /// @notice Mapping of anchored hashes to their anchor timestamps.
    mapping(bytes32 => uint256) public anchors;

    /// @notice Owner address (for potential future access control).
    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "LedraAnchor: not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Anchor a SHA-256 hash on-chain.
     * @param hash The SHA-256 hash as bytes32.
     * @dev Idempotent — re-anchoring an existing hash is a no-op (saves gas on duplicates).
     */
    function anchor(bytes32 hash) external {
        if (anchors[hash] != 0) return; // Already anchored, skip
        anchors[hash] = block.timestamp;
        emit Anchored(hash, msg.sender, block.timestamp);
    }

    /**
     * @notice Check if a hash has been anchored.
     * @param hash The SHA-256 hash to verify.
     * @return True if the hash exists on-chain.
     */
    function isAnchored(bytes32 hash) external view returns (bool) {
        return anchors[hash] != 0;
    }

    /**
     * @notice Get the timestamp when a hash was anchored.
     * @param hash The SHA-256 hash to query.
     * @return Unix timestamp of anchoring, or 0 if not anchored.
     */
    function getAnchorTimestamp(bytes32 hash) external view returns (uint256) {
        return anchors[hash];
    }

    /**
     * @notice Transfer ownership (for key rotation).
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "LedraAnchor: zero address");
        owner = newOwner;
    }
}
