# SSO (SAML 2.0) セットアップ手順

Ledra はエンタープライズ顧客向けに SAML SSO をサポートします。
本ドキュメントでは Supabase Auth の SSO 機能を使用した IdP 連携の
手順を示します。

## 前提

- Supabase プロジェクトが **Pro プラン以上**
  (SAML SSO は Pro 以上で利用可)
- 顧客(IdP) が SAML 2.0 メタデータ XML を提供できること
- Ledra 側で `signInWithSSO()` を呼び出せる auth helper を用意済
  (`src/lib/auth/sso.ts`)

## 1. Supabase で SAML を有効化

```bash
# CLI 経由
supabase auth providers update saml --enabled true

# または ダッシュボード:
# Authentication → Providers → SAML 2.0 → Enable
```

## 2. IdP プロバイダを登録

顧客毎に IdP メタデータを登録します。

```bash
# 推奨: メタデータ URL 経由 (IdP 側で更新があれば自動追従)
supabase sso providers add saml \
  --metadata-url 'https://idp.example.com/saml/metadata' \
  --domains 'example.co.jp,example.com'

# または: メタデータ XML を直接アップロード
supabase sso providers add saml \
  --metadata-file ./metadata.xml \
  --domains 'example.co.jp'
```

`--domains` で指定したドメインの email でログインを試みると、
Supabase が自動的に対応する IdP にリダイレクトします。

## 3. ACS / SLO URL を IdP 側に設定

IdP 側で以下を設定してもらいます:

| 項目 | 値 |
|------|-----|
| ACS URL (Assertion Consumer Service) | `https://<your-supabase-project>.supabase.co/auth/v1/sso/saml/acs` |
| Entity ID (SP) | `https://<your-supabase-project>.supabase.co/auth/v1/sso/saml/metadata` |
| NameID format | `emailAddress` |
| 必須属性 | `email`, `name` (Supabase が `user_metadata` に格納) |

詳細は Supabase 公式ドキュメント参照:
<https://supabase.com/docs/guides/auth/enterprise-sso/auth-sso-saml>

## 4. Ledra アプリ側の確認

- `src/lib/auth/sso.ts` の `startSsoSignIn(supabase, { domain, redirectTo })`
  を server action から呼ぶ
- 返された URL に `Response.redirect` するだけで IdP に遷移
- IdP からの ACS callback は Supabase が処理し、最終的に
  `redirectTo` に渡したパス (= `/auth/callback`) にコードを乗せて返す
- `/auth/callback/route.ts` の `exchangeCodeForSession` がそのまま使える
  (パスワードログインと同じ経路)

## 5. ロールバック / 切り戻し

- `supabase sso providers list` で登録済 provider を確認
- 障害時は `supabase sso providers remove <provider-id>` で即座に
  当該 IdP を切り離せる (パスワードログインは引き続き使える)

## 6. 残作業 (本ドキュメント時点では未実装)

- [ ] 管理画面に「SSO で続ける」ボタンを露出
      (`src/app/login/page.tsx` に server action を配線)
- [ ] テナント毎に SSO を強制する flag (`tenants.sso_required`)
- [ ] SCIM 連携 (ユーザ自動プロビジョニング)
- [ ] 監査ログに `auth_method = 'saml'` を記録
- [ ] パスワードリセット導線を SSO ユーザには非表示化

これらは続編 PR で実装します。`startSsoSignIn` ヘルパは既に
unit test 付きでマージ済みなので、ボタン配線は数十行で完了します。

## トラブルシューティング

### "sso_unsupported_supabase_version" が返る
- `@supabase/supabase-js` が v2.51 未満。`package.json` を更新:
  ```bash
  npm install @supabase/supabase-js@latest
  ```

### IdP で ACS URL に POST しても Supabase が 400 を返す
- Entity ID と ACS URL の組が IdP メタデータと完全一致していない。
  特に末尾スラッシュの有無に注意。

### ユーザが認証されたが Ledra 側で tenant_membership が無く 403
- SCIM 未実装のため、SSO 初回ログインユーザは
  `/api/admin/users/invite` 経由で予め招待しておく必要がある。
  自動プロビジョニングは続編で対応予定。
