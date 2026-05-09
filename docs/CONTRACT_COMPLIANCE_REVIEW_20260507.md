# Contract Compliance Review — 2026-05-07

ブランチ: `claude/contract-compliance-review-UoXnO`
レビュー範囲:

1. `_review-pdfs/` 配下 6 本の営業/契約資料 ↔ `src/` 実装の整合性
2. `contracts/` 配下 3 本の Solidity スマートコントラクト監査

---

## エグゼクティブサマリ

| 領域 | 結果 |
|---|---|
| 料金プラン (4 プラン × 上限値 × 価格) | ✅ ほぼ完全一致 |
| アドオン / NFC / キャンペーン価格 | ✅ 完全一致 |
| 機能カタログ (証明書/車両/POS/分析/4 ポータル) | ✅ 90%+ 実装済み |
| セキュリティ三層モデル (TLS/at-rest/payload) | ✅ 実装あり (一部未自動化) |
| Polygon anchoring | ⚠️ **画像ハッシュのみ。証明書本体・バッチは未配線** |
| C2PA / ECDSA P-256 / pepper hashing | ✅ 実装済み |
| PDF デジタル署名 | ⚠️ **メタデータ保存のみ。PDF 内署名オブジェクト未埋込** |
| CloudSign 連携 | ❌ **資料に記載のみ、実装なし** |
| Pro プラン限定機能の課金ゲート (監査ログ / API 連携 / 詳細レポート) | ❌ **無料プランでも素通り** |
| 顧客ポータル セッション 24h | ⚠️ 実装は **30 日** |
| Vercel 東京リージョン記述 | ⚠️ コード/設定で確認不可 (ダッシュボード設定の可能性) |
| Solidity コントラクト | ⚠️ 機能は最小構成。書込みアクセス制御なし、未使用コード混在 |

**重要度の整理:**

- **Critical (要対応)**: Pro プラン機能 (監査ログ / API 連携) のゲート抜け、PDF 内署名未埋込、CloudSign 不実装
- **High (整合性ズレ)**: Polygon anchoring が証明書本体/バッチ未配線、顧客ポータル TTL 表記ズレ
- **Medium**: Solidity コントラクトの所有者制御欠如、Tokyo region の根拠資料不足

---

## 1. 料金プラン整合性

`src/lib/billing/planFeatures.ts` / `src/lib/billing/memberLimits.ts` / `src/lib/marketing/pricing.ts` / `src/lib/billing/campaign.ts` を `Ledra_Pricing_Overview.pdf` と突き合わせ。**全項目が PDF と一致**。

| 項目 | PDF | コード | 一致 |
|---|---|---|---|
| Free 月額 | ¥0 | `pricing.ts:26` | ✅ |
| Starter 月額 / 年額 | ¥9,800 / ¥94,080 | `pricing.ts:26,28` | ✅ |
| Standard 月額 / 年額 / 初期 | ¥24,800 / ¥238,080 / ¥29,800 | `pricing.ts:44,46,48` | ✅ |
| Pro 月額 / 年額 / 初期 | ¥49,800 / ¥478,080 / ¥49,800 | `pricing.ts:65,67,69` | ✅ |
| 証明書発行上限 | 10 / 80 / 300 / ∞ | `planFeatures.ts:178-182` (CERT_LIMITS) | ✅ |
| 店舗上限 | 1 / 1 / 2 / 5 | `planFeatures.ts:170-175` (STORE_LIMITS) | ✅ |
| ユーザー上限 | 1 / 3 / 7 / 15 | `memberLimits.ts:4-9` | ✅ |
| 年間契約 20% 割引 | あり | `pricing.ts:159` (ANNUAL_DISCOUNT_PERCENT=20) | ✅ |
| ブランド証明書ライト/プレミアム | ¥3,300+¥16,500 / ¥4,400+¥88,000 | `pricing.ts:88-92, 103-107` | ✅ |
| 追加店舗/ユーザー/優先サポート/導入伴走 | ¥4,980 / ¥1,480 / ¥4,980 / ¥19,800 | `pricing.ts:163-166` | ✅ |
| NFC 10/30/100 枚パック | ¥980 / ¥2,480 / ¥6,980 | `pricing.ts:170-177` | ✅ |
| NFC 初回 20 枚無料 → キャンペーン時 30 枚 | あり | `pricing.ts:171, 185` | ✅ |
| 初期 100 店舗キャンペーン (Standard/Pro) | あり | `billing/campaign.ts:16-17` | ✅ |

**判定: 料金関連の整合性は問題なし。**

---

## 2. 機能ゲート (Critical)

**PDF p.3 比較表で「Pro プランのみ」と記載されている機能のうち、コード上で課金ゲートされていないものがある。**

### 2.1 監査ログ (Pro 限定 と記載)

- `Ledra_Pricing_Overview.pdf` p.3: 監査ログ列で Pro のみ ✓
- 実装:
  - 監査テーブル (`audit_logs` / `admin_audit_logs` / `signature_audit_logs` / `order_audit_log` / `certificate_edit_histories`) は存在
  - `src/app/api/customer/audit-log/route.ts` は **プラン判定なし**で `audit_logs` を返却
  - `src/lib/billing/featureKeys.ts` に `audit_log` 系のフィーチャーキー未定義 ⇒ `checkAdminFeature()` でゲートできない
- **影響**: Free/Starter/Standard 顧客が監査ログ参照 API を叩いても 200 が返る。営業資料の差別化要素が機能していない。

### 2.2 API 連携 (Pro 限定 と記載)

- `Ledra_Pricing_Overview.pdf` p.3 / `Ledra_Features_Deep_Dive.pdf` p.10 FAQ: 「プロプランで提供」
- 実装:
  - `src/app/api/admin/tenant/external-api-key/route.ts` は API キー発行を提供
  - `src/lib/billing/featureKeys.ts` に `api_integration` キー未定義
  - 発行 API もプランチェックなし
- **影響**: 任意プランで API キー発行・外部連携が可能。Pro プランの収益価値毀損。

### 2.3 詳細レポート (Pro 限定 と記載)

- `src/app/admin/thickness-reports/` 等のレポート機能はプランチェックなしでアクセス可能
- `planFeatures.ts` の `MATRIX` に `detailed_reports` が存在しない

### 推奨対応

```
src/lib/billing/featureKeys.ts に
  | "audit_log"
  | "api_integration"
  | "detailed_reports"
を追加。

src/lib/billing/planFeatures.ts MATRIX で
  free/starter/standard: false, pro: true に設定。

該当 route handler 先頭で
  await requireAdminFeature(supabase, tenantId, "audit_log")
を呼ぶ。
```

---

## 3. Polygon Anchoring (High)

### 3.1 設計と実装の乖離

`Ledra_Security_Whitepaper.pdf` p.7 (改ざん防止) / p.8 (Polygon anchoring フロー) の主張:

> 発行時に**証明書コンテンツ**のハッシュを Polygon に刻印
> ガス代高騰時に備え、**バッチ Merkle 化**で個別トランザクション数を抑制

**実装の現状:**

| コントラクト | デプロイ用ソース | TS 配線 | 実呼び出し |
|---|---|---|---|
| `LedraAnchor.sol` (画像ハッシュ) | あり | `providers/polygon.ts:113 anchorToPolygon()` | ✅ 画像 SHA-256 のみ |
| `LedraCertAnchor.sol` (証明書本体・即時) | あり | **なし** | ❌ コメントで言及のみ (`certificateHashing.ts:7`) |
| `LedraBatchAnchor.sol` (Merkle バッチ) | あり | **なし** | ❌ |

`src/app/api/qstash/polygon-backfill/route.ts` および `providers/polygon.ts` を読む限り、`LedraAnchor.anchor(bytes32)` のみが呼ばれ、**証明書 canonical JSON の SHA-256 はオンチェーンに刻印されない**。

`certificateHashing.ts` には canonical 化 + SHA-256 のロジックは整備されているが、コール先がない。

### 3.2 影響

- 「証明書コンテンツ自体が改ざんされても Polygon と突合せて検知できる」という主張は、**画像差し替えの検知のみ**に縮退している。施工内容や日時テキストの改ざんは画像ハッシュでは検知できない。
- 「バッチ Merkle 化でガス代抑制」も実体なし。スケーラビリティ訴求の根拠が弱い。

### 推奨対応

短期 (整合性回復):
- a) Whitepaper 文言を「**画像 SHA-256** を Polygon に刻印」に正確化、または
- b) `LedraCertAnchor.anchorCertificate(certDigest, publicIdHash)` を呼ぶ instant ルートを実装。`certificateHashing.ts` の `sha256Hex(canonicalize(...))` を入力にする。

中期: `LedraBatchAnchor.anchorBatch(merkleRoot, leafCount)` を日次 cron で呼ぶ batch ルート。OpenZeppelin `StandardMerkleTree` 互換でリーフを構築 (Solidity NatSpec 通り)。

---

## 4. Solidity コントラクト監査

### 4.1 共通の所見

3 本とも **書込み関数に `onlyOwner` などのアクセス制御がない**。設計コメントは「Owner address (for potential future access control)」と将来のための予約。

```solidity
function anchor(bytes32 hash) external {       // 誰でも呼べる
function anchorCertificate(bytes32 ...) ext.   // 誰でも呼べる
function anchorBatch(bytes32 ..., uint256 ...) // 誰でも呼べる
```

| 観点 | 評価 |
|---|---|
| 再入可能性 | 状態変更後に external call なし。問題なし |
| 整数オーバーフロー | Solidity 0.8 標準で revert。問題なし |
| Idempotency | `if (anchors[hash] != 0) return;` で適切 |
| 書込みアクセス制御 | **なし** (Medium) — フロントランによる先取り anchor が理論上可能 |
| Owner / transferOwnership | 機能はあるが `onlyOwner` を使う関数が一切ない (デッドコード) |
| OwnershipTransferred イベント | **なし** (best practice 違反) |
| 緊急停止機構 (Pausable) | なし |
| アップグレード機構 | なし (immutable) |
| `block.timestamp` 利用 | 数秒の miner manipulation 余地あるが用途上許容 |
| ガス見積コメント | `LedraAnchor.sol:7` の "~45,000 gas (~$0.001)" は実測根拠が必要 |

### 4.2 フロントラン耐性

攻撃者が事前に `cert canonical JSON` を予測できれば、Ledra より先に anchor を打って timestamp を奪える。実用上 SHA-256 の予測は困難なため**実害は低い**が、`onlyOwner` または allowlist にした方がポリシーとしてクリーン。

### 4.3 推奨パッチ (例)

```solidity
modifier onlyAnchorer() {
    require(anchorers[msg.sender], "not authorized");
    _;
}

mapping(address => bool) public anchorers;

function setAnchorer(address a, bool ok) external onlyOwner {
    anchorers[a] = ok;
}

function anchor(bytes32 hash) external onlyAnchorer { ... }
```

加えて:
- `event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);` を追加
- `transferOwnership` 内で発火
- `Pausable` (OpenZeppelin) を導入し、緊急時に `pause()` で書込み停止可能に

---

## 5. セキュリティ Whitepaper との整合性

### 5.1 ✅ 一致している項目

| 主張 | 実装 |
|---|---|
| HSTS / セキュリティヘッダ | `next.config.ts:104` `max-age=63072000; includeSubDomains` |
| RLS 全テーブル有効化 | `supabase/migrations/` で 100+ POLICY 定義 |
| RBAC (Owner/Admin/Staff/Viewer + Agent/Insurer/Customer) | `src/lib/auth/roles.ts`, `src/types/agent.ts`, `src/types/insurer.ts` |
| MFA (TOTP/SMS) | `src/app/admin/settings/security/page.tsx`, `src/app/api/admin/mfa/factors/[id]/route.ts` |
| Upstash Redis レート制限 | `src/lib/api/rateLimit.ts` (auth 10/60s, sensitive 5/300s 等) |
| Pepper hashing (`CUSTOMER_AUTH_PEPPER`) | `src/lib/customerPortalServer.ts:46-49` `SHA-256("v1\|{tenantId}\|{last4}\|{PEPPER}")` |
| AES-256-GCM (アプリ層) | `src/lib/crypto/tenantSecrets.ts` (`SECRET_ENCRYPTION_KEY`) |
| 監査ログテーブル + 編集履歴 diff | `audit_logs` ほか + `certificate_edit_histories` (JSONB diff) |
| Sentry | `sentry.client.config.ts` 等 |
| ESLint / CodeQL / npm audit | `.github/workflows/ci.yml`, `codeql.yml`, Dependabot |
| データ削除自動化 (退会 30 日) | `src/app/api/cron/data-retention/route.ts`, `src/app/api/customer/data-deletion/route.ts` |
| 顧客電話 last4 ハッシュ化 | DB 列 `customer_phone_last4_hash` のみ保持 |

### 5.2 ⚠️ 主張と実装の差異

| 主張 | 実装 | 差異 |
|---|---|---|
| 顧客ポータル セッション「**デフォルト 24 時間**」(p.4) | `customerPortalServer.ts:20` `SESSION_TTL_DAYS = 30` | **実装は 30 日**。Whitepaper の 24h 表記を更新するか、TTL を短縮 |
| 「**Vercel の東京リージョン**を主」(p.5) | `vercel.json` / `next.config.ts` に region 指定なし | コードでは確認不可。Vercel Dashboard 設定の可能性。証跡として `vercel.json` に `"regions": ["hnd1"]` を明記推奨 |
| 「自動鍵ローテーション」(p.3) | `tenantSecrets.ts` に rotation の自動化なし。`crypto.ts` の `LEDRA_SIGNING_KEY_VERSION` は手動切替 | 「自動」表現を「手動ローテーション運用」に正確化 |
| 「署名付き URL は **1 回限り** のトークン」(p.4) | 代理店契約 (`agent-sign`) は 300s 一回限りだが、顧客ポータル全体に対する universal な one-time URL 機構は未確認 | Whitepaper は「署名付き URL ＝ 1 回限り」と一般化しているので scope の明確化が必要 |
| 「Critical は即時、High は 72h 以内」(p.6) | `.github/dependabot.yml` 設定はあるが SLA 自動エンフォースなし | プロセスとしては運用ルールなので OK だが、SLO 計測の仕組み不在 |
| ISMS / P-mark 取得「準備中」(p.10) | `docs/iso27001-soc2-prep.md` あり | 表記通り |

---

## 6. Service Overview / Features Deep Dive 実装確認

### 6.1 ✅ 実装あり

- 4 ポータル: `src/app/admin/`, `src/app/agent/`, `src/app/insurer/`, `src/app/c/` & `src/app/my/`
- デジタル証明書 + QR + 無効化 + 再発行 + 複製
- 車検証 OCR (Claude Vision): `src/lib/ocr/shakensho.ts`
- 顧客 360° ビュー: `src/app/admin/customers/[id]/CustomerTabs.tsx`
- サービス履歴タイムライン: `src/app/admin/vehicles/[id]/ServiceTimeline.tsx`
- CSV インポート: `src/lib/csv/parse.ts`
- Google Calendar 双方向同期: `src/lib/gcal/client.ts`
- 請求書 PDF + 共有リンク + 未回収アラート
- POS 決済 (現金/カード/QR/銀行振込/その他): `src/types/pos-constants.ts`
- BtoB 受発注: `src/lib/orders/`, `src/lib/ai/btobMatchEngine.ts`
- ダッシュボード KPI / 30 日推移 / ステータス内訳
- パートナーランク 5 段階 (Platinum/Gold/Silver/Bronze/Starter): `src/app/admin/page.tsx:25-66`
- LINE 通知: `src/lib/line/client.ts`
- テナント外部 API キー: `src/app/api/admin/tenant/external-api-key/route.ts`
- Webhook 配信 (HMAC-SHA256): `src/lib/outbound-webhooks.ts`
- NFC タグ管理: `src/app/admin/nfc/`, `src/app/api/mobile/nfc/[id]/`
- Tap to Pay (Stripe Terminal): `src/app/api/mobile/pos/terminal/location/route.ts`
- C2PA: `src/lib/anchoring/providers/c2pa.ts` (`@contentauth/c2pa-node`)
- ECDSA P-256 電子署名: `src/lib/signature/crypto.ts`

### 6.2 ❌ 実装が見当たらない / 部分実装

| 機能 | 主張箇所 | 状態 |
|---|---|---|
| **CloudSign 連携** | Service Overview p.3, Features Deep Dive (随所), Operations 想定 docs | **コード中の連携実装なし**。`src/app/video/page.tsx:349`, `src/lib/marketing/resourcePdf.tsx:328` 等の表示のみ。`docs/agent-demo-guide.md` にも「標準連携」と記載あり |
| **Square POS 端末決済** | Features Deep Dive p.5, p.9 | `src/types/square.ts` に型定義のみ、SDK レベルの決済 flow は不在 |
| **PDF 内デジタル署名オブジェクト** | Whitepaper p.7 「証明書 PDF には Ledra の署名鍵で署名を付与」 | `src/lib/signature/pdfUtils.ts` でメタデータ + 別途 verify URL を保存するが、PDF 仕様の signature object (PAdES/PKCS#7) は埋め込まれていない |
| **PWA Service Worker** | Features Deep Dive p.8 | `manifest.json` はあるが `service-worker.ts` 未確認。オフライン動作は不透明 |
| **ウィジェットカスタマイズ** | Features Deep Dive p.6 | カスタムビルダー未確認。固定レイアウト |
| **証明書本体 / バッチの Polygon anchoring** | Whitepaper p.7-8 | 上記セクション 3 参照 |

### 推奨対応

最低限、**営業資料側で表現を実装に合わせる**:

- 「CloudSign **連携予定** (ロードマップ)」または記述削除
- 「Square 連携は**端末メタデータ管理**まで」と限定
- 「PDF 署名は**証明書 ID + 公開鍵 fingerprint + verify URL** をメタデータとして付与」と明確化
- 「Polygon に刻印されるのは**施工写真の SHA-256**」と統一 (証明書本体ハッシュも同梱したいなら実装側を進める)

---

## 7. パイロット版資料 (Case Studies / ROI Template)

`Ledra_Case_Studies.pdf` は明確に「パイロット設計段階での想定パターン」と注記しており、実数を出していないため**コンプライアンス上の懸念なし**。`Ledra_ROI_Template.pdf` も「単純化した 4 入力モデル」「1 件 3 分は他社平均」と前提を明示しており、誤認を生む断定的表現は見当たらない。

ただし「**1件あたり事務時間は 3 分として固定 (他社平均)**」の根拠は外部に言及されておらず、出典が問われた場合に補足できる準備が必要。

---

## 8. 推奨アクション (優先度順)

### P0 — 営業表現と実装の即時整合 (1〜2 週)

1. **Pro 限定機能のゲート実装** — `audit_log` / `api_integration` / `detailed_reports` を `featureKeys.ts` 追加 + `MATRIX` 設定 + route で `requireAdminFeature` 呼出し
2. **CloudSign 文言修正** — 全資料 (`Ledra_Service_Overview.pdf` 生成元, `agent-demo-guide.md`, `ledra-introduction-guide.md` ほか) で「ロードマップ」表記、または項目削除
3. **Polygon anchoring 文言修正** — Whitepaper p.7-8 を「画像 SHA-256 を Polygon にアンカリング」に統一。証明書本体・バッチのアンカリングを実装するなら別途タスク化

### P1 — セキュリティ表現の精緻化 (2〜4 週)

4. **顧客ポータル セッション TTL 整合** — Whitepaper を 30 日表記に変更、または `SESSION_TTL_DAYS` を 1 に短縮 (UX 影響評価必要)
5. **Vercel リージョン明記** — `vercel.json` に `"regions": ["hnd1"]` を追加
6. **PDF 署名の表現修正** — 「PDF メタデータに署名情報を付与」「verify URL から第三者検証」と訂正、または PAdES 実装
7. **「自動鍵ローテーション」削除** — 手動運用の実態に合わせる

### P2 — Solidity 改善 (任意)

8. **コントラクト書込みアクセス制御** — `onlyAnchorer` modifier + allowlist
9. **OwnershipTransferred イベント追加**
10. **Pausable 導入** (緊急停止)
11. **LedraCertAnchor / LedraBatchAnchor 配線** (P0-3 と連動)

### P3 — ドキュメント整備

12. ROI Template の「1件 3 分」根拠を `docs/` に内部メモ化
13. Case Studies に実数値が入った時点で本レビュー再走

---

## 9. 検証用コマンド

```bash
# プラン値の最終確認
grep -n "" src/lib/billing/planFeatures.ts src/lib/billing/memberLimits.ts \
  src/lib/marketing/pricing.ts | head -200

# Polygon 配線の確認
grep -rn "anchorCertificate\|anchorBatch" src/

# CloudSign の実装有無
grep -rn "cloudsign\|cloud-sign" src/lib/

# 監査ログのプランゲート
grep -rn "requireAdminFeature\|checkAdminFeature" src/app/api/customer/audit-log/

# セッション TTL
grep -n "SESSION_TTL" src/lib/customerPortalServer.ts
```

---

レビュー対象コミット: `aca1bf2` (main の最新)
レビュー実施: `claude/contract-compliance-review-UoXnO`
