# i18n (国際化) 整備状況

`next-intl` は導入済だが、現時点では極めて部分的な状態。本ドキュメントで
現状と「英語対応 LP を出すまでに必要な作業」を整理する。

## 現状

- **依存**: `next-intl@4.9.2` 導入済
- **メッセージ JSON**: `messages/ja.json`、`messages/en.json` (各 12 行)
- **適用範囲**: 一部 UI 部品のラベルのみ。
  ページ本文・マーケティングコピー・エラーメッセージは **すべてハードコード日本語**
- **API 応答**: `apiValidationErrorT` 等が `accept-language` で切替対応 (`src/lib/api/responseI18n.ts`)
  だが、呼び出し側で `*T` 系を使っているのは数十ルートに留まる

## 不足

| 範囲 | 状態 |
|------|------|
| マーケティングサイト (`/(marketing)/**`) | 全文ハードコード ja。en 版なし |
| 管理画面 (admin) | ja のみ。en ニーズが低いので保留可 |
| 顧客ポータル | ja のみ。海外旅行客向け施工店があれば en 必須 |
| エラーメッセージ (apiValidationError 等) | i18n 未対応の `*` 関数を使う route が大半 |
| メールテンプレート | `tenant_email_templates` でテナント別カスタムは可能だが、言語切替は未実装 |
| 日付・通貨フォーマット | `Intl.DateTimeFormat` を直書きしている箇所が多い |

## 英語対応 LP までの最小手順

```
1. ja/en 共通の Hero/Feature/PricingCards コンポーネントを抽出
   src/components/marketing/i18n/* に移し、useTranslations() を経由
   (現在は中身が日本語ハードコード)

2. messages/ja.json と en.json に対応キーを追加
   (現状 12 行 → 200-300 行規模に膨らむ想定)

3. middleware で /en/* を /ja/* と同等にルーティング
   next-intl の navigation API (`createNavigation`) を採用
   → src/i18n/routing.ts を新設

4. SEO: hreflang を sitemap.ts と各 page の metadata.alternates に追加

5. Footer の言語スイッチャーを実装
   src/components/marketing/Footer.tsx に dropdown
```

## 工数概算

| タスク | 工数 |
|--------|------|
| マーケサイト (Hero/Pricing/Features など) の i18n 抜き出し | 3 日 |
| 翻訳ファイル整備 (ja → en、まずは社内訳でも可) | 2 日 |
| middleware + ルーティング | 半日 |
| SEO hreflang + sitemap | 半日 |
| 言語スイッチャー + UI 調整 | 半日 |
| **合計** | **約 6-7 日** |

## 推奨タイミング

- **今すぐ着手しない理由**: 国内マーケ → 海外マーケに切り替えるビジネスフェーズ次第
- **着手すべきトリガー**: 海外加盟店の引き合い / 越境 EC (POS) 案件 / 投資家への海外展開ピッチ
- **暫定対応**: 海外向けのクイック対応として、`/en/landing` という静的英語ページを 1 枚だけ用意するアプローチ (1 日で書ける)

## 関連ファイル

- `src/lib/api/responseI18n.ts` — API 応答 i18n 既存
- `messages/{ja,en}.json` — 既存メッセージファイル
- `src/app/layout.tsx` — `NextIntlClientProvider` の wrap 確認 (TODO: 確認必要)
