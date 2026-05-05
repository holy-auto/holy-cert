# モバイル配布 (App Store / Google Play) フロー

`apps/mobile` は EAS Build / EAS Submit を使った Expo (React Native)
アプリです。本ドキュメントでは正式リリースの一連の手順をまとめます。

## アーキテクチャ前提

- **EAS Build**: ネイティブビルド (iOS .ipa / Android .aab) をクラウド生成
- **EAS Update**: JS のみ更新は OTA で配信 (`apps/mobile/docs/EAS_UPDATE.md`)
- **App Version**: `eas.json:cli.appVersionSource = "remote"` のため
  バージョン番号は EAS サーバ管理 (ローカル `app.json` の version は
  記録のみ)

## 必須前提

| 項目 | 必要なもの |
|------|----------|
| Apple Developer Program | 年額 $99 メンバーシップ + Team ID `T43978PBAA` |
| App Store Connect | App ID `6762254734`, ASC API key (`P235PU8K3S`) |
| Google Play Console | デベロッパーアカウント + service account JSON |
| Expo / EAS | 組織アカウント (CI 用 access token) |

## チェックリスト: 初回ストア提出

### 1. メタデータ整備
- [ ] App Store: アプリ名 / 説明文 / スクリーンショット (5 画面以上)
      / アプリプレビュー動画 / カテゴリ / キーワード
- [ ] Google Play: 同等のメタデータ + Feature Graphic 1024×500
- [ ] プライバシーポリシー URL (Ledra: `https://ledra.co.jp/privacy`)
- [ ] サポート URL / 連絡先メール

### 2. 法令対応
- [ ] **App Store**: 「アプリのプライバシー」(`Privacy Nutrition Label`)
      で取得データを宣言。Ledra は以下を取得する:
      - 連絡先情報 (メール)、ユーザー ID、診断データ (Sentry)
      - **NFC / カメラ / 位置情報** は使用目的を明示
- [ ] **Google Play**: 「データの安全性」セクションを記入
- [ ] **App Tracking Transparency** (iOS): 広告 SDK を含まないため
      `NSUserTrackingUsageDescription` は不要だが、Sentry / PostHog の
      session replay は宣言する

### 3. ビルド & 提出

```bash
# iOS production build (App Store 提出用)
cd apps/mobile
eas build --platform ios --profile production

# Android production build (.aab)
eas build --platform android --profile production

# 提出 (App Store Connect / Google Play Console に自動アップロード)
eas submit --platform ios --latest
eas submit --platform android --latest --track internal
```

### 4. テストトラック
- iOS: TestFlight 内部テスト → 外部テスト (Apple 審査 1〜2日)
- Android: Internal track → Closed → Open → Production
- 最低でも 5 名以上の社内テスター + 加盟店オーナー数名で 1 週間検証

### 5. ストア審査ポイント (経験則)

| 落ちやすい指摘 | 対策 |
|--------------|------|
| ログインが必要なのにデモアカウントが提供されていない | 審査用デモを `scripts/setup-demo-tenant.ts` 経由で用意し、レビュー欄に email/pass を貼る |
| Stripe Terminal の Tap to Pay 利用宣言不足 | `apps/mobile/docs/mobile-release-tap-to-pay.md` の通り Apple 申請 + entitlement 設定 |
| プライバシーポリシーへのリンク切れ | `/privacy` ページが本番でアクセス可能か確認 |
| 起動時クラッシュ (TestFlight だけで再現) | EAS production プロファイルでビルド検証必須 (development build では出ない) |

## 継続デリバリ

### JS / RN だけの変更 → EAS Update (OTA)
```bash
cd apps/mobile
eas update --branch production --message "fix: NFC タップ精度改善"
```
ストア再提出不要。数分でアプリ起動時に自動取得。

### ネイティブ依存 (新パッケージ追加 / SDK 更新) → EAS Build
- `app.json` に追加した plugin / patch-package を変更したら
  必ず production build を再生成
- `eas.json` の `production.autoIncrement: true` がビルド番号を
  自動インクリメント

## ロールバック

### OTA 配信のロールバック
```bash
eas update:list --branch production
eas update:republish --group <PREVIOUS_GROUP_ID>
```

### ストア配信のロールバック
- iOS: 直前ビルドの「Phased Release」を停止 → 新ビルド差し戻しは不可。
  代わりに緊急 hot-fix を OTA で当てる
- Android: Play Console で staged rollout を 0% に戻す

## CI 連携

`.github/workflows/mobile-ci.yml` で以下を実行:
- PR ごとに `tsc --noEmit`
- main マージで自動 EAS Update (production branch)

正式ストア提出は **手動** とし、CI からの自動 submit は無効化済 (
誤提出のリスクが大きいため)。

## TODO (続編で対応)

- [ ] Tap to Pay (iPhone) の Apple Entitlement 申請が承認待ち
- [ ] Push 通知 (APNs / FCM) の本番証明書登録
- [ ] 生体認証 (Face ID / 指紋) のオプトイン設定
- [ ] ストア掲載後の Crashlytics / Sentry リリーストラッキング
- [ ] 加盟店向けインストールガイド (`docs/agent-demo-guide.md` の延長)

## 参考

- `apps/mobile/docs/EAS_UPDATE.md` — OTA 運用詳細
- `apps/mobile/docs/mobile-release-tap-to-pay.md` — Tap to Pay 対応
- Expo EAS docs: <https://docs.expo.dev/eas/>
- App Store Review Guidelines: <https://developer.apple.com/app-store/review/guidelines/>
- Google Play Developer Policy: <https://play.google.com/about/developer-content-policy/>
