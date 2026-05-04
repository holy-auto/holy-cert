# Sentry アラート設定

`captureSecurityEvent()` で送信する `security_event` タグと、エラー全体を
監視するためのアラート設定。Sentry Dashboard → Alerts → New Alert Rule
で以下を作成する。

## アラート閾値の方針

- **誤検知より見落としが致命的**: 閾値は控えめに設定する (アラート疲労より
  対応漏れの方がリスクが大きい)
- **平日 / 休日で挙動が変わるイベントは時間帯指定を入れる** (例: 不正ログイン
  試行は休日深夜が多い)
- **Slack `#security-alerts` チャンネルに集約**: メールは見逃しやすい

---

## 1. P0 / P1 候補 (即時対応必要)

### A. Webhook 署名検証失敗
- **条件**: `tags.security_event:webhook_signature_failed` の件数が
  10 分間で 5 件以上
- **意味**: 攻撃者が webhook を偽装している可能性
- **通知**: Slack `#security-alerts` + 電話 (PagerDuty)
- **対応**: incident-response.md の P1 フロー

### B. レート制限が機能していない
- **条件**: `tags.security_event:rate_limit_unavailable` が 5 分間で
  3 件以上
- **意味**: Upstash Redis 障害 / 設定ミス
- **通知**: Slack
- **対応**: Upstash 状況確認 → 必要なら `RATE_LIMIT_FAIL_CLOSED=1`

### C. テナント越境アクセス試行
- **条件**: `tags.security_event:tenant_isolation_violation` が発生
- **意味**: ユーザーが他テナントのデータにアクセスしようとした
- **通知**: Slack 即時 + 電話
- **対応**: ユーザー特定 → アカウント停止 → 監査ログ調査

### D. Honeypot 集中ヒット
- **条件**: 同一 `extras.ip_hash` から `security_event:honeypot_hit` が
  1 時間で 20 件以上
- **意味**: 自動スキャナによる執拗な探索
- **通知**: Slack
- **対応**: Vercel WAF で当該 IP / IP レンジを block

### E. アカウントロック多発
- **条件**: `security_event:auth_failed` が同一ユーザーで 1 時間 50 件以上、
  または異なる IP 30 種以上から同一アカウントへ
- **意味**: credential stuffing
- **通知**: Slack + 当該ユーザーへメール (パスワード変更を促す)

### F. Idempotency 競合急増
- **条件**: `security_event:idempotency_conflict` が 10 分で 20 件以上
- **意味**: クライアント側のバグ or リプレイ攻撃
- **通知**: Slack

### G. CSP 違反スパイク
- **条件**: `security_event:csp_violation` が 1 時間で 100 件以上
- **意味**: 攻撃 / 新規 CSP 違反コードの混入 / 第三者スクリプト変更
- **通知**: Slack
- **対応**: 違反ディレクティブを確認、必要なら CSP 更新

---

## 2. P2 候補 (4 時間以内対応)

### H. エラー率
- **条件**: 全 `level:error` が直近 5 分平均で 1% を超える
- **通知**: Slack

### I. 暗号化失敗
- **条件**: `security_event:secret_decryption_failed` が発生
- **意味**: 鍵不一致 / DB データ破損
- **通知**: Slack

### J. Cron 失敗
- **条件**: `tags.cron_job:*` で error が連続 2 回
- **通知**: Slack
- **対応**: Cron lock 状況 + Upstash 接続確認

---

## 3. P3 (週次レビュー)

### K. 想定外 4xx
- **条件**: `tags.api.status:415` (Content-Type rejected) が週 50 件以上
- **意味**: クライアント側の実装ミス or 攻撃の予兆
- **通知**: 週次レポートに含める

### L. 401/403 集中
- **条件**: 同一 IP から 401/403 が 1 時間で 100 件以上
- **意味**: 列挙攻撃 / SDK のバグ
- **通知**: 日次レポート

---

## 4. PII 漏洩監視 (Sentry 内部)

`sentry.server.config.ts` の `beforeSend` で query / headers / body を
redact 済みだが、設定漏れの可能性に備えて以下を監視する:

- **Sentry Audit Log で "PII detected" が出たアイテムをチェック**
- **イベント本文を週 1 でランダムサンプル目視**
- 漏洩発見時は `beforeSend` の redact リストに追加 + Sentry の
  `Settings → Security & Privacy → Data Scrubbing` も併用

---

## 5. アラート Runbook の Slack 統合

各アラートには Slack 通知メッセージに以下のリンクを含める:

```
[Sentry issue] {{event.url}}
[Runbook] https://github.com/holy-auto/Ledra/blob/main/docs/operations/incident-response.md
[On-call] @founder
```

これで 3 クリック以内に対応開始できる。

---

## 6. アラート設定変更履歴

ここに変更日 / 変更者 / 理由を追記すること。誤検知が多いから閾値を緩めた、
の判断履歴を残すことで観察期間と監査対応に役立つ。

| 日付 | 変更 | 理由 |
|---|---|---|
| 2026-05-04 | 初版 | プラットフォーム整備に伴い |
