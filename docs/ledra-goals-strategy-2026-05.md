# Ledra 目標設定レビュー — ARR 10億 / 保険会社 PoC 5社 / トヨタ協業

> 作成日: 2026-05-09
> 対象: ARR 10億 / 保険会社 PoC 5社 / トヨタ協業 — の3目標
> 用途: 経営目標の妥当性レビューと、現実的な KPI 構造への置き換え提案
> 関連: `docs/direction-research-loot-drop.md` / `docs/competitor-analysis-2026-05.md` / `docs/toyota-*` / `docs/internal/vc-submission.md` / `src/lib/marketing/pricing.ts`

---

## 0. 結論 (一行サマリ)

> **「保険会社 1 社の本番化 → 指定工場ネットワーク取込み」を主軸に据え、トヨタ Woven City PoC を社外説得材料として使い、店舗 ARR + 保険 ARR + 流通 ARR の 3 階建てで 18〜24 ヶ月で 10 億を狙う**。3 目標を並列に追うのではなく、**順序付けと「捨てる機能」の決定** が現状の最大ボトルネック。

---

## 1. 総論: 3目標は「方向は正しいが、構造が弱い」

3 目標とも筋は通っているが、そのまま KPI に置くと以下のような典型失敗パターンに乗る：

- **PoC 5 社抱えたまま契約 0 社**
- **店舗だけ追って ARR 10 億に届かない**
- **トヨタ単独に賭けて代替案を持たず、足元を見られる**

`docs/direction-research-loot-drop.md` で自社が書いている警告と、目標の立て方が噛み合っていない。

各目標を **「構造に分解して」「先行指標に置き換える」** 必要がある。

---

## 2. ARR 10億円について

### 2.1 評価: 妥当だが、店舗 SaaS 単独では届かない

ざっくり試算 (`src/lib/marketing/pricing.ts` のプラン定義に基づく):

| ARR | 月間売上 | 必要店舗数 (平均 ARPU ¥35,000※) |
|---|---|---|
| 10 億円 | 約 8,300 万 | **約 2,400 店舗** |

※ スタンダード ¥24,800 + アドオン (追加店舗・追加ユーザー・優先サポート・ブランド証明書) 込みの実効値

参考軸:

| 競合 | ARR | 顧客数 |
|---|---|---|
| Tekmetric (米国・5 年先行) | $15M ≈ 22 億円 | ~3,000 店 |
| Shopmonkey (米国) | $29.7M ≈ 44 億円 | ~6,000 店 |

**つまり ARR 10 億 = 国内のコーティング/PPF 専業セグメントで Tekmetric の半分まで取る** という意味になる。狙えるが、店舗 SaaS だけだと 2,400 店が天井に効きすぎる (国内のコーティング/PPF 専業店は数千〜1 万社規模、整備全体は約 9 万社)。

### 2.2 提言: ARR を「3階建て」に分解する

`docs/internal/vc-submission.md` でも自社が書いている **「サブスク + テンプレート + 流通手数料の 3 階建て」** を、目標の段階で数字に落とすべき：

```
ARR 10億の内訳 (推奨)
├─ 店舗サブスク     : ¥6 億   (1,400 店 × ¥35,000/月)
├─ 保険会社課金     : ¥3 億   (3〜5 社 × ¥500 万〜1,000 万/月)
└─ 流通/従量課金    : ¥1 億   (中古車査定連携・ブランド証明書プレミアム・OEM API)
```

このうち **保険会社の高単価課金 (¥3 億分) と OEM 流通課金が、店舗 ARR の伸び悩みに対する保険** となる。`docs/direction-research-loot-drop.md` §5 で結論が「保険会社 + 施工証明書の双方向ネットワークに賭けろ」となっているのと整合。

---

## 3. 保険会社 PoC 5社について

### 3.1 評価: KPI 設計として危険

`docs/direction-research-loot-drop.md` §2.7 と §3 教訓 #5 で自社が書いている通り：

> **B2B 埋込保険系は 1 社あたり成約まで 6〜12 ヶ月。受注した瞬間に統合 (custom integration) が始まるので、ARR は階段状にしか伸びない。**

5 社並走は **plateau-by-plateau growth の罠** そのもの。リソース希釈で、契約締結 0 件のまま PoC 5 社抱える形になりやすい。

### 3.2 提言: 「契約・本番運用 1 社 + パイプライン 4 社」に置き換える

```
NG: 「PoC 5社」
OK: 「ライトハウス契約 1社 (本番運用化) + パイプライン PoC 4社」
```

具体構造:

| 段階 | 数 | 意味 |
|---|---|---|
| **Lighthouse** (本番接続・課金開始) | 1 社 | **損保ジャパン** (2026-05-13 経営確定。他 3 社は §3.2 のパイプライン枠へ) |
| **PoC 合意** (NDA + 範囲書) | 2-3 社 | 上記の残り |
| **初回 MTG** (関心確認) | 5-8 社 | 中堅含む |

理由:

1. 1 社目の本番接続が完了すると `src/lib/insurer/` の共通ロジックがテンプレ化され、2 社目以降は 3〜6 ヶ月に短縮できる (これは設計次第)
2. 「1 社目のために全機能を曲げる」覚悟が無いと、2 社目以降のテンプレも作れない
3. 今の `/insurer/*` 機能セット (検索・案件・SLA・分析) は綺麗だが、**実際に 1 社の業務フローに完全フィットしているかは未検証**。Lighthouse 1 社のフロー固定が最優先

### 3.3 「PoC」の言葉を統一する

「PoC 5社」は社内で意味がぶれるリスクが高い。以下の段階を社内で明確に区別すべき：

```
リード → 初回 MTG → デモ実施 → NDA → PoC 合意書 → PoC 実施 → 本番接続契約 → 課金開始
```

「PoC 5 社」が NDA 段階を指すのか、本番接続契約 5 社を指すのかで意味が 10 倍違う。**契約フェーズごとに別 KPI を持つ** べき。

---

## 4. トヨタ協業について

### 4.1 評価: 戦略文書は良い。ただし「トヨタ単体」を目標にすると弾切れ

`docs/toyota-partnership-proposal.md` / `docs/toyota-poc-plan.md` / `docs/toyota-negotiation-strategy.md` は、スタートアップ vs 大企業の交渉論として教科書的 (ゼロコスト PoC、競合圧力、データモート、社内チャンピオン育成)。

ただし 2 点弱い:

1. **`/v/[vin]` 車両パスポートが未実装** (`toyota-poc-plan.md` で明記されている最大ギャップ)。これが無いとデモのクライマックスが成立しない
2. **トヨタ単独目標は交渉力を弱める**。`toyota-negotiation-strategy.md` でも自社が「日産 PASSPORT・ホンダ・MOBI に並行アプローチ」と書いているが、これが KPI に含まれていない

### 4.2 提言: 目標を「OEM 協業 1 社 (PoC 合意以上)」に書き換える

```
NG: 「トヨタ協業」(単体目標)
OK: 「OEM 1社と PoC 合意以上 (本命: トヨタ Woven City、保険: 日産 PASSPORT / MOBI 加盟)」
```

短期の必須仕込み:

- [ ] `/v/[vin]` ページ実装 (PoC 計画書の最重要タスク・3〜5 日)
- [ ] Polygon アンカリングを新規発行のデフォルト ON 化 (環境変数 1 行)
- [ ] MOBI コンソーシアム加盟申請 (これがあるだけでトヨタ社内稟議の説得力が変わる)
- [ ] 日産 PASSPORT への並行コンタクト開始
- [ ] Polygon Mainnet 本番投入 (Amoy → Mainnet 切替)

### 4.3 トヨタ内のターゲット優先順

`docs/toyota-poc-plan.md` の優先度を踏襲:

| 優先 | 接触先 | 理由 |
|---|---|---|
| ★★★ | Woven by Toyota — スタートアップ連携担当 | スタートアップとの共創を明示。意思決定速い |
| ★★☆ | KINTO — プロダクト/事業開発 | SBT 実証実験部門。技術感度が高い |
| ★☆☆ | Toyota Blockchain Lab | 窓口が公式ページのみ。層が厚く時間がかかる |

**まず Woven by Toyota Partner Program へのゼロコスト PoC 提案** が最速ライン。

---

## 5. 目標構造そのものの見直し

3 目標は **全部「アウトプット」(数の達成)** で、**アウトカム** (事業の前進) を直接測れていない。

### 5.1 推奨: 4 層 KPI に分解

```
L1 基盤      : /v/[vin] 実装、Polygon デフォルト有効化、エンタープライズ調達
              チェックリスト (docs/enterprise-readiness.md 新設)、保険会社向け
              営業資料、機能 ROI ボード

L2 パイプライン: 保険会社初回 MTG 数 (年 12 社)、OEM 初回 MTG 数 (年 3 社)、
              店舗デモ実施数、代理店経由紹介数

L3 転換      : PoC 合意 → 本番契約への転換率、無料 → 有料転換率、
              PoC 継続率、店舗オンボーディング完了率

L4 結果      : ARR (3 階建て内訳付き)、契約保険会社数 (本番運用)、
              OEM PoC 合意数、加盟店舗数
```

**3 つの目標 (ARR / PoC / Toyota) は L4 (結果) だが、L1〜L3 が無いと L4 は動かない**。今のロードマップは L1 が断片的、L2 が KPI 化されていない、L3 はそもそも測っていない。

---

## 6. 何を「捨てる」か

`docs/direction-research-loot-drop.md` §3 教訓 #3 と §4 ① で自社が結論づけている通り、今の Ledra は面積が広すぎる (4 ポータル + マーケットプレイス 4 種 + Academy + POS + モバイル + ブロックチェーン)。

ARR 10 億達成のために、以下を **有料アドオン化 or 凍結** すべき：

| 機能 | 推奨 | 理由 |
|---|---|---|
| `/admin/market-vehicles` (中古車) | ✅ **アドオン化決定 (2026-05-13)** — `tenant_addons.market_vehicles` | 証明書とのシナジーは仮説段階、機能が重い |
| `/admin/btob` `/admin/orders` (job_orders) | ✅ **アドオン化決定 (2026-05-13)** — `tenant_addons.btob` | 施工店間取引慣習の SaaS 化は時間がかかる |
| `/admin/deals` | ✅ **アドオン化決定 (2026-05-13)** — `tenant_addons.deals` | 同上 |
| `/admin/academy` | Standard/Pro 限定のままで OK | 既にゲートされている |
| Apple Tap to Pay | 維持 | 現場 DX として効く・差別化にもなる |
| Polygon バックフィル | 運営機能のまま | 課金不要、契約交渉時のエビデンス |
| Storefront ダッシュボード | 維持 | 現場運用の差別化 |

**コーティング/PPF 施工店向けの「証明書 + 保険連携」を主役** にして、それ以外は支援役に降格。これは Loot Drop §8 の結論と一致する。

---

## 7. 修正後の目標 (案)

```
2026 通期 目標 (推奨)

■ ARR (¥10億)
├─ 店舗サブスク ARR : ¥6 億   (1,400 店 × ¥35,000/月)
├─ 保険会社 ARR    : ¥3 億   (Lighthouse 1 社本番 + 2 社 PoC 契約)
└─ 流通/OEM ARR    : ¥1 億   (OEM PoC 1 社 + 中古車査定連携 1 事業者)

■ 保険会社
├─ Lighthouse 本番運用     : 1 社  (必達)
├─ PoC 契約 (NDA+範囲書)    : 2-3 社
└─ 初回 MTG                : 5-8 社

■ OEM
├─ PoC 合意 (Woven City 等): 1 社  (必達 — トヨタ本命)
└─ 並行アプローチ          : 日産 PASSPORT / ホンダ / MOBI 加盟

■ L1 基盤 (Q1 で完了させる)
├─ /v/[vin] 実装
├─ Polygon デフォルト ON
├─ docs/enterprise-readiness.md
├─ 保険会社向け 営業資料 (Insurer Sales Pack)
└─ 機能 ROI ボード (どの機能が ARR に効いているか可視化)
```

---

## 8. 一番のリスクと順序付け

「ARR 10 億」「PoC 5 社」「トヨタ」を **並列で同時に追うこと** そのものがリスク。Loot Drop が示す失敗パターンは、まさに「広く薄く同時に追って、どれも完成しない」状態。

### 推奨順序

```
Q2-Q3 2026 : Lighthouse 保険会社 1 社 + Toyota Woven City PoC 合意
Q3-Q4 2026 : Lighthouse 本番運用 → 指定工場ネットワーク取込み
Q4-Q1 2027 : 2 社目以降の保険会社並列展開 + OEM PoC 拡張
Q1-Q2 2027 : ARR 10 億達成
```

**= 24 ヶ月で ARR 10 億・保険会社 1 社本番 + α・OEM 1 社 PoC 合意以上** が現実的なライン。今期 (12 ヶ月) で全部やるのは無理。

### 月次レビュー

`docs/direction-research-loot-drop.md` §6 のアンチパターン定点観測チェックリストを実運用化:

```
[ ] No Market Need
    [ ] 直近 30 日で課金プランをアップグレードしたテナント数 ≥ 3
    [ ] 解約理由 top3 に「ニーズと合わない」が入っていない
[ ] Cash
    [ ] 現預金残高での runway ≥ 12 ヶ月
    [ ] 月次 ARR 成長率 ≥ 8%
[ ] Competition
    [ ] Shopmonkey / Tekmetric / 国内競合の月次ニュース確認
[ ] Product / Tech Failure
    [ ] Sentry の P0/P1 エラーが 0
    [ ] tenant scope 漏れ自動チェック (CI grep) 緑
[ ] Unit Economics
    [ ] LTV / CAC ≥ 3
    [ ] CAC payback ≤ 12 ヶ月
```

---

## 9. アクション (今週開始すべき)

| # | アクション | オーナー | 期限 |
|---|---|---|---|
| 1 | `/v/[vin]` 車両パスポートページ実装 | エンジニア | 1 週間 |
| 2 | ✅ Polygon アンカリングをデフォルト ON → tenants.polygon_anchor_opt_out 列 (migration 20260514000001) + upload/backfill 配線 (2026-05-14) | エンジニア | 完了 |
| 3 | ✅ Lighthouse 保険会社の決定 → **損保ジャパン** (2026-05-13) | CEO | 完了 |
| 4 | Woven by Toyota Partner Program 応募準備 | CEO + BizDev | 1 ヶ月 |
| 5 | ✅ 機能 ROI ボード Phase 2 → `/admin/platform/operations/roi-board` + CSV export (2026-05-14) | エンジニア | 完了 |
| 6 | `docs/enterprise-readiness.md` 新設 | PM | 3 日 |
| 7 | ✅ マーケット系機能 のアドオン化 → `tenant_addons` (migration 20260514000000) | 経営 + エンジニア | 完了 |
| 8 | 3 階建て ARR 内訳での KPI 再設定 | 経営 + 投資家 | 2 週間 |

---

## 10. 参考: 既存資料との対応

このメモは以下の既存資料の **目標レイヤーへの落とし込み** として位置づける:

- `docs/direction-research-loot-drop.md` — 失敗パターン研究 (本メモの理論的背骨)
- `docs/competitor-analysis-2026-05.md` — 競合 (Shopmonkey / Tekmetric / Shop-Ware) 比較
- `docs/toyota-partnership-proposal.md` — トヨタ提案書本体
- `docs/toyota-poc-plan.md` — Toyota PoC 実施計画
- `docs/toyota-negotiation-strategy.md` — 大企業交渉戦略
- `docs/internal/vc-submission.md` — VC 提出パッケージ
- `docs/internal/vc-pitch-outline.md` — ピッチデック構成
- `docs/AUDIT_REPORT_20260503.md` — 監査・機能改善レポート
- `src/lib/marketing/pricing.ts` — 価格モデル (確定済み)

---

## 11. 次のステップ

このメモを叩き台として:

1. 経営チームで **3 階建て ARR の比率** を最終決定
2. **Lighthouse 保険会社** を 4 社のうち 1 社に絞る (アプローチ前提に)
3. `/v/[vin]` 実装スプリントを起動
4. Woven by Toyota Partner Program 応募の準備
5. マーケット系機能の **凍結 / アドオン化** を決議

---

> 技術はすでにある。次の 24 ヶ月は **「広く薄く」を「狭く深く」に塗り直すフェーズ**。3 目標は捨てるべきではないが、**「並列に追う目標」ではなく「順序づけて達成する目標」** として再定義する。
