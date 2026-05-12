# POS レシート連番 — race-condition 検証手順

> 対象: migration `20260512000000_pos_receipt_counter.sql` (PR #376)
> 目的: 同時実行下で同一テナント×月に発行されたレシート番号が重複しない
> ことを SQL レベルで検証する
> 必要環境: Supabase Branch (Pro 必須) または ローカル `supabase start`

---

## なぜ JS 単体テストでは不十分か

新しい `pos_checkout()` は Postgres の `ON CONFLICT (tenant_id, year_month)
DO UPDATE` の atomic increment に依存して race-free を実現している。これは
**DB エンジン側の保証** であり、Node の vitest プロセス内では再現できない
(Supabase JS client は順次リクエストするので衝突しない)。

代わりに以下の 2 段階で検証する:

1. **静的検証** — `supabase/__tests__/posReceiptCounter.test.ts` が migration
   ファイルの内容を assert (COUNT(*) や advisory_lock が混入していないか)
2. **動的検証** — このドキュメントの SQL 手順を Supabase Branch で 1 回実行

---

## 手順

### 0. 準備

```bash
# Supabase Branch を新しく切る (Pro plan)
# Dashboard → Branches → New Branch → "dr-receipt-race"
# Branch 接続文字列を控える
export PGURL='postgresql://postgres.<branch-ref>:<pw>@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres'
```

### 1. テナント + 既存レシートを準備

```sql
-- 既存テナントを使うか、テスト用に1つ作る
INSERT INTO tenants (slug, name) VALUES ('race-test', 'Race Test Tenant')
RETURNING id;
-- => 例: 11111111-1111-1111-1111-111111111111

-- カウンタ初期値 (= 既存レシートの最大 + 1 をシミュレート)
-- 何もない状態から始めるならスキップしても OK
```

### 2. 並列に pos_checkout() を 50 並列 × 4 回打つ

`psql` のサブプロセス並列実行で十分:

```bash
TENANT='11111111-1111-1111-1111-111111111111'
USER='22222222-2222-2222-2222-222222222222'

for i in $(seq 1 200); do
  (
    psql "$PGURL" -c "SELECT (pos_checkout(
      p_tenant_id := '$TENANT'::uuid,
      p_amount := 1000,
      p_payment_method := 'cash',
      p_create_receipt := true,
      p_user_id := '$USER'::uuid
    ))::text;" -t
  ) &
  # 50 並列まで詰める
  if (( i % 50 == 0 )); then wait; fi
done
wait
```

### 3. 連番の重複と欠番を assert

```sql
-- 当該テナント × 当月のレシート番号一覧
WITH recs AS (
  SELECT
    doc_number,
    CAST(substring(doc_number from '-(\d+)$') AS integer) AS seq
  FROM documents
  WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
    AND doc_type = 'receipt'
    AND doc_number LIKE 'RCP-' || to_char(now(), 'YYYYMM') || '-%'
)
SELECT
  COUNT(*)             AS total_rows,
  COUNT(DISTINCT seq)  AS distinct_seqs,
  MIN(seq)             AS min_seq,
  MAX(seq)             AS max_seq
FROM recs;
```

#### 期待値

- `total_rows = distinct_seqs = 200` (重複ゼロ)
- `max_seq - min_seq + 1 = 200` (欠番ゼロ — counter は厳密に連続)

どちらか外れたら **migration を revert + 原因調査**:
- 重複あり = `ON CONFLICT` が想定どおり動いていない
- 欠番あり = カウンタが進んだが INSERT が失敗したケース (本当の race
  ではなく、別の `documents` 制約違反)。許容できる場合もある

### 4. クリーンアップ

```bash
# Branch を削除すれば全部消える
# Dashboard → Branches → "dr-receipt-race" → Delete
```

---

## CI 化の方針 (将来)

Supabase Branch 接続文字列を GitHub Secrets に置けば CI でも回せるが、
今は **手動で四半期に 1 回** で十分。Lighthouse 接続前と、pos_checkout
の関数本体を編集した PR で都度走らせる。

`docs/disaster-recovery.md` の四半期 DR 演習チェックリストに追記する。

---

## トラブルシューティング

### 「`pos_receipt_counters` doesn't exist」

migration が Branch に適用されていない。`supabase db push --linked` か
Dashboard の「Apply migrations」を実行。

### 連番が `0` から始まる

migration の `last_number int NOT NULL DEFAULT 0` 規定値どおり。最初の
`INSERT ... VALUES (..., 1)` で 1 になる (`ON CONFLICT` パスを通らない
ため `DEFAULT` は使われない)。問題ない。

### バックフィルが効いていない

`SELECT * FROM pos_receipt_counters` で既存テナントの行があるか確認。
あれば backfill 成功。なければ migration の `INSERT ... SELECT ...
FROM documents` の正規表現を確認 — doc_number 形式が `RCP-YYYYMM-NNN`
以外 (例: `RCP-2025-12-001`) なら catch されない。
