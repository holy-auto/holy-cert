# Tap to Pay on iPhone - Distribution 提出ガイド

## 提出物 (Apple へメール返信時)

1. **動画3本**:
   - Onboarding flow video
   - Enabling Tap to Pay & Educating Merchants video
   - Checkout flow video
2. **App Review Requirements Checklist** (記入済み Numbers ファイル)

すべて Apple のFile Uploader にアップロードしてからメール返信。

---

## 動画撮影前の準備

### 1. テスト用 iPhone を用意
- iPhone XS 以降
- iOS 16.4 以降（推奨: 17 以降）
- Apple Developer 登録済みデバイス
- Apple Account でサインイン済み
- Tap to Pay 用 Apple Account 規約は未承諾の状態

### 2. テスト環境
- Stripe **テストモード** で発行された Connect アカウントとPSPテスト鍵
- ビルドは `eas build --profile development` (Development Distribution Entitlement で署名されたビルド)

### 3. 録画準備
- **画面録画ツール**: コントロールセンターの画面収録 + マイクON
- **チェックアウト動画専用**: Tap to Pay UI は OS 側で画面収録がブロックされるため、**別iPhone or 三脚 + カメラ** で iPhone を物理的に撮影する必要あり

---

## 動画1: Onboarding Flow (新規ユーザー)

### Custom Apps 配布の場合

Custom Apps なのでアプリ内サインアップは不要だが、Apple は「新規ユーザーが TTP を利用開始するまでの導線」の説明を求める。以下を録画 OR 文書で説明する：

```
[ナレーション + 画面収録 (任意)]
1. Ledra は Custom Apps として Apple Business Manager 経由で配布されます
2. 新規顧客は弊社の Web 管理画面 (https://app.cartrust.co.jp) でテナント登録し、
   ABM の "Apps and Books" 経由で Ledra アプリの配布を受けます
3. iPhone に Ledra をインストール後、初回起動でログイン (Email + パスワード)
4. ログイン後、ホーム画面 → その他タブ → 設定 → Tap to Pay 設定 へ進む
5. 「Tap to Pay を有効化する」ボタンを押下 → 規約同意 → セットアップ完了
```

提出時のラベル: `01_onboarding_custom_apps.mp4` (または書面説明)

---

## 動画2: Enabling Tap to Pay + Educating Merchants

### シナリオ (既存ログイン済みユーザー)

**準備**: アプリにログイン済み、Tap to Pay は未有効化の状態。

```
1. アプリ起動 → ホーム画面表示
2. (任意) Tap to Pay 利用可能の通知バナーがあれば写す
3. 下タブ「その他」 → 「設定」をタップ
4. 「Tap to Pay 設定」をタップ
   ↓
   要件 3.6 を満たす：通常フロー外 (設定画面) からアクセス可能
5. Tap to Pay 設定画面が表示される
   - iPhone のタッチ決済の説明カード
   - 受け付けられる支払方法 (コンタクトレスカード/Apple Pay/その他電子ウォレット)
   ↓
   要件 4.3 を満たす：設定/ヘルプから教育コンテンツへアクセス可能
6. 「Tap to Pay を有効化する」ボタンをタップ
   ↓
   要件 3.5 を満たす：T&C同意の明確なアクション
7. Apple の Tap to Pay 利用規約画面が iOS 標準UIで表示される
8. 「同意して続ける」をタップ
9. 設定進捗インジケータが表示される (0% → 100%)
   ↓
   要件 3.9.1 を満たす：configurationProgress による進捗表示
10. 完了通知が表示される
11. 設定画面に戻り「✅ 有効化済みです」表示を確認

[管理者権限がない場合のフロー (別動画 or 同動画内で示す)]
12. 非adminユーザーで設定画面を開くと「管理者のみが行えます」案内が表示
   ↓
   要件 3.8.1 を満たす
```

提出時のラベル: `02_enabling_education.mp4`

---

## 動画3: Checkout Flow

### 重要
Tap to Pay UI は **画面録画でブラック表示** される (Apple の仕様)。
**外部カメラで iPhone を物理撮影**してください。
三脚 + 別スマホ or デジカメで iPhone 全体が映るように撮影する。

### 準備
- ログイン済み
- Tap to Pay 有効化済み
- Stripe テストカード or Apple Pay (テスト用) を用意

### シナリオ
```
1. ホーム画面から「予約」タブ → テスト予約をタップ
2. もしくは「会計」タブ → 「新規会計（飛び込み）」を選択
3. メニュー (例: コーティング ¥10,000) を追加し合計を表示
4. ★ チェックアウト画面で 専用 Tap to Pay ボタンが**最上位**に表示されるのを写す
   ↓
   要件 5.1, 5.2, 5.5 を満たす (専用ボタン / 最上位 / SF Symbols 同等アイコン)
5. ボタン文言が「iPhone のタッチ決済」と日本語表示されるのを写す
   ↓
   要件 5.4 を満たす
6. ボタンをタップ → 1秒以内に Apple Tap to Pay UI が立ち上がるのを写す
   ↓
   要件 5.6 を満たす
7. (もし設定中なら) "initializing" 画面が表示されるのを写す
   ↓
   要件 5.7 を満たす
8. iPhone 上部に コンタクトレスカード / Apple Pay デバイスをかざす
   ↓
   外部カメラで iPhone とカードの両方が映るアングルにする
9. 読取後 "processing" 画面が表示されるのを写す
   ↓
   要件 5.8 を満たす
10. 承認画面（または拒否画面）が明示的に表示されるのを写す
    ↓
    要件 5.9 を満たす
11. レシート送信ダイアログを開いて SMS または Email でレシートを送信
    ↓
    要件 5.10 を満たす
```

提出時のラベル: `03_checkout.mp4`

---

## チェックリスト記入対応表

`App Review Requirements Checklist 1_6.numbers` の各項目を以下と対応させて記入：

| Sec | # | 状態 | 備考 |
|----|---|------|------|
| 1 | 1.1 | ✅ Completed | UIRequiredDeviceCapabilities = arm64 + iphone-ipad-minimum-performance-a12 |
| 1 | 1.2 | ✅ Completed | iOS Deployment Target = 16.0 (Stripe Terminal SDK 要件に準拠) |
| 1 | 1.3 | ✅ Completed | 同上 |
| 1 | 1.4 | ✅ Completed | useTerminal で OS_VERSION_NOT_SUPPORTED 専用ハンドリング |
| 1 | 1.5 | ✅ Completed | useTapToPayWarmup でアプリ起動時 + foreground 復帰時に warmup |
| 1 | 1.6 | ✅ Completed | T&C状態は Stripe Terminal SDK 経由で取得 (ローカル変数依存なし) |
| 1 | 1.7 | ⚠️ Optional | FaceID/TouchID は Phase 5 で追加予定 (現時点では未実装、推奨項目のため非ブロッカー) |
| 1 | 1.8 | ✅ Completed | HIG 準拠 (SF Symbols 同等アイコン、iOS Native Stack 利用) |
| 1 | 1.9 | N/A | Custom Apps 配布のため公開マーケティング非該当 |
| 2 | 2.1 | N/A | Custom Apps 配布のため要件免除 |
| 2 | 2.2 | N/A | 同上 |
| 2 | 2.3 | N/A | 同上 |
| 3 | 3.1 | ✅ Completed | 設定画面 → Tap to Pay 設定 で常時アクセス可能 |
| 3 | 3.2 | N/A | Custom Apps 配布のためスプラッシュ強制不要 |
| 3 | 3.3 | N/A | 同上 |
| 3 | 3.4 | N/A | 同上 (新規オンボーディングプロセスがアプリ内に存在しない) |
| 3 | 3.5 | ✅ Completed | 設定画面の「Tap to Pay を有効化する」ボタン |
| 3 | 3.6 | ✅ Completed | 設定画面から有効化可能 |
| 3 | 3.7 | ✅ Completed | チェックアウトの TTP ボタン押下で connectTapToPay 起動 |
| 3 | 3.8 | ✅ Completed | hasMinRole('admin') による制御 |
| 3 | 3.8.1 | ✅ Completed | 非adminには管理者連絡を促す UI |
| 3 | 3.8.2 | N/A | Apple Account 経由で T&C 同意するため対象外 |
| 3 | 3.9 | ⚠️ Optional | 「試してみる」画面は Phase 5 (推奨項目) |
| 3 | 3.9.1 | ✅ Completed | onDidReportReaderSoftwareUpdateProgress + ProgressBar |
| 4 | 4.1 | ⚠️ See note | Stripe Terminal SDK は ProximityReaderDiscovery を内部使用。SDKに任せる方針 |
| 4 | 4.2 | ✅ Completed | 設定画面 Tap to Pay 設定の「使い方」セクション |
| 4 | 4.3 | ✅ Completed | 同上 |
| 4 | 4.4-4.8 | N/A | Custom Apps 配布のため必須ではない (社内研修で代替) |
| 5 | 5.1 | ✅ Completed | TapToPayButton コンポーネント |
| 5 | 5.2 | ✅ Completed | 明細カード直後・支払方法より上に配置 |
| 5 | 5.3 | ✅ Completed | グレーアウトせず常時押下可能 |
| 5 | 5.4 | ✅ Completed | 「iPhone のタッチ決済」(日本語ロケール) |
| 5 | 5.5 | ✅ Completed | wave.3.right.circle 同等アイコンを SVG で再現 |
| 5 | 5.6 | ✅ Completed | useTapToPayWarmup により起動時から準備済み |
| 5 | 5.7 | ✅ Completed | 既存 isProcessing UI を流用 |
| 5 | 5.8 | ✅ Completed | TapToPayButton state="processing" |
| 5 | 5.9 | ✅ Completed | PaymentOutcome コンポーネント (承認/拒否/タイムアウト) |
| 5 | 5.10 | ✅ Completed | ReceiptShareDialog (SMS/Email/Share Sheet) |
| 5 | 5.11 | N/A | 日本市場のため PIN 入力 / Fallback 不要 |
| 6 | 6.1-6.3 | N/A | Custom Apps 配布のためマーケティング要件非該当 |

---

## 返信メールテンプレート

```
Subject: Re: Tap to Pay on iPhone Publishing Entitlement Submission - com.ledra.app

Hello Apple Developer Support,

Thank you for granting the Development Distribution Entitlement for our app
"Ledra" (Bundle ID: com.ledra.app, Apple Team ID: T43978PBAA).

We have built our app to meet the requirements outlined in
"Tap to Pay on iPhone App & Marketing Requirements and Review Guide v1.6"
and would like to request the Publishing Entitlement.

We are distributing this app via **Custom Apps** through Apple Business Manager
to known automotive service merchants in Japan.
Therefore the consumer-facing onboarding requirements (sec 2.x) and
marketing requirements (sec 6.x) do not apply.

We have uploaded the following materials to the File Uploader:

1. 01_onboarding_custom_apps.mp4
   - Documents the Custom Apps distribution flow (no in-app sign-up)
2. 02_enabling_education.mp4
   - Existing user enables Tap to Pay from Settings, accepts terms,
     and is shown merchant education
3. 03_checkout.mp4
   - Filmed externally to capture the Tap to Pay on iPhone UI;
     shows item entry → checkout → tap → processing → outcome → receipt
4. App_Review_Requirements_Checklist_1_6_completed.numbers

PSP: Stripe (approved PSP for JP region)
Region: Japan

Please let us know if you need any additional information.

Best regards,
HOLY Corp. (Company)
```

---

## 動画撮影チェックリスト

撮影前に以下を確認：

- [ ] Stripe テストモードで動作するビルドを使う（development profile）
- [ ] iPhone XS 以降のテスト機を Apple Developer Portal に登録済み
- [ ] iOS 16.4 以降にアップデート済み
- [ ] 画面の通知が映らないように「おやすみモード」ON
- [ ] バッテリー残量が映ってもOK（リアルな画面でAppleはむしろ歓迎）
- [ ] 動画解像度: 1080p以上、30fps以上
- [ ] 音声: 不要（ナレーション無くてOK、画面で完結する）
- [ ] 手ぶれ防止: 三脚またはスタビライザー使用
- [ ] チェックアウト動画は **iPhone を物理撮影** すること（OS が画面録画をブロックする）
