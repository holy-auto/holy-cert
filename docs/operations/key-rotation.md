# Key Rotation Runbook

このドキュメントは Ledra で使用している secret / 暗号鍵のローテーション
手順を一覧化したものです。事故時の緊急ローテと、定期ローテの両方に対応
できるよう構成しています。

## 共通原則

1. **ローテーションは段階的に行う**: 旧鍵で復号できなくなる瞬間を作らない
2. **本番反映前に staging で動作確認**: 環境変数差し替え + smoke test
3. **完了後 90 日は旧鍵を保管**: ロールバックや過去ログ復号のため
4. **ローテーション履歴は `admin_audit_logs` に記録**

## SECRET_ENCRYPTION_KEY (テナント機微情報の AES-256-GCM)

最重要鍵。LINE channel secret / Square OAuth tokens / Google Calendar
tokens を保護している。

### 段階的ローテーション (推奨, 計画的)

```bash
# 1. 新鍵を生成
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 2. Vercel に v2 として登録 (旧鍵は v1 で残す)
vercel env add SECRET_ENCRYPTION_KEY_V2 production
# v1 -> v2 への versioning は src/lib/crypto/secretBox.ts の VERSION
# 識別子で行う (envelope に "v1." / "v2." prefix が付く)

# 3. 全 tenant 機微情報を v2 で再暗号化 (バックグラウンドジョブ)
#    /api/admin/platform/encrypt-secrets-backfill?from=v1&to=v2

# 4. 30 日経過後、v1 鍵を削除
vercel env rm SECRET_ENCRYPTION_KEY production
vercel env mv SECRET_ENCRYPTION_KEY_V2 SECRET_ENCRYPTION_KEY production
```

### 緊急ローテーション (鍵漏洩時)

1. `RATE_LIMIT_FAIL_CLOSED=1` で API を fail-closed 化
2. 即座に新鍵を生成、`SECRET_ENCRYPTION_KEY` を上書き
3. すべての tenant 機微情報を `/api/admin/platform/encrypt-secrets-backfill`
   で再暗号化
4. 旧鍵で暗号化された外部トークン (Square OAuth / LINE) は
   各テナントから再連携を依頼
5. インシデントを `admin_audit_logs` に `key_rotation_emergency` で記録

## CUSTOMER_AUTH_PEPPER

OTP コードの pepper。ローテすると過去の OTP が即無効化されるため、
ローテ時は計画ダウンタイムを取る。

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
vercel env add CUSTOMER_AUTH_PEPPER production
```

## CRON_SECRET / QSTASH_TOKEN

外部スケジューラ署名用。ローテ時は Vercel Cron / QStash 側も同時更新する。

```bash
# 1. 新値を生成
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 2. Vercel + QStash 双方を更新 (順序は QStash → Vercel 側)
vercel env add CRON_SECRET production
# QStash dashboard で signing key を新値に変更

# 3. cron 動作を 1 サイクル確認
```

## STRIPE_WEBHOOK_SECRET

Stripe の "Roll secret" 機能を使う。30 分の重複期間が自動で設けられる。

```bash
# 1. Stripe Dashboard → Webhooks → Roll signing secret
# 2. 新 secret を Vercel に反映
vercel env add STRIPE_WEBHOOK_SECRET production
# 3. 30 分以内に deploy 完了させる
```

## SUPABASE_SERVICE_ROLE_KEY

Supabase ダッシュボードの Settings → API → "Reset service role key"。
反映後すべての server-side ジョブが再起動するまで 30 秒の DB アクセス
失敗が発生し得るため、低トラフィック帯に実施。

## SECURITY_LOG_SALT

監査ログの IP ハッシュソルト。ローテすると過去ログとの突合ができなくなる
ため、調査用途で 24 ヶ月保持してから入れ替える。

## 確認チェックリスト

- [ ] 新鍵生成 → 強度 (32 byte / base64) を確認
- [ ] staging に投入 → smoke test (login / OTP / Stripe webhook / cron)
- [ ] 本番に投入
- [ ] 30 分後に Sentry でエラー急増がないか確認
- [ ] `admin_audit_logs` に `key_rotation` レコードを残す
- [ ] 旧鍵を金庫 (1Password / Vault) に保管、削除予定日を記録
