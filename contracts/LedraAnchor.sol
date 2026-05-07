// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title LedraAnchor
 * @notice Stores SHA-256 hashes of certificate images for tamper-proof verification.
 * @dev Deployed on Polygon PoS. Gas cost per anchor: ~45,000 gas (~$0.001)
 *      based on Polygon mainnet measurements (subject to gas market changes).
 *
 * Usage:
 *   1. Ledra backend calls `anchor(hash)` after image upload
 *   2. Anyone can verify via `isAnchored(hash)` (read-only, no gas)
 *   3. Event logs provide full audit trail
 *
 * Access control:
 *   - Writes are gated by an anchorer allowlist (the deployer is bootstrapped
 *     in as the initial anchorer). The owner can add/remove anchorers and
 *     pause the contract for emergency response.
 */
contract LedraAnchor {
    /// @notice Emitted when a new hash is anchored.
    event Anchored(bytes32 indexed hash, address indexed sender, uint256 timestamp);

    /// @notice Emitted when ownership is transferred (best-practice).
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /// @notice Emitted when an anchorer is added or removed.
    event AnchorerSet(address indexed anchorer, bool allowed);

    /// @notice Emitted when the contract is paused or unpaused.
    event PausedSet(bool paused);

    /// @notice Mapping of anchored hashes to their anchor timestamps.
    mapping(bytes32 => uint256) public anchors;

    /// @notice Owner address (key rotation / governance).
    address public owner;

    /// @notice Allowlist of addresses permitted to call anchor().
    mapping(address => bool) public anchorers;

    /// @notice When true, write operations are blocked.
    bool public paused;

    modifier onlyOwner() {
        require(msg.sender == owner, "LedraAnchor: not owner");
        _;
    }

    modifier onlyAnchorer() {
        require(anchorers[msg.sender], "LedraAnchor: not anchorer");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "LedraAnchor: paused");
        _;
    }

    constructor() {
        owner = msg.sender;
        anchorers[msg.sender] = true;
        emit OwnershipTransferred(address(0), msg.sender);
        emit AnchorerSet(msg.sender, true);
    }

    /**
     * @notice Anchor a SHA-256 hash on-chain.
     * @param hash The SHA-256 hash as bytes32.
     * @dev Idempotent — re-anchoring an existing hash is a no-op (saves gas on duplicates).
     */
    function anchor(bytes32 hash) external onlyAnchorer whenNotPaused {
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

    /// @notice Add or remove an anchorer (governance).
    function setAnchorer(address anchorer, bool allowed) external onlyOwner {
        require(anchorer != address(0), "LedraAnchor: zero address");
        anchorers[anchorer] = allowed;
        emit AnchorerSet(anchorer, allowed);
    }

    /// @notice Emergency pause / unpause.
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit PausedSet(_paused);
    }

    /**
     * @notice Transfer ownership (for key rotation).
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "LedraAnchor: zero address");
        address previousOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }
}
