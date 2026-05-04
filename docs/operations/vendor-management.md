# ベンダー / 第三者リスク管理

SOC 2 CC9.2 / ISO 27001 A.15 / 個情法 (委託先の監督) に対応するベンダー
評価と継続管理プロセス。

## 1. 利用中ベンダー一覧

| ベンダー | 用途 | 個人情報を扱うか | DPA 締結 | SOC 2 報告書受領 |
|---|---|---|---|---|
| Vercel | ホスティング, edge | あり (リクエストログ経由) | 済 | 年次取得 |
| Supabase | DB / Auth / Storage | あり (本体) | 済 | 年次取得 |
| Upstash | Redis (rate limit / idempotency) | 限定 (IP ハッシュのみ) | 済 | 年次取得 |
| QStash | 非同期ジョブ | なし | 済 | - (Upstash 経由) |
| Stripe | 決済 | あり (支払者情報) | 済 (DPA web から) | 年次取得 |
| Resend | メール送信 | あり (受信者メール) | 済 | 年次取得 |
| Anthropic | LLM | 限定 (LLM 入力) | 済 | 年次取得 |
| Sentry | エラー監視 | 最小化済 (PII redact) | 済 | 年次取得 |
| PostHog | プロダクト分析 | 匿名 ID のみ | 済 | 年次取得 |
| Polygon | ブロックチェーン | なし (公開チェーン) | - | - |
| Pinata | IPFS | なし | - | - |
| Hive | コンテンツモデレーション | あり (画像) | 済 | 年次取得 |
| Square | POS 連携 | あり | 済 | 年次取得 |
| LINE | LINE 公式アカウント | あり | 済 | LINE Yahoo の規約 |
| Google Calendar | 予約連携 | 限定 | 済 | Google Workspace |

## 2. 新規ベンダー導入時のチェックリスト

新しい SaaS / API 連携を導入する前に、以下を確認:

- [ ] **データ分類**: 何を渡すか (個人情報 / 機微情報 / メタデータのみ)
- [ ] **DPA / データ処理契約**: 個人情報を渡す場合は必須
- [ ] **ベンダーの認証**: SOC 2 / ISO 27001 / Privacy Shield 後継 (DPF) を
      取得しているか
- [ ] **保管国**: GDPR / 個情法の越境移転規制を確認 (中国 / ロシア NG)
- [ ] **退会時のデータ削除**: 解約後何日でデータが消えるか確認
- [ ] **インシデント通知**: 漏洩時にこちらに 24 時間以内通知してくれるか
- [ ] **副処理者**: ベンダーが更に外部委託する先を開示してもらう
- [ ] **コスト**: 価格 / 請求形態 / vendor lock-in 度合い
- [ ] **代替候補**: 1 社停止リスクに備えて代替案を 1 つ持つ

承認は CTO 1 名で可。記録は `docs/audits/vendor-onboarding-YYYY-MM.md`
に残す。

## 3. 年次レビュー

毎年 1 月に全ベンダーの再評価を実施:

- [ ] SOC 2 / ISO 27001 報告書の最新版を入手
- [ ] DPA が有効か (改定があれば再締結)
- [ ] 利用状況: 実際使っているか / コスト効率
- [ ] インシデント発生有無 (ベンダー側で過去 1 年間に重大事故があったか)
- [ ] 副処理者リストの変動

結果は `docs/audits/vendor-review-YYYY.md` に集約。

## 4. ベンダー側でインシデントが起きた場合

ベンダーから漏洩通知を受けたら:

1. 影響範囲を 4 時間以内に確認 (どの顧客の何のデータが影響か)
2. `docs/operations/incident-response.md` の P1 フローを起動 (Ledra 自身の
   インシデントと同等に扱う)
3. 影響顧客への通知は **Ledra から自前で出す** (ベンダー任せにしない)
4. ベンダーの post-mortem を待たず、Ledra 側でも独自の調査を実施

## 5. ベンダー切り替え準備 (BCP)

主要ベンダーの代替候補を平時から決めておく:

| 主 | 副 |
|---|---|
| Vercel | AWS Amplify / Cloudflare Workers |
| Supabase | Firebase / 自前 PostgreSQL on Render |
| Upstash | AWS ElastiCache / Cloudflare KV |
| Stripe | PAY.JP / Square (国内決済) |
| Resend | SendGrid / Mailgun |
| Sentry | Datadog / Honeybadger |

主ベンダー停止時に最低 24 時間で副に切り替える migration script を
作っておく (実装は将来検討、現時点では候補のみ持つ)。
