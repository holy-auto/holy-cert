# Ledra 方向性リサーチ — Loot Drop に学ぶ「先輩たちの教訓」

> 出典: <https://www.loot-drop.io/> (1,628 件の Failed Startup 解剖 / $502B+ の焼却資本)
> 最終更新: 2026-05-05
> 目的: 失敗した先行スタートアップの post-mortem を、Ledra の現実 (200+ API / 4 ポータル / 130+ migration) に当てて意思決定に使う

---

## 0. なぜ Loot Drop を読むのか

Loot Drop は世界の死亡スタートアップ 1,600+ 件を「死因」「燃やした VC マネー」「市場分析」「再構築プラン」で整理した無料公開データベース。執筆陣は 22 カテゴリ (SaaS / Marketplace / Fintech / Blockchain / AI 他) ごとに editorial deep-dive を出している。

ここから読み取れる結論はシンプルで、**スタートアップは単一の理由では潰れず、「千の傷で死ぬ (death by a thousand cuts)」**。複数の弱点が連鎖して資金が尽き、最後にキャッシュ枯渇という現象として可視化される。

Ledra は今、4 ポータル + マーケットプレイス + 中古車市場 + BtoB + 保険連携 + ブロックチェーン + POS + モバイル + Academy という**極めて広い面積**を持っている。1 つでも穴が空けば連鎖して全体が崩れる構造。だから先輩たちの傷を 1 つずつ確認しておく価値がある。

---

## 1. Loot Drop の 7 アンチパターン (Start-Up Learning Framework)

| # | アンチパターン | 全体に占める割合の目安 | 一言 |
|---|---|---|---|
| 1 | **No Market Need** (市場ニーズなし) | ~35% (最頻) | 「払うほど痛い問題」を解いていない |
| 2 | **Ran Out of Cash** (資金枯渇) | 70% (最終死因として) | ほぼ全てのケースで最後に出る症状 |
| 3 | **Team / Founder Conflict** | 顕著 | 共同創業者の解離、初期メンバの離脱 |
| 4 | **Competition** | Fintech では 47% (96 件中 45 件) | 大手・銀行・潤沢資金の競合に潰される |
| 5 | **Product / Tech Failure** | 多数 | 信頼性 / セキュリティ / UX 不全 |
| 6 | **Legal / Regulatory** | 規制業界で頻出 | 認可・コンプライアンス・データ法規 |
| 7 | **Unit Economics** | ~19% | LTV < CAC / 粗利が薄すぎ |

> Loot Drop の主張: アンチパターンは互いに連鎖する。「Product 不全 → 解約増 → Unit Economics 崩壊 → Cash 枯渇」のように進行する。

---

## 2. Ledra の各アンチパターンへの暴露度診断

各項目で **🔴 高 / 🟡 中 / 🟢 低** で評価し、その根拠と具体的な対処を書く。

### 2.1 🟡 No Market Need — 「証明書 SaaS」は本当に痛い問題か？

**暴露度: 中** — コア仮説 (施工証明書 + 保険会社連携) は仮説検証が継続中。その周りの機能は仮説段階のものが多い。

| 機能 | 仮説の強さ | 検証状況 |
|---|---|---|
| 施工証明書発行 + QR + PDF | コア。施工店の「お客様への信頼提示」ニーズは明確 | 🟢 顧客の声で検証済 |
| 保険会社ポータル + 案件連携 | 強い差別化。アフター事故査定の効率化 | 🟡 PoC 段階 (Toyota 提案中) |
| ブロックチェーン・アンカリング | "改ざん検知" の訴求が刺さるかは要検証 | 🔴 課金理由として聞いたことが何回あったか? |
| 中古車マーケット (`/admin/market-vehicles`) | 別事業の匂い | 🔴 BtoB と顧客の往復で擦り切れる |
| BtoB 受発注 + 商談管理 | 既存施工店間の取引慣習を SaaS 化できるか | 🔴 SmartHR/Money Forward の歴史でも既存慣行の置換は時間がかかる |
| 代理店紹介 (Agent ポータル) | グロース戦術として有効 | 🟡 紹介経由の有料化率が KPI |

**Loot Drop の含意:**
- 「No Market Need」は**払う人がいない**という形で現れる。「便利そう」「あったら良い」は No Market Need。
- 失敗例: BetterCo / Lighthouse 系のドメイン特化 SaaS は「便利だが代替手段で十分」と判断され churn する。

**Ledra への提言:**
1. **コア (証明書 + 保険) と周辺 (中古車 / BtoB / Academy) を価格表で分離する**。コアが MRR を生み、周辺は無料 / オプションに格下げする勇気。
2. 保険会社向けは**1 社 (損保ジャパン or 東京海上) を Lighthouse Customer 化** し、その 1 社のワークフローを正解として固定する。複数社並列で薄く対応するのは Loot Drop が Insurtech で警告する「plateau-by-plateau growth」の罠。
3. ブロックチェーン・アンカリングの**「課金できる」ユースケース**を 1 つ特定する。「保険会社が訴求として支払う」「中古車買取業者が信頼性として支払う」「メーカ保証延長で支払う」のいずれか。**「あって当然」な機能は無料同梱、「あって嬉しい」機能は有料の独立 SKU**。

### 2.2 🟡 Ran Out of Cash — バーンレート vs ARR の構造

**暴露度: 中** — Vercel + Supabase + Upstash + Polygon + Stripe + Resend + Sentry の SaaS スタックは固定費としては安いが、**機能あたりの保守コスト**が指数で増えている。

| 数字 | 値 | 含意 |
|---|---|---|
| Route Handlers | 400+ | 各ルートに認可 / 入力検証 / 監査ログ / レート制限が必要 |
| Migration | 130+ | スキーマ変更コストが高く、機能追加スピードが落ちる |
| Vitest cases | 693+ | 良い水準だが E2E カバレッジは薄い (`docs/AUDIT_REPORT_20260329.md` ロードマップ) |
| 統合先 | Stripe / Square / LINE / CloudSign / Resend / QStash / Upstash / Polygon / Google Calendar / Sentry | **9 個の SPOF**。それぞれ 99.9% で全体は 99.1% (= 月 6.5h ダウン期待値) |

**Loot Drop の含意:**
- Cash 枯渇は通常**「機能を増やすほど ARR が増えない」**カーブに乗る。
- 機能数 ≠ ARR。1 機能あたりの ARR 寄与を測らず、全方位で機能を足すと固定費だけ増える。

**Ledra への提言:**
1. **機能 ROI ボード**を作る。各機能 (admin/jobs, admin/btob, admin/market-vehicles, polygon-anchoring 等) に「触ったテナント数」「直近 30 日の API call 数」「課金プランへの寄与」を可視化。
2. 6 ヶ月使われていない機能は **deprecation 候補**。特に `/admin/market-vehicles` `/admin/deals` `/admin/btob` は touch 率が低そうだという仮説を測定する。
3. **統合先の冗長化に走る前に「外せる統合」を消す**。例: LINE と Resend が両方ある状況で、メンテナンスコストの低い片方に寄せる議論。

### 2.3 🟢 Team / Founder Conflict

**暴露度: 低 (リポ単独からは判定不可)** — ここでは触れないが、Loot Drop 全体の警告として「**意思決定の単一所有者**」が必要。Ledra の場合、4 ポータルで意思決定の責任者が分散すると、機能優先度の食い違いで内部摩擦が起きる。

**提言:** ロードマップの**最終決裁者を 1 人**にする。各ポータルの PO はいて良いが、機能間トレードオフの最終ジャッジが分散しないようにする。

### 2.4 🔴 Competition — 米国の先行勢と日本の独自勢

**暴露度: 高** — Loot Drop の Fintech deep-dive が示す通り、Competition は最強の死因の 1 つ。Ledra の同領域には既に強敵がいる。

| 競合 | ARR | 顧客数 | 強み | 弱み |
|---|---|---|---|---|
| **Shopmonkey** (US) | $29.7M (2024) | ~6,000 shops | All-in-one + embedded finance | 日本未進出 |
| **Tekmetric** (US) | $15M (2024) | ~3,000 shops | マルチショップ管理 | 同上 |
| **Shop-Ware** (US) | 非公開 | - | aftermarket 特化 | 同上 |
| **ServiceTitan** | $700M+ ARR | 100,000+ | HVAC → 横展開のテンプレ | 整備業特化ではない |
| **CCC** (US 自動車保険) | 上場 | 大手保険連携 | 保険会社サイドで圧倒的シェア | 既存 incumbent |
| 日本の整備工場業務システム勢 | 中小寡占 | - | 既存業務との互換性 | UI/UX 古い、SaaS 化遅い |

**Loot Drop の含意:**
- ServiceTitan は **HVAC → 庭仕事 → 配管 → ガレージドア** と「狭い垂直で勝つ → 横展開」をテンプレ化した。
- 一気に全部やる垂直 SaaS は Competition で潰れる。Shopmonkey も最初は「整備工場の見積書印刷」から入って、徐々に in-shop financing まで広げた。

**Ledra への提言:**
1. **「最初に勝つ垂直」を 1 つ決める**。コーティング専門 / PPF 専門 / ボディリペア専門 / 整備工場一般、のうち 1 つ。これは「証明書を実際に発行する施工」と「保険会社に最も求められる施工」の交点で決める。私見だがコーティング・PPF が最も「証明書の経済的意味」が大きい (中古車査定での加点)。
2. **All-in-one を狙わない**。Shopmonkey ですら 6,000/230,000 = 2.6% シェア。日本市場でいきなり総合システム化は、既存システムからの乗り換えコスト (データ移行・教育) で挫折する。**「保険連携」「証明書」「中古車査定加点」の 3 点セット**を**他システムと共存できる形**で提供すれば、置換ではなく追加導入として刺さる。
3. **CCC に学ぶ**: 米国の自動車保険テック CCC は、保険会社側にロックインを作ることで bodyshop 側の SaaS を支配した。Ledra も**保険会社側のスイッチングコスト**を先に作るのが王道。Insurer 1 社が定着すれば、その傘下の指定工場が自然に Ledra に流れる。

### 2.5 🟡 Product / Tech Failure — マルチテナントの構造的脆弱性

**暴露度: 中** — Ledra はテナント分離をかなり丁寧にやっている (`createTenantScopedAdmin`, RLS, ownership re-check on UPDATE) が、面積が広いため穴の確率が大きい。

**Loot Drop の警告 (Multi-tenant SaaS の典型死因):**
- 「整理されていないテナントスコープが 1 つ漏れた瞬間に信頼が崩れる」
- 「セキュリティ・回復力・テナント分離は 1 日目に設計しないと後から入れられない」
- 顧客のカスタマイズ要望に応え続けると、ある会社では「**エンジニアの 60% が他社のカスタムワークフローを壊さない検証**に消えた」(M&A 後ケース)

**Ledra のリスク所在:**
| ファイル / 領域 | リスク |
|---|---|
| `src/lib/customerPortalServer.ts` | 顧客ポータル: メールハッシュだけだとテナント内衝突可能 (README 既指摘) |
| `src/app/api/admin/**/[id]/route.ts` (UPDATE 系) | ownership SELECT → 別 UPDATE の TOCTOU |
| `src/lib/billing/*` + `webhook/stripe` | 冪等性が崩れると課金に直結 (`stripe_processed_events` の claim ロジックは 23505 以外で 503 を返すこと) |
| `polygon-anchoring` | Web3 トランザクション失敗時のリトライポリシー / **ガス代の急騰時の挙動** |
| `cron/*` | `verifyCronRequest` を全 cron で呼んでいるか定期監査が必要 |
| **テンプレート証明書のカスタマイズ** (`docs/template-options-design.md` 37k LoC 設計) | 上記 M&A 事例と同型の罠。**「お客様ごとのカスタムテンプレ」を許すなら、検証とテストが顧客数だけ二乗で増える** |

**提言:**
1. **テンプレートのカスタム軸を 5〜10 個に限定**して、無限のカスタマイズを許さない。Hick's Law (UX) と同じ理由で、**選択肢を絞ると顧客の意思決定も速くなる**。
2. 6 ヶ月に 1 回、`security-review` slash command で本ブランチを通すことを CI に組み込む (本リポでは `claude/ledra-direction-research-VGixZ` のような定期ブランチ)。
3. **チェックリストの自動化**: README の「コントリビュート前のチェックリスト」を danger.js / GitHub Actions にして PR で機械的に弾く。

### 2.6 🟡 Legal / Regulatory — 自動車 + 保険 + 個人情報 + ブロックチェーン

**暴露度: 中** — 触れる規制ドメインの多さがリスクの源。

| 領域 | 関連規制 | 関連ファイル |
|---|---|---|
| 個人情報 (顧客 / 車両所有者) | 改正個人情報保護法 + APPI | `docs/data-retention.md` `docs/dpa-template.md` |
| 適格請求書 (インボイス制度) | 消費税法 (2023-) | `docs/architecture-roadmap.md` §6 |
| 電子署名 | 電子署名法 | `src/lib/signature/*` + CloudSign |
| 保険会社データ連携 | 業法 (損保業)・約款 | `src/app/insurer/**` |
| 公道車両 / 車検証 OCR | 道路運送車両法 | `vehicle-passport-design.md` |
| ブロックチェーン (Polygon) アンカリング | 個人情報の不可逆記録に関するガイドライン | `src/lib/anchoring/*` |
| 課金 (Stripe) | 資金移動・特定商取引法 | `/tokusho` ページ |

**Loot Drop の警告:**
- 規制業界 (Health / Fintech / Insurance) のスタートアップ失敗は、**「正しいエンタープライズ要件 (SOC2, ISO27001, SSO, MFA, audit log)」が後回しになり、契約直前で落とされる**ケースが多い。

**Ledra の現状:**
- ✅ 2FA (TOTP) 実装済 (`/admin/settings/security`) — 良い
- ✅ ISO27001/SOC2 準備中 (`docs/iso27001-soc2-prep.md`)
- ✅ DPA テンプレ整備中
- 🟡 **個人情報のブロックチェーン記録**は要再検討。**ハッシュのみ on-chain、原文 off-chain** が原則。`anchoring-roadmap.md` の方針を必ず守る。
- 🔴 **GDPR の「忘れられる権利」 vs ブロックチェーンの不可逆性**は、EU 進出時に詰む。日本国内に閉じる戦略を明示するか、原文を切断可能な設計にする (= ハッシュのみアンカリング)。

**提言:**
1. **エンタープライズ調達チェックリスト**を 1 ファイルに集約する (`docs/enterprise-readiness.md` を新設)。SSO / MFA / Audit / DPA / SOC2 / ISO / Pentest report / RPO/RTO を網羅。保険会社・大手施工チェーンとの契約交渉時にそのまま提出できる形。
2. ブロックチェーン記録の対象は**「アンカー (ハッシュ)」と「公開可能なメタデータ」だけ**に限定し、契約書・写真・氏名・車台番号などの原文は**絶対に on-chain に乗せない**。`anchoring-roadmap.md` を再確認。

### 2.7 🟡 Unit Economics — 機能数 ≠ 課金単価

**暴露度: 中** — 機能を増やしても、価格表に反映されなければ Unit Economics は逆に悪化する (固定費は増えて単価は据え置き)。

**Loot Drop の数式 (要点):**
- LTV / CAC > 3 が健全
- Payback period < 12 ヶ月が安全
- 価格は**「規模に対してスケールする変数」** (例: 月の発行証明書数、テナントの店舗数、保険案件処理数) と**「フラットなプラン」**を組み合わせる
- 競合との価格比較で消耗するのは avoid。**「保険連携で査定が早くなる」「証明書発行で中古車査定が +XX 万円」**のような ROI ストーリーを、定量で営業資料に仕込む

**Ledra への提言:**
1. **3 ティア + 従量** を堅持する: スターター / プロ / エンタープライズ + 「証明書発行 100 件/月超」「保険会社あたり」「マーケット出品数」の従量課金。
2. **Square 連携 / Stripe Terminal / Polygon アンカリング / Academy** などはアドオン SKU。コアプランから外して**実コストで利益が乗る価格**にする。
3. 営業資料に**「Ledra 導入前後の中古車査定差」「保険査定リードタイム短縮日数」**を入れる。事例 (`docs/marketing/case-study-guide.md`) を本番テナントから 3 件吸い上げて数値化する。

---

## 3. 先輩スタートアップから盗む 5 つの教訓

Loot Drop データベースから、Ledra に直接転用できる典型ケースを抽出した。

### 教訓 #1: 「全部入り」を最初からやらない (ServiceTitan の逆張り)

**ServiceTitan** は 2007 創業から 4 年間、**HVAC (空調) 一本**だった。横展開はその後。Ledra は今、admin / agent / insurer / customer / marketing / mobile / api / cron / remotion (動画) と、**ServiceTitan の 4 倍以上の面積**を 1 〜 2 年で持っている。

**転用:** 顧客獲得チャネルとしての**「最初に勝つ垂直」**をコーティング・PPF に絞る。Body repair や一般整備は次フェーズ。

### 教訓 #2: 「便利だが代替で十分」は死ぬ (No Market Need 系)

Loot Drop に並ぶ B2B SaaS の死因 #1 は「Excel + 紙 + LINE で間に合うので置き換えない」。これは**痛みの強さの不足**で、機能の品質では解決しない。

**転用:** Ledra は**「Excel・紙では絶対に出せないアウトプット」**を 1 つ持つべき。それが**「保険会社が直接アクセスできる証明書」**であり、これが**LINE では絶対できない**ところに価値がある。マーケティングはここに集中。

### 教訓 #3: マーケットプレイス + SaaS の同時起ちは難しい (Marketplace deep-dive)

Loot Drop の Marketplace カテゴリは Failed startup の山 (Cherry, Munchery, etc.)。「**Supply 側を増やす施策と Demand 側を増やす施策が逆方向**」で、片方の SaaS と両方やると体力が持たない。

Ledra は今、`/admin/market-vehicles` (中古車) + `/admin/btob` (施工店間取引) + `/admin/orders` (受発注) + `/admin/deals` (商談) と、**マーケットプレイス系を 4 種同時運用**している。

**転用:**
1. マーケット系を**1 種に絞る**。最も「証明書とシナジーがある」のは中古車 (証明書 = 査定加点ストーリー) なので、ここだけ残す。
2. BtoB 受発注は**Phase 2 以降**に降格。今は施工店内オペレーション (admin/jobs) を磨く。

### 教訓 #4: 日本の中小企業向け SaaS は「導入を済ませる」までが勝負

調査によると、日本の B2B SaaS は **67.4% が導入失敗を経験**。原因は「**人材不足 (56%)**」「**業務プロセスを SaaS に合わせる再編失敗**」「**初期設定が分かりにくい**」。

**転用:**
1. **オンボーディングを「1 日で終わる」状態に**する。`docs/admin-beginner-guide.md` 20k 字 を読まないと使えない状態は既に黄信号。
2. **コマンドパレット (Cmd+K) の自然言語化** (FEATURES.md §12.2) を最優先。「証明書を発行したい」と打てば導線が出る = 業務プロセスの再編を SaaS 側が肩代わりする。
3. **無料トライアル中のオンボーディング工数** を CS 側で吸収するスクリプト化。Ledra Academy はこれの自助化として整える。

### 教訓 #5: Insurtech は「plateau-by-plateau」 — 保険会社 1 社あたり 6 〜 12 ヶ月

Loot Drop の Fintech deep-dive: **B2B 埋込保険系は 1 社あたり成約まで 6 〜 12 ヶ月**。受注した瞬間に統合 (custom integration) が始まるので、ARR は階段状にしか伸びない。

**転用:**
1. **保険会社向けは 1 社目を「絶対に逃せない案件」として全リソース投入**する。Toyota 系・損保ジャパン系・東京海上系のいずれか 1 つ。`docs/toyota-*` の交渉系資料を最も上位の優先度に。
2. 2 社目以降は**1 社目のテンプレを再利用**できるように、`src/lib/insurer/` の共通ロジックを最初から「設定で振る舞う」設計に。Hard-code を避ける。
3. 営業の現場は**plateau の踊り場で「もう成長しない」と勘違いしやすい**。創業者と投資家に**「次の社が来るまで 6 ヶ月かかる」**を事前に共有しておく。

---

## 4. Ledra が今すぐ取るべき 7 つの方向修正

優先度順。各項目はリポ内のどのファイルを触るかまで踏み込む。

### ① コア / 周辺の分離を価格表に反映する (1 週間)

- `src/app/(marketing)/pricing/` を作って 3 ティア + アドオンを公開
- `src/lib/billing/` のプランガード (`requirePlan('pro')` 等) を、現在「全機能を pro 以上にゲート」している場合は**コア機能だけ starter で開放**するよう緩める
- `/admin/market-vehicles` `/admin/btob` `/admin/deals` を**「Trades アドオン (有料)」**として隠す。デフォルト OFF。

### ② 「最初に勝つ垂直」 = コーティング / PPF に絞ったマーケティング書き換え (3 日)

- `src/app/(marketing)/page.tsx` のヒーローを「コーティング・PPF 施工店向け」に切り替え
- `for-shops` `for-insurers` のページ (現状 Coming Soon) を**コーティング・PPF・保険査定**に振った形で 1 ページずつ書く
- 業界別ベンチマーク (`docs/research-blockchain-automotive-japan-2026.md`) の数字を引用

### ③ ライトハウス顧客 (保険会社 1 社) 戦略の明示 (継続)

- `docs/toyota-*` の 5 ファイル を `docs/lighthouse-customer-strategy.md` に再編集して、Toyota 以外 (損保ジャパン / 東京海上 / 三井住友海上 / あいおいニッセイ) も対象に拡張
- 「1 社目が決まるまで 2 社目以降の保険会社向け機能は凍結」と運用ルールを明示

### ④ 機能 ROI ボードの実装 (1 週間)

- `/admin/platform/operations` を拡張し、ルートごとに「直近 30 日 unique tenant」「API call count」「課金プラン契約率」を可視化
- Vercel Analytics + Supabase の `audit_logs` から自動集計 (cron `monitor` の拡張)
- 6 ヶ月触れていない route を deprecation リストに自動入りさせる

### ⑤ ブロックチェーン・アンカリングの「課金できる用途」を 1 つ確定 (1 ヶ月)

- 「中古車買取査定での加点」「保険会社の証拠保全」「メーカ保証延長」のうちから 1 つ
- 該当する顧客 5 社にインタビュー (本番テナントで実施)
- 結果次第で `src/lib/anchoring/*` の運用形態を絞る (有料アドオン化 / 無料同梱 / 廃止のいずれか)

### ⑥ オンボーディングを「1 日完了」に再設計 (2 週間)

- `docs/admin-beginner-guide.md` 20k 字 → 「最初の 1 時間で証明書 1 通発行」に圧縮した動画 + チェックリスト
- ダッシュボードの onboarding tour (`/admin`) で「最初の証明書発行」を完了するまで**追加機能をフォルディング (折りたたみ)**
- コマンドパレット (Cmd+K) を自然言語化 (FEATURES.md §12.2 既記載) を Q3 から Q2 に前倒し

### ⑦ エンタープライズ調達チェックリストを 1 ファイル化 (3 日)

- `docs/enterprise-readiness.md` を新規作成
- 内容: SSO / MFA / Audit log / DPA / SOC2 / ISO27001 / Pentest / RPO RTO / Data residency / Subprocessor 一覧
- 営業 (代理店ハブ・自社) が即座に PDF 化して提案資料に添付できる形

---

## 5. 中長期 (12 ヶ月) で Ledra が賭けるべき 1 点

Loot Drop の含意を集約すると、**「賭けない」のが最大の失敗**。広く薄く 4 ポータル + 9 統合先で死ぬよりも、**1 つの圧倒的価値**に賭けて他は支援役に降格させる。

候補:

1. **「保険会社 + 施工証明書」の双方向ネットワーク**
   - 1 つの保険会社に深く食い込み、その指定工場ネットワーク全体を Ledra に流す
   - CCC (US) のロールモデル
   - 課金: 保険会社 SaaS (高単価) + 指定工場 (低単価大量)
   - **これが現状最も差別化されており、競合 (Shopmonkey/Tekmetric) も入ってこない**

2. 「中古車査定における施工証明書のデファクト化」
   - 査定業者 (CarsSensor / GooNet / カーセンサー / オートバックス車買取) との連携
   - 課金: 出品プレミアム / 査定業者向け API 有料化
   - **ただし証明書発行店が直接ベネフィットを受けないため、説得が難しい**

3. 「整備工場 All-in-one (Shopmonkey 日本版)」
   - 既存システム (車両管理ソフト系) からの乗り換えを狙う
   - 課金: 月額固定
   - **競合が強い。日本市場でのトップエンドは少なく、価格圧縮の罠**

**推奨は #1 (保険会社ネットワーク)**。
- Ledra のユニーク資産 (保険会社ポータル) と最も整合
- Loot Drop の Insurtech deep-dive が「**ニッチかつ大手連携の人間関係依存度が低いセグメント**で勝ちやすい」と示す
- 1 社の灯台顧客が決まれば指定工場が芋づる式に流れる

---

## 6. 月次レビュー: アンチパターン定点観測チェックリスト

毎月第 1 週に下記をレビューする (PO + CTO)。緑になっていない項目は Critical Path として対処する。

```
[ ] No Market Need
    [ ] 直近 30 日で課金プランをアップグレードしたテナント数 ≥ 3
    [ ] 解約理由 top3 に「ニーズと合わない」が入っていない
    [ ] 営業 NPS or 顧客 NPS のサンプルが取れている

[ ] Cash
    [ ] 現預金残高での runway ≥ 12 ヶ月
    [ ] 月次 ARR 成長率 ≥ 8% (vertical SaaS の中央値)
    [ ] 機能あたり ARR 寄与のワーストワンを deprecate or 統合の議論

[ ] Team / Founder Conflict
    [ ] 機能優先度の最終決裁者が 1 人で運用されている
    [ ] OKR / マイルストーンが部門間で齟齬していない

[ ] Competition
    [ ] Shopmonkey / Tekmetric / 国内競合の月次ニュース確認
    [ ] 自社の差別化ポイント 3 つを言語化できる (= 営業資料に書いてある)

[ ] Product / Tech Failure
    [ ] Sentry の P0/P1 エラーが 0
    [ ] tenant scope 漏れ自動チェック (CI grep) 緑
    [ ] vitest + playwright が 0 failure
    [ ] 過去 30 日でのインシデント retro が docs に追記されている

[ ] Legal / Regulatory
    [ ] DPA / プライバシーポリシー / 特商法表記 が最新
    [ ] 個人情報 on-chain 化していない確認 (audit query)
    [ ] 監査ログが 1 年分保管されている

[ ] Unit Economics
    [ ] LTV / CAC ≥ 3
    [ ] CAC payback ≤ 12 ヶ月
    [ ] アドオンの粗利率 ≥ 70%
```

---

## 7. 参考リンク

- Loot Drop トップ: <https://www.loot-drop.io/>
- Why They Fail (7 アンチパターン): <https://www.loot-drop.io/why-they-fail>
- Meta-Study (失敗理由分布): <https://www.loot-drop.io/insights.html>
- Top 10 Lists (カテゴリ別ランキング): <https://www.loot-drop.io/lists>
- Deep Dives (22 カテゴリ): <https://www.loot-drop.io/deep-dives>
- FAQ: <https://www.loot-drop.io/faq>

### 参考: 関連 Ledra 内部ドキュメント

- アーキテクチャロードマップ: `docs/architecture-roadmap.md`
- 直近の監査結果: `docs/AUDIT_REPORT_20260503.md`
- アンカリング戦略: `docs/anchoring-roadmap.md`
- ブロックチェーン × 自動車 × 日本: `docs/research-blockchain-automotive-japan-2026.md`
- Toyota パートナーシップ提案: `docs/toyota-partnership-proposal.md`
- ISO27001 / SOC2 準備: `docs/iso27001-soc2-prep.md`
- 機能一覧: `FEATURES.md`

---

## 8. 結論 — 一行サマリ

> **「証明書 + 保険連携」**を Ledra のコアに据え、**ライトハウス保険会社 1 社**に集中投下し、**マーケットプレイス・BtoB・Academy・中古車**は有料アドオン or 凍結に降格する。Loot Drop が示す通り、**広く薄くは死ぬ**。狭く深く勝つことが、Ledra が先輩たちの墓場に並ばないための唯一の道。
