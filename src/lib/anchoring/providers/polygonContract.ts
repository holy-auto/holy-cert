/**
 * LedraAnchor smart contract ABI and configuration.
 *
 * The contract stores SHA-256 hashes of certificate images on Polygon PoS.
 * Each anchoring emits an `Anchored` event that can be verified on-chain.
 *
 * Contract interface:
 *   function anchor(bytes32 hash) external
 *   function isAnchored(bytes32 hash) external view returns (bool)
 *   event Anchored(bytes32 indexed hash, address indexed sender, uint256 timestamp)
 */

export const LEDRA_ANCHOR_ABI = [
  {
    type: "function",
    name: "anchor",
    inputs: [{ name: "hash", type: "bytes32", internalType: "bytes32" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "isAnchored",
    inputs: [{ name: "hash", type: "bytes32", internalType: "bytes32" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "Anchored",
    inputs: [
      { name: "hash", type: "bytes32", indexed: true, internalType: "bytes32" },
      { name: "sender", type: "address", indexed: true, internalType: "address" },
      { name: "timestamp", type: "uint256", indexed: false, internalType: "uint256" },
    ],
  },
] as const;
