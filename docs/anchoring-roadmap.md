# Anchoring Roadmap — 証明書オンチェーン保証の段階的拡張

施工写真の SHA-256 ハッシュだけを Polygon に刻印している現状（Phase 1）から、証明書レコード本体までカバーし、最終的にバッチ Merkle 化で常時運用できる形（Phase 3）へ移行するための設計と計画。

PII は一貫してオンチェーンに載せない方針。改ざん検知の対象範囲だけを段階的に広げる。

---

## 背景と現状のギャップ

### 現状（既存実装）

- ハッシュ対象: アップロード画像のバイト列のみ（`src/lib/anchoring/imageHashing.ts:16-17`）
- 保存先: `LedraAnchor` コントラクト（`contracts/LedraAnchor.sol`）の `mapping(bytes32 => uint256)`
- 発火タイミング: 画像アップロード API（`src/app/api/certificates/images/upload/route.ts`）内で逐次 1 tx
- 写真ゼロ件で発行された証明書（`certificate_create` は画像必須ではない — `src/lib/validations/certificate.ts:3-19`）はオンチェーンに何も残らない

### ギャップ

| 項目 | 現状 |
|------|------|
| 写真ありの証明書 | 各画像の存在証明はオンチェーンで成立 |
| 写真なしの証明書 | **オンチェーン保証なし**（証明書メタデータの存在証明が無い） |
| 証明書メタデータ（顧客名・施工内容・発行日） | オンチェーンに痕跡なし。改ざんされても検知不能 |
| HP・PoC の文言 | 「証明書ハッシュを刻印」と表現 → 実態（画像ハッシュ）と乖離 |

監査時に「その日付・その内容の証明書がその時点で存在した」という独立検証は、写真がない限り成立しない。これは Pro / Enterprise / 保険会社向けに売り込む際の弱点になる。

---

## 設計原則

1. **PII はオンチェーンに載せない**: 顧客名・連絡先・住所などはハッシュ材料からも完全除外。原文は Supabase に閉じる
2. **削除権との両立**: 証明書削除時は Supabase 側のレコードを物理削除すれば、オンチェーンに残った 32 バイトのハッシュからは個人情報を復元できない（事実上の crypto-shredding）
3. **段階移行**: 現存の `LedraAnchor` コントラクトと検証 API の互換を保ったまま拡張
4. **検証独立性**: anchor の検証に Ledra のサーバーが不要であること（Polygonscan + 公開された canonical 仕様だけで第三者が再現できる）
5. **編集の追跡可能性**: 証明書編集のたびに新 digest を計算・anchor し、履歴をオンチェーンで辿れるようにする

---

## Phase 1（現状）: 写真ハッシュのみ刻印

**ステータス**: 実装済み・運用中（Phase 3e）

### 仕様

- ハッシュ対象: アップロード画像のバイト列（EXIF/GPS 剥離後）
- コントラクト: `LedraAnchor.anchor(bytes32 hash)`
- 1 件 1 tx

### このフェーズで残すべきもの

- **HP・PoC の文言修正**: 「証明書ハッシュ」を **「施工写真の SHA-256 ハッシュ」** に統一
- 修正対象（要確認）:
  - 公開 LP の anchoring セクション
  - PoC 資料の FAQ
  - 顧客向け『真正性バッジ』ツールチップ

### 制約

- 写真なし証明書の保証なし
- 写真と証明書メタデータの紐付け（どの証明書の写真か）はオフチェーン

---

## Phase 2/3 統合実装（直接 P3 移行）

Phase 2 を per-cert anchor 経路として実装したまま、通常運用は Phase 3 の Merkle batch anchoring に乗せる。Enterprise プラン or 管理者手動操作のときだけ Phase 2 経路（即時 anchor）にフォールバックする構成。

### 全体フロー

```
[証明書発行/編集]
      │
      ▼
[canonical JSON 生成]
      │
      ▼
[cert_digest = SHA-256] ──┬── certificate_anchors テーブルに 'queued' で保存
                          │
       ┌──────────────────┴──────────────────┐
       │                                     │
   通常経路                            Enterprise / 手動
       │                                     │
       ▼                                     ▼
[日次 03:00 JST cron]                [LedraCertAnchor.anchorCertificate()]
       │                                     │
[Merkle tree 構築]                    [tx 確定 → 'anchored']
       │
[LedraBatchAnchor.anchorBatch(root)]
       │
[各 leaf に proof 保存 → 'anchored']
```

### Canonical JSON 仕様（`ledra-cert-v1`）

PII は **完全除外**。後方互換性のため schema バージョンを必須化。

```json
{
  "schema": "ledra-cert-v1",
  "public_id": "cert_abc123",
  "tenant_id": "uuid-tenant",
  "issued_at": "2026-04-27T09:00:00.000Z",
  "version_at": "2026-04-27T10:30:00.000Z",
  "status": "active",
  "vehicle_info_hash": "0000...",
  "content_hash": "0000...",
  "expiry_type": "months",
  "expiry_value": "12",
  "image_sha256_set": ["aaaa...", "bbbb..."]
}
```

仕様詳細:

- **PII（含めないフィールド）**: `customer_name`, `customer_phone_last4`, `customer_id`, `logo_asset_path`, `footer_variant` などすべて除外
- **`issued_at`**: 証明書の最初の発行時刻（`certificates.created_at` を ISO 8601 UTC ms 精度に正規化）
- **`version_at`**: この digest が表す証明書バージョンの時刻（編集のたびに更新）
- **`vehicle_info_hash`**: `vehicle_info_json` を [JCS (RFC 8785)](https://www.rfc-editor.org/rfc/rfc8785) で canonicalize した文字列の SHA-256（hex）。`null` の場合は固定値 `"0".repeat(64)`
- **`content_hash`**: 同様に `content_free_text` と `content_preset_json` を結合してハッシュ化（仕様: `JSON.stringify({ free: content_free_text, preset: content_preset_json })` を JCS で正規化）
- **`expiry_type` / `expiry_value`**: `null` のときはキーごと省略する（`null` 値ではなく不在で表現）
- **`image_sha256_set`**: 全画像の SHA-256 を昇順ソート（順序非依存にして、画像追加順による digest 変動を抑制）
- **シリアライズ**: 最終 canonical 文字列は **JCS (RFC 8785)** で生成。改行・空白なし、キー昇順、Unicode NFC、数値正規化
- **`cert_digest`**: 上記 canonical 文字列の SHA-256（hex 64 文字）

### コントラクト

`LedraCertAnchor`（即時用）と `LedraBatchAnchor`（バッチ用）を併設。既存 `LedraAnchor` はそのまま画像専用として継続。

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract LedraCertAnchor {
    event CertificateAnchored(
        bytes32 indexed certDigest,
        bytes32 indexed publicIdHash,
        uint256 timestamp
    );
    mapping(bytes32 => uint256) public anchors;

    function anchorCertificate(bytes32 certDigest, bytes32 publicIdHash) external {
        if (anchors[certDigest] != 0) return;
        anchors[certDigest] = block.timestamp;
        emit CertificateAnchored(certDigest, publicIdHash, block.timestamp);
    }

    function isAnchored(bytes32 certDigest) external view returns (bool) {
        return anchors[certDigest] != 0;
    }
}

contract LedraBatchAnchor {
    event BatchAnchored(
        bytes32 indexed merkleRoot,
        uint256 leafCount,
        uint256 timestamp
    );
    mapping(bytes32 => uint256) public roots;
    mapping(bytes32 => uint256) public leafCounts;

    function anchorBatch(bytes32 merkleRoot, uint256 leafCount) external {
        if (roots[merkleRoot] != 0) return;
        roots[merkleRoot] = block.timestamp;
        leafCounts[merkleRoot] = leafCount;
        emit BatchAnchored(merkleRoot, leafCount, block.timestamp);
    }

    function isAnchored(bytes32 merkleRoot) external view returns (bool) {
        return roots[merkleRoot] != 0;
    }
}
```

`publicIdHash = keccak256(public_id)` を indexed event に入れて Polygonscan からの逆引きを可能にする。

### Merkle tree 仕様

`@openzeppelin/merkle-tree` の `StandardMerkleTree` を使う。独自実装はしない。

- **leaf**: `cert_digest`（bytes32）を含む `[bytes32]` の 1 要素配列
- **encoding**: `keccak256(keccak256(abi.encode(leaf)))` （OpenZeppelin 標準）
- **sorted pairs**: enabled（OZ デフォルト）
- **proof 形式**: `string[]`（hex bytes32 の配列）として JSONB に保存
- **空バッチ**: leaf 0 件の日は cron スキップ（tx を打たない）
- **単一 leaf バッチ**: leaf 1 件でも root を生成して anchor（proof は空配列）

### DB スキーマ

```sql
-- 証明書 anchor 履歴（編集のたびに新規 INSERT）
CREATE TABLE certificate_anchors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id UUID NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
  cert_digest TEXT NOT NULL,                    -- 64 hex
  canonical_json JSONB NOT NULL,                -- 検証用に丸ごと保存（PII 含まず）
  schema_version TEXT NOT NULL DEFAULT 'ledra-cert-v1',
  status TEXT NOT NULL CHECK (status IN ('queued', 'batched', 'anchored', 'failed')),
  anchor_route TEXT NOT NULL CHECK (anchor_route IN ('batch', 'instant')),
  batch_id UUID REFERENCES certificate_anchor_batches(id),
  merkle_proof JSONB,                           -- ["0x...", ...] 確定後にセット
  instant_tx_hash TEXT,                         -- instant 経路のみ
  block_number BIGINT,
  failure_reason TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  anchored_at TIMESTAMPTZ
);

CREATE INDEX certificate_anchors_cert_id_created_idx
  ON certificate_anchors(certificate_id, created_at DESC);
CREATE INDEX certificate_anchors_digest_idx
  ON certificate_anchors(cert_digest);
CREATE INDEX certificate_anchors_queued_idx
  ON certificate_anchors(created_at)
  WHERE status = 'queued' AND anchor_route = 'batch';

-- バッチ単位（Merkle root 単位）
CREATE TABLE certificate_anchor_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merkle_root TEXT NOT NULL UNIQUE,
  leaf_count INTEGER NOT NULL,
  contract_address TEXT NOT NULL,
  network TEXT NOT NULL,                        -- 'amoy' | 'polygon'
  tx_hash TEXT NOT NULL,
  block_number BIGINT,
  anchored_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 証明書テーブル側は表示用のショートカット（最新の anchor を指す）
ALTER TABLE certificates
  ADD COLUMN latest_anchor_id UUID REFERENCES certificate_anchors(id);
```

`certificates.latest_anchor_id` は表示・検証 API での join を高速化するための非正規化カラム。anchor 行追加時にトリガで更新するか、アプリ層で更新する（後者推奨：トリガはデバッグしにくい）。

### Anchor route の振り分けロジック

```typescript
// pseudo-code
function decideAnchorRoute(certificate, tenant): 'batch' | 'instant' {
  if (manualInstantRequested) return 'instant'; // admin UI からの強制
  if (tenant.plan === 'enterprise' && tenant.settings.instant_anchor !== false) return 'instant';
  return 'batch';
}
```

- `tenants.settings.instant_anchor` は default false。Enterprise プランで自動 ON、それ以外は admin 操作でのみ ON
- 個別の証明書発行 API には route 指定パラメータを **持たせない**（テナント設定経由でのみ制御）

### バッチ cron 仕様

- **時刻**: 毎日 03:00 JST（= 18:00 UTC）
- **エンドポイント**: `POST /api/cron/anchor-batch`（`CRON_SECRET` 保護）
- **動作**:
  1. `status='queued' AND anchor_route='batch'` の anchor 行を全件取得（最大 10,000 件/バッチ。それ以上は次回繰越）
  2. `cert_digest` を leaf に Merkle tree 構築
  3. `LedraBatchAnchor.anchorBatch(root, leafCount)` を送信
  4. tx confirm 待ち（最大 60 秒、`waitForTransaction({ confirmations: 1 })`）
  5. `certificate_anchor_batches` に行追加
  6. 各 anchor 行に `merkle_proof`, `batch_id`, `status='anchored'`, `anchored_at` を更新
  7. `certificates.latest_anchor_id` を更新
- **失敗時**: tx 失敗ならリトライ（指数バックオフ 4 回）。それでも失敗なら `status='failed'` + `failure_reason` 記録、Slack/email アラート
- **冪等性**: 同じ root の再 anchor はコントラクト側で no-op。クラッシュ後の再実行も安全

### 発火タイミング詳細

| イベント | 動作 |
|---------|------|
| `POST /api/certificates` 成功時 | canonical JSON 生成 → digest 計算 → `certificate_anchors` に `status=queued` で INSERT |
| `PATCH /api/certificates/:id`（編集時） | 同上。新しい行を INSERT（履歴を残す） |
| 画像追加・削除時 | 同上 |
| `status='void'` への変更 | 同上（無効化時刻もオンチェーンで証明可能になる） |
| Enterprise plan で `instant_anchor: true` | INSERT 後すぐ `LedraCertAnchor.anchorCertificate()` を呼ぶ |
| 管理者「即時 anchor」ボタン | 該当 anchor 行を取り出し instant 経路で送信 |

### 検証 API: `GET /api/cert-verify/:public_id`

第三者が Ledra サーバーに依存せず検証できるよう、必要な情報を全部返す。

```json
{
  "public_id": "cert_abc123",
  "current": {
    "canonical_json": { "schema": "ledra-cert-v1", "...": "..." },
    "cert_digest": "abcd...",
    "anchor_route": "batch",
    "merkle_root": "0x...",
    "merkle_proof": ["0x...", "0x..."],
    "batch_contract": "0x...",
    "batch_tx_hash": "0x...",
    "block_number": 12345678,
    "anchored_at": "2026-04-28T03:00:15Z",
    "polygonscan_url": "https://polygonscan.com/tx/0x..."
  },
  "history": [
    { "version_at": "2026-04-27T09:00:00Z", "cert_digest": "...", "anchor_route": "batch", "...": "..." },
    { "version_at": "2026-04-27T10:30:00Z", "cert_digest": "...", "anchor_route": "instant", "...": "..." }
  ],
  "image_anchors": [
    { "sha256": "...", "tx_hash": "0x...", "anchored_at": "..." }
  ]
}
```

### Pending 状態の UX

- 公開証明書ページのバッジ:
  - `queued`: 「ブロックチェーン刻印待機中（次回更新: 03:00 JST）」+ グレー表示
  - `anchored` (batch): 「ブロックチェーン検証済み」+ Polygonscan リンク
  - `anchored` (instant): 「ブロックチェーン即時検証済み」+ Polygonscan リンク
  - `failed`: 表示せず（ログのみ）。リトライ後に通常表示に戻る
- 施工店ポータルのダッシュボード: pending 件数と次回バッチ時刻を表示
- admin: 全 pending 一覧 + 個別の「即時 anchor」ボタン

### 移行・バックフィル

- 既存証明書全件に対して canonical JSON 生成 → `certificate_anchors` に `status=queued` で INSERT
- 翌日の通常バッチに乗る（5,000 件/日のレートリミットで自然に処理）
- 既存の画像 anchor（`certificate_images.polygon_tx_hash`）はそのまま維持。検証 API では `image_anchors` として併記
- バックフィル用エンドポイント: `POST /api/admin/cert-anchor/backfill`（既存の `/admin/polygon-backfill` と同じパターン）

### コスト見積もり（統合後）

| 件数/月 | batch tx | instant tx (5%) | Mainnet コスト |
|---------|---------|----------------|---------------|
| 1,000 | ~30 | ~50 | ~10円 |
| 10,000 | ~30 | ~500 | ~55円 |
| 100,000 | ~30 | ~5,000 | ~510円 |

batch を主、instant をスポット利用にする限り、件数が増えてもガス代はほぼ instant 分のみで線形。

### 監視・アラート

- `certificate_anchors WHERE status='queued' AND created_at < now() - interval '25 hours'` → 滞留検知（cron 失敗の signal）
- バッチ完了時にメトリクス記録: leaf 数、ガス使用量、所要時間、エラー有無
- ウォレット残高アラート（既存と統合）
- instant 経路の連続失敗（直近 1 時間で 3 回以上）→ 即時 Slack アラート

---

## 実装ステップ

Phase 2 を経由せず Phase 3（バッチ）に直接移行する方針。Phase 2 用の `LedraCertAnchor` は instant フォールバック経路として併設するが、通常運用は最初からバッチで開始する。

| ステップ | 期間（目安） | 主要タスク |
|---------|-------------|-----------|
| **S1 文言修正** | 0.5 日 | HP・PoC・バッジツールチップを「施工写真の SHA-256 ハッシュ」表記に統一 |
| **S2 contracts** | 1 日 | `LedraCertAnchor.sol`, `LedraBatchAnchor.sol` 実装 + Amoy デプロイ + テスト |
| **S3 canonical lib** | 2 日 | `src/lib/anchoring/certificateHashing.ts` 実装（JCS canonicalize + digest 生成 + 単体テスト多め） |
| **S4 DB schema** | 0.5 日 | migration 追加（`certificate_anchors`, `certificate_anchor_batches`, `certificates.latest_anchor_id`） |
| **S5 anchor write path** | 2 日 | 証明書発行・編集・画像追加で `certificate_anchors` に queued 行を入れる |
| **S6 instant route** | 1 日 | Enterprise 自動 + admin 手動の instant anchor 実装 |
| **S7 batch cron** | 2 日 | `@openzeppelin/merkle-tree` 統合、`/api/cron/anchor-batch` 実装、Vercel Cron 登録 |
| **S8 verification API** | 1 日 | `/api/cert-verify/:public_id` の 3 系統統合レスポンス |
| **S9 UI** | 2 日 | バッジの pending/anchored/instant 表示、admin の pending 一覧と即時 anchor ボタン |
| **S10 Amoy 通し試験** | 2 日 | バックフィル含む E2E、failure injection でリトライ確認 |
| **S11 Mainnet デプロイ** | 1 日 | コントラクトデプロイ → 環境変数切替 → 段階リリース |
| **S12 バックフィル** | 1〜3 日 | 既存証明書を queued に流し込み、3〜5 日かけて全件 anchored 状態へ |

合計 2〜3 週間。S1〜S5 までは互いに依存少なく並行可能。

各ステップ間でコントラクトは併存させ、検証 API は `LedraAnchor` / `LedraCertAnchor` / `LedraBatchAnchor` の 3 系統を横断的に問い合わせる構成にする。

---

## 法務・プライバシー再確認

| 項目 | Phase 1 | Phase 2 | Phase 3 |
|------|---------|---------|---------|
| オンチェーンに載るデータ | 画像 SHA-256 | 画像 SHA-256 + cert digest（PII 除外） | Merkle root のみ |
| PII 直接掲載 | なし | なし | なし |
| 削除権との両立 | ○ | ○（DB 削除 = 実質 crypto-shredding） | ○（root から逆引き不能） |
| 第三者検証 | 画像のみ | 証明書全体（PII 除く） | 証明書全体（PII 除く） |

いずれのフェーズでも **オンチェーンには PII が載らない**。法務上の現状の優位性（Phase 1 と同等）を維持したまま、保証範囲だけを拡張する設計。

---

## 関連ドキュメント

- `docs/polygon-anchoring-deployment.md` — Phase 1 の運用手順
- `docs/polygon-amoy-dry-run.md` — テストネット動作確認
- `docs/metamask-signer-setup.md` — 署名鍵管理
- `contracts/LedraAnchor.sol` — Phase 1 コントラクト
