# オンボーディング / オフボーディング セキュリティチェックリスト

SOC 2 CC6.2 / ISO 27001 A.7 / A.9.2 で最頻出の指摘ポイント。新規参加者・
退職者の両方で、アクセス権の付与 / 失効を **タスク化して記録する**
ことが大事。

## 1. オンボーディング (新規メンバー)

### 入社初日 (本人 / マネージャ)

- [ ] 雇用契約書 / NDA / セキュリティ誓約書を取り交わし、PDF を
      `1Password → HR Documents` に保存
- [ ] `SECURITY.md` を読んでもらう
- [ ] セキュリティポリシーへの同意 (年次更新)

### アクセス権付与 (CTO / 兼任)

- [ ] **GitHub** organization 招待 (権限: 役割に応じて Member / Admin)
- [ ] **Vercel** team 招待 (権限: 役割に応じて Member / Owner)
- [ ] **Supabase** project 招待 (Owner は CTO のみ)
- [ ] **Sentry** member 招待
- [ ] **Stripe** account staff 招待
- [ ] **1Password** Vault 招待 (本人専用 Vault + 必要な共有 Vault)
- [ ] **Google Workspace** (`@ledra.co.jp` メール発行)
- [ ] **Slack** ワークスペース招待

### デバイス / 認証

- [ ] 業務 PC は会社支給 / 私物のいずれか明確化
- [ ] **MFA を全サービスで有効化** (SMS は不可、TOTP / Passkey)
- [ ] パスワードはすべて 1Password で管理 (使い回し禁止)
- [ ] フルディスク暗号化 (FileVault / BitLocker) を有効化
- [ ] OS / ブラウザの自動アップデートを有効化

### 入社 1 週間以内

- [ ] `docs/operations/incident-response.md` を読む
- [ ] `docs/operations/security-review-checklist.md` を読む
- [ ] PR を 1 つ通す (環境構築の確認)

### 入社 1 ヶ月以内

- [ ] tabletop drill に参加 (四半期に 1 回開催の次の回)
- [ ] CodeQL / Sentry / Slack `#security-alerts` の見方を学ぶ

---

## 2. オフボーディング (退職者)

### 退職決定〜最終出社日 (HR / マネージャ)

- [ ] 退職同意書 / 機密保持の継続義務 (NDA 退職後 2 年) を再確認
- [ ] 引き継ぎリストを作成 (担当 PR / 進行中タスク / オーナーシップ)
- [ ] 退職日を 1Password の `Offboarding Schedule` に記録

### 最終出社日 / 当日 (CTO)

> **以下を全て** 退職時刻から 1 時間以内に実施。`admin_audit_logs` に
> `actor=cto, action=offboard, target=<email>` で記録すること。

- [ ] **GitHub** organization から remove (個人アカウントは残る)
- [ ] **Vercel** team から remove
- [ ] **Supabase** project から remove
- [ ] **Sentry** member から remove
- [ ] **Stripe** staff から remove
- [ ] **1Password** Vault アクセスを失効、共有 Vault に含まれる
      パスワードはローテーション
- [ ] **Google Workspace** アカウント停止 (削除は法定保管期間後)
- [ ] **Slack** ワークスペース deactivate (履歴は保持)
- [ ] 業務 PC を回収・初期化 (会社支給の場合)
- [ ] 物理アクセスカード回収

### Secret ローテーション (退職者が触れたもの)

退職者が知り得た secret は退職日以内にローテ:

- [ ] `SUPABASE_SERVICE_ROLE_KEY` (Service Role を触れた場合)
- [ ] `STRIPE_SECRET_KEY` (Stripe 管理画面に入った場合)
- [ ] `SECRET_ENCRYPTION_KEY` (暗号化鍵を直接見られた場合)
- [ ] `CRON_SECRET` / `QSTASH_TOKEN` (cron 設計に関わった場合)
- [ ] `CUSTOMER_AUTH_PEPPER` (本番環境変数を読み取れた場合)
- [ ] 1Password 共有 Vault の各種パスワード

ローテーション手順は `docs/operations/key-rotation.md` 参照。

### 退職後 30 日以内

- [ ] アクセス権失効を全サービスで再確認 (取りこぼし防止の二重チェック)
- [ ] Sentry / GitHub Audit Log で不審な活動がないか確認
- [ ] 退職者からの問い合わせ対応窓口を `comms@ledra.co.jp` に集約

---

## 3. 四半期アクセスレビュー (SOC 2 CC6.2 必須)

四半期に 1 回 (1月 / 4月 / 7月 / 10月)、**全アクティブユーザーの権限を
再確認** する。スプレッドシート / Vanta / Drata で記録。

- [ ] GitHub org members の役割が正しいか
- [ ] Vercel team members の権限が正しいか
- [ ] Supabase project members の権限が正しいか
- [ ] `tenant_memberships` の owner / admin role が正しいか
- [ ] `admin_audit_logs` に承認なき role 変更がないか
- [ ] 退職済みなのにアクセスが残っているアカウントがないか

レビュー結果は `docs/audits/access-review-YYYY-Q.md` に保存し、
監査人にいつでも提示できる状態にする。

---

## 4. 委託先 / 業務委託のオンボーディング

正社員と異なり、契約期間が明確な分 access 期限を最初から設定する:

- [ ] 契約書に access 期間 / 終了日を明記
- [ ] GitHub の招待は契約終了日と同じ日付で expiration を設定
      (GitHub の機能で自動失効可能)
- [ ] 1Password の Vault 共有も期間限定
- [ ] 業務委託でも上記 1 と同じ MFA / FileVault は必須
