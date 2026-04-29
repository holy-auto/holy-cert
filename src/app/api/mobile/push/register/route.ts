import { NextRequest } from "next/server";
import { resolveMobileCaller } from "@/lib/auth/mobileAuth";
import { apiOk, apiUnauthorized, apiInternalError } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/parseBody";
import { mobilePushTokenSchema, mobilePushTokenDeleteSchema } from "@/lib/validations/mobile";

export const dynamic = "force-dynamic";

// ─── POST: Register push notification token ───
export async function POST(request: NextRequest) {
  try {
    const caller = await resolveMobileCaller(request);
    if (!caller) return apiUnauthorized();

    const parsed = await parseJsonBody(request, mobilePushTokenSchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;

    const { data, error } = await caller.supabase
      .from("push_tokens")
      .upsert(
        {
          user_id: caller.userId,
          tenant_id: caller.tenantId,
          token: body.token,
          platform: body.platform,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,token" },
      )
      .select("id, user_id, tenant_id, token, platform, updated_at")
      .single();

    if (error) return apiInternalError(error, "push.register");

    return apiOk({ push_token: data });
  } catch (e) {
    return apiInternalError(e, "push.register");
  }
}

// ─── DELETE: Remove push token ───
export async function DELETE(request: NextRequest) {
  try {
    const caller = await resolveMobileCaller(request);
    if (!caller) return apiUnauthorized();

    const parsed = await parseJsonBody(request, mobilePushTokenDeleteSchema);
    if (!parsed.ok) return parsed.response;
    const { token } = parsed.data;

    const { error } = await caller.supabase
      .from("push_tokens")
      .delete()
      .eq("user_id", caller.userId)
      .eq("token", token);

    if (error) return apiInternalError(error, "push.unregister");

    return apiOk({ deleted: true });
  } catch (e) {
    return apiInternalError(e, "push.unregister");
  }
}
