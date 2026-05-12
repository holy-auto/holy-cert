# Lighthouse: 損保ジャパン — 本番接続オンボーディング計画

> 状態: **Lighthouse 確定 (2026-05-13)**
> オーナー: CEO + BizDev (営業) / エンジニア (技術接続)
> 関連: `docs/ledra-goals-strategy-2026-05.md` §3 (保険会社 PoC 構造) /
> `docs/enterprise-readiness.md` (セキュリティ調達向け Q&A) /
> `docs/disaster-recovery.md` (RPO/RTO 担保) /
> `docs/sso-setup.md` (SAML SSO セットアップ)

---

## 0. なぜ損保ジャパンが Lighthouse か

経営チームの判断 (2026-05-13):

- **損保 4 社の中で意思決定速度が最も明確** — 既存の DX 推進部門と直接接点
- **指定工場ネットワーク (約 5,000 店)** が業界最大級 → 1 社目接続で店舗 ARR の指数拡大シナリオ
- **保険業務の SaaS 利用に前向き** — 競合 (Shopmonkey 等) より先に押さえれば 12〜18 ヶ月リード
- **DX 案件の単価が他 3 社より明示的** (¥500 万〜1,000 万/月 帯)

他 3 社 (東京海上 / 三井住友海上 / あいおいニッセイ) は **PoC 合意フェーズのパイプライン**
として並行アプローチ。Lighthouse 接続の 30 日後を目処に NDA 締結を狙う。

---

## 1. 接続前の必須完了条件 (Go/No-Go)

エンジニア側は **下記を全てクリアしてから NDA → 本番接続契約** に進む。Lighthouse の品質
基準は他 3 社以降の標準テンプレになる。

### 1.1 セキュリティ・コンプライアンス

- [x] `docs/enterprise-readiness.md` 6 カテゴリの状態表で 🟢/✅ が揃う
- [x] Supabase Pro 化 + PITR (1 分粒度) 有効化
- [x] Read Replica (Tokyo) 構築 + `SUPABASE_REPLICA_URL` を Vercel に登録
- [x] SAML SSO (`tenants.sso_required`) で `@sompo-japan.co.jp` ドメインを SSO 強制
- [x] `docs/disaster-recovery.md` の四半期 DR 演習を 1 回実施 + 記録
- [ ] **外部ペネトレーションテスト** 発注 + critical 0 で合格
- [ ] **DPA** 法務レビュー済 + 損保ジャパン側のテンプレに沿った修正
- [ ] **個人情報保護委員会** への取扱事業者届出更新 (新規 sub-processor が増える場合)

### 1.2 機能・運用

- [x] `/insurer/*` (検索 / 案件 / SLA / 分析) が全機能 staging で動作確認済
- [x] `/v/[vin]` 車両パスポートが本番アンカリング (Polygon Mainnet) で動作
- [x] Stripe webhook 信頼性レイヤ (payload 保存 + 監視 cron)
- [x] Email outbox フォールバック (`sendEmailWithFallback`)
- [ ] **本番運用 SLA** の数値合意 (uptime 99.5% / 重大障害復旧 RPO 24h / RTO 4h)
- [ ] **on-call ローテ** 確立 (PagerDuty 連携 + 週次担当者)
- [ ] **損保ジャパン専用** Slack チャネル (お互いの障害連絡用)

### 1.3 業務フローの 1 社フィット検証

- [ ] **損保ジャパンの案件管理フロー** を BizDev 経由でヒアリング → `/insurer/cases/*` で再現
  できるか staging で 5 ケース実地テスト
- [ ] 既存の損保ジャパン社内システム (Sompo Hub 等) との **データ受け渡し要件** 確認
- [ ] **指定工場ネットワーク** の Ledra 加盟店 onboarding の摩擦点 (申請フォーム / 与信 / 契約)
  を 30 加盟店分シミュレート

---

## 2. SSO 設定 — 損保ジャパン IdP 連携

### 2.1 必要情報 (損保ジャパンから取得)

- IdP のメタデータ XML URL or ファイル
- IdP の Entity ID
- 利用ドメイン (例: `@sompo-japan.co.jp`、`@sompo-japan.jp` 等の複数候補)
- SCIM 自動プロビジョニングを使うかどうか (使う場合は別途 SCIM bearer token 払い出し)

### 2.2 Supabase 設定手順

`docs/sso-setup.md` の汎用手順をそのまま適用。要点:

```bash
# 1. SAML 有効化 (1 回のみ)
supabase auth providers update saml --enabled true

# 2. 損保ジャパン IdP を登録
# Supabase Dashboard → Authentication → SSO → Add provider
#   - Type: SAML 2.0
#   - Metadata XML: <損保ジャパンから受領>
#   - Domains: sompo-japan.co.jp

# 3. Ledra 側 tenant に SSO 強制を有効化
UPDATE tenants
SET sso_required = true,
    sso_email_domain = 'sompo-japan.co.jp'
WHERE id = '<損保ジャパンの tenant_id>';
```

### 2.3 検証

- [ ] `@sompo-japan.co.jp` のテストアカウントでパスワード sign-in を試み → SSO 案内画面
  にリダイレクトされる
- [ ] SSO 経由で sign-in 後、`/insurer` にアクセスできる
- [ ] IdP 側でユーザを deactivate → 次のセッションリフレッシュで Ledra も deactivate
- [ ] Sentry に `insurer_id` タグが付くことを確認 (`setSentryInsurerContext`)

---

## 3. 課金モデル

| 項目 | 詳細 |
|---|---|
| 月額 | ¥500 万〜1,000 万 (案件数連動の段階設計を提案予定) |
| 課金タイミング | 月次後払い (請求書 30 日サイト) |
| Stripe 設定 | Lighthouse 専用 price_id を新設 + `insurers.plan_tier = 'enterprise'` |
| トライアル | 30 日 (PoC 合意書〜本番接続切替まで) |
| 解約条件 | 90 日前通知 (DPA 第◯条で確認) |

---

## 4. ロードマップ

```
2026-05  CEO Lighthouse 決定 (← 完了)
2026-06  NDA → 初回 MTG → ヒアリング (業務フロー)
2026-07  PoC 合意書 + 本番接続要件確定 + SLA 数値合意
2026-08  外部ペネトレ + DPA 法務レビュー + IdP 連携テスト
2026-09  staging で 5 ケース実地テスト + on-call ローテ確立
2026-10  本番接続 + 課金開始 (Q3 マイルストーン)
2026-11  指定工場ネットワーク 30 加盟店分の onboarding
2026-12  本番運用 90 日経過、SLA 達成率レビュー
2027-Q1  2 社目 (東京海上 / 三井住友海上 / あいおいニッセイ) の PoC 着手
```

---

## 5. リスクと緩和策

| リスク | 緩和策 |
|---|---|
| 損保ジャパン側の DPA 修正要求がトヨタ並みに重い | 法務予算を 1 ヶ月前倒しで確保 (~¥80 万) |
| 業務フローのカスタム要求が `/insurer/*` 設計と乖離 | カスタム要件は **アドオン化 or 別 PR** に切り出し、コア設計を曲げない |
| SAML IdP のセットアップが Supabase 側で詰まる | Supabase Pro サポート (Enterprise 帯) で priority case を切る |
| 損保ジャパン側 SaaS 利用が縮小 / 経営判断で停止 | 並行アプローチ中の 3 社のうちどれかに即切替 (Loot Drop §5 教訓 #5) |
| 損保ジャパン経由の加盟店 onboarding が想定の 1/3 | 加盟店個別営業 ARR を再見積もり、3 階建てのうち店舗 ARR 構成比を引き上げる |

---

## 6. パイプライン 4 社の状況 (Lighthouse 後)

| 順位 | 保険会社 | 期待タイミング | 担当 |
|---|---|---|---|
| 1 | **損保ジャパン** ✅ | 2026-10 本番接続 | CEO + BizDev |
| 2 | 東京海上 | 2027-Q1 PoC 開始 | BizDev |
| 3 | 三井住友海上 | 2027-Q1 NDA | BizDev |
| 4 | あいおいニッセイ | 2027-Q2 初回 MTG | BizDev |
| 5 | 中堅 (共栄火災 / 富士火災等) | 2027-Q2+ | BizDev |

2 社目以降は 1 社目で確立した接続テンプレ (`/insurer/*` の業務フロー固定) を活用して
**3〜6 ヶ月接続** を目標にする。

---

## 7. このドキュメントの更新ルール

- 状態が変わったら **即時** §1 チェックリストを更新
- ロードマップから 2 週間以上ずれたら §4 を書き換えて経営会議に共有
- 新しいリスクが見えたら §5 に追記し、緩和策を BizDev / CEO とすり合わせ
