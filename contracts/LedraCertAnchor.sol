// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title LedraCertAnchor
 * @notice Stores SHA-256 digests of certificate canonical JSON for tamper-proof verification.
 * @dev Deployed on Polygon PoS alongside LedraAnchor (image hashes).
 *      Used by the *instant* anchor route — Enterprise plans and admin
 *      manual anchoring. Steady-state traffic goes through LedraBatchAnchor.
 *
 * Usage:
 *   1. Ledra backend calls `anchorCertificate(certDigest, publicIdHash)` after
 *      certificate creation/edit (only for instant route).
 *   2. Anyone can verify via `isAnchored(certDigest)` (read-only, no gas).
 *   3. The `publicIdHash` lets Polygonscan filter events by certificate.
 *
 * Access control:
 *   - Writes are gated by an anchorer allowlist (deployer bootstrapped).
 *   - Owner can pause and rotate keys for emergency response.
 */
contract LedraCertAnchor {
    /// @notice Emitted when a certificate digest is anchored.
    /// @param certDigest    SHA-256 of the certificate canonical JSON.
    /// @param publicIdHash  keccak256 of the certificate's public_id (for indexed filtering).
    /// @param timestamp     Block timestamp at which it was anchored.
    event CertificateAnchored(
        bytes32 indexed certDigest,
        bytes32 indexed publicIdHash,
        uint256 timestamp
    );

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event AnchorerSet(address indexed anchorer, bool allowed);
    event PausedSet(bool paused);

    /// @notice Mapping of anchored cert digests to their anchor timestamps.
    mapping(bytes32 => uint256) public anchors;

    /// @notice Owner address (governance / key rotation).
    address public owner;

    /// @notice Allowlist of addresses permitted to call anchorCertificate().
    mapping(address => bool) public anchorers;

    /// @notice When true, write operations are blocked.
    bool public paused;

    modifier onlyOwner() {
        require(msg.sender == owner, "LedraCertAnchor: not owner");
        _;
    }

    modifier onlyAnchorer() {
        require(anchorers[msg.sender], "LedraCertAnchor: not anchorer");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "LedraCertAnchor: paused");
        _;
    }

    constructor() {
        owner = msg.sender;
        anchorers[msg.sender] = true;
        emit OwnershipTransferred(address(0), msg.sender);
        emit AnchorerSet(msg.sender, true);
    }

    /**
     * @notice Anchor a certificate digest on-chain.
     * @param certDigest    Cert canonical JSON SHA-256 as bytes32.
     * @param publicIdHash  keccak256(public_id) — included as indexed event arg.
     * @dev Idempotent — re-anchoring an existing digest is a no-op (saves gas).
     */
    function anchorCertificate(bytes32 certDigest, bytes32 publicIdHash) external onlyAnchorer whenNotPaused {
        if (anchors[certDigest] != 0) return; // Already anchored, skip
        anchors[certDigest] = block.timestamp;
        emit CertificateAnchored(certDigest, publicIdHash, block.timestamp);
    }

    /**
     * @notice Check if a certificate digest has been anchored.
     */
    function isAnchored(bytes32 certDigest) external view returns (bool) {
        return anchors[certDigest] != 0;
    }

    /**
     * @notice Get the timestamp when a digest was anchored, or 0 if not anchored.
     */
    function getAnchorTimestamp(bytes32 certDigest) external view returns (uint256) {
        return anchors[certDigest];
    }

    /// @notice Add or remove an anchorer.
    function setAnchorer(address anchorer, bool allowed) external onlyOwner {
        require(anchorer != address(0), "LedraCertAnchor: zero address");
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
        require(newOwner != address(0), "LedraCertAnchor: zero address");
        address previousOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }
}
