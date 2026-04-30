# EAS Update (OTA) 運用ガイド

`apps/mobile` は EAS Update を使ったコード/アセットの OTA (Over-The-Air)
配信に対応している。ストア審査が不要な軽微な修正 (UI 文言、ロジック変更、
バグフィックス) は **App Store / Google Play へリビルドせずに数分でユーザー
端末へ配信できる**。

ネイティブ依存 (新規パッケージ、`app.json` plugins、Permissions など) を
変える変更は OTA では届かないため、必ず通常の `eas build` でストア配信する。

## チャネル構成

`apps/mobile/eas.json` の build.profiles で channel を設定済み。

| profile | channel | 配信先 |
| --- | --- | --- |
| development | development | 開発端末 (Expo Dev Client) |
| preview | preview | TestFlight + Play Internal |
| staging | staging | alpha tester |
| production | production | 一般ユーザー |

各端末は `expo-updates` 経由で自分の build channel に紐づく最新 update を取得する。

## セットアップ (初回のみ)

```bash
cd apps/mobile

# 1. expo-updates を導入 (まだなら)
npx expo install expo-updates

# 2. EAS にチャネルを登録
eas channel:create development
eas channel:create preview
eas channel:create staging
eas channel:create production

# 3. (任意) チャネルをすでに作成済みなら確認
eas channel:list
```

## 通常運用: ブランチに push して自動配信

GitHub Actions に EAS Update の publish job を追加する場合:

```yaml
# .github/workflows/mobile-eas-update.yml (例)
name: Mobile EAS Update
on:
  push:
    branches: [main, staging]
    paths: ["apps/mobile/**"]
jobs:
  publish:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: apps/mobile
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with: { node-version: 22, cache: npm, cache-dependency-path: apps/mobile/package-lock.json }
      - run: npm ci
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      # branch → channel マッピング
      - name: Publish to channel
        run: |
          if [ "$GITHUB_REF_NAME" = "main" ]; then
            eas update --channel preview --message "${{ github.event.head_commit.message }}"
          elif [ "$GITHUB_REF_NAME" = "staging" ]; then
            eas update --channel staging --message "${{ github.event.head_commit.message }}"
          fi
```

`production` channel への配信は手動 (tag push or 専用 workflow) で行う。
事故防止のため自動 push しない。

## 手動 publish

```bash
cd apps/mobile

# preview チャネルに publish
eas update --channel preview --message "fix: NFC タグ書込みの確認文言"

# production にプロモート (preview の特定 update を本番へ昇格)
eas update --branch preview --json | jq -r '.[0].id'  # 直近 update id を取得
eas update:republish --update-id <ID> --channel production
```

## ロールバック

問題のある update を rollback (旧 update を再 publish) するのが基本。

```bash
# 直近2件の update を確認
eas update:list --channel production --limit 2

# 古い方を再 publish
eas update:republish --update-id <OLDER_ID> --channel production
```

## 注意事項

- **ネイティブ変更は OTA では届かない**。`@sentry/react-native` 追加、
  `app.json` plugins 変更、permission 追加などは `eas build` 必須
- **runtimeVersion** が一致する build にだけ配信される。`runtimeVersion`
  を上げた瞬間以降の build にしか新しい OTA は届かないので、ネイティブ
  変更時は runtimeVersion を bump する習慣をつける (現在は `appVersion`
  が `appVersionSource: remote` 経由で自動連動)
- ストア審査ガイドラインに反する変更を OTA で送るのは禁止 (Apple は特に厳しい)
- update size に注意: アセットを大量に追加するなら `eas-update` の
  `runOnce` や差分配信を活用

## 参考

- https://docs.expo.dev/eas-update/getting-started/
- https://docs.expo.dev/eas-update/runtime-versions/
- https://docs.expo.dev/eas-update/rollouts/
