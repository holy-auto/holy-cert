/**
 * Polygon blockchain anchoring provider.
 *
 * Env:
 *   POLYGON_ANCHOR_ENABLED  = "true" | "false" (default: "false")
 *   POLYGON_RPC_URL         = RPC endpoint (e.g. https://polygon-rpc.com)
 *   POLYGON_PRIVATE_KEY     = Hex-encoded private key for signing txs
 *   POLYGON_CONTRACT_ADDRESS = Address of the deployed LedraAnchor contract
 *
 * Cost model:
 *   - No monthly fee (uses public RPC or Alchemy free tier)
 *   - Per-transaction gas: ~0.001 MATIC (~$0.001) on Polygon PoS
 *
 * The provider submits the SHA-256 hash (as bytes32) to the LedraAnchor
 * smart contract, which emits an `Anchored` event and stores the hash
 * for on-chain verification.
 */

import type { PolygonAnchorResult } from "./types";

const DISABLED_RESULT: PolygonAnchorResult = {
  txHash: null,
  anchored: false,
};

function isEnabled(): boolean {
  return process.env.POLYGON_ANCHOR_ENABLED === "true";
}

function getConfig() {
  const rpcUrl = process.env.POLYGON_RPC_URL;
  const privateKey = process.env.POLYGON_PRIVATE_KEY;
  const contractAddress = process.env.POLYGON_CONTRACT_ADDRESS;

  if (!rpcUrl || !privateKey || !contractAddress) {
    return null;
  }

  return { rpcUrl, privateKey, contractAddress } as const;
}

/**
 * Anchor a SHA-256 hash to the Polygon blockchain.
 *
 * The hash is submitted to the LedraAnchor smart contract as a bytes32 value.
 * On success, returns the transaction hash for on-chain verification.
 *
 * @param sha256 - The SHA-256 hex string of the image to anchor.
 * @returns PolygonAnchorResult with txHash and anchored status.
 */
export async function anchorToPolygon(sha256: string): Promise<PolygonAnchorResult> {
  if (!isEnabled()) return DISABLED_RESULT;

  const config = getConfig();
  if (!config) {
    console.warn(
      "[polygon] enabled but missing config (POLYGON_RPC_URL, POLYGON_PRIVATE_KEY, POLYGON_CONTRACT_ADDRESS)",
    );
    return DISABLED_RESULT;
  }

  try {
    // Dynamic import to keep viem tree-shaken when polygon is disabled
    const { createPublicClient, createWalletClient, http } = await import("viem");
    const { privateKeyToAccount } = await import("viem/accounts");
    const { polygon } = await import("viem/chains");
    const { LEDRA_ANCHOR_ABI } = await import("./polygonContract");

    const account = privateKeyToAccount(config.privateKey as `0x${string}`);

    const publicClient = createPublicClient({
      chain: polygon,
      transport: http(config.rpcUrl),
    });

    const walletClient = createWalletClient({
      account,
      chain: polygon,
      transport: http(config.rpcUrl),
    });

    // Normalize SHA-256 to bytes32 (ensure 0x prefix, 64 hex chars)
    const hashBytes32 = `0x${sha256.replace(/^0x/, "").padStart(64, "0")}` as `0x${string}`;

    // Submit the hash to the LedraAnchor contract
    const txHash = await walletClient.writeContract({
      address: config.contractAddress as `0x${string}`,
      abi: LEDRA_ANCHOR_ABI,
      functionName: "anchor",
      args: [hashBytes32],
    });

    // Wait for the transaction to be included in a block
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      confirmations: 1,
    });

    if (receipt.status === "success") {
      console.info(`[polygon] anchored hash=${sha256.slice(0, 12)}… tx=${txHash}`);
      return { txHash, anchored: true };
    }

    console.warn(`[polygon] tx reverted: ${txHash}`);
    return { txHash, anchored: false };
  } catch (error) {
    console.error("[polygon] anchoring failed:", error instanceof Error ? error.message : error);
    return DISABLED_RESULT;
  }
}

/**
 * Verify whether a SHA-256 hash has been anchored on-chain.
 * This is a read-only call (no gas cost).
 */
export async function verifyAnchor(sha256: string): Promise<boolean> {
  const config = getConfig();
  if (!config) return false;

  try {
    const { createPublicClient, http } = await import("viem");
    const { polygon } = await import("viem/chains");
    const { LEDRA_ANCHOR_ABI } = await import("./polygonContract");

    const client = createPublicClient({
      chain: polygon,
      transport: http(config.rpcUrl),
    });

    const hashBytes32 = `0x${sha256.replace(/^0x/, "").padStart(64, "0")}` as `0x${string}`;

    const isAnchored = await client.readContract({
      address: config.contractAddress as `0x${string}`,
      abi: LEDRA_ANCHOR_ABI,
      functionName: "isAnchored",
      args: [hashBytes32],
    });

    return isAnchored as boolean;
  } catch (error) {
    console.error("[polygon] verification failed:", error instanceof Error ? error.message : error);
    return false;
  }
}
