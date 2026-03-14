# マイグレーション実行ガイド

## ファイル構成

```
supabase/
├── migrations/
│   ├── 20260313000000_market_platform.sql   # テーブル・インデックス・基本RLS
│   └── 20260313010000_rls_and_storage.sql   # 本番向けRLSポリシー + ストレージ設定
└── MIGRATION_GUIDE.md
```

---

## 環境変数の設定

`.env.local` に以下を設定してください：

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...
SUPABASE_SERVICE_ROLE_KEY=eyJh...

# メール通知（任意）
RESEND_API_KEY=re_xxxxx
RESEND_FROM=noreply@yourdomain.com

# アプリURL（メール内リンク生成用）
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# 管理者メールアドレス（カンマ区切りで複数可）
MARKET_ADMIN_EMAILS=admin@yourcompany.com
```

---

## 実行手順

### 1. Supabase CLI を使う場合

```bash
# Supabase CLI インストール（未インストールの場合）
npm install -g supabase

# リモートプロジェクトにリンク
supabase link --project-ref <your-project-ref>

# マイグレーション実行
supabase db push
```

### 2. Supabase Dashboard から手動実行する場合

1. [Supabase Dashboard](https://app.supabase.com) を開く
2. プロジェクトを選択 → **SQL Editor**
3. 以下の順番でファイルの内容をコピー＆ペーストして実行：
   1. `20260313000000_market_platform.sql`
   2. `20260313010000_rls_and_storage.sql`

---

## ストレージ設定確認

マイグレーション実行後、Supabase Dashboard で確認：

1. **Storage** → `assets` バケットが作成されていること
2. **Storage → Policies** で以下のポリシーが存在すること：
   - `assets_select` (public)
   - `assets_upload` (authenticated)
   - `assets_delete` (authenticated)

---

## RLS の動作確認

API サーバーは `SUPABASE_SERVICE_ROLE_KEY` を使用するため、RLS をバイパスします。
クライアント（`NEXT_PUBLIC_SUPABASE_ANON_KEY`）経由でのアクセスには RLS が適用されます。

### テスト方法

```sql
-- 特定ユーザーとして実行（Supabase Dashboard のSQL Editorで）
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub":"<user-uuid>","role":"authenticated"}';

SELECT * FROM dealers;          -- 自社 + 承認済みのみ表示されること
SELECT * FROM inventory_listings; -- active/reserved + 自社のみ表示されること
```

---

## 管理者アクセス

`MARKET_ADMIN_EMAILS` に設定したメールアドレスでログインすると、
`/market/admin` にアクセスできます。

管理機能：
- 業者の承認・停止
- 全問い合わせ一覧
- 全商談一覧
- 売買実績レポート

---

## 本番デプロイ前チェックリスト

- [ ] 全環境変数が設定済み
- [ ] マイグレーションが本番DBに適用済み
- [ ] `assets` ストレージバケットが作成済み
- [ ] 管理者メールアドレスが `MARKET_ADMIN_EMAILS` に設定済み
- [ ] `RESEND_API_KEY` と `RESEND_FROM` が設定済み（メール通知を使う場合）
- [ ] 招待コードで業者登録フローが動作することを確認
- [ ] 初期管理者アカウントを作成（Supabase Dashboard の Authentication → Users）
