# ステージング環境ガイド

## 概要

ステージング環境は本番デプロイ前の最終検証に使用します。

## セットアップ

### 1. Vercel でステージング環境を設定

1. Vercel ダッシュボード → Settings → Git
2. Production Branch: `main`
3. Preview Branches に `staging` を追加
4. Environment Variables で「Preview」スコープにステージング用の値を設定:
   - `NEXT_PUBLIC_SUPABASE_URL` → ステージング用Supabaseプロジェクト
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → ステージング用キー
   - `SUPABASE_SERVICE_ROLE_KEY` → ステージング用サービスキー
   - `STRIPE_SECRET_KEY` → Stripeテストモードキー（`sk_test_...`）
   - `STRIPE_WEBHOOK_SECRET` → ステージング用Webhook Secret
   - その他の環境変数はテスト用の値を設定

### 2. Supabase ステージング用プロジェクト

1. Supabase ダッシュボードで新規プロジェクトを作成（例: `cartrust-staging`）
2. マイグレーションを適用:
   ```bash
   npx supabase db push --project-ref <staging-project-ref>
   ```
3. RLS ポリシーが本番と同一であることを確認

### 3. Stripe テストモード

ステージング環境では Stripe の **テストモード** を使用します。
- `STRIPE_SECRET_KEY` = `sk_test_...`
- テストカード: `4242 4242 4242 4242`
- Webhook をステージングURLに向ける

## デプロイフロー

```
feature-branch → staging → main
        ↓            ↓         ↓
      PR作成   ステージング検証  本番デプロイ
```

### ステージングへのデプロイ

```bash
# feature ブランチから staging にマージ
git checkout staging
git pull origin staging
git merge feature/your-branch
git push origin staging
```

Vercel が自動的にプレビューデプロイを実行します。

### 本番へのデプロイ

```bash
# staging の検証完了後、main にマージ
git checkout main
git pull origin main
git merge staging
git push origin main
```

## CI パイプライン

`staging` ブランチへの push/PR で以下が自動実行されます:

1. **Lint + TypeCheck + Unit Tests**
2. **E2E Tests** (ステージング環境変数を使用)
3. **Vercel Preview Deploy** (自動)

## 検証チェックリスト

ステージングで以下を確認してから本番デプロイ:

- [ ] ログイン・ログアウトが正常に動作する
- [ ] 証明書の発行・PDF出力が動作する
- [ ] Stripe 決済フロー（テストカード）が完了する
- [ ] Cron ジョブが正常実行される（手動トリガー）
- [ ] メール送信が正常に動作する
- [ ] 新機能の動作確認
- [ ] モバイル表示の確認
- [ ] パフォーマンス（ページロード3秒以内）

## トラブルシューティング

### ステージングのマイグレーションが古い

```bash
npx supabase db push --project-ref <staging-project-ref>
```

### 環境変数が反映されない

Vercel ダッシュボードで Environment Variables の **スコープ** が「Preview」に設定されているか確認。
変更後は再デプロイが必要:

```bash
git commit --allow-empty -m "trigger redeploy"
git push origin staging
```
