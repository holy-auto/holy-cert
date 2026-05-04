# SOC 2 Type II 取得準備

エンタープライズ調達で頻繁に求められる SOC 2 Type II 取得への準備状況と
スケジュール。Trust Service Criteria (TSC) の Security / Availability /
Confidentiality を初年度のスコープとする。

> **Type I** = 特定時点の統制設計を評価 (1〜2 ヶ月)
> **Type II** = **6 ヶ月以上の運用記録** を評価 (推奨)

## 1. 全体スケジュール (12 ヶ月)

```
Month 1-2  | Readiness Assessment (gap 分析) ────── 監査前の事前評価
Month 3-4  | gap 修正 sprint
Month 5-10 | 6-month observation period (運用ログを残す)
Month 11   | 監査人によるテスト
Month 12   | レポート発行
```

## 2. 監査ベンダー候補

| ベンダー | 価格目安 | 強み |
|---|---|---|
| Drata + 提携監査人 | $24K-50K/年 (約 350-700万円) | コンプラ自動化 SaaS が強力, 速い |
| Vanta + 提携監査人 | $30K-60K/年 (約 450-900万円) | エコシステム豊富 |
| Secureframe | $20K-40K/年 | 価格バランス |
| 国内会計事務所 (PwC / Deloitte 等) | 1000万円〜 | 国内認知度高、価格高め |

国内エンプラ向けは **ISMAP + ISO 27001 の方が刺さる** ケースが多いので、
SOC 2 が必要な顧客が出てから着手で十分。

## 3. TSC 統制 → 既存実装のマッピング

| TSC | 統制要件 | Ledra の実装 |
|---|---|---|
| **CC1.x 統制環境** | 管理層の責任、ポリシー文書 | `SECURITY.md` / 雇用契約 / コードオブコンダクト |
| **CC2.x コミュニケーション** | 内部 / 外部への伝達 | Slack #security-alerts / `/.well-known/security.txt` |
| **CC3.x リスク評価** | リスク識別と対応 | 四半期 tabletop drill / ペネトレ年 1 回 |
| **CC4.x モニタリング** | 統制の運用評価 | Sentry / GitHub Audit Log / Vercel Analytics |
| **CC5.x 統制活動** | リスク低減策 | RLS / CSP / WAF / CodeQL / gitleaks |
| **CC6.1 論理アクセス** | 認証・認可 | Supabase Auth + `requireMinRole` + RLS |
| **CC6.2 ユーザー登録** | プロビジョン / デプロビジョン | `tenant_memberships` + `admin_audit_logs` |
| **CC6.3 アクセス制限** | 最小権限 | role hierarchy (owner > admin > staff) |
| **CC6.6 境界保護** | 外部からの不正侵入対策 | CSP / CSRF / CORS / SSRF guard / honeypot |
| **CC6.7 データ転送** | 転送中の保護 | TLS 1.2+ / HSTS 2 年 |
| **CC6.8 マルウェア** | マルウェア検知 | `validateFileMagic` / Trivy fs |
| **CC7.1 脆弱性管理** | 脆弱性検知と対応 | CodeQL / Trivy / Dependabot / 年次ペネトレ |
| **CC7.2 イベント検知** | 異常検知 | Sentry alerts (`docs/operations/sentry-alerting.md`) |
| **CC7.3 インシデント対応** | 対応プロセス | `docs/operations/incident-response.md` |
| **CC7.4 復旧** | 修復 | hotfix deploy / DB PITR (Supabase) |
| **CC7.5 学習** | 改善 | Post-mortem + 改善 issue 化 |
| **CC8.1 変更管理** | 本番反映の統制 | GitHub PR + CODEOWNERS + CI 必須 |
| **CC9.1 リスク低減** | BCP / DR | Vercel multi-region / Supabase PITR |
| **CC9.2 ベンダー管理** | 第三者リスク | Stripe / Supabase 等の SOC 2 を受領 |
| **A1.x 可用性** | 稼働監視 / 容量計画 | Vercel uptime / Sentry / weekly metrics |
| **C1.x 機密性** | 機密データ識別 / 保護 | `SECRET_ENCRYPTION_KEY` / RLS / PII redaction |

## 4. 取得前に詰めておくべき統制 (gap)

現状で取得を阻害しないが、観察期間中に強化すべき:

- [ ] **アクセスレビューの定期化** (四半期に 1 回、`tenant_memberships` の
      role を全件確認)
- [ ] **オンボーディング / オフボーディングのチェックリスト化**
      (退職者の Vercel / Supabase / 1Password / GitHub アクセス即時失効)
- [ ] **ベンダーのセキュリティレビュー記録** (Stripe / Supabase /
      Vercel / Upstash の SOC 2 報告書を年次で受領 + ファイリング)
- [ ] **データ保持ポリシー** (退会後の顧客データ削除タイミングを明文化)
- [ ] **バックアップテスト** (DB の PITR を四半期に 1 回試験復元)
- [ ] **従業員教育** (年次セキュリティ研修 + 入社時研修の実施記録)

## 5. Drata / Vanta 等を導入するかの判断軸

導入する: 観察期間中の証跡収集が自動化される (Slack 連携 / GitHub /
Vercel / Supabase の状態を毎日 polling) → 監査負担が劇的に減る

導入しない: 売上数億の段階では月額 $2K の SaaS 費用が重い → スプレッド
シート + GitHub Actions で代替可能

**推奨**: 売上 ARR $500K (年 7,000 万円) を超えたタイミングで Drata 導入を
検討。それまでは GitHub Actions の `weekly-security-report.yml` で代替。

## 6. 取得後の運用負担

- 観察期間中は **証跡を残し続ける**: GitHub の PR レビュー履歴 / Sentry
  アラート対応記録 / 四半期アクセスレビュー
- **年次 surveillance audit** が必要 (2 年目以降): 初年度の 50% 程度の費用
- **重大変更時に監査人に通知** (例: マルチクラウド化、コア認証変更)
