# データ保持ポリシー

各テーブルの retention 期間と削除ポリシー。`/api/cron/data-retention` が
日次で実行し、期限超過行を物理削除またはアーカイブする。

## ポリシー一覧

| テーブル | 保持期間 | 削除ポリシー | 根拠 |
|---------|---------|-------------|------|
| `customer_login_codes` | **30 日** | 物理削除 | OTP 履歴。攻撃調査用に 30 日あれば十分 |
| `customer_sessions` | **revoked_at + 90 日** | 物理削除 | revoke 後の調査用 |
| `audit_logs` (一般) | **2 年** | アーカイブ → 削除 | コンプラ + 訴訟対応 |
| `audit_logs` (billing) | **7 年** | アーカイブのみ | 国税法 (帳簿書類) |
| `notification_logs` | **180 日** | 物理削除 | 配送調査用 |
| `outbox_events` (delivered) | **90 日** | 物理削除 | 既配送の証跡が不要になる時点 |
| `outbox_events` (dead_letter) | **2 年** | 保持 | 障害調査 + 是正記録 |
| `stripe_processed_events` | **90 日** | 物理削除 | 冪等性チェックの window |
| `inventory_movements` | **無期限** | 保持 | 監査証跡 |
| `certificates` | **無期限** | 論理削除 (status='archived') | 顧客の権利 / 改ざん検知の信頼性 |
| `vehicle_passports` | **無期限** | 論理削除 | 同上 |
| `customer_data_exports` | **作成後 7 日** | 物理削除 | DSAR ダウンロード期限 |

## 削除リクエスト (個人情報保護法 第 30 条 / GDPR 第 17 条)

`/api/customer/data-deletion` を経由した削除リクエストは:

1. `customer_deletion_requests` に `status='pending'` で作成
2. 30 日のクーリングオフ期間 (誤請求 + 加盟店からの異議申立用)
3. 期間経過後、cron が以下を実行:
   - `customers` 行を `is_deleted=true` + PII (name/email/phone) を NULL 化
   - `certificates.customer_id` は残置 (証明書の改ざん検知信頼性のため)
   - `customer_sessions` を物理削除
   - `customer_login_codes` を物理削除

完全な物理削除ではなく **PII の匿名化** に留めるのは、ブロックチェーン
アンカーされた証明書ハッシュとの整合性を保つため (証明書本体は
「誰が施工したか」のテナント側情報なので削除しない)。

## 実装

cron route: `src/app/api/cron/data-retention/route.ts` (実装済)

スケジュール: `vercel.json` の cron で日次 (03:00 JST) 実行。
処理時間が `maxDuration` (60s) を超える場合は QStash に分割。

## 残作業

- [ ] アーカイブ先 (S3 / R2) の構成と書き出しスクリプト
- [ ] `customer_data_exports` テーブル (今は API レスポンスのみ。
      非同期生成 + 7 日保管にしたら削除対象になる)
- [ ] 顧客向け削除リクエスト UI
- [ ] 法務レビュー済の retention table を `tokusho` ページに転載
