# SLO / Error Budget

Ledra の主要サービスレベル目標 (Service Level Objective) と
Error Budget を定義する。SLI (Indicator) は Vercel + Sentry +
Stripe Dashboard で計測可能なものに限る。

## 全体方針

- 評価期間: **直近 30 日 rolling**
- SLO 違反時: Sentry → PagerDuty → on-call が起票
- 月次レビュー: SLO 達成状況を `docs/operations/incident-log.md` に記録

## SLO 一覧

| ID | Service | SLI | SLO | Error Budget (30d) |
|----|---------|-----|-----|--------------------|
| **A1** | Web availability | `/` の HTTP 2xx 率 (Vercel observability) | **99.9%** | 43 分 |
| **A2** | API availability | `/api/*` の HTTP < 5xx 率 (Sentry transactions) | **99.5%** | 3.6 時間 |
| **L1** | Page latency | `/` LCP p75 (Vercel Speed Insights) | **< 2.5s** | 25% of users may exceed |
| **L2** | API latency | route handler p99 (Sentry) | **< 1500ms** | 1% violations OK |
| **B1** | Stripe webhook | `stripe_processed_events.delivered_at - received_at` p99 | **< 30s** | 1% violations OK |
| **B2** | Cron success | `/api/cron/*` の成功率 | **99%** | 7 / 30 日まで失敗 OK |
| **B3** | Outbox delivery | `outbox_events` で 24h 以内に delivered | **99%** | 1% dead_letter OK |
| **C1** | OTP delivery | request-code → 受信ログ間隔 (Resend webhook) | **< 60s** | 5% may exceed |
| **C2** | Certificate PDF | issue → PDF available 時間 | **< 5s** | 5% may exceed |

## Error Budget 消費ルール

| 消費率 | アクション |
|-------|-----------|
| < 50% | 通常運用。新機能リリース可 |
| 50-80% | リリース凍結はしないが、**新規機能は SLO 影響を必ず計測**する |
| 80-100% | リリース凍結。修正のみマージ可。ポストモーテム必須 |
| > 100% | インシデント対応モード。事業影響評価 + Customer Comms |

## SLI 計測方法

### A1 / A2 (availability)
- Vercel ダッシュボード `Observability → Web Vitals` のステータスコード分布
- Sentry の `event.contexts.response.status_code` を 30d で集計

### L1 (LCP)
- `@vercel/speed-insights` 自動計測 (instrumentation-client.ts で配線済)
- 月次で `/admin/site-content/*` 等の重い画面の p75 を抜き出し

### L2 (API p99)
- Sentry Performance → Transaction Summary の Duration p99
- route 単位 (`op:http.server`) で集計

### B1 (Stripe webhook latency)
- `src/app/api/stripe/webhook/route.ts` の冒頭で `received_at` を計測 →
  Sentry transaction の duration として記録

### B2 (Cron success)
- `withCronLock` から logger に `cron_run_*` ログを出している
- 30 日 rolling で `failed / total` を集計 (Vercel Log Drain → BigQuery)

### B3 (Outbox)
- `select count(*) from outbox_events where status='dead_letter' and created_at > now() - interval '30 days'`
  / 同期間の総 enqueue 数

### C1 (OTP)
- `src/app/api/customer/request-code/route.ts` で `requestId` を log
- Resend webhook (`/api/webhooks/resend`) の `delivered` event ログとの diff

### C2 (Certificate PDF)
- 証明書発行 API のログに `issued_at`、PDF 生成エンドポイントに `pdf_ready_at`

## 残作業

- [ ] Vercel observability から SLO 自動レポート生成 (`scripts/slo-report.ts`)
- [ ] Sentry に SLO breach の Saved Search を保存
- [ ] PagerDuty 連携 (Sentry → PD action)
- [ ] 顧客向け status page (`status.ledra.co.jp`) の整備
