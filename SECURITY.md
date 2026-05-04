# Security at Ledra

このドキュメントは、エンタープライズ調達セキュリティ・PoC 期間中の
質問対応・脆弱性報告窓口を一元化したものです。最新版は常に main の
このファイルを参照してください。

## 1. 報告窓口 (Vulnerability Disclosure)

- **メール**: `security@ledra.co.jp` (環境変数 `SECURITY_CONTACT_EMAIL` で上書き可)
- **`/.well-known/security.txt`**: RFC 9116 形式で公開
- **応答 SLA**: 受領確認 48 時間以内 / トリアージ 5 営業日以内
- **Safe Harbor**: 善意のセキュリティ研究者は responsible disclosure を
  守る限り、法的措置の対象外とします

## 2. 多層防御の構成

| 層 | 実装 | 主な攻撃シナリオ対策 |
|---|---|---|
| TLS / HSTS | Vercel + HSTS 2 年 (`includeSubDomains`) | MITM, downgrade |
| ネットワーク境界 | Vercel Edge + Upstash Redis レート制限 (300/60s/IP) | DDoS, scraping |
| アプリ境界 (CSRF) | `proxy.ts` で Origin/Host 一致検証 | CSRF |
| アプリ境界 (CORS) | `cors.ts` で Origin allowlist | リフレクション CORS |
| アプリ境界 (Content-Type) | `proxy.ts` で `application/json` 強制 | form-CSRF, MIME confusion |
| アプリ境界 (CSP) | nonce per-request, `frame-ancestors 'none'`, `upgrade-insecure-requests`, `report-to` | XSS, clickjacking, mixed-content |
| 入力検証 | Zod + `inputLimits.ts` 上限定数 | DoS, ReDoS, log injection |
| ファイルアップロード | `fileValidation.ts` マジックバイト + path-traversal sanitization | MIME confusion, file polyglot |
| SSRF | `ssrf.ts` で IPv4/IPv6 + RFC1918 + メタデータ全拒否 | SSRF, IMDS exfil |
| 認証 (per-IP) | Upstash sliding window | brute force |
| 認証 (per-account) | `accountLockout.ts` 5 失敗で 15 分ロック | credential stuffing |
| 認証 (session) | Supabase Auth JWT, cookie に Secure / HttpOnly / SameSite=lax 強制 | session hijacking |
| 認可 | Supabase RLS + `requireMinRole` チェック | tenant escape, privilege escalation |
| Webhook 署名 | Stripe / Svix / Square / LINE / QStash の HMAC + timing-safe compare | webhook spoofing, replay |
| Idempotency | `withIdempotency` Redis-backed | double charge, retry safety |
| 機微データ at-rest | AES-256-GCM (`secretBox.ts`) + 32-byte 鍵 | DB breach |
| 監査ログ | `admin_audit_logs` + `auditChain.ts` ハッシュチェーン | log tampering |
| 観測 / インシデント検知 | Sentry + 構造化ログ + honeypot ルート | 不正アクセス検知, post-mortem |

## 3. Secret 管理

| Secret | 用途 | ローテーション間隔 | 場所 |
|---|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | DB admin | 90日 | Vercel env |
| `SECRET_ENCRYPTION_KEY` | テナント機微情報 AES-256-GCM | 12ヶ月 (key version で gradual rollout) | Vercel env |
| `CRON_SECRET` | Vercel Cron HMAC | 90日 | Vercel env |
| `CUSTOMER_AUTH_PEPPER` | OTP ペッパー | 12ヶ月 | Vercel env |
| `STRIPE_WEBHOOK_SECRET` | Stripe 署名検証 | Stripe ローテーション時 | Vercel env |
| `QSTASH_TOKEN` | QStash 認証 | 90日 | Vercel env |
| `SECURITY_LOG_SALT` | 監査ログ IP ハッシュソルト | 24ヶ月 | Vercel env |

ローテーション手順は [`docs/operations/key-rotation.md`](docs/operations/key-rotation.md) 参照。

## 4. データ保護

- **暗号化 (in transit)**: TLS 1.2+ 強制 (HSTS / `upgrade-insecure-requests`)
- **暗号化 (at rest)**: Supabase は AES-256 で全列を暗号化、機微フィールドは
  追加で AES-256-GCM (`SECRET_ENCRYPTION_KEY`) で二重暗号化
- **PII 最小化**: ログ・Sentry イベントから email / IP / Authorization /
  Cookie / 各種 webhook 署名を自動 redact
- **アクセス制御**: Supabase RLS + `tenant_memberships` でテナント単位
  分離、Service Role はサーバ側のみ使用

## 5. CI / CD セキュリティ

| 項目 | ツール | 失敗時の挙動 |
|---|---|---|
| SAST | CodeQL (security-extended クエリ) | PR を blocking |
| 秘密漏洩検出 | gitleaks | PR を blocking |
| 依存 CVE スキャン | `npm audit --audit-level=high` + dependency-review-action | PR を blocking |
| 依存ライセンス審査 | dependency-review-action (deny: AGPL/GPL/SSPL) | PR を blocking |
| ファイルシステム脆弱性 | Trivy fs (HIGH/CRITICAL → SARIF) | weekly + PR で警告 |
| Lint / Type / Test | ESLint + tsc + vitest | PR を blocking |
| Pre-commit | husky + lint-staged | local commit を blocking |

## 6. インシデントレスポンス

1. **検知**: Sentry alert / honeypot hit / 顧客通報
2. **初動**: 環境変数 `RATE_LIMIT_FAIL_CLOSED=1` で API を fail-closed 化、
   必要なら影響テナントを `tenants.is_suspended=true` で隔離
3. **封じ込め**: 漏洩した secret を `docs/operations/key-rotation.md`
   手順でローテ
4. **根絶**: 攻撃 IP を Vercel WAF / Cloudflare で永久 deny
5. **復旧**: 修正 deploy 後、`captureSecurityEvent("incident_resolved")`
   で記録し PR で post-mortem 文書化
6. **学習**: 30 日以内に内部レビュー、CSP / RLS / CI に追加検査を反映

## 7. 監査・準拠

- ISO 27001 / SOC 2 Type II の準拠を 2026 年中に取得予定
- 監査ログは `admin_audit_logs` テーブル + ハッシュチェーン
  (`auditChain.ts`) で改ざん検知
- データ削除要求 (GDPR / 個情法) は契約上 30 日以内に対応

## 8. 既知の制限 / 今後の改善

- DNS rebinding 完全対策には fetch 直前の IP 再解決が必要 (現状: 静的
  ホスト名 allowlist + 内部 CIDR ブロック)
- WebAuthn / Passkey: 2026 Q3 投入予定
- TOTP MFA: 管理者ロールは 2026 Q2 必須化予定
- HSM 鍵管理 (AWS KMS / GCP KMS) への移行: 2026 Q4 計画

最終更新: 2026-05-04
