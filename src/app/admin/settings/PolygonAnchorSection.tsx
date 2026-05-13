import { redirect } from "next/navigation";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createTenantScopedAdmin } from "@/lib/supabase/admin";

type Props = {
  tenantId: string;
  optedOut: boolean;
};

export default function PolygonAnchorSection({ tenantId, optedOut }: Props) {
  async function toggle(formData: FormData) {
    "use server";

    const nextRaw = String(formData.get("next") ?? "")
      .trim()
      .toLowerCase();
    const next = nextRaw === "true";

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login?next=/admin/settings");

    const { data: membership } = await supabase
      .from("tenant_memberships")
      .select("tenant_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (!membership?.tenant_id || membership.tenant_id !== tenantId) {
      redirect("/admin/settings?e=1");
    }

    const { admin } = createTenantScopedAdmin(tenantId);
    const { error } = await admin
      .from("tenants")
      .update({ polygon_anchor_opt_out: next, updated_at: new Date().toISOString() })
      .eq("id", tenantId);
    if (error) redirect("/admin/settings?e=1");

    redirect(`/admin/settings?polygon=${next ? "off" : "on"}`);
  }

  return (
    <section className="glass-card p-5">
      <div className="mb-4">
        <div className="text-xs font-semibold tracking-[0.18em] text-muted">真正性</div>
        <div className="mt-1 text-base font-semibold text-primary">ブロックチェーンアンカリング</div>
        <p className="mt-1 text-xs text-muted">
          施工写真の SHA-256 ハッシュを Polygon PoS ネットワークに記録し、第三者がいつでも改ざん検知できる状態にします。
          標準では「ON」(=
          記録する)です。証明書のオフチェーン運用に切り替えたい場合のみ停止してください。停止中はガス代も発生しません。
        </p>
      </div>

      <div className="rounded-xl border border-border-default bg-base p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-primary">
              現在の状態:{" "}
              {optedOut ? (
                <span className="text-warning-text">停止中 (新規施工写真はアンカーされません)</span>
              ) : (
                <span className="text-success-text">有効 (新規施工写真は自動でアンカーされます)</span>
              )}
            </div>
            <div className="mt-1 text-xs text-muted">
              停止しても既存のアンカー履歴は失われません。再開すると以降の新規写真からアンカーが再開されます。
              <br />
              バックフィルジョブ (`/admin/polygon-backfill`) も停止中はスキップされます。
            </div>
          </div>
          <form action={toggle}>
            <input type="hidden" name="next" value={optedOut ? "false" : "true"} />
            <button type="submit" className={optedOut ? "btn-primary text-sm" : "btn-secondary text-sm"}>
              {optedOut ? "アンカリングを再開" : "アンカリングを停止"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
