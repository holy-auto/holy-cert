import { NextRequest } from "next/server";
import { apiOk, apiInternalError, apiValidationError } from "@/lib/api/response";
import { loadPublicCertificateMedia } from "@/lib/certificateMedia/loadPublic";

export const runtime = "nodejs";

/**
 * 公開ページ用エンドポイント: certificate_media を署名 URL 付きで返す。
 * /c/[public_id] のサーバコンポーネントは publicData 経由で直接 Supabase
 * にアクセスするので必須ではないが、モバイル WebView や外部クライアント向けに
 * 同等情報を取得できる JSON エンドポイントを公開する。
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ public_id: string }> }) {
  try {
    const { public_id } = await params;
    if (!public_id) return apiValidationError("public_id は必須です。");
    const media = await loadPublicCertificateMedia(public_id);
    return apiOk({ media });
  } catch (e) {
    return apiInternalError(e, "public media");
  }
}
