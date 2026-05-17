# Plug and Play Japan — Insurtech 応募ドラフト

> 作成日: 2026-05-17
> 用途: Plug and Play Japan アクセラレータ **Insurtech バーティカル** への応募下書き (英語フォーム向け)
> 応募フォーム: https://japan.plugandplaytechcenter.com/startups/apply-program-en/
> Insurtech 紹介: https://japan.plugandplaytechcenter.com/insurtech/
> 関連: `docs/ledra-goals-strategy-2026-05.md` (主軸=保険) / `docs/lighthouse-sompo-japan.md` (損保ジャパンは*標的*・未接触) / `docs/direction-research-loot-drop.md` §5 (双方向ネットワーク・テーゼ) / `docs/competitor-analysis-2026-05.md` / `docs/toyota-poc-plan.md` (ゼロコスト PoC の型)

---

## 0. このドキュメントの使い方 (社内向け・JP)

- **応募バーティカルは Insurtech 一本**。Mobility には今出さない:
  - モビリティの本命 (トヨタ Woven City) はコールド、かつ車両パスポート `/v/[vin]` が未実装 → デモのクライマックスが成立しない (`docs/ledra-goals-strategy-2026-05.md` §4.1)。
  - Insurtech は `/insurer/*` が実装済みで「触れるプロダクト」がある唯一のトラック。かつ PnP Japan Insurtech のアンカーパートナーが SOMPO = 当社が選んだ Lighthouse 標的。
- **トラクションを誇張しない**。損保ジャパン含む保険会社とは **現時点で接点ゼロ**。応募はプロダクトとテーゼで勝負する。「既に SOMPO と協業」等は **書かない** (虚偽になる/選考後に破綻する)。下の Traction 欄は正直ベース + プレースホルダ。
- **PnP を単一障害点にしない**。応募と並行して、損保ジャパン / 東京海上 / 三井住友海上 / あいおいニッセイへの直接コールドも走らせる (`docs/ledra-goals-strategy-2026-05.md` §9 アクション 9)。
- **数字の空欄 `[ ... ]` は提出前に実数で埋める**。憶測値を入れない。埋められない数字は欄ごと正直に「early / pre-revenue」と書く。
- 窓口は **CEO 一本化**。PnP 経由の接点と直接商談が社内で交錯しないよう、コンタクト履歴を 1 箇所で管理。

---

## 1. 応募メタ情報

| 項目 | 値 |
|---|---|
| Program | Plug and Play Japan — Accelerator |
| Vertical | **Insurtech** |
| Batch / Deadline | [apply ページで現行バッチ募集期間・締切を確認して記入] |
| Location | Tokyo, Japan |
| Form language | English |

---

## 2. 応募フォーム ドラフト (EN — そのまま貼れる粒度)

> 各項目に PnP の想定設問を併記。文字数上限はフォーム側に従い、長い欄は先頭 2 文に要点を寄せる。

### Company

- **Company / legal entity**: HOLY Inc. (株式会社HOLY) — operating the product brand **Ledra**.
- **Website**: https://ledra.co.jp  ·  **Product (app)**: https://app.ledra.co.jp
- **HQ**: R-cube Aoyama 3F, 1-3-1 Kita-Aoyama, Minato-ku, Tokyo 107-0061, Japan
- **Founded / stage**: [founding year] · [pre-seed / seed / ...]
- **Team size**: [n] ([eng] eng / [biz] biz)

### One-line pitch (elevator)

> Ledra turns every repair, body, coating and PPF job at an auto shop into a **tamper-proof, blockchain-anchored digital certificate**, and connects those certificates to **insurers** — creating a two-sided shop⇄insurer network that makes vehicle repair history verifiable, fraud-resistant and reusable across the insurance value chain.

### Problem (Insurtech framing)

- Vehicle repair / coating / PPF records in Japan are paper or siloed PDFs. They are **trivial to alter after the fact**, so insurers cannot trust a shop-supplied record without manual re-inspection.
- This drives **claims-handling cost, repair-quality disputes ("水掛け論"), and fraud exposure** in accident-car repair and around designated-shop networks.
- Insurers run large **designated-shop networks** (industry-leading networks are on the order of ~5,000 shops) but have **no standardized, verifiable digital record layer** flowing from those shops back to the claims process.

### Solution / product (what is LIVE today — no roadmap-ware)

- Multi-tenant SaaS for auto maintenance / body repair / coating / PPF shops: **certificate issuance, billing & documents, customer portal, booking**.
- **`/insurer/*` portal is built and in production-grade state**: case linkage, search, SLA, analytics for insurer-side users.
- **Blockchain anchoring (Polygon)**: each certificate's photo/document hash is anchored on-chain, so any post-hoc substitution is **third-party verifiable** — this is the trust primitive insurers lack today.
- Stack: Next.js 16 / React 19, Supabase (Postgres/Storage/Auth), Stripe, Upstash, Polygon (viem/ethers). Structured logging, per-request correlation IDs, tenant/insurer-scoped data access, Sentry.

### Technology / IP / defensibility

- The moat is **not the SaaS UI** (US peers have that) — it is the **two-sided certificate network**: the more shops issue anchored certificates, the more valuable verification becomes for insurers, and insurer adoption pulls in their designated-shop networks. (Thesis: `docs/direction-research-loot-drop.md` §5.)
- Tamper-evidence is **cryptographic + on-chain**, not policy-based — verifiable by a third party without trusting Ledra.

### Business model

- Shop SaaS subscription (live pricing):

  | Plan | Monthly | Notes |
  |---|---|---|
  | Free | ¥0 | up to 10 certs/mo |
  | Starter | ¥9,800 | up to 80 certs/mo |
  | Standard | ¥24,800 | up to 300 certs/mo (setup ¥29,800) |
  | Pro | ¥49,800 | higher volume (setup ¥49,800) |
  | Add-ons | ¥3,300–¥4,400/mo | branded certificate, etc. |

- **Three-layer ARR thesis**: (1) shop subscription, (2) **insurer billing** (target band ¥5M–¥10M / month / insurer), (3) distribution / OEM usage. Insurtech is layer (2) — the high-ARPU layer this application targets.

### Market

- Japan: coating/PPF specialist shops in the thousands–~10,000; total auto-maintenance ~90,000 shops. Insurer designated-shop networks add a top-down channel on top of bottom-up shop sales.
- Reference comps (US, no insurer-network layer): Tekmetric ≈ $15M ARR / ~3,000 shops; Shopmonkey ≈ $29.7M ARR / ~6,000 shops.

### Traction (HONEST — fill before submit, do not inflate)

- Product: **live in production**; shop-side paying tenants: **[n paying tenants]**, MRR **[¥…]**, certificates issued **[n]**, on-chain anchored **[n]**. If early, state "early / limited paid traction" plainly.
- Insurer side: **pre-contact — no insurer relationship yet.** We have an internal *decision* to make Sompo Japan our lighthouse *target*; we are **not** claiming an existing relationship. Securing the first insurer conversation is exactly why we are applying to PnP Insurtech.

### Competitive differentiation

- vs US shop-ops SaaS (Tekmetric / Shopmonkey / Shop-Ware): they optimize shop operations; **none provide a tamper-proof, third-party-verifiable certificate layer or an insurer-facing network**.
- vs JP incumbents: largely paper / unstructured PDF; no anchoring, no insurer portal.
- Ledra's wedge = **anchoring + the `/insurer/*` side = a two-sided network**, which is the defensible part. (Detail: `docs/competitor-analysis-2026-05.md`.)

### Team

- [Founder/CEO — 1 line: background relevant to auto/insurance/SaaS]
- [Eng/CTO — 1 line] · [BizDev — 1 line]

### Funding

- Status: [bootstrapped / raising [round] of [¥…] ] · Use of funds: [insurer integration + GTM]

### Why Plug and Play Japan — and which corporate partners we want to work with

> Frame as **desired warm introductions**, NOT existing relationships.

- We are applying to **Insurtech** because our highest-ARPU layer is insurer billing, our insurer product is already live, and PnP Japan Insurtech's corporate-partner network is the most direct, curated path to the insurers we have selected as targets but **do not yet have access to**.
- Corporate partners we would most want to be introduced to, and why:
  - **SOMPO (Sompo Holdings / Sompo Japan / SOMPO Digital Lab)** — our chosen lighthouse *target*; largest-class designated-shop network (~5,000) and accumulated ADAS / accident-repair data make certificate↔claims matching most natural here. **No existing contact — a warm intro via PnP is the specific outcome we seek.**
  - **Tokio Marine** — pipeline; nationwide claims footprint.
  - **MS&AD (Mitsui Sumitomo Insurance / Aioi Nissay Dowa)** — pipeline; large designated-shop networks.

### What we want from the 12-week program

1. Curated introductions to the insurer corporate partners above for a scoped PoC.
2. Enterprise-procurement readiness with a large insurer (security review, DPA, SSO) — we have `docs/enterprise-readiness.md`, `docs/dpa-template.md`, `docs/sso-setup.md` prepared.
3. Validation of the two-sided network thesis with at least one insurer's designated-shop segment.

### Pilot we can run with a corporate partner (zero-cost PoC)

> Mirrors the zero-cost PoC structure in `docs/toyota-poc-plan.md`, adapted to insurers.

- 60–90 day pilot: a defined claim/repair type; a bounded set of the partner's designated shops issue **Ledra anchored certificates**; insurer-side users verify via `/insurer/*`.
- Success metric: verification works end-to-end + measurable reduction in repair-quality disputes / re-inspection cost on the pilot scope.
- Ledra bears integration cost for the pilot; conversion to paid (¥5M–¥10M/mo band) on success.

---

## 3. 提出前チェックリスト

- [ ] `[ ... ]` プレースホルダ (founding year / team size / traction 実数 / funding) を全て実値化、または正直に "early / pre-revenue" と明記
- [ ] Traction 欄に **保険会社トラクションを書いていない** (pre-contact のまま) ことを再確認 — 誇張は選考後に必ず破綻する
- [ ] 「SOMPO と協業中」等の **既存関係を示唆する表現がゼロ** か (desired intro の表現に統一)
- [ ] Vertical = **Insurtech** で送信 (Mobility と二股にしない)
- [ ] 応募ページで現行バッチの締切・必須項目を確認し、メタ情報表を更新
- [ ] CEO 窓口一本化 — 直接コールド (損保 4 社) と PnP 経由のコンタクト履歴を 1 箇所で管理
- [ ] 英文を最終ネイティブチェック (固有名詞: SOMPO / Tokio Marine / MS&AD の正式表記)

---

## 4. モビリティを出すならいつか (将来メモ)

`/v/[vin]` 車両パスポート実装 + Polygon デフォルト ON 完了後、かつ Woven by Toyota / タイムズモビリティ (`docs/times-mobility-followup-email.md`) が温まってから、**次バッチで Mobility に追加応募**。順序は「Insurtech で実績 → Mobility で拡張」(`docs/ledra-goals-strategy-2026-05.md` §8 推奨順序と一致)。
