/**
 * CloudSign API integration module.
 *
 * Environment variables:
 *   CLOUDSIGN_API_KEY          — API key for CloudSign
 *   CLOUDSIGN_WEBHOOK_SECRET   — Webhook signature secret
 *   CLOUDSIGN_TEMPLATE_AGENT_CONTRACT — Template ID for agent contracts
 *   CLOUDSIGN_TEMPLATE_NDA     — Template ID for NDAs
 */

const CLOUDSIGN_BASE_URL = "https://api.cloudsign.jp/v2";

function getApiKey(): string {
  const key = process.env.CLOUDSIGN_API_KEY;
  if (!key) throw new Error("CLOUDSIGN_API_KEY is not configured");
  return key;
}

async function cloudsignFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${CLOUDSIGN_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
      ...options.headers,
    },
  });
  return res;
}

/**
 * Template type → CloudSign template ID mapping.
 */
export function getTemplateId(templateType: string): string {
  const map: Record<string, string | undefined> = {
    agent_contract: process.env.CLOUDSIGN_TEMPLATE_AGENT_CONTRACT,
    nda: process.env.CLOUDSIGN_TEMPLATE_NDA,
  };
  const id = map[templateType];
  if (!id) throw new Error(`No CloudSign template configured for type: ${templateType}`);
  return id;
}

/**
 * Create a document from a CloudSign template.
 */
export async function createDocumentFromTemplate(templateId: string, title: string) {
  const res = await cloudsignFetch("/documents", {
    method: "POST",
    body: JSON.stringify({
      template_id: templateId,
      title,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`CloudSign createDocument failed (${res.status}): ${body}`);
  }

  return (await res.json()) as { id: string; status: string };
}

/**
 * Add a participant (signer) to a document.
 */
export async function addParticipant(
  documentId: string,
  email: string,
  name: string,
) {
  const res = await cloudsignFetch(`/documents/${documentId}/participants`, {
    method: "POST",
    body: JSON.stringify({
      email,
      name,
      order: 1,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`CloudSign addParticipant failed (${res.status}): ${body}`);
  }

  return (await res.json()) as { id: string };
}

/**
 * Send a signing request for a document.
 */
export async function sendSigningRequest(documentId: string) {
  const res = await cloudsignFetch(`/documents/${documentId}/send`, {
    method: "POST",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`CloudSign sendSigningRequest failed (${res.status}): ${body}`);
  }

  return (await res.json()) as { id: string; status: string };
}

/**
 * Get the current status of a document.
 */
export async function getDocumentStatus(documentId: string) {
  const res = await cloudsignFetch(`/documents/${documentId}`);

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`CloudSign getDocumentStatus failed (${res.status}): ${body}`);
  }

  return (await res.json()) as {
    id: string;
    status: string;
    title: string;
    signing_url?: string;
  };
}

/**
 * Download the signed PDF for a document.
 */
export async function downloadSignedPdf(documentId: string): Promise<Buffer> {
  const res = await cloudsignFetch(`/documents/${documentId}/pdf`, {
    headers: {
      Accept: "application/pdf",
      Authorization: `Bearer ${getApiKey()}`,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`CloudSign downloadSignedPdf failed (${res.status}): ${body}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Verify a CloudSign webhook signature.
 */
export async function verifyWebhookSignature(
  payload: string,
  signature: string,
): Promise<boolean> {
  const secret = process.env.CLOUDSIGN_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[cloudsign] CLOUDSIGN_WEBHOOK_SECRET is not configured");
    return false;
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const computed = Buffer.from(sig).toString("hex");

  // Use constant-time comparison to prevent timing attacks
  if (computed.length !== signature.length) return false;
  const { timingSafeEqual } = await import("crypto");
  return timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
}
