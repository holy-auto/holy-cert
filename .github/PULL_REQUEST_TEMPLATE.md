<!--
  PR テンプレートはレビュアの認知負荷を下げる + 抜け漏れ防止の二目的。
  該当しない欄は削除してかまわない。`セキュリティ` 欄だけは必ず判断する。
-->

## 概要

<!-- 1〜3 行で「何を」「なぜ」変えたか。実装詳細は本文か commit ログへ。 -->

## 動作確認

- [ ] `npm run lint`
- [ ] `npx tsc --noEmit`
- [ ] `npm run test` (vitest)
- [ ] ローカルで golden path を動作確認した
- [ ] エッジケース / エラーパスを確認した
- [ ] (UI 変更時) ブラウザで実機確認した

## セキュリティチェック (該当するものに ✅)

> 1 つでも該当する場合は @founder のレビュー必須。
> 詳細は `docs/operations/security-review-checklist.md` 参照。

- [ ] 認証 / 認可 / セッション / cookie の処理を変更した
- [ ] `requireMinRole` / `resolveCallerWithRole` / RLS ポリシーを変更した
- [ ] 新しい API エンドポイントを追加した
- [ ] webhook / cron / qstash の処理を変更した
- [ ] 暗号鍵 / secret / トークンの取り扱いを変更した
- [ ] 外部 URL / ユーザー由来 URL を fetch するコードを追加した (→ `assertSafeExternalUrl`)
- [ ] ファイルアップロードを追加・変更した (→ `validateFileMagic`)
- [ ] 新しい入力フィールドを追加した (→ Zod + `SafeString` 上限)
- [ ] 新しい外部依存パッケージを追加した
- [ ] DB マイグレーションを追加した (RLS チェック必要)

該当しない場合: `セキュリティ影響なし` とコメントに残すと早く merge できる。

## デプロイ前後で必要な作業

- [ ] 新しい環境変数を `.env.example` に追記した
- [ ] 新しい環境変数を Vercel に登録した (本番 / staging)
- [ ] feature flag / 段階公開が必要な変更ではない
- [ ] データ移行 / バックフィルが必要な場合は手順を本文に記載した

## ロールバック手順

<!-- "Revert" だけで安全に戻せるか、別途バックフィルが必要かを書く。 -->
