# 競合徹底リサーチ: Shopmonkey / Tekmetric / Shop-Ware × Ledra

> 作成: 2026-05-09
> 用途: プロダクトロードマップ更新 + ポジショニング検討の汎用ドキュメント
> 対象競合: [Shopmonkey](https://www.shopmonkey.io/) / [Tekmetric](https://www.tekmetric.com/) / [Shop-Ware](https://shop-ware.com/)

---

## 0. 各社のポジショニング・サマリー

| | **Shopmonkey** | **Tekmetric** | **Shop-Ware** | **Ledra** |
|---|---|---|---|---|
| 主戦場 | 米国 独立修理工場・小規模チェーン・大型トラック | 米国 独立修理工場 (Heavy Duty 含む) | 米国 高単価・成長志向の修理工場 | 日本 コーティング/PPF/ボディリペア/整備 |
| 価格 | $179〜/月 (3 user) | $199〜$439/月 + Add-on | $117〜$249+/月 | (国内価格、別途) |
| コア訴求 | 統合管理 + AI志向 + Buy Now Pay Later | 70+ Integrations + Tekmessage/Tekmerchant | DVX (リッチメディア DVI) で承認率 89% | **施工証明書 + 保険会社連携 + ブロックチェーン** |
| ユニーク | 多機能統合、決済 (BNPL) 強い | API/連携の広さ、UI 評価が高い | DVX で承認率を CSV 化、20% 売上増の実績 | 4 ロール (店/代理店/保険/顧客)、改ざん検知、日本固有連携 |

---

## 1. Shopmonkey

### 1.1 機能一覧
- **見積/請求**: VIN・ナンバープレート読取、Parts & Labor Lookup、定型サービス、ドラッグ&ドロップ Workflow
- **デジタル車両点検 (DVI)**: 写真/動画/メモ、ARO (平均客単価) 引き上げ訴求
- **決済**: オンライン/対面、Buy Now Pay Later (BNPL)、テキスト送付
- **CRM/Marketing**: レビュー獲得、ターゲット配信、ロイヤリティ
- **在庫管理**: 自動再発注、低在庫アラート
- **会計連携**: QuickBooks
- **対象**: 一般整備 + Collision (ボディ) + Heavy Duty Truck

### 1.2 Ledra との関係
- **競合する**: 見積/請求/DVI/Workflow/CRM/在庫/予約/POS/モバイル
- **Ledra 優位**: 証明書中心 UX、保険会社ポータル、代理店ポータル、ブロックチェーン、日本固有 (車検証OCR/CloudSign/LINE/Square)
- **Shopmonkey 優位**: BNPL、Parts & Labor Lookup の充実度、QuickBooks 連携の成熟度

---

## 2. Tekmetric

### 2.1 機能一覧
- **Smart Jobs**: 数クリックで RO 作成
- **DVI + Tekmetric Mobile**: 写真注釈 (矢印/図形/テキスト)、定型 Findings、Image Markup → ARO 87% 増実績
- **Tekmessage**: True Two-Way Texting (画面内で SMS 双方向)
- **Tekmerchant**: Text-to-Pay (タッチレス決済)
- **Tekmetric Marketing**: Web サイト構築、レビュー管理、オンライン予約
- **Real-time Reporting**: 経営ダッシュボード
- **70+ Integrations**: ALLDATA、Advance Auto Parts、PartsTech、Nexpart、Shopgenie 等
- **価格階層**: Start $199 / Grow $349 / Scale $439 / Enterprise (+ Multi-Shop $70, Tire Suite $39, Marketing $345)

### 2.2 Ledra との関係
- **競合する**: ほぼ全部 (RO/DVI/SMS/決済/Marketing/予約/レポート/モバイル)
- **Ledra 優位**: 4 ロール構造、保険査定特化、Polygon アンカリング、BtoB マーケットプレイス、案件 (Job) 軸の統合ワークスペース
- **Tekmetric 優位**: **70+ 連携の広さ**、UI の洗練、技術者向けモバイル体験、明確なプラン階層

---

## 3. Shop-Ware

### 3.1 機能一覧
- **DVX (Digital Vehicle Experience)**: PDF 静的 DVI ではなく、写真/動画/技術メモを **リアルタイム更新するインタラクティブ DVI** → 承認率 89%
- **Workflow Management**: RO に注意が必要なタイミングで通知、技師の集中を妨げない
- **Parts**: RepairLink/MyPlace4Parts/Parts Authority (300万点) ネイティブ連携、リアルタイム在庫
- **VIN lookup / OEM Labor Guide**
- **Live Chat**: アドバイザーが写真/動画/詳細を瞬時に共有
- **Employee Management**: リアルタイム稼働、個別パフォーマンス分析
- **Fleet/Multi-Shop**: 複数連絡先管理、複数店舗対応
- **Canned Jobs by vehicle type**
- **実績**: 顧客企業の売上・粗利・効率が **平均 20% 増**
- **価格**: $117〜$249+

### 3.2 Ledra との関係
- **競合する**: DVI/Workflow/Parts/Live Chat/従業員管理/Fleet
- **Ledra 優位**: 証明書アンカリング、保険会社/代理店ポータル、日本市場対応、案件 (Job) 統合ワークスペース、QR/NFC + 顧客マイページ
- **Shop-Ware 優位**: **DVX のリッチメディア体験 (89% 承認率は強烈なエビデンス)**、Live Chat、従業員パフォーマンス分析、Heavy-Duty Fleet 多連絡先管理、定型 Job (canned jobs)

---

## 4. Ledra 視点での切り分け

### 4.1 ガチで競合する領域 (3社全部 or ほぼ全部が持っている)

| 機能 | Ledra 現状 | 学ぶべき水準 |
|---|---|---|
| 見積/請求 | あり (`/admin/invoices`) | Tekmetric Smart Jobs / Shopmonkey Parts & Labor Lookup |
| DVI (写真/動画/注釈) | 写真アップロードあるが**注釈/動画はまだ薄い** | **Tekmetric Image Markup**、**Shop-Ware DVX** |
| ワークフロー | `/admin/jobs/[id]` (実装済) | ← この軸はむしろ Ledra が一歩先 |
| 予約/Calendar | あり (Google Cal連携) | Tekmetric Online Appointment |
| SMS/メッセージング | LINE 主体 | **Tekmessage True Two-Way** (画面内完結) を SMS/LINE で再現 |
| 決済 (POS/オンライン) | Stripe Terminal/Square | **Shopmonkey BNPL**、**Tekmerchant Text-to-Pay** |
| 在庫/部品 | 軽め | Shop-Ware Parts カタログ (300万点ネイティブ) |
| CRM/Marketing | 顧客 360°ビュー実装済 | Tekmetric Marketing (Web 構築 + レビュー収集) |
| モバイルアプリ | API はあるが**専用ネイティブアプリ未確認** | **Tekmetric Mobile / Shop-Ware モバイル** |
| 連携の広さ | Stripe/Square/LINE/Google/Resend/CloudSign | **Tekmetric 70+ 連携** (ALLDATA/PartsTech 等の業界カタログ) |

### 4.2 Ledra 独自領域 (3社の誰も本気でやっていない)

これらはそのまま守りの堀になる。

1. **施工証明書 (Certificate)** を中核に据えた UX
   - Shopmonkey/Tekmetric/Shop-Ware は「Repair Order/Invoice」が一次データ。Ledra は「証明書」。コーティング/PPF 業界では**証明書が顧客への価値そのもの**で、修理工場の RO とは販売文脈が違う。
2. **保険会社ポータル (Insurer)**
   - 3社とも保険会社向け SaaS は無い。Ledra は `/insurer/*` で**証明書照会 → 案件管理 → SLA → 分析**を一気通貫で持つ。
3. **代理店ポータル (Agent)**
   - パートナー紹介 → コミッション → ランキング → 営業資料配信。3社にこの構造はない。
4. **ブロックチェーン・アンカリング (Polygon)**
   - 証明書の改ざん検知。保険会社向けに強い訴求。3社に無い概念。
5. **日本固有連携**
   - 車検証 OCR / CloudSign / LINE Messaging API / 法人番号検索による Insurer 登録 / 特商法ページ等。
6. **マルチテナント × 4 ロール (Admin/Agent/Insurer/Customer)**
   - 3社は基本「Shop と Customer」の2ロール。Ledra は **B2B2B2C** に近い構造。
7. **NFC タグ / 車両統合タイムライン**
   - `vehicle_histories` + `certificates` + `reservations` + `nfc_tags` を 1 タイムラインに合成。「いつ何をされた車両か」を 1 画面で答えるのは**保険査定の文脈**で強い。
8. **BtoB マーケットプレイス**
   - 施工店間の受発注/商談。3社にこの機能は無い (整備工場間で発注し合う文化が薄い)。

---

## 5. 学ぶべき機能 (優先度順)

### 5.1 P0 (短期で取り込む / 差が大きい / 参入障壁低い)

#### P0-1. DVX 風リッチメディア証明書 (Shop-Ware DVX に倣う)
- 静的 PDF 証明書ではなく、写真/動画/メモが**インタラクティブに更新される証明書ビュー**
- Shop-Ware の「89% 承認率」は科学的証拠として強い
- Ledra `/c/[public_id]` 公開ビューに動画/360°写真/作業前後比較を組み込めば、**保険査定への訴求力が桁上がり**
- 実装場所: `/c/[public_id]`, `/admin/certificates/new`, `/admin/certificates/[public_id]`

#### P0-2. 写真 Image Markup (Tekmetric Mobile)
- 写真に矢印・図形・テキストで注釈
- 施工前のキズや施工後の確認に使える
- コーティング業界でも保険査定文脈でも非常に効く
- FEATURES.md 12.3 の「写真改ざん検出」と相性も良い
- 実装場所: 証明書発行フロー、モバイル API (`/api/mobile/certificates/[id]/*`)

#### P0-3. 施工テンプレート / Canned Jobs (Shop-Ware/Shopmonkey)
- 「セラミックコーティング Lv2 標準セット」「PPF フルボディ標準工程」をワンクリック適用
- FEATURES.md 12.3 ロードマップ「施工テンプレート」と一致
- コーティング/PPF は標準工程が定型なので、**ここは絶対やった方が良い**
- 実装場所: `/admin/menu-items` を拡張、案件作成フローに組み込み

### 5.2 P1 (中期、戦略的に効く)

#### P1-1. 管理画面内 LINE/SMS 双方向 UI (Tekmessage)
- LINE/SMS のやり取りを管理画面内で完結。ブラウザ切替なしでスタッフが返信できる
- 顧客 360° ビュー (`/admin/customers/[id]`) にスレッドタブを追加

#### P1-2. Text-to-Pay / オンライン決済リンク強化 (Tekmerchant + Shopmonkey BNPL)
- SMS/LINE で支払いリンクを送り、タッチレスで決済完了
- 日本では分割払い (Paidy/Atone) で BNPL 相当を実装可
- Stripe Connect の活用拡張で実装

#### P1-3. 明確なプラン階層 + Add-on モデル (Tekmetric Pricing)
- Start/Grow/Scale/Enterprise + Add-on は教科書的
- Ledra も Add-on (Multi-shop / Insurer 連携 / PPF Pack / Coating Pack 等) で **ARPU を伸ばす設計**にできる

#### P1-4. Parts/Material カタログのネイティブ統合 (Shop-Ware)
- 国内コーティング/PPF 材料ベンダー (CPC/XPEL/STEK/SunTek/G'ZOX 等) との API 連携
- 在庫/価格/型番をネイティブで引ける

#### P1-5. ネイティブモバイルアプリ (Tekmetric Mobile)
- 既に `/api/mobile/*` がある。ネイティブ iOS/Android アプリで現場体験を完成させる
- VIN/ナンバー読取、写真撮影、注釈、サイン取得を 1 アプリで

#### P1-6. マーケティング Suite (Tekmetric Marketing)
- 施工店ごとの**Web サイト自動生成** (SEO/Google Business 連携)
- レビュー収集、オンライン予約埋め込み
- Ledra は marketing site 枠組みがあるので、テナント別 Web 構築機能に拡張可

#### P1-7. Real-time Job Status の通知強化 (Shop-Ware)
- 「注意が必要な RO だけを通知」する設計。スタッフの集中を奪わない
- Supabase Realtime をそういう用途に振り直すのはアリ

### 5.3 P2 (長期、差別化を尖らせる)

#### P2-1. AI コパイロット (Tekmetric/Shopmonkey が標榜)
- FEATURES.md 12.3 にも「AI 写真品質チェック」「LLM 証明書テキスト生成」「音声入力整形」「Cmd+K 自然言語検索」あり
- 3社はまだ機能名でしか出していないので、**ここで先行すれば差別化になる**

#### P2-2. 従業員パフォーマンス分析 (Shop-Ware)
- 技術者ごとの稼働時間/ARO 貢献。日本の中小施工店にも刺さる

#### P2-3. Live Chat (Shop-Ware)
- アドバイザーが顧客と画面内チャットしながら写真/動画を共有
- LINE で半分代替可能だが、Web で完結する第二経路として

---

## 6. 学ばなくて良い (Ledra の文脈に合わない)

- **Heavy Duty Truck / Fleet 管理**: Shop-Ware が押す領域だが、Ledra のターゲット (コーティング/PPF/ボディ) と方向性が違う
- **Tire Suite (Tekmetric)**: タイヤ販売管理は日本のコーティング/PPF 店ではノイズ
- **OEM Labor Guide / ALLDATA 連携**: 修理 (RO) 中心の世界観。コーティング/PPF は標準工程が定型なので、Canned Jobs で十分
- **QuickBooks 連携そのもの**: 日本では弥生/freee/MF クラウド連携が必要 (連携設計の作法は学ぶ価値あり)

---

## 7. 推奨アクション (3 ヶ月スパン)

| Priority | 機能 | 出典 | Ledra 内の置き場所 |
|---|---|---|---|
| P0 | **インタラクティブ証明書ビュー (動画/前後比較/注釈付き写真)** | Shop-Ware DVX | `/c/[public_id]`, `/admin/certificates/new` |
| P0 | **写真 Image Markup** | Tekmetric Mobile | 証明書発行フロー、モバイル API |
| P0 | **施工テンプレート (Canned Jobs)** | Shopmonkey/Shop-Ware | `/admin/menu-items` 拡張 |
| P1 | **管理画面内 LINE/SMS 双方向 UI** | Tekmessage | 顧客 360° ビューにスレッド追加 |
| P1 | **Text-to-Pay (SMS/LINE で決済リンク)** | Tekmerchant + Shopmonkey BNPL | `/admin/invoices` + Stripe |
| P1 | **明確なプラン階層 + Add-on モデル** | Tekmetric Pricing | Stripe Subscription 設計 |
| P2 | **専用ネイティブモバイルアプリ** | Tekmetric Mobile | `/api/mobile/*` を消費する RN/Flutter |
| P2 | **テナント別 Web サイト + レビュー収集** | Tekmetric Marketing | marketing 側に拡張 |
| P2 | **AI コパイロット (写真品質チェック / 証明書文章生成)** | 3 社いずれも標榜のみ | ロードマップ 12.3 を実装に進める |

---

## 8. Sources

- [Shopmonkey Official](https://www.shopmonkey.io/)
- [Shopmonkey on Capterra](https://www.capterra.com/p/169022/Shopmonkey/)
- [Shopmonkey Pricing](https://www.shopmonkey.io/pricing)
- [Shopmonkey on G2](https://www.g2.com/products/shopmonkey/reviews)
- [Tekmetric Official](https://www.tekmetric.com/)
- [Tekmetric Pricing](https://www.tekmetric.com/pricing)
- [Tekmetric Integrations (70+)](https://www.tekmetric.com/integrations)
- [Tekmetric Mobile App](https://www.tekmetric.com/mobile-app)
- [Tekmetric DVI](https://www.tekmetric.com/feature/digital-vehicle-inspection)
- [Tekmetric CRM/Marketing](https://www.tekmetric.com/feature/crm-marketing)
- [Shop-Ware Features](https://shop-ware.com/features/)
- [Shop-Ware DVX](https://shop-ware.com/features/dvx/)
- [Shop-Ware Digital Workflow](https://shop-ware.com/features/digital-workflow/)
- [Shop-Ware Fleet Management](https://shop-ware.com/features/fleet-management/)
- [Shopmonkey vs Tekmetric (Capterra)](https://www.capterra.com/compare/169022-190952/Shopmonkey-vs-Tekmetric)
- [Shopmonkey vs Tekmetric DVI Deep Dive](https://autorepairshopsoftware.com/blog/comparing-tekmetric-shopmonkey-deep-dive-into-dvi)
- [Shop-Ware on SaaSworthy](https://www.saasworthy.com/product/shop-ware)
- [Insight Partners on Shop-Ware](https://www.insightpartners.com/ideas/behind-the-investment-shop-ware-vertical-saas-for-the-automotive-aftermarket/)
