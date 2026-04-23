import { apiInternalError, apiUnauthorized, apiValidationError } from "@/lib/api/response";
import { resolveCallerWithRole } from "@/lib/auth/checkRole";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { parseShakenshoAuto, extractFirstRegistrationYear } from "@/lib/ocr/shakensho";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const caller = await resolveCallerWithRole(supabase);
    if (!caller) return apiUnauthorized();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return apiValidationError("ファイルが見つかりません。");
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return apiValidationError("JPG / PNG / GIF / WEBP 形式の画像を選択してください。");
    }

    const arrayBuffer = await file.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    // maker は QR コードには含まれない（OCR 必須）ので requireFields に指定。
    // QR だけでは不足と判定され OCR を併用してマージされる。
    const { data: parsed, source } = await parseShakenshoAuto(imageBuffer, {
      requireFields: ["maker"],
    });

    return Response.json({
      ok: true,
      source,
      extracted: {
        maker: parsed.maker ?? null,
        model: parsed.model ?? null,
        year: extractFirstRegistrationYear(parsed.first_registration),
        vin_code: parsed.vin ?? null,
        plate_display: parsed.plate_display ?? null,
        expiry_date: parsed.expiry_date ?? null,
        fuel_type: parsed.fuel_type ?? null,
      },
    });
  } catch (e) {
    return apiInternalError(e, "parse-shakken");
  }
}
