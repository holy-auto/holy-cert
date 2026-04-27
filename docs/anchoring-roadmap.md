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

1. **PII はオンチェーンに載せない**: 顧客名・連絡先・住所などはハッシュ材料に含めるが、原文はオフチェーン（Supabase）に閉じる
2. **削除権との両立**: 証明書削除時は Supabase 側のレコードを物理削除すれば、オンチェーンに残った 32 バイトのハッシュからは個人情報を復元できない（事実上の crypto-shredding）
3. **段階移行**: 現存の `LedraAnchor` コントラクトと検証 API の互換を保ったまま拡張
4. **検証独立性**: anchor の検証に Ledra のサーバーが不要であること（Polygonscan + 公開された canonical 仕様だけで第三者が再現できる）

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

## Phase 2: 証明書 canonical JSON ハッシュも刻印

**目的**: 写真有無に関わらず、証明書発行イベントそのものをオンチェーンで証明する。

**前提ボリューム**: 月数百〜数千件程度。1 件 1 tx で運用可能なレンジ。

### ハッシュ対象（canonical certificate digest）

PII は除外し、**識別子・タイムスタンプ・施工メタ・画像ハッシュ集合** のみで構成する。canonical JSON の例：

```json
{
  "schema": "ledra-cert-v1",
  "public_id": "cert_abc123",
  "tenant_id": "uuid-...",
  "issued_at": "2026-04-27T09:00:00Z",
  "status": "active",
  "vehicle_info_hash": "sha256(canonicalize(vehicle_info_json))",
  "content_hash": "sha256(content_free_text || canonicalize(content_preset_json))",
  "expiry": { "type": "months", "value": "12" },
  "image_sha256_set": ["<hex>", "<hex>", ...]
}
```

ポイント:
- `customer_name` / `customer_phone_last4` などの PII は含めない
- 代わりに `vehicle_info_json` や preset の **値そのものではなくハッシュ** を含めることで、PII を除外しつつ改ざん検知性を維持
- `image_sha256_set` を含めることで、Phase 1 の画像 anchor との整合性も検証可能
- canonical 化（キーソート・空白正規化）の仕様は別途公開し、第三者が再現できるようにする

### コントラクト変更

`LedraAnchor` を拡張するか、新コントラクト `LedraCertAnchor` を併設するかの 2 択。後方互換のため **併設を推奨**：

```solidity
contract LedraCertAnchor {
    event CertificateAnchored(bytes32 indexed certDigest, bytes32 indexed publicIdHash, uint256 timestamp);
    mapping(bytes32 => uint256) public anchors;

    function anchorCertificate(bytes32 certDigest, bytes32 publicIdHash) external {
        if (anchors[certDigest] != 0) return;
        anchors[certDigest] = block.timestamp;
        emit CertificateAnchored(certDigest, publicIdHash, block.timestamp);
    }
}
```

`publicIdHash = keccak256(public_id)` を indexed event 引数に持たせることで、Polygonscan 上で `public_id` から該当 anchor を逆引きできる。

### 発火タイミング

- 証明書発行 API（`POST /api/certificates`）の最終ステップ
- 画像が後から追加される設計のため、`certDigest` は **画像追加・編集のたびに再計算 → 再 anchor**
- コントラクトは idempotent なので同一 digest の再 anchor は no-op（ガスのみ消費）

### DB スキーマ

`certificates` テーブルに追加:

```sql
ALTER TABLE certificates
  ADD COLUMN cert_digest TEXT,           -- hex of certDigest
  ADD COLUMN cert_anchor_tx_hash TEXT,
  ADD COLUMN cert_anchor_at TIMESTAMPTZ;
```

### コスト見積もり

| 件数/月 | Mainnet コスト |
|---------|---------------|
| 1,000 | ~100円 |
| 10,000 | ~1,000円 |
| 100,000 | ~10,000円 |

Phase 1 と同等のオーダー（写真分と合わせて約 2 倍）。

### 検証フロー

1. 第三者が `public_id` を取得
2. Ledra 公開 API or Supabase の公開ビューから canonical JSON を取得（PII は最初からマスク済み）
3. SHA-256 を計算 → `cert_digest` と一致確認
4. Polygonscan で `LedraCertAnchor.anchors[certDigest]` を読み出し → タイムスタンプ取得
5. これだけで「その時点でその内容の証明書が存在した」が成立

---

## Phase 3（通常運用）: Merkle batch anchoring

**目的**: 件数増加に対してガス代を線形に伸ばさない。1 日 1 tx（or 1 時間 1 tx）で全件カバー。

**移行タイミング**: 月間発行件数が概ね 5,000 件を超えたあたりが損益分岐点。それ以前でも運用簡素化目的で前倒し可。

### アーキテクチャ

1. Phase 2 の `certDigest` を計算するところまでは同じ
2. すぐに anchor せず、`certificate_anchor_queue` に積む
3. Cron（例: 毎日 03:00 JST）でキューを取り出し、Merkle tree を構築
4. **Merkle root のみ**を `LedraBatchAnchor` に刻印
5. 各証明書には Merkle proof（深さに応じて数百バイト）を保存

### コントラクト

```solidity
contract LedraBatchAnchor {
    event BatchAnchored(bytes32 indexed merkleRoot, uint256 leafCount, uint256 timestamp);
    mapping(bytes32 => uint256) public roots; // root => timestamp

    function anchorBatch(bytes32 merkleRoot, uint256 leafCount) external {
        if (roots[merkleRoot] != 0) return;
        roots[merkleRoot] = block.timestamp;
        emit BatchAnchored(merkleRoot, leafCount, block.timestamp);
    }
}
```

### DB スキーマ

```sql
CREATE TABLE certificate_anchor_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merkle_root TEXT NOT NULL UNIQUE,
  leaf_count INTEGER NOT NULL,
  tx_hash TEXT NOT NULL,
  anchored_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE certificates
  ADD COLUMN cert_batch_id UUID REFERENCES certificate_anchor_batches(id),
  ADD COLUMN merkle_proof JSONB;  -- ["0x...", "0x...", ...]
```

`merkle_proof` は兄弟ノードの配列で、leaf （= `certDigest`）から root までのパス。

### コスト

| 件数/月 | tx 数 | Mainnet コスト |
|---------|------|---------------|
| 10,000 | ~30（1日1回） | ~3円 |
| 100,000 | ~30 | ~3円 |
| 1,000,000 | ~30 | ~3円 |

ツリーの深さ（log2 N）が proof サイズに効くだけで、root anchor 自体のガスはほぼ固定。

### UX 上の考慮

- 発行直後の証明書は **`anchor_status: pending`** 状態
- 次回バッチ走行後に `anchor_status: anchored` に遷移
- 公開ページには「ブロックチェーン刻印待機中（次回更新: 03:00 JST）」のような表示
- 監査用途では即時性は不要なので許容範囲。緊急で個別 anchor が必要な場合のみ Phase 2 のフォールバックを残す

### 検証フロー

1. canonical JSON から `certDigest` を計算
2. 証明書レコードから `merkle_proof` と `cert_batch_id` を取得
3. Merkle proof を辿って root を再構築
4. Polygonscan で `LedraBatchAnchor.roots[root]` を確認 → タイムスタンプ一致確認

ライブラリは `@openzeppelin/merkle-tree` 互換の標準的な構成にする（独自仕様にしない）。

---

## 移行計画

| フェーズ | 期間（目安） | 主要タスク |
|---------|-------------|-----------|
| **P1 文言修正** | 1 日 | HP・PoC・バッジツールチップを「写真ハッシュ」表記に統一 |
| **P2 設計確定** | 3 日 | canonical JSON 仕様策定、`LedraCertAnchor` 実装、Amoy で動作確認 |
| **P2 デプロイ** | 1 週 | Mainnet デプロイ、`/api/certificates` 経路に組込み、既存証明書のバックフィル |
| **P2 → P3 並行運用** | 1 ヶ月 | キュー機構を実装するが当面は per-cert anchor のまま運用、回帰検証 |
| **P3 切替** | 1 週 | バッチ cron を有効化、per-cert anchor は緊急用に縮退 |

各フェーズ間でコントラクトは併存させ、検証 API は `LedraAnchor` / `LedraCertAnchor` / `LedraBatchAnchor` の 3 系統を横断的に問い合わせる構成にする。

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
