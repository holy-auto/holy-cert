import { redirect } from "next/navigation";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import AdminFeatureGuard from "@/app/admin/AdminFeatureGuard";
import { FEATURES } from "@/lib/billing/featureKeys";
import PageHeader from "@/components/ui/PageHeader";
import { createSignedAssetUrl } from "@/lib/signedUrl";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; e?: string; seal_ok?: string; seal_e?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();

  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login?next=/admin/logo");

  const { data: mem } = await supabase
    .from("tenant_memberships")
    .select("tenant_id")
    .limit(1)
    .single();

  if (!mem) return <div className="text-sm text-muted">tenant_memberships が見つかりません。</div>;

  const tenantId = mem.tenant_id as string;

  // Fetch current tenant to show existing logo/seal
  const { data: tenant } = await supabase
    .from("tenants")
    .select("logo_asset_path,company_seal_path")
    .eq("id", tenantId)
    .single();

  const logoPath = (tenant?.logo_asset_path as string | null) ?? null;
  const sealPath = (tenant?.company_seal_path as string | null) ?? null;

  let logoUrl: string | null = null;
  let sealUrl: string | null = null;
  try {
    if (logoPath) logoUrl = await createSignedAssetUrl(logoPath, 600);
  } catch { /* ignore */ }
  try {
    if (sealPath) sealUrl = await createSignedAssetUrl(sealPath, 600);
  } catch { /* ignore */ }

  async function uploadLogo(formData: FormData) {
    "use server";
    const supabase = await createSupabaseServerClient();

    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) redirect("/admin/logo?e=1");

    if (file.type !== "image/png") redirect("/admin/logo?e=png");
    if (file.size > 2 * 1024 * 1024) redirect("/admin/logo?e=size");

    const objectPath = `tenants/${tenantId}/logos/logo.png`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    const up = await supabase.storage
      .from("assets")
      .upload(objectPath, bytes, { contentType: "image/png", upsert: true });

    if (up.error) redirect("/admin/logo?e=2");

    const { error } = await supabase
      .from("tenants")
      .update({ logo_asset_path: objectPath })
      .eq("id", tenantId);

    if (error) redirect("/admin/logo?e=3");
    redirect("/admin/logo?ok=1");
  }

  async function uploadSeal(formData: FormData) {
    "use server";
    const supabase = await createSupabaseServerClient();

    const file = formData.get("seal_file") as File | null;
    if (!file || file.size === 0) redirect("/admin/logo?seal_e=1");

    if (file.type !== "image/png") redirect("/admin/logo?seal_e=png");
    if (file.size > 2 * 1024 * 1024) redirect("/admin/logo?seal_e=size");

    const objectPath = `tenants/${tenantId}/seals/seal.png`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    const up = await supabase.storage
      .from("assets")
      .upload(objectPath, bytes, { contentType: "image/png", upsert: true });

    if (up.error) redirect("/admin/logo?seal_e=2");

    const { error } = await supabase
      .from("tenants")
      .update({ company_seal_path: objectPath })
      .eq("id", tenantId);

    if (error) redirect("/admin/logo?seal_e=3");
    redirect("/admin/logo?seal_ok=1");
  }

  return (
    <AdminFeatureGuard feature={FEATURES.upload_logo}>
      <div className="space-y-6">
        <PageHeader
          tag="ブランド設定"
          title="ロゴ・角印アップロード"
          description="請求書や帳票に表示されるロゴと角印を設定します。"
        />

        {/* Notifications */}
        {sp.ok && <div className="glass-card p-3 text-sm text-emerald-600 border border-emerald-200">ロゴを保存しました</div>}
        {sp.e === "png" && <div className="glass-card p-3 text-sm text-red-500">PNGのみ対応です</div>}
        {sp.e === "size" && <div className="glass-card p-3 text-sm text-red-500">ファイルサイズは2MB以下にしてください</div>}
        {sp.e && sp.e !== "png" && sp.e !== "size" && <div className="glass-card p-3 text-sm text-red-500">ロゴアップロードエラー: {sp.e}</div>}
        {sp.seal_ok && <div className="glass-card p-3 text-sm text-emerald-600 border border-emerald-200">角印を保存しました</div>}
        {sp.seal_e === "png" && <div className="glass-card p-3 text-sm text-red-500">角印: PNGのみ対応です</div>}
        {sp.seal_e === "size" && <div className="glass-card p-3 text-sm text-red-500">角印: ファイルサイズは2MB以下にしてください</div>}
        {sp.seal_e && sp.seal_e !== "png" && sp.seal_e !== "size" && <div className="glass-card p-3 text-sm text-red-500">角印アップロードエラー: {sp.seal_e}</div>}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Logo Upload */}
          <section className="glass-card p-5 space-y-4">
            <div>
              <div className="text-xs font-semibold tracking-[0.18em] text-muted">ロゴ</div>
              <div className="mt-1 text-base font-semibold text-primary">会社ロゴ</div>
              <p className="mt-1 text-xs text-muted">請求書ヘッダーや帳票に表示されます</p>
            </div>

            {logoUrl && (
              <div className="flex items-center justify-center rounded-xl border border-border-subtle bg-white p-4">
                <img src={logoUrl} alt="現在のロゴ" className="max-h-20 max-w-full object-contain" />
              </div>
            )}

            <div className={`flex items-center gap-2 text-sm ${logoPath ? "text-emerald-600" : "text-amber-500"}`}>
              <span className={`w-2 h-2 rounded-full ${logoPath ? "bg-emerald-500" : "bg-amber-500"}`} />
              {logoPath ? "設定済み" : "未設定"}
            </div>

            <form action={uploadLogo} className="space-y-3">
              <div className="text-xs text-muted">PNG形式 / 2MB以下</div>
              <input
                type="file"
                name="file"
                accept="image/png"
                className="text-sm text-primary file:btn-secondary file:mr-3 w-full"
                required
              />
              <button className="btn-primary w-full">ロゴをアップロード</button>
            </form>
          </section>

          {/* Seal Upload */}
          <section className="glass-card p-5 space-y-4">
            <div>
              <div className="text-xs font-semibold tracking-[0.18em] text-muted">角印</div>
              <div className="mt-1 text-base font-semibold text-primary">角印（社印）</div>
              <p className="mt-1 text-xs text-muted">請求書の差出人欄に重ねて表示されます</p>
            </div>

            {sealUrl ? (
              <div className="flex items-center justify-center rounded-xl border border-border-subtle bg-white p-4">
                <img src={sealUrl} alt="現在の角印" className="max-h-20 max-w-full object-contain" />
              </div>
            ) : (
              <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-red-200 bg-red-50/30 p-6">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto border-2 border-dashed border-red-300 rounded-lg flex items-center justify-center">
                    <span className="text-2xl text-red-300 font-bold">印</span>
                  </div>
                  <p className="mt-2 text-xs text-muted">角印が未設定です</p>
                </div>
              </div>
            )}

            <div className={`flex items-center gap-2 text-sm ${sealPath ? "text-emerald-600" : "text-amber-500"}`}>
              <span className={`w-2 h-2 rounded-full ${sealPath ? "bg-emerald-500" : "bg-amber-500"}`} />
              {sealPath ? "設定済み" : "未設定"}
            </div>

            <form action={uploadSeal} className="space-y-3">
              <div className="text-xs text-muted">PNG形式 / 2MB以下 / 背景透過推奨</div>
              <input
                type="file"
                name="seal_file"
                accept="image/png"
                className="text-sm text-primary file:btn-secondary file:mr-3 w-full"
                required
              />
              <button className="btn-primary w-full">角印をアップロード</button>
            </form>
          </section>
        </div>

        <div className="glass-card p-4 text-xs text-muted space-y-1">
          <p>アップロードした画像は請求書やその他の帳票で使用されます。</p>
          <p>角印は差出人住所の右側に重ねて表示されます。透過PNGの使用を推奨します。</p>
        </div>
      </div>
    </AdminFeatureGuard>
  );
}
