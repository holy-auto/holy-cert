import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createTenantScopedAdmin } from "@/lib/supabase/admin";
import { resolveCallerWithRole } from "@/lib/auth/checkRole";
import { sanitizeFeatureKeys } from "@/lib/features/catalog";
import PageHeader from "@/components/ui/PageHeader";
import FeaturesClient from "./FeaturesClient";

/**
 * 機能の表示設定 `/admin/settings/features`
 * ------------------------------------------------------------
 * 上級機能はデフォルト非表示。ここで:
 *   - 自分のサイドバーに出す機能を選ぶ (全ユーザー)
 *   - テナントで使える機能を制限する (オーナー / 管理者のみ)
 *
 * 新しいテーブルへの読み取りはサービスロールクライアント経由
 * (createTenantScopedAdmin) で行い、未マイグレーション環境でも
 * 既定値にフォールバックして画面を壊さない。
 */

export const dynamic = "force-dynamic";

export default async function FeatureSettingsPage() {
  const supabase = await createSupabaseServerClient();
  const caller = await resolveCallerWithRole(supabase);
  if (!caller) redirect("/login?next=/admin/settings/features");

  const { admin, tenantId } = createTenantScopedAdmin(caller.tenantId);

  let tenantDisabled: string[] = [];
  let userVisible: string[] = [];

  const { data: tRow, error: tErr } = await admin
    .from("tenant_feature_settings")
    .select("disabled_features")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (!tErr && tRow?.disabled_features) {
    tenantDisabled = sanitizeFeatureKeys(tRow.disabled_features);
  }

  const { data: uRow, error: uErr } = await admin
    .from("user_feature_prefs")
    .select("visible_features")
    .eq("tenant_id", tenantId)
    .eq("user_id", caller.userId)
    .maybeSingle();
  if (!uErr && uRow?.visible_features) {
    userVisible = sanitizeFeatureKeys(uRow.visible_features);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        tag="FEATURES"
        title="機能の表示設定"
        description="上級向けの機能は初期状態では非表示です。必要なものだけサイドバーに表示できます。"
        actions={
          <Link href="/admin/settings" className="btn-secondary">
            店舗設定へ戻る
          </Link>
        }
      />

      <FeaturesClient role={caller.role} initialUserVisible={userVisible} initialTenantDisabled={tenantDisabled} />
    </div>
  );
}
