# Polygon Amoy Dry-Run チェックリスト

Phase 2〜5 で実装したブロックチェーン関連機能一式を、**本番 Polygon mainnet に切り替える前に** Amoy testnet で end-to-end 検証するためのチェックリスト。

本書は [`polygon-anchoring-deployment.md`](./polygon-anchoring-deployment.md) のデプロイ手順の後に実施する **受入試験** として使う。

---

## 0. 前提条件

以下が完了していること:

- [ ] MetaMask (または Rabby) に Polygon Amoy が追加済み
- [ ] Amoy faucet から 0.1 POL 以上入金済み
- [ ] `LedraAnchor.sol` が Amoy にデプロイ済み (コントラクトアドレスが手元にある)
- [ ] 次の env が Vercel Preview / 本番と**同一値**で設定されている:
  - `POLYGON_ANCHOR_ENABLED=true`
  - `POLYGON_NETWORK=amoy`
  - `POLYGON_PRIVATE_KEY=0x...` (施工画像アンカー用の hot wallet)
  - `POLYGON_CONTRACT_ADDRESS=0x...` (デプロイ済みアドレス)
  - `POLYGON_WALLET_WARN_BALANCE_POL=0.05` (dry-run 用に低めに設定)
  - `POLYGON_WALLET_ALERT_BALANCE_POL=0.01`
  - `CRON_SECRET`, `QSTASH_TOKEN` など既存の運用系 env
  - `RESEND_API_KEY`, `CONTACT_TO_EMAIL` (wallet アラートメール先)

---

## 1. 画像アップロード → アンカー基本フロー

### 1-1. 施工店から画像 1 枚をアップロード

1. [ ] テスト用施工店アカウントでログイン
2. [ ] 任意の証明書を開き、施工画像を 1 枚アップロード
3. [ ] アップロード完了レスポンスに `certificate_images.id` が含まれる

### 1-2. QStash 経由でアンカー処理がキューされる

1. [ ] Vercel logs で `[anchor-job]` 系の enqueue ログが出ていること
2. [ ] DB `certificate_images.polygon_tx_hash` が **null でなくなる** (通常 30 秒以内)
3. [ ] DB `certificate_images.polygon_network` が `amoy` になっている

### 1-3. Polygonscan で確認

1. [ ] Amoy Polygonscan (`https://amoy.polygonscan.com/tx/{tx_hash}`) で `Success` になっている
2. [ ] `Anchored` イベントの `sha256` パラメータが DB の `certificate_images.sha256` と一致

---

## 2. 重複アップロードの冪等性 (Phase 1 / #5 isAnchored 事前チェック)

1. [ ] **同じハッシュの画像**を別の証明書に再度アップロード
2. [ ] `certificate_images.polygon_tx_hash` には **1 回目と同じ tx_hash** が入る (新規 tx は発行されない)
3. [ ] Polygonscan 上で新しい tx が増えていないこと (ガス代が発生していない)
4. [ ] ログに `[anchor-job] already anchored; reusing existing tx_hash=...` 相当のメッセージ

**NG の場合**: `isAnchored()` 事前チェックが効いていない → `providers/polygon.ts` を再確認。

---

## 3. authenticity_grade の昇格 (Phase 1 / #4)

1. [ ] アンカー完了後、`certificate_images.authenticity_grade` が `basic` 以上に昇格
2. [ ] C2PA 検証 + EXIF 時刻一致 + デバイス attestation 有効なら `verified` または `premium`
3. [ ] 管理画面 (`/admin/certificates/:id`) でバッジ表示が更新される

---

## 4. 公開 `/verify` ページ (Phase 2)

### 4-1. 正常系 (アンカー済み画像)

1. [ ] 未ログインのブラウザで `/verify` を開く
2. [ ] 1-1 でアップロードした**オリジナル画像**をドロップ
3. [ ] `onChainVerified: true` の結果カードが表示される
4. [ ] 「Polygonscan で確認」リンクが Amoy ドメインを指す
5. [ ] 開発者ツールの Network タブで、POST /api/public/verify に送信されているのは **SHA-256 のみ** (画像 binary が送られていないこと)

### 4-2. 異常系 (改ざん画像)

1. [ ] 元画像を画像編集ソフトで 1 px だけ書き換えて保存
2. [ ] `/verify` に改ざん画像をドロップ
3. [ ] `onChainVerified: false` が表示される
4. [ ] DB にもハッシュが存在しないので `"該当データなし"` 相当メッセージ

### 4-3. レート制限

1. [ ] 同じ IP から 61 回連続でリクエスト (curl ループで OK)
2. [ ] 61 回目以降は HTTP 429 が返る

---

## 5. 保険会社向け `/insurer/anchor-verify` (Phase 5)

### 5-1. 認可

1. [ ] 未ログインで `/insurer/anchor-verify` にアクセス → `/insurer/login` に redirect
2. [ ] **契約していない**保険会社でログイン → SHA-256 を入力 → `404 "該当する施工画像が見つかりません"` が返る
3. [ ] **契約済み**保険会社でログイン → 同じ SHA-256 を入力 → メタデータが開示される

### 5-2. 両入力モード

1. [ ] SHA-256 を直接ペーストしても正しく検証される
2. [ ] 画像ファイルをドロップしても (ブラウザ内で hash 計算後) 同じ結果になる

### 5-3. 監査ログ

1. [ ] `insurer_access_log` テーブルに `action=view`, `meta.route=GET /api/insurer/anchor-verify/[sha256]`, `meta.sha256_prefix=...`, `meta.on_chain_verified=true/false` が 1 行挿入されている

---

## 6. PDF 証明書への QR 埋め込み (Phase 3)

### 6-1. 単一 PDF (`/admin/certificates/pdf-one`)

1. [ ] アンカー済み画像を 1 枚含む証明書を選び PDF を発行
2. [ ] PDF 内に「ブロックチェーン認証 (Polygon)」セクションが存在する
3. [ ] QR を携帯で読み取ると Amoy Polygonscan に飛ぶ
4. [ ] QR は最大 4 枚まで、5 枚目以降は `"ほか N 枚"` のテキスト要約

### 6-2. 一括 PDF (`/api/admin/certificates/batch-pdf`, `/admin/certificates/pdf-selected`)

1. [ ] 同じ tenant の証明書 20 件を選択して batch-pdf を叩く
2. [ ] DB への SQL クエリが `IN (...)` の **1 回のみ** (N+1 が解消されている)
3. [ ] 各 PDF に正しいアンカー情報が埋め込まれる

---

## 7. Wallet 残高監視 cron (Phase 4)

### 7-1. healthy 状態

1. [ ] 手動で cron を叩く: `curl -H "Authorization: Bearer $CRON_SECRET" https://<preview>.vercel.app/api/cron/polygon-signer`
2. [ ] `status: "healthy"`, `balance_pol > 0.05` のレスポンス
3. [ ] メールは**送信されない**

### 7-2. warning 状態

1. [ ] wallet の POL を意図的に 0.03 前後まで消費する (数件アンカーを発行)
2. [ ] 手動で cron を叩く
3. [ ] `status: "warning"` のレスポンス
4. [ ] `CONTACT_TO_EMAIL` に「Polygon signer wallet low」警告メールが届く

### 7-3. critical 状態

1. [ ] `POLYGON_WALLET_ALERT_BALANCE_POL` を一時的に現在残高より**高い値**に上げる
2. [ ] 手動で cron を叩く
3. [ ] `status: "critical"` のレスポンス + CRITICAL 件名のメール受信
4. [ ] 閾値を元に戻す

### 7-4. RPC 障害シミュレーション

1. [ ] `POLYGON_RPC_URL` を一時的に `https://invalid.example/rpc` に差し替え
2. [ ] 手動で cron を叩く
3. [ ] HTTP 200 + `status: "error"` のレスポンス (cron が retry-loop に入らないこと)
4. [ ] env を元に戻す

### 7-5. アンカー無効時の skip

1. [ ] `POLYGON_ANCHOR_ENABLED=false` に変更
2. [ ] 手動で cron を叩く
3. [ ] `status: "skipped"` が返り、メール送信されない
4. [ ] env を元に戻す

---

## 8. 認可 / レート制限 共通

1. [ ] `/api/public/verify` は未認証でも叩けるが 60 req/60s/IP で 429
2. [ ] `/api/insurer/anchor-verify/[sha256]` は insurer 未ログインで 401
3. [ ] `/api/cron/polygon-signer` は `CRON_SECRET` なしで 401

---

## 9. 本番切替前の最終チェック

すべての ✓ が取れたら、次のステップへ:

- [ ] `contracts/LedraAnchor.sol` を Polygon mainnet にデプロイ
- [ ] Vercel 本番環境 env を更新:
  - `POLYGON_NETWORK=polygon`
  - `POLYGON_CONTRACT_ADDRESS=0x...` (mainnet のアドレス)
  - `POLYGON_PRIVATE_KEY=0x...` (**mainnet 専用の新しい** hot wallet)
  - `POLYGON_WALLET_WARN_BALANCE_POL=0.5`
  - `POLYGON_WALLET_ALERT_BALANCE_POL=0.1`
- [ ] mainnet wallet に最低 **2 POL** 入金 (約 500〜1000 円)
- [ ] Amoy で使った private key は**破棄** (再利用しない)
- [ ] セクション 1〜7 を本番環境で再度流し、tx が mainnet Polygonscan で確認できること

---

## 10. ロールバック手順

本番で問題が起きた場合:

1. [ ] `POLYGON_ANCHOR_ENABLED=false` を設定 → アンカー停止 (既存アンカーは影響なし)
2. [ ] QStash の未処理 anchor job を確認、必要に応じて手動 drain
3. [ ] 証明書発行そのものは継続可能 (オフチェーンの認証グレードで動作)

---

## 付録: トラブルシュート

| 症状 | 原因候補 |
| --- | --- |
| `status: "error"`, `RPC error: request timeout` | 公式 RPC の一時障害。`POLYGON_RPC_URL` を Alchemy / Infura の専用 RPC に切り替え |
| `isAnchored` が常に false | コントラクトアドレスが誤り / ABI 不整合 / RPC が別ネットワークを指している |
| アンカー後も `authenticity_grade` が `unverified` | C2PA / EXIF / attestation のうちどれかが失敗。`certificate_images.c2pa_verified` などを確認 |
| `/verify` で 200 なのにメタデータが空 | 意図的仕様: DB 構造を外部から探られないよう、該当なしも 200 で返す |
