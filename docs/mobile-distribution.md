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

## 本番リリース前 残作業チェックリスト

ストア審査提出前に全てクリアする。「担当」は当該領域の最終責任者、
「状態」は更新するたびに書き換える。

| # | 項目 | 担当 | 状態 | 関連 |
|---|---|---|---|---|
| 1 | Tap to Pay (iPhone) Apple Entitlement 申請 | iOS リード | ⏳ 承認待ち | `docs/tap-to-pay-submission-guide.md` |
| 2 | Push 通知本番証明書登録 (APNs key + FCM Server Key を EAS Secrets に) | Mobile リード | ⬜ 未着手 | `apps/mobile/eas.json` |
| 3 | 生体認証 (`expo-local-authentication`) のオプトイン UI + 設定保存 | Mobile リード | ⬜ 未着手 | `apps/mobile/src/features/auth/` |
| 4 | Sentry リリーストラッキング (`sentry-expo` + EAS Update hook) | DevOps | ⬜ 未着手 | `sentry.client.config.ts` |
| 5 | 加盟店向け インストールガイド (TestFlight + Play Internal) | サポート | ⬜ 未着手 | `docs/agent-demo-guide.md` の延長 |
| 6 | ストアスクリーンショット (5 端末分 × 2 言語) | デザイン | ⬜ 未着手 | `_review-pdfs/` |
| 7 | プライバシーポリシーの最新版を App Privacy 入力に反映 | PM | ⬜ 未着手 | `/(marketing)/privacy` |
| 8 | App Store / Play 連絡先メアド統一 (Resend に MX 設定済か?) | PM | ⬜ 未着手 | `docs/operations-guide.md` |
| 9 | EAS Build credentials 鍵 (.p8 / keystore) を 1Password に複製 | DevOps | ⬜ 未着手 | — |
| 10 | 本番接続前の Crashlytics 24h 観測期間 | Mobile リード | ⬜ 未着手 | Phased Release 5% から開始 |

進捗テンプレ: ⬜ 未着手 / ⏳ 進行中 / 🟡 ブロッカーあり / ✅ 完了

### Lighthouse 接続前にやらない理由 (敢えてスコープ外)

- **iPad 対応**: B2B SaaS の現場は iPhone + Android スマホ中心。Lighthouse 1社の声で判断
- **Apple Wallet パス**: Tap to Pay より優先度低。証明書 NFC があれば代替可
- **Watch app**: ユースケース未確定

## 参考

- `apps/mobile/docs/EAS_UPDATE.md` — OTA 運用詳細
- `apps/mobile/docs/mobile-release-tap-to-pay.md` — Tap to Pay 対応
- Expo EAS docs: <https://docs.expo.dev/eas/>
- App Store Review Guidelines: <https://developer.apple.com/app-store/review/guidelines/>
- Google Play Developer Policy: <https://play.google.com/about/developer-content-policy/>
