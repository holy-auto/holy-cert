# 機能 ROI ボード — 設計メモ

> 状態: 設計段階 (実装未着手)
> 目的: 「どの機能が ARR / リテンションに効いているか」を 1 画面で見て、
> 機能の凍結・有料アドオン化判断を経営会議の議題にできるようにする
> 関連: `docs/ledra-goals-strategy-2026-05.md` §9 アクション #5、
> `docs/direction-research-loot-drop.md` §6 月次レビュー

---

## 0. なぜ必要か

`goals-strategy-2026-05.md` §6 で自社が結論づけている通り、Ledra は今
「4 ポータル + マーケットプレイス 4 種 + Academy + POS + モバイル +
ブロックチェーン」と面積が広すぎる。Lighthouse 商談を 24 ヶ月で
進めるなら、**ARR に効いていない機能を凍結・アドオン化する判断を
データドリブンで** できないと、引き続き広く薄く維持する罠から
出られない。

`/admin/platform/operations` (プラットフォーム管理画面) に
**「機能 ROI ボード」** ページを追加し、機能ごとに以下を週次で集計する:

---

## 1. メトリクスのスキーマ

機能カテゴリ × tenant × 週 で集計する。

| メトリクス | 計算ロジック | データ源 | 信頼度 |
|---|---|---|---|
| `dau`        | その機能のページ / API を週内で叩いた tenant の user 数 | `audit_logs` / Vercel Analytics | 中 |
| `wau`        | 上記の週内 unique | 同上 | 中 |
| `success`    | 機能の主要アクション (証明書発行 / POS 決済 / 予約確定 / 等) の成功件数 | feature 別に専用テーブル | 高 |
| `failure`    | 同主要アクションのエラー件数 (`error.tsx` / route 内 throw) | Sentry events tagged with `feature_id` | 高 |
| `tenants_using` | 週内に 1 回でも `success > 0` となった tenant 数 | success 集計 | 高 |
| `arr_attribution` | その機能が **必須プラン** にゲートされていれば、そのプランの月額 × 利用 tenant 数 | `plan_features.ts` + `tenants.plan_tier` | 中 |
| `support_load` | その機能に関するサポート問い合わせ件数 | `contact_messages` の自由文に対する LLM 分類 (週次バッチ) | 低 |

ROI = `arr_attribution / engineering_cost_score`
- `engineering_cost_score` は手動で 1〜5 を assign (PR 数や LOC でなく "現場ヒアリングの肌感")。
  → ROI > 1 = 「赤字でない」、ROI > 3 = 「投資継続価値あり」

---

## 2. 機能カテゴリ (初期定義)

| カテゴリ | feature_id | 主要アクション | 必須プラン |
|---|---|---|---|
| 証明書発行 | `cert.issue` | `certificates.status = 'active'` への遷移 | starter |
| 顧客ポータル | `customer.portal` | `customer_sessions` の week-unique | starter |
| 予約 | `reservations` | `reservations.status` の `confirmed → completed` | starter |
| POS | `pos` | `payments.status = 'completed'` | standard |
| インボイス制度 | `invoice.qualified` | `documents.is_invoice_compliant = true` | standard |
| 保険連携 (loose) | `insurer.case_view` | `insurer_access_logs.event_type = 'case_view'` | enterprise |
| Polygon アンカリング | `anchoring.polygon` | `certificate_images.polygon_tx_hash IS NOT NULL` | pro |
| アカデミー | `academy` | `academy_lesson_completions` | standard |
| 車両パスポート | `passport` | `vehicle_passports` の week-active VIN | pro |
| 中古車マーケット | `market.vehicles` | `market_vehicles.published_at` | アドオン (議論中) |
| BtoB / Deals | `btob.deals` | `job_orders.status = 'completed'` | アドオン (議論中) |

---

## 3. 集計テーブル (planned)

```sql
CREATE TABLE feature_metrics_weekly (
  feature_id   text     NOT NULL,
  tenant_id    uuid     NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  week_start   date     NOT NULL,  -- 月曜
  dau          int      NOT NULL DEFAULT 0,
  wau          int      NOT NULL DEFAULT 0,
  success      int      NOT NULL DEFAULT 0,
  failure      int      NOT NULL DEFAULT 0,
  arr_jpy      int      NOT NULL DEFAULT 0,
  support_load int      NOT NULL DEFAULT 0,
  computed_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (feature_id, tenant_id, week_start)
);
```

- 集計 cron: 月曜 04:00 JST に `/api/cron/feature-metrics-rollup` を発火
- 過去 13 週ぶんを保持し、それ以前は `feature_metrics_quarterly` に圧縮 (将来)

---

## 4. UI モック (planned)

`/admin/platform/operations/roi-board`:

```
┌─ Feature ROI Board (2026 W19) ────────────────────────┐
│                                                       │
│  Feature           ARR(月) │ Tenants │ Success │ ROI │
│  ─────────────────────────────────────────────────── │
│  ✅ cert.issue     ¥4.2M   │  84/120 │  3,219  │ 5.1 │
│  ✅ pos            ¥1.8M   │  47/120 │  9,872  │ 4.2 │
│  🟡 customer.portal ¥1.2M  │  61/120 │  -      │ 3.0 │
│  ⚠ market.vehicles ¥0.0M  │   3/120 │     17  │ 0.1 │  ← 凍結候補
│  ⚠ btob.deals     ¥0.0M   │   2/120 │      4  │ 0.0 │  ← 凍結候補
│  ⏸ academy        ¥0.0M   │  12/120 │    109  │ 0.8 │  ← Standard ゲート再考
│                                                       │
└───────────────────────────────────────────────────────┘
```

- 行をクリックで詳細ドリルダウン (週次推移グラフ + 利用 tenant リスト)
- 「凍結候補」マークは ROI < 0.5 かつ tenants_using < 全体の 5% を自動付与

---

## 5. 実装フェーズ

### Phase 1 — 集計だけ ✅ 実装済 (2026-05-13)
1. ✅ migration: `feature_metrics_weekly` テーブル (`20260513000000_*`)
2. ✅ cron route `/api/cron/feature-metrics-rollup` (Sun 19:00 UTC = Mon 04:00 JST、batch upsert)
3. ✅ 6 機能の success/failure 集計 (cert.issue / pos / customer.portal / reservations / insurer.case_view / anchoring.polygon)
4. ✅ **UI なし**。Supabase Studio で生データ確認 (`SELECT * FROM feature_metrics_weekly ORDER BY week_start DESC, feature_id`)

### Phase 2 — ボード UI ✅ 実装済 (2026-05-14)
5. ✅ `/admin/platform/operations/roi-board` ページ (platform-admin only)
6. ✅ 週次推移インライン sparkline (依存ゼロの SVG。recharts は未導入のまま見送り)
7. ✅ CSV エクスポート (`/api/admin/roi-board/export`、BOM 付き UTF-8)
8. ✅ `freeze_candidate` / `watch` / `healthy` 自動分類 (§6 ルール反映)

集計ロジック: `src/lib/operations/roiBoard.ts` (`getRoiBoardSnapshot` /
`classifyFeature` / `snapshotToCsv`)。直近 4 週を default として取得し、
feature_id ごとに success/failure を合算 + tenant 集合を計算する。

### Phase 3 — 自動アラート (Week 3+)
8. 「ROI < 0.5 で 4 週連続」になった機能を月次レポートで経営にプッシュ
9. Slack `#ledra-ops` への週次サマリー通知

---

## 6. 「捨てる」判断のルール (経営合意)

ROI ボードの数字だけで決めない。以下の **3 条件 + 経営判断** を組み合わせる:

1. **数値**: ROI < 0.5 が 4 週連続
2. **戦略**: その機能が Lighthouse の調達要件に含まれない
3. **代替**: 既存顧客が困らない移行パスがある (アドオン化 / アーカイブモード / 別ベンダー紹介)

3 つ揃ったら → 次月のリリースノートで「凍結予告」、3 ヶ月後に
新規 tenant への展開を停止し、6 ヶ月後にコードベースから物理削除。

---

## 7. 次のアクション

- [ ] 経営チームで feature_id とプラン紐付けの最終承認
- [ ] migration ファイル作成 (`20260520000000_feature_metrics_weekly.sql`)
- [ ] cron route 実装 (Phase 1)
- [ ] 12 週分のバックフィル (audit_logs から再計算 — 古いログは粗い精度で良い)

実装着手前にこの設計書を経営チームでレビューする。スキーマと feature_id
の定義は後方互換が壊れにくい設計が肝なので、最初に決めきる。
