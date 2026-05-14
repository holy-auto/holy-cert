/**
 * setup-demo-manufacturer.ts
 *
 * デモ用メーカーポータルアカウントをセットアップするスクリプト。
 * Supabase Auth にデモユーザー（admin / viewer）を作成し、
 * manufacturer_memberships テーブルにリンクします。
 *
 * 前提条件:
 *   - supabase/migrations/20260514100000_manufacturer_certifications.sql
 *   - supabase/migrations/20260514110000_manufacturer_memberships.sql
 *   - supabase/migrations/20260514120000_demo_seed_manufacturer.sql
 *     がすべて適用済みであること
 *   - .env.local に SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY が設定済み
 *
 * 実行方法:
 *   npx tsx scripts/setup-demo-manufacturer.ts
 *
 * 作成されるデモアカウント:
 *   admin  : demo@manufacturer.ledra.test    / Demo1234!
 *   viewer : viewer@manufacturer.ledra.test  / Demo1234!
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const DEMO_MANUFACTURER_ID = "00000000-0000-0000-0000-de0000000200";
const DEMO_PASSWORD = "Demo1234!";

type DemoUser = {
  email: string;
  displayName: string;
  role: "admin" | "viewer";
};

const DEMO_USERS: DemoUser[] = [
  {
    email: "demo@manufacturer.ledra.test",
    displayName: "メーカー 花子",
    role: "admin",
  },
  {
    email: "viewer@manufacturer.ledra.test",
    displayName: "閲覧 次郎",
    role: "viewer",
  },
];

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を環境変数に設定してください。");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log("🚀 デモメーカーアカウントのセットアップを開始します...\n");

  // ── 1) Check that demo manufacturer record exists ─────────────────
  const { data: mfr, error: mfrErr } = await admin
    .from("manufacturers")
    .select("id, name, is_active")
    .eq("id", DEMO_MANUFACTURER_ID)
    .single();

  if (mfrErr || !mfr) {
    console.error(
      "❌ デモメーカーレコードが見つかりません。",
      "\n   先に以下のマイグレーションを適用してください:",
      "\n   supabase/migrations/20260514120000_demo_seed_manufacturer.sql",
    );
    process.exit(1);
  }
  console.log(`✅ デモメーカー確認: ${mfr.name} (${DEMO_MANUFACTURER_ID})`);

  // ── 2) Fetch existing auth users once (avoid N listUsers calls) ──
  const { data: existing, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) {
    console.error("❌ 既存ユーザー一覧の取得に失敗しました:", listErr.message);
    process.exit(1);
  }

  // ── 3) Create / link each demo user ──────────────────────────────
  for (const u of DEMO_USERS) {
    let userId: string;
    const found = existing?.users?.find((x) => x.email === u.email);

    if (found) {
      userId = found.id;
      console.log(`✅ 既存ユーザー確認: ${u.email} (${userId})`);
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: u.email,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { display_name: u.displayName, manufacturer_id: DEMO_MANUFACTURER_ID },
      });

      if (createErr || !created?.user) {
        console.error(`❌ ユーザー作成失敗 (${u.email}):`, createErr?.message);
        process.exit(1);
      }
      userId = created.user.id;
      console.log(`✅ ユーザー作成: ${u.email} (${userId})`);
    }

    const { error: linkErr } = await admin
      .from("manufacturer_memberships")
      .upsert(
        {
          manufacturer_id: DEMO_MANUFACTURER_ID,
          user_id: userId,
          role: u.role,
          display_name: u.displayName,
          is_active: true,
        },
        { onConflict: "manufacturer_id,user_id" },
      );

    if (linkErr) {
      console.error(`❌ manufacturer_memberships リンク失敗 (${u.email}):`, linkErr.message);
      process.exit(1);
    }
    console.log(`   → manufacturer_memberships リンク完了 (role: ${u.role})`);
  }

  // ── 4) Optional: certify the demo tenant for richer dashboard demo
  //    If a tenant with slug 'demo-tenant' exists (created by
  //    setup-demo-tenant.ts), grant it an active certification so the
  //    認定施工店 / ランキング / 発行履歴 画面に少なくとも1件出る。
  const { data: demoTenant } = await admin
    .from("tenants")
    .select("id, name")
    .eq("slug", "demo-tenant")
    .maybeSingle();

  if (demoTenant?.id) {
    const { error: certErr } = await admin
      .from("manufacturer_certified_tenants")
      .upsert(
        {
          manufacturer_id: DEMO_MANUFACTURER_ID,
          tenant_id: demoTenant.id,
          status: "active",
          notes: "デモ用に自動付与された認定",
        },
        { onConflict: "manufacturer_id,tenant_id" },
      );
    if (certErr) {
      console.warn(`⚠️  デモテナント認定の付与に失敗:`, certErr.message);
    } else {
      console.log(`✅ デモテナント認定付与: ${demoTenant.name} (${demoTenant.id})`);
    }
  } else {
    console.log(
      "ℹ️  デモテナント (slug=demo-tenant) が見つかりませんでした。" +
        "\n   `npm run demo:setup-tenant` を先に実行すると認定施工店もデモに含まれます。",
    );
  }

  // ── Summary ───────────────────────────────────────────────────────
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  デモメーカーアカウント セットアップ完了 🎉
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  URL          : /manufacturer/login
  メーカー名    : ${mfr.name}

  アカウント:
    admin  : demo@manufacturer.ledra.test    / ${DEMO_PASSWORD}
    viewer : viewer@manufacturer.ledra.test  / ${DEMO_PASSWORD}

  確認できる機能:
    /manufacturer            — ダッシュボード (カウント/ランキング/最新発行)
    /manufacturer/tenants    — 認定施工店一覧
    /manufacturer/certificates — 発行履歴 (フィルタ+ページング)
    /manufacturer/templates  — テンプレート一覧
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

main().catch((e) => {
  console.error("❌ 予期しないエラー:", e);
  process.exit(1);
});
