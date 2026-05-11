# 災害復旧 (DR) ランブック — Supabase

> 対象: Ledra 本番 Supabase プロジェクト
> 目的: データ損失・全停止に対する **RPO ≤ 24h / RTO ≤ 4h** を担保する
> 関連: `docs/operations-guide.md` (通常運用)、`docs/staging-environment.md` (staging)、
> `docs/architecture-roadmap.md` §3 (SPOF 対策)

---

## 0. 全体方針

| 項目 | 値 |
|---|---|
| **RPO** (許容データ損失) | **24時間** (PITR で 7日まで巻き戻し可能) |
| **RTO** (復旧時間目標) | **4時間** |
| **バックアップ保持期間** | 30日 (Pro plan の自動バックアップ) |
| **PITR 粒度** | 1分 (Pro plan 必須) |
| **Read Replica** | 1台 (East Asia, eventual consistency) |
| **対象テーブル** | 全 public schema + auth + storage.objects metadata |

---

## 1. 事前設定 (Lighthouse 接続前に完了)

### 1.1 Supabase Pro へのアップグレード

無料プランでは PITR / Read Replica は利用できない。Pro 必須。

```
Supabase Dashboard
  → Project Settings → Billing → Upgrade to Pro
```

### 1.2 PITR 有効化

```
Supabase Dashboard
  → Project Settings → Database → Point in Time Recovery
  → Enable PITR (1 minute granularity)
```

確認:
- `pg_dump --version` で WAL 設定が `wal_level=logical` になっていれば PITR は動作中
- 1日後に Dashboard の "Backups" タブに "PITR window: 2026-05-10 → 2026-05-17" のような帯が表示される

### 1.3 Read Replica 作成

```
Supabase Dashboard
  → Project Settings → Database → Read Replicas → Add Replica
  → Region: ap-northeast-1 (Tokyo) ※プライマリと同じ地理リージョン
```

作成完了後、Replica 用エンドポイント URL を取得し、Vercel 環境変数に登録:

```
SUPABASE_REPLICA_URL = https://<id>-replica.supabase.co
```

未設定だと `getReadReplica()` は自動的にプライマリにフォールバックする。

### 1.4 ヘルスチェック登録

- 監視: `https://app.ledra.co.jp/api/health` を 60秒ごとに probe
  - 200: 全機能 healthy
  - 503: degraded — `checks.database` または `checks.database_replica` を見て切り分け
- 通知先: ops Slack `#ledra-ops` + email `ops@ledra.co.jp`

---

## 2. 障害シナリオ別 対応手順

### 2.1 プライマリ DB がレイテンシ高 / read query が詰まる

**症状**: ダッシュボードが重い、`/v/[vin]` で 504 が出る、Sentry に `statement timeout` が増える

**対応**:
1. Vercel ダッシュボードで `SUPABASE_REPLICA_URL` が設定済か確認
2. `/api/health` の `checks.database_replica.ok` が `true` か確認
3. 設定済 + replica OK なら、anonymous read 系 (`/v/[vin]` `/c/[public_id]`) は既に replica 経由。primary 側で遅いクエリを `pg_stat_statements` で特定:
   ```sql
   SELECT query, calls, mean_exec_time, total_exec_time
   FROM pg_stat_statements
   ORDER BY total_exec_time DESC
   LIMIT 20;
   ```
4. 必要に応じて index 追加 → 別 PR で migration として投入

### 2.2 プライマリ DB がダウン (全機能停止)

**症状**: `/api/health` が 503、`checks.database.ok=false`

**対応**:
1. **Supabase Status** を確認: https://status.supabase.com/
2. プロバイダ側の障害: 復旧を待つ。同時に Vercel で **マルチテナント全体への通知** を出す
   - `/admin/platform/operations` から手動でステータス更新 (将来的に自動化)
3. プロバイダ側ではなく独自設定の問題 (例: connection pool 枯渇):
   - Supabase Dashboard → Database → Connection Pooling で `pool_size` を確認
   - 必要なら `transaction` モード → `session` モードへ一時切替

### 2.3 データ破損 / 誤 UPDATE / 誤 DELETE

**症状**: 特定 tenant のデータが消えた・上書きされた

**対応** (PITR):
1. **誤操作の時刻を特定**: `audit_logs` テーブルや Vercel ログから「事故の直前」のタイムスタンプを得る (例: `2026-05-11 14:32:10Z`)
2. **Branch を作成**: Supabase MCP 経由で staging Branch を切る
   ```
   mcp__supabase__create_branch(name: "dr-pitr-20260511")
   ```
   作成された Branch は PITR から `2026-05-11 14:30:00Z` 時点のデータでセットアップする (Supabase Dashboard → Branches → New Branch → restore_from_pitr)
3. **失われた row を抽出** (Branch の DB に接続):
   ```sql
   SELECT * FROM certificates WHERE tenant_id = '<tenant>' AND created_at < '2026-05-11 14:32:10';
   ```
4. **CSV エクスポート → 本番へインポート**:
   - 影響範囲が <100 行なら手動 INSERT (audit_logs に DR コメントを残す)
   - 1000 行超なら本番 DB を PITR で `2026-05-11 14:30:00Z` に巻き戻す判断もあり。経営判断必要 (戻すと事故以後の全 write が消える)

### 2.4 プロジェクト全損 (リージョン障害 / アカウント乗っ取り)

**症状**: Supabase Dashboard へログイン不能、プロジェクトが消えた

**対応**:
1. Supabase サポートに連絡: support@supabase.com (24h 対応)
2. 並行して、ローカルに保存されている **直近の自動バックアップダウンロード** から新プロジェクトを起こす:
   - 自動バックアップは `Project Settings → Database → Backups` から 30日分 DL 可能
   - Lighthouse 1社接続後は **毎週金曜に手動 DL → S3 (encrypted) に保管** を運用に組み込む (TODO)
3. 新プロジェクトに restore 後、Vercel の env vars を新 URL/Key に切替えてデプロイ

---

## 3. 定期演習 (Quarterly)

四半期に1回、以下を実施:

- [ ] PITR から Branch を作成し、`2025-XX-XX` 時点のテストデータが期待通り再現できるか確認 (~30分)
- [ ] Read Replica のレプリケーション遅延を測定:
  ```sql
  -- primary 側
  SELECT pg_current_wal_lsn();
  -- replica 側 (同タイミング)
  SELECT pg_last_wal_replay_lsn();
  ```
  → 通常 <1MB 遅延。10MB 超なら通信経路を疑う
- [ ] `/api/health` を意図的に 503 にして、監視 → 通知 のチェーンが動くか確認

---

## 4. 設定の Source of Truth

| 設定項目 | 場所 |
|---|---|
| PITR 有効/無効 | Supabase Dashboard (UI のみ、IaC 化未対応) |
| Read Replica URL | Vercel env `SUPABASE_REPLICA_URL` |
| 監視先 | Vercel Monitor / external uptime tool (Better Uptime / Pingdom) |
| 復旧担当者 | CEO + 当番エンジニア (週次ローテーション) |
| エスカレーション | Supabase support → CTO 直通 |

---

## 5. コード側のフック

| ファイル | 役割 |
|---|---|
| `src/lib/supabase/readReplica.ts` | replica-aware client。env 未設定時は primary に透過フォールバック |
| `src/app/api/health/route.ts` | DB + replica の reachability を 1 endpoint で返す |
| `src/lib/passport/getPassportData.ts` | `/v/[vin]` の read を replica 経由に固定済 |

新しい anonymous public read path / dashboard 集計 read を追加する際は、
`getReadReplica("用途の breadcrumb")` を経由させること。書き込みは
**必ず** `createServiceRoleAdmin()` / `createTenantScopedAdmin()` を使う
(replica は read-only のため write は実行時例外になる)。
