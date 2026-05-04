# インシデント対応 Runbook

セキュリティ・運用インシデント発生時の標準手順。SOC 2 CC7.3 / ISO 27001
A.16 / ISMAP 4.5 の "速やかな対応" 要件に対応する。

> **想定読者**: オンコール担当 / CTO / カスタマーサポート

## 0. 用語

- **Incident Commander (IC)**: 全体指揮を取る 1 名。最初に検知した人が
  自動的に IC になる。引き継ぐ場合は明示的に Slack で宣言。
- **Scribe**: 時系列メモを残す担当 (IC が兼務可)。
- **Comms**: 顧客 / 内部への連絡担当 (P1 のみ専任)。

## 1. Severity 区分

| Severity | 定義 | 例 | 一次応答 |
|---|---|---|---|
| **P0** | 全顧客のデータ漏洩・機密性破壊が進行中 | DB 全件 dump 流出, 認証バイパス公開 | 即時 + 全社召集 |
| **P1** | 一部顧客のデータが漏洩 / 改ざん / 喪失 | 単一テナントの不正アクセス, 暗号鍵漏洩疑い | 60 分以内 |
| **P2** | サービス停止 / 機能不全だが個情漏洩なし | 主要 API の認証エラー連発, レート制限の暴走 | 4 時間以内 |
| **P3** | 限定的影響 / 回避策あり | 単一機能のバグ, 非クリティカルアラート | 翌営業日 |

## 2. Phase 別アクション (P0 / P1)

### Phase 1 — Detect (検知 0-5 分)

検知ソース:
- **Sentry alert** (`security_event` タグ) — Slack `#security-alerts`
- **honeypot ヒット急増** — `security_event:honeypot_hit` の件数 spike
- **rate limit 急増** — `security_event:rate_limited` の件数 spike
- **顧客通報** — `security@ledra.co.jp` / お問い合わせフォーム
- **外部研究者** — `/.well-known/security.txt` 経由

検知者がやること:
1. `#incident-active` チャンネルを作成 / または既存に投稿
2. severity を初期判定 (不明なら P1 で開始 / 上方修正は容易、下方は容易でない)
3. IC を宣言: 「私が IC です」

### Phase 2 — Triage (10 分以内)

IC がやること:
1. **影響範囲の特定**
   - 影響テナント数 / ユーザー数 / データ種別
   - 進行中か収束済みか
2. **証拠保全**
   - Vercel logs / Sentry issues / Supabase logs を保全 (削除されないよう
     `30 日延長保持` を依頼)
   - 該当時刻の `admin_audit_logs` を CSV エクスポート
3. **拡大判断**
   - P0 なら全社召集 (Founder + Engineering + 法務)
   - P1 なら担当 Engineer 招集

### Phase 3 — Contain (封じ込め 30 分以内)

選択肢 (影響範囲を最小化):

| 状況 | 対応 |
|---|---|
| 単一 IP からの攻撃 | Vercel WAF で IP block |
| 単一 tenant の侵害 | `tenants.is_suspended=true` で即時隔離 |
| 全 API への異常 | `RATE_LIMIT_FAIL_CLOSED=1` を本番に投入 + redeploy |
| 認証バイパス | 該当 route を maintenance モード (503 を返す) |
| 暗号鍵漏洩 | `docs/operations/key-rotation.md` の **緊急ローテ** 手順 |
| Service Role Key 漏洩 | Supabase ダッシュボードで即時 reset |
| Stripe Webhook Secret 漏洩 | Stripe Dashboard で `Roll signing secret` |

### Phase 4 — Eradicate (根絶 4 時間以内)

1. 根本原因コードを修正、PR を `[INCIDENT]` プレフィックス付きで作成
2. CodeQL / Trivy / `npm audit` で類似脆弱性をスキャン
3. テストケース追加で再発防止
4. CI 通過後、本番に hotfix deploy

### Phase 5 — Recover (復旧)

1. WAF / suspend / fail-closed を順次解除
2. 影響を受けたデータがあれば顧客と相談しながら復元
3. P1 の場合: 当該テナントに状況報告を 24 時間以内に行う

### Phase 6 — Lessons Learned (5 営業日以内)

1. **Post-mortem 作成**: `docs/incidents/YYYY-MM-DD-<slug>.md` に時系列 +
   原因 + 対応 + 改善策を non-blame で記録
2. **改善 issue 化**: `security` ラベル付きで GitHub issue 化
3. **30 日以内に改善実装** + 再演習
4. **`SECURITY.md` の更新** (適用範囲が変わる場合)

## 3. 顧客向け連絡テンプレート

### 一次連絡 (検知 + 24 時間以内)

```
件名: [重要] Ledra におけるセキュリティインシデント発生のお知らせ

平素より Ledra をご利用いただきありがとうございます。

YYYY-MM-DD HH:MM (JST) ごろ、Ledra の {対象機能} において
セキュリティインシデントが発生したことをお知らせいたします。

【影響範囲】
- {影響テナント数 / 影響データ種別}

【現在の状況】
- {封じ込め完了 / 調査中}

【お客様にお願いしたいこと】
- {パスワード変更 / 不正アクセスログ確認 / なし}

【今後の連絡】
- 24 時間以内に詳細状況をご報告します
- 専用問い合わせ窓口: incident@ledra.co.jp
```

### 最終報告 (5 営業日以内)

`docs/incidents/template-final-report.md` を使う (post-mortem を顧客向けに
要約したもの)。

## 4. メディア / SNS 対応

- 公式回答は `comms@ledra.co.jp` に集約。エンジニアは個人 SNS で
  詳細を語らない (調査中の事実誤認を防ぐ)
- 個人情報保護委員会への報告: 漏洩確定後 速報 3〜5 日以内 / 確報 30 日以内

## 5. 演習スケジュール

| 頻度 | 内容 | 担当 |
|---|---|---|
| 四半期 | tabletop drill (P1 シナリオを口頭で回す) | CTO + 全 Eng |
| 半年 | 実機 drill (staging で fail-closed を実投入) | CTO |
| 年 1 回 | 第三者ペネトレーションテスト | 外部ベンダー |

## 6. 連絡先

- 内部 Slack: `#security-alerts` (アラート受信) / `#incident-active` (進行中)
- 顧客向け: `security@ledra.co.jp` / `incident@ledra.co.jp`
- ベンダー: Stripe / Supabase / Vercel / Upstash の support 窓口は
  1Password の `Vendor Support Contacts` ボールトに集約
