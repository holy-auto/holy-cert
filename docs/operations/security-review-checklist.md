# PR セキュリティレビュー チェックリスト

CODEOWNERS で自動アサインされるセキュリティレビュアが、PR 種別ごとに
必ず確認する項目。OWASP ASVS Level 2 に準拠。

> **使い方**: PR 説明欄のチェック項目に該当する種別を見て、対応する
> セクションを確認する。すべて OK なら "✅ Security review passed" と
> コメントしてレビューを承認する。

## 共通(全 PR)

- [ ] PR にセキュリティチェック欄が記入されている
- [ ] 新しい環境変数があれば `.env.example` と `envValidation.ts` に追加されている
- [ ] CI が通っている (lint / tsc / test / CodeQL / gitleaks / dependency-review / Trivy)
- [ ] 機微情報 (API key / トークン / パスワード) がコードに直書きされていない
- [ ] `console.log` で機微データが出力されていない
- [ ] エラーメッセージに secret / SQL / スタックトレースが漏れていない

## 認証 / 認可を変更する PR

- [ ] `requireMinRole` か `requirePermission` で role check されている
- [ ] tenant scoping (`.eq("tenant_id", caller.tenantId)`) が全 query にある
- [ ] 失敗時に `auditAuthFailure` / `auditRoleDenied` が呼ばれている
- [ ] Supabase Service Role Client が使われていない (使う場合は明示的な理由)
- [ ] cookie に Secure / HttpOnly / SameSite が付与されている

## 新規 API エンドポイント

- [ ] Zod スキーマで全入力を validate している (`SafeString` 上限を使用)
- [ ] `checkRateLimit` を route の先頭で呼んでいる (適切な preset)
- [ ] CSRF / Content-Type ガードが proxy.ts でかかる位置にある
- [ ] 破壊的操作なら `withIdempotency` でラップされている
- [ ] 認証必須なら `resolveCallerWithRole` でユーザー解決
- [ ] 失敗時のレスポンスが `apiError` を経由している (PII 漏れない)
- [ ] Response の Cache-Control が適切 (機微データなら `no-store`)

## Webhook ハンドラ

- [ ] 署名検証を最初に行っている (HMAC + `timingSafeEqual`)
- [ ] timestamp tolerance を確認している (replay 防御)
- [ ] body は `req.text()` で生のまま読み、署名計算後に JSON.parse
- [ ] idempotency キーで同一イベントの二重処理を防いでいる
- [ ] 失敗時は 4xx/5xx を区別 (送信元の retry policy を意識)

## Cron / バッチ処理

- [ ] `verifyCronRequest()` で認証している
- [ ] Cron lock で並列実行を防いでいる (二重課金防止)
- [ ] エラー時に Sentry に送られる
- [ ] バッチサイズに上限がある (1 トランザクションが暴走しない)

## 外部 URL を fetch する

- [ ] `assertSafeExternalUrl` で SSRF 検証している
- [ ] timeout が設定されている (デフォルト無限はダメ)
- [ ] レスポンスサイズ上限がある (gigabytes が返ってくると OOM)
- [ ] エラー時にリトライバックオフ (固定リトライは避ける)

## ファイルアップロード

- [ ] `validateFileMagic` で実 MIME を検証している (Content-Type を信用しない)
- [ ] `sanitizeFilename` でパストラバーサル除去
- [ ] サイズ上限がある (route 単位)
- [ ] アップロード rate limit (`upload` preset) がかかっている
- [ ] ストレージキーに userId / tenantId が含まれ、他テナントと混在しない

## DB マイグレーション

- [ ] 新規テーブル / 列に **RLS が必須** (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)
- [ ] policy が tenant_id / user_id を必ず参照する
- [ ] PII 列を含むなら `SECRET_ENCRYPTION_KEY` で暗号化されている
- [ ] バックフィルが必要なら zero-downtime 手順 (`docs/operations/zero-downtime-migrations.md`)

## 依存パッケージ追加

- [ ] License が AGPL/GPL/SSPL でない (dependency-review-action で自動チェック)
- [ ] メンテナンス状況を確認 (週次 commit / オープン issue 多すぎない)
- [ ] 同種の機能が既存依存にないか確認 (重複は表面積を増やす)
- [ ] postinstall scripts がない (あるなら内容確認)
- [ ] `npm audit` で HIGH 以上が出ない

## UI / Server Component

- [ ] `dangerouslySetInnerHTML` を使っていない (使うなら DOMPurify 通す)
- [ ] ユーザー入力を URL に埋める前に encode している
- [ ] redirect 先が `safeInternalPath` を通っている (open redirect 防御)
- [ ] CSP nonce が必要な inline script で使われている

## 削除確認

- [ ] 削除した機能のデータが孤立していない (cascade or 明示削除)
- [ ] 削除後に呼ばれない route / 関数を残していない
- [ ] 削除した依存の暗黙的依存先を確認した

## レビュー完了の判定

- 上記すべて該当チェック OK → "✅ Security review passed" でレビュー承認
- 1 つでも不明 / 気になる箇所がある → request changes でブロック
- セキュリティ影響皆無の typo 修正等 → "no security impact" コメントで即承認
