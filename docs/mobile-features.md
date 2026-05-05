# モバイル機能 (Push / 生体認証 / オフライン) 実装計画

`apps/mobile/` (Expo / React Native) で未着手の重要機能。本ドキュメントは
**実装計画とコード追加位置のみ** で、実装本体は別 PR。

## 5.1 Push 通知 (APNs / FCM)

### バックエンド側 (本リポジトリ)

```sql
-- Phase 1: device 登録テーブル
CREATE TABLE mobile_push_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL,
  user_id     uuid NOT NULL,
  -- Expo Push Token (https://exp.host/--/expo-push/<token>) を使うのが最短
  expo_token  text NOT NULL UNIQUE,
  platform    text NOT NULL CHECK (platform IN ('ios', 'android')),
  app_version text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
```

```
src/lib/push/expo.ts
  └─ sendExpoPush(tokens, payload) — withRetry でラップ
src/app/api/mobile/push/register/route.ts
  └─ 端末起動時にトークン登録
src/app/api/cron/push-pending/route.ts
  └─ outbox から push topic を拾って配信
```

### モバイル側 (apps/mobile)

```
apps/mobile/src/lib/push/registerPushToken.ts
  └─ expo-notifications で getExpoPushTokenAsync()
apps/mobile/app/(tabs)/_layout.tsx
  └─ 起動時に register
```

### 工数: **3 日**
- バックエンド: 1 日
- モバイル: 1 日
- 通知文面 + 動作確認: 1 日

## 5.2 生体認証 (Face ID / 指紋) ログイン保持

`expo-local-authentication` を使う。Supabase の refresh_token を端末の
SecureStore に保管し、起動時に Face ID 通過後に自動ログイン復元する。

```
apps/mobile/src/auth/biometric.ts
  ├─ saveRefreshTokenSecurely(token)  # expo-secure-store + biometricAuthentication: true
  ├─ promptBiometric()                 # localAuthentication.authenticateAsync()
  └─ restoreSession()                  # 起動時に呼ぶ
```

ユーザは設定画面で「生体認証でログイン保持」をオプトイン。

### 工数: **1 日**

## 5.3 オフライン施工写真撮影 → 復帰時同期

加盟店が圏外のフィールドで撮影 → 帰社後に自動同期。

```
apps/mobile/src/offline/queue.ts
  ├─ enqueueUpload(localUri, metadata)
  ├─ uploadAll() — NetInfo で online を検知して走らせる
  └─ retentionPolicy() — 30 日経過で本体削除 (端末容量保護)
```

データストアは `expo-sqlite` または `MMKV`。アップロードは
`/api/admin/certificates/photos/direct-upload` (発行済 endpoint) を流用。

### 残作業
- 同期失敗時の UI (再試行ボタン)
- アップロード進捗バー
- 端末再起動後の再開 (ServiceWorker 相当のバックグラウンドタスク登録)

### 工数: **4 日**

## まとめ

```
合計 ~8 営業日。本リポジトリ側で必要な変更:
  - mobile_push_tokens migration
  - src/lib/push/expo.ts
  - src/app/api/mobile/push/* (register / unregister)
  - src/app/api/cron/push-pending (outbox 連携)

apps/mobile の作業はネイティブ build → TestFlight 配布が必要なので
docs/mobile-distribution.md の手順 (前コミット) と組み合わせて進める。
```
