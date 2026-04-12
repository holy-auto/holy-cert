/**
 * Polygon blockchain anchoring provider.
 *
 * Env: `POLYGON_ANCHOR_ENABLED` = "true" | "false"
 *      `POLYGON_RPC_URL`        = JSON-RPC endpoint (Amoy testnet or mainnet)
 *      `POLYGON_PRIVATE_KEY`    = Signer wallet private key (hex)
 *      `POLYGON_CONTRACT_ADDRESS` = Deployed anchor contract address
 * Default: "false"
 */

import type { PolygonAnchorResult } from "./types";

function isEnabled(): boolean {
  return process.env.POLYGON_ANCHOR_ENABLED === "true";
}

const DISABLED_RESULT: PolygonAnchorResult = {
  txHash: null,
  anchored: false,
};

const POLYGON_TIMEOUT_MS = 30_000;

const ANCHOR_ABI = ["function anchor(bytes32 hash) external"] as const;

/**
 * Anchor a SHA256 hash to the Polygon blockchain.
 *
 * @param sha256 - The SHA256 hash of the image to anchor (64-char hex).
 * @returns PolygonAnchorResult with txHash and anchored status.
 */
export async function anchorToPolygon(sha256: string): Promise<PolygonAnchorResult> {
  if (!isEnabled()) return DISABLED_RESULT;

  const rpcUrl = process.env.POLYGON_RPC_URL;
  const privateKey = process.env.POLYGON_PRIVATE_KEY;
  const contractAddress = process.env.POLYGON_CONTRACT_ADDRESS;

  if (!rpcUrl || !privateKey || !contractAddress) {
    console.warn("[polygon] missing POLYGON_RPC_URL, POLYGON_PRIVATE_KEY, or POLYGON_CONTRACT_ADDRESS");
    return DISABLED_RESULT;
  }

  try {
    const { JsonRpcProvider, Wallet, Contract } = await import("ethers");

    const provider = new JsonRpcProvider(rpcUrl);
    const wallet = new Wallet(privateKey, provider);
    const contract = new Contract(contractAddress, ANCHOR_ABI, wallet);

    // Ensure the hash is a 0x-prefixed bytes32
    const hashBytes32 = sha256.startsWith("0x") ? sha256 : `0x${sha256}`;

    const tx = await Promise.race([
      contract.anchor(hashBytes32) as Promise<{ hash: string; wait: () => Promise<unknown> }>,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("polygon tx timeout")), POLYGON_TIMEOUT_MS),
      ),
    ]);

    // Wait for 1 confirmation
    await Promise.race([
      tx.wait(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("polygon confirmation timeout")), POLYGON_TIMEOUT_MS),
      ),
    ]);

    return { txHash: tx.hash, anchored: true };
  } catch (err) {
    console.error("[polygon] anchoring failed", err);
    return DISABLED_RESULT;
  }
}
