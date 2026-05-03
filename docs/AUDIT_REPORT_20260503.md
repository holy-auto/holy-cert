# Ledra WEBアプリ 監査・機能改善レポート

**監査日**: 2026-05-03
**対象**: Ledra (CartTrust) プラットフォーム — Next.js 16 + Supabase + Stripe
**前回監査**: `docs/AUDIT_REPORT_20260329.md` (2026-03-29) からの差分・残存課題と新規所見

---

## 0. エグゼクティブサマリ

| 分野 | 前回スコア | 今回スコア | 変動 |
|------|-----------|-----------|------|
| セキュリティ | 6.5/10 | **6.8/10** | ↑ Cron署名修正 / proxy.ts動作確認 |
| DB/APIレイヤー | 6.0/10 | **8.5/10** | ↑↑ レスポンス統一 / Zod / pagination |
| UI/フロントエンド | 7.0/10 | **7.3/10** | ↑ console -16% / any -8% |
| テスト/DevOps | 5.5/10 | **7.0/10** | ↑ unit test +65% / cron alert / coverage 閾値 |
| ビジネスロジック完成度 | 7.5/10 | 7.5/10 | → コア安定 |
| **総合** | **6.3/10** | **7.4/10** | **↑ 1.1 ポイント** |

> 前回監査の HIGH 項目 (#1, #6, #7, #8) は全て解消。残存リスクは API 層から
> セキュリティ細部 (顧客ポータル 2FA / Admin route テナント検証細部) と
> 観測性周辺 (Sentry user context / bundle 監視 / SAST) に移行。

---

## 1. セキュリティ — 6.8/10

### 解消済み（前回 HIGH/CRITICAL）

| 項目 | ファイル | 検証 |
|------|---------|------|
| Cron 署名検証バグ | `src/lib/cronAuth.ts:27` | URL pathname を SHA-256 + `timingSafeEqual`。✓ |
| proxy.ts 自動有効化 (Next 16) | `src/proxy.ts` | Origin/Host 検証、sec-fetch-site fallback、webhook/mobile 除外 OK。✓ |
| Stripe webhook 冪等性 | `src/app/api/stripe/webhook/route.ts:303-307` | `stripe_processed_events` への ON CONFLICT claim。✓ |
| Insurer route guard | `src/app/insurer/layout.tsx` | InsurerRouteGuard 配置済。✓ |

### 残存課題

#### MEDIUM-1: 顧客ポータル認証が単要素のまま
- **場所**: `src/lib/customerPortal*.ts`、`src/app/api/customer/verify-code/route.ts`
- **内容**: メール + 電話下4桁の OTP のみ。電話番号列挙耐性なし。
- **推奨**: メール OTP を必須化 + 既存「下4桁」をフォールバックに格下げ。
  もしくは Resend Magic Link への切替。
- **工数目安**: 1〜2日

#### MEDIUM-2: Admin プラットフォーム route の `createServiceRoleAdmin`
- **場所**: `src/app/api/admin/insurers/route.ts:53`、`src/app/api/admin/billing-state/route.ts`
- **内容**: 横断照会のため意図的に tenant スコープ外。`requirePlatformAdmin()` で
  ガードされており現状問題ないが、新規 contributor が誤用する余地あり。
- **推奨**: `createPlatformScopedAdmin()` のような明示ラッパを設けて ESLint で誘導。
- **工数目安**: 半日

#### LOW-1: console statements 325 件残存（前回 387 → 325, -16%）
- **影響**: PII / secret 漏洩リスクは logger の自動マスクで低い。
- **推奨**: 残存コードに `eslint-disable-next-line no-console` を必須化、
  もしくは `eslint-plugin-no-console` を error 化して段階的に潰す。

#### LOW-2: パスワードポリシー 8文字（NIST は 12 推奨）
- **場所**: signup フロー全般
- **推奨**: 最小 12 文字 + 既知パスワード辞書チェック（haveibeenpwned API）。

---

## 2. DB / API レイヤー — 8.5/10（大幅改善）

### 改善が確認できた点

- **レスポンス形式統一**: 324 ルート中、生 `NextResponse.json()` は **1 件のみ**。
  残りは `apiOk` / `apiError` 等の標準ヘルパ経由 (`src/lib/api/response.ts`)。
  ✓ secret 漏洩スキャン / scope-id 冗長除去まで組み込まれている。
- **Zod 検証**: POST/PUT 247 ルートが `safeParse()` / `parseJsonBody()` を経由。
  カバレッジ 95% 超。
- **Pagination**: `parsePagination()` ヘルパで maxPerPage キャップ。
  `/api/admin/agents` `/api/admin/invoices` `/api/agent/rankings` 全て対応済。
  無制限返却ルートは確認できず。
- **Migration**: 全 160 本タイムスタンプ付・`pending_remote.sql` 不在。
  新規テーブルは `tenant_id NOT NULL` + RLS 既定。

### 残存課題

#### MEDIUM-3: `safeJson` の外部 API 適用が部分的
- **場所**: Polygon / Resend / QStash 呼び出し各所
- **内容**: `await fetch(...).json().catch(() => ({}))` で握り潰している箇所あり。
- **推奨**: `safeFetchJson()` ヘルパ (`src/lib/api/safeJson.ts`) の利用を webhook
  応答経路と外部 fetch 全般に展開。エラー時に `logger.error` まで通す。

#### MEDIUM-4: トランザクション非対応の 4〜5 ステップ処理
- **場所**: 代理店承認フロー、POS 決済の確定
- **内容**: PostgREST にトランザクションがないため、中間失敗で孤立データ発生。
- **推奨**: マルチステップ処理のみ `pg-transaction` 経由 RPC（`SECURITY DEFINER`
  function）に集約。または `outbox` テーブル + リトライキューで補償。
- **工数目安**: 3〜5日

#### LOW-3: 主要テーブルに `deleted_at` なし
- **影響**: 現状 status カラム + `audit_logs` で代替されており GDPR 観点では充足。
- **推奨**: 監査要件が高度化したタイミングで `tenants` `certificates` `invoices`
  に `deleted_at timestamptz` を追加。

---

## 3. UI / フロントエンド — 7.3/10

### 改善が確認できた点

- `: any` **265 件** (前回 288 → -8%)、`as any` 34 件 → 合計 299
- `console.*` **325 件** (前回 387 → -16%)
- `error.tsx` の Sentry 連携 **9/9 完了**（前回は market のみ未対応）
- `Button` コンポーネントが `src/components/ui/Button.tsx` に存在し、
  `btn-primary` クラス使用が **189 箇所** で揃っている

### 残存課題

#### MEDIUM-5: `any` 集中ファイル トップ 5（リファクタ価値高）
| 件数 | ファイル |
|------|---------|
| 16 | `src/lib/cron/__tests__/maintenance.test.ts` |
| 11 | `src/app/insurer/search/page.tsx` |
| 7  | `src/app/api/cron/square-sync/route.ts` |
| 7  | `src/app/admin/certificates/new/VoiceMemoPanel.tsx` |
| 6  | `src/app/api/qstash/square-sync/route.ts` |

→ Square Webhook 周りが共通でゆるい。Square SDK のレスポンス DTO を型生成して
   `unknown` + Zod parse に置換することを推奨。

#### MEDIUM-6: `<img>` 残存 4 箇所
- `src/app/admin/certificates/new/success/page.tsx`
- `src/app/admin/certificates/new/PhotoUploadSection.tsx`
- `src/app/admin/academy/learn/[id]/page.tsx`
- `src/app/admin/market-vehicles/[id]/VehicleDetailClient.tsx`

→ Next.js `<Image>` への置換で LCP 改善 + alt 必須化。

#### MEDIUM-7: `.catch(() => {})` / `.catch(() => null)` が 18 箇所
- 失敗の温存箇所。ログ + Sentry breadcrumb への昇格を推奨。
  最小修正は `.catch((e) => logger.warn("...", { error: e }))`。

#### LOW-4: マーケティング 2 階層ページに `generateMetadata` 欠落
- `/roi`, `/features`, `/contact` 等 (5〜8 ページ)
- → SEO の取りこぼし。OG image + canonical を含めて追加。

#### LOW-5: Accessibility (`aria-live`, `aria-busy`)
- aria 属性使用が 20 件のみ。非同期更新の音声読み上げが弱い。
- → 主要フォーム（証明書発行 / 予約 / 顧客登録）に loading announcement を追加。

#### LOW-6: 重い Client Component
- `ReservationsClient` 1517 行、`AdvancedSections` 1596 行、`resourcePdf` 2144 行
- `"use client"` ページが 80 件 → サーバサイドへ部分移行する余地あり
- → 段階的に Server Component + Client Island 化。

---

## 4. テスト / DevOps / 観測性 — 7.0/10

### 改善が確認できた点

- **Unit test 51 ファイル** (前回 31 → +65%)、テスト総行数 7,544 行
- **Coverage 閾値**: statements 50% / branches 40% / functions 40% / lines 50%
  を `vitest.config.ts` で適用 (lib/components スコープ)
- **Cron 障害アラート**: 全 11 cron が Sentry tag + Resend メール二重送信
  (`sendCronFailureAlert()`) と `withCronLock` (TTL 600s) を適用
- **CI ジョブ**: ESLint, tsc --noEmit, vitest (coverage), Playwright,
  npm audit (high/critical)、migration lint が並列稼働

### 残存課題

#### MEDIUM-8: API ルートが coverage スコープから除外されている
- **場所**: `vitest.config.ts` の coverage include: `src/lib/**`, `src/components/**`
- **内容**: 324 route handler が coverage 計測外。`__tests__` 自体ほぼ無し。
- **推奨**: route handler に対する thin な integration test を 5〜10 件先行投入。
  特に Stripe webhook / cron / customer verify-code は最優先。

#### MEDIUM-9: SAST が CI に未組込
- **推奨**: GitHub CodeQL (無償) もしくは Semgrep (`p/owasp-top-ten`)。
  既存 npm audit と相補。

#### MEDIUM-10: Sentry にユーザ / テナントコンテキストが乗っていない
- **場所**: `sentry.client.config.ts` / `sentry.server.config.ts`
- **内容**: `Sentry.setUser` `Sentry.setContext("tenant", ...)` 未設定。
- **推奨**: proxy.ts もしくは layout で session 復元時にセット。
  インシデント切り分け速度が桁違いに向上。
- **工数目安**: 半日

#### LOW-7: バンドルサイズ監視なし
- **推奨**: `@next/bundle-analyzer` を CI 限定で有効化、`vercel.json` で
  サイズ閾値超え PR をブロック。

#### LOW-8: pre-commit に test 実行なし
- 速度優先で妥当。代わりに `pre-push` で `vitest run --changed` を推奨。

---

## 5. 機能改善・拡張ロードマップ（優先度付き）

### Tier 1 — 4-6 週間以内（リスク削減 / 観測性）

1. **Sentry user/tenant context 注入** — 半日 — Ops/Inc 対応速度↑
2. **顧客ポータル メール OTP 必須化** — 1-2日 — 認証強度↑
3. **API route handler integration test 5本** — 2日 — 回帰防止
4. **CodeQL / Semgrep を CI 追加** — 半日 — SAST ベースライン
5. **`createPlatformScopedAdmin()` 導入 + ESLint 誘導** — 半日 — 誤用防止

### Tier 2 — 6-12 週間（品質向上）

6. **`any` 集中ファイル Top 5 を型化** — 3-5 日（特に Square 系）
7. **`<img>` → `<Image>` 4 箇所** — 半日 — LCP/alt
8. **マーケティングページ `generateMetadata`** — 1日 — SEO
9. **トランザクション必要な代理店承認/POS 決済を RPC 化** — 3-5日
10. **`.catch(() => {})` 18 箇所を logger 経由化** — 1日

### Tier 3 — 12 週間以降（拡張準備）

11. **アカデミー（動画/クイズ/修了証）本実装** — 3-6 ヶ月
12. **モバイルアプリ App Store/Play 配布準備** — 2-3 ヶ月
13. **SSO / SAML 対応**（エンタープライズ商談用） — 1-2 ヶ月
14. **GDPR データエクスポート** — 2-3 週間
15. **POS 在庫管理機能** — 3-4 週間

---

## 6. コードベース指標サマリ

| 指標 | 前回 (2026-03-29) | 今回 (2026-05-03) | 変動 |
|------|------------------|------------------|------|
| API ルート | 247 | **324** | +77 |
| Migration | 97 | **160** | +63 |
| Unit test | 31 | **51** | +20 |
| E2E test | 10 | 10 | ±0 |
| `console.*` | 387 | **325** | -62 |
| `: any` | 288 | **265** | -23 |
| `<img>` 残存 | 2 | 4 | +2（新規ページ追加分） |
| 標準レスポンス helper 利用 | 部分 | **324/324 ほぼ全件** | 統一完了 |

---

## 7. 結論

前回 (2026-03-29) の HIGH ブロッカーは **全て解消** され、特に API 層は
レスポンス形式・Zod 検証・pagination の 3 点で実用上の不整合がほぼ消滅した
（6.0 → 8.5）。残るリスクの中心は

1. 顧客ポータルの認証強度（MEDIUM）
2. Sentry コンテキスト不足によるインシデント切り分け効率（MEDIUM）
3. SAST 不在（MEDIUM）
4. API route handler のテスト空白（MEDIUM）

の 4 点。Tier 1 (5 タスク, 合計 ~5 人日) を消化すれば総合 8.0/10 圏に到達可能。

---

*本レポートは 2026-05-03 時点のコードベース静的解析と前回監査との差分検証に
基づく。動的テスト・ペネトレーション・負荷試験は別途推奨。*
