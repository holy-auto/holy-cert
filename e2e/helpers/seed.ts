import { APIRequestContext } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * 共有 e2e fixture。`scripts/setup-demo-tenant.ts` が用意するデモ証明書 (LEDRA-DEMO-0001 〜 0016)
 * を起点に、テスト中で証明書画像 / Image Markup 注釈 / certificate_media を投入し、
 * 後片付けする最小限のヘルパー群。
 */

export const DEMO_CERTIFICATE_PUBLIC_ID = "LEDRA-DEMO-0001";

const FIXTURE_DIR = join(__dirname, "..", "fixtures");

export function readPixelPng(): Buffer {
  return readFileSync(join(FIXTURE_DIR, "test-pixel.png"));
}

/** 証明書 ID (UUID) を public_id から引く */
export async function getCertificateIdByPublicId(
  request: APIRequestContext,
  publicId: string,
): Promise<string | null> {
  // /api/admin/certificates の検索は `q` パラメータで public_id 部分一致検索を行う。
  // 戻り値は apiJson で `{ certificates: [...] }`、`ok` フラグなし。
  const res = await request.get(`/api/admin/certificates?q=${encodeURIComponent(publicId)}`);
  if (!res.ok()) return null;
  const json = (await res.json()) as { certificates?: Array<{ id?: string; public_id?: string }> };
  if (!Array.isArray(json.certificates)) return null;
  const match = json.certificates.find((c) => c.public_id === publicId);
  return match?.id ?? null;
}

export type UploadedImage = { id: string; file_name: string | null };

/** 証明書に PNG 1x1 を 1 枚アップロードする */
export async function uploadFixtureImage(
  request: APIRequestContext,
  publicId: string,
): Promise<UploadedImage | null> {
  const res = await request.post("/api/certificates/images/upload", {
    multipart: {
      public_id: publicId,
      photos: {
        name: "test-pixel.png",
        mimeType: "image/png",
        buffer: readPixelPng(),
      },
    },
  });
  if (!res.ok()) return null;
  const json = (await res.json()) as { ok?: boolean; images?: UploadedImage[] };
  if (!json.ok || !Array.isArray(json.images) || json.images.length === 0) return null;
  return json.images[0] ?? null;
}

/** Image Markup 用の最小注釈ドキュメント (矢印 1 本) */
export function buildSampleAnnotationDoc(opts?: { width?: number; height?: number }) {
  const width = opts?.width ?? 100;
  const height = opts?.height ?? 100;
  return {
    version: 1 as const,
    imageWidth: width,
    imageHeight: height,
    annotations: [
      {
        id: "annot-1",
        kind: "arrow",
        x1: 10,
        y1: 10,
        x2: 50,
        y2: 50,
        stroke: "#ff0000",
        strokeWidth: 4,
      },
    ],
  };
}

/** 注釈 PUT */
export async function putAnnotations(
  request: APIRequestContext,
  imageId: string,
  doc: ReturnType<typeof buildSampleAnnotationDoc>,
): Promise<boolean> {
  const res = await request.put(`/api/certificates/images/${imageId}/annotations`, {
    data: { annotations: doc },
  });
  return res.ok();
}

/** rendered の焼き込みを実行 */
export async function postRender(request: APIRequestContext, imageId: string): Promise<boolean> {
  const res = await request.post(`/api/certificates/images/${imageId}/render`);
  return res.ok();
}

/** 画像削除 (cleanup) */
export async function deleteImage(request: APIRequestContext, imageId: string): Promise<void> {
  await request.delete(`/api/certificates/images/${imageId}`).catch(() => {});
}

// ── Phase 3 (certificate_media) 用 ─────────────────────────────────

/** 1x1 PNG を「動画」MIME と称してアップロードしようとする (失敗確認用) */
export function buildFakeVideoBuffer(): Buffer {
  // 実際の MP4 ではないが、サイズ最小での MIME 検証パスのみ通したい場合に使う。
  // 本番に近い検証には ffmpeg 出力 etc を別 fixture で用意する想定。
  return Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32]);
}

/**
 * before_after メディアをアップロード。
 * `/api/certificates/[id]/media` の `id` パスパラメータは **public_id**。
 */
export async function uploadBeforeAfterMedia(
  request: APIRequestContext,
  publicId: string,
): Promise<{ id: string } | null> {
  const buf = readPixelPng();
  const res = await request.post(`/api/certificates/${encodeURIComponent(publicId)}/media`, {
    multipart: {
      media_type: "before_after",
      file: { name: "after.png", mimeType: "image/png", buffer: buf },
      before: { name: "before.png", mimeType: "image/png", buffer: buf },
      caption: "e2e fixture before/after",
    },
  });
  if (!res.ok()) return null;
  const json = (await res.json()) as { ok?: boolean; media?: { id?: string } };
  if (!json.ok || !json.media?.id) return null;
  return { id: json.media.id };
}

export async function deleteMedia(request: APIRequestContext, mediaId: string): Promise<void> {
  await request.delete(`/api/certificates/media/${mediaId}`).catch(() => {});
}
