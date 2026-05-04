# 撮影リスト — 現場スタッフ向けマニュアル用スクリーンショット

`docs/admin-beginner-guide.md` で参照している画像の撮影リストです。
撮影したら、このフォルダ (`docs/images/admin/`) に **下記のファイル名そのまま** で保存してください。本文側はファイル名で参照しているので、置けばそのまま表示されます。

## 撮影の前にひととおり

- **解像度**: ブラウザを **横 1280–1440 px** くらいにして撮るときれいです（Retina の 2 倍解像度のままでも OK）
- **形式**: `.png`（推奨）。`.jpg` でも本文側のリンクを書きかえれば動きます
- **個人情報**: デモアカウント（`demo@ledra-motors.example`）でログインしてから撮ると、最初から偽のお客さま・車両が入っているので安全です
- **トリミング**: ブラウザのアドレスバーは入っていてもいなくても OK。**該当機能が分かる範囲で十分** です
- **矢印・吹き出しは不要**: 必要なら本文側でキャプションを足します

## 撮影リスト

| # | ファイル名 | 撮るところ | URL の目安 | コツ |
|---|---|---|---|---|
| 01 | `01-login.png` | ログイン画面（メール・パスワード入力欄が見える） | `/login` | ログイン前なので誰でも撮れます |
| 02 | `02-dashboard.png` | ログイン直後のダッシュボード全体 | `/admin` | サイドバー＋中央のウィジェットが入るように |
| 03 | `03-sidebar.png` | 左メニューだけクローズアップ | `/admin` の左側 | サイドバーを縦に切り出した縦長の画像で OK |
| 04 | `04-customers-list.png` | 顧客一覧（テーブルが見える） | `/admin/customers` | デモ顧客 8 名が見えるはず |
| 05 | `05-customers-new.png` | 「新規顧客を登録」のフォーム | 顧客一覧で「新規顧客を登録」を押した状態 | 入力欄ぜんぶが入る縦長で |
| 06 | `06-vehicles-list.png` | 車両一覧 | `/admin/vehicles` | |
| 07 | `07-vehicles-new.png` | 車両登録フォーム（車検証 OCR セクションも） | `/admin/vehicles/new` | 「車検証から自動入力」の見出しを含めて |
| 08 | `08-reservations-calendar.png` | 予約管理のカレンダー | `/admin/reservations` | 1 週間ぶんが見える状態で |
| 09 | `09-reservations-form.png` | カレンダーの空き枠を押した直後の予約フォーム | 同上、モーダル/サイドパネルが開いた状態 | |
| 10 | `10-certificates-list.png` | 証明書一覧 | `/admin/certificates` | デモ証明書 16 枚が見える |
| 11 | `11-certificates-new-form.png` | 証明書発行フォーム上半分（車両ピッカー〜施工内容） | `/admin/certificates/new` | |
| 12 | `12-certificates-photo-upload.png` | 同フォームの「写真アップロード」エリア | 同上、下にスクロールして | アップロード前の空状態と、何枚か入った状態の **2 枚** あるとベスト（`12-certificates-photo-upload.png` と `12b-certificates-photo-uploaded.png`） |
| 13 | `13-certificates-success.png` | 発行完了画面（証明書番号が出ているところ） | `/admin/certificates/new/success` または発行後の遷移先 | |
| 14 | `14-certificate-detail.png` | 発行済み証明書の詳細ページ（QR コードが見える） | `/admin/certificates/[public_id]` | QR コードを必ず入れる |
| 15 | `15-certificate-pdf.png` | PDF 出力をブラウザで開いた状態（または印刷プレビュー） | PDF 出力ボタンを押した結果 | |
| 16 | `16-invoices-list.png` | 請求書一覧 | `/admin/invoices` | |
| 17 | `17-invoices-new.png` | 新規請求書フォーム | `/admin/invoices/new` | |
| 18 | `18-settings-members.png` (任意) | メンバー招待画面 | `/admin/members` | FAQ Q6 用。なくても本文成立 |
| 19 | `19-password-reset.png` (任意) | パスワード再設定リンクのある画面 | ログイン画面の「パスワードを忘れた」リンク先 | FAQ Q5 用。任意 |

## 必須 / 任意の目安

- **必須**: 01〜17（メイン業務フロー）
- **任意**: 18〜19（FAQ 用。なくても成立）

撮影が終わったら、お知らせください。本文との差し込み確認・トリミング微調整・キャプション追記をこちらで行います。
