# 動画ストリーミング Provider 抽象化

`academy_lessons` の動画再生は **provider-agnostic** に設計されています。
初期 provider は **Cloudflare Stream**、将来 **Mux** 等への移行は
バックフィルスクリプトのみで完了する構造です。

## アーキテクチャ

```
[管理画面] ─── upload-url ───▶ [provider API] ◀── direct upload (browser)
                                     │
                                  webhook
                                     ▼
                            [/api/webhooks/video/{provider}]
                                     │ update
                                     ▼
                  [Supabase: academy_lessons.video_*]
                                     │
                                     ▼
[受講者画面] ◀── HLS ─── [provider CDN] ◀── playback (受講者のブラウザ)
```

## DB スキーマ (`academy_lessons`)

| カラム | 内容 |
|--------|------|
| `video_provider` | `'cloudflare' \| 'mux' \| 'youtube' \| 'external' \| null` |
| `video_asset_id` | provider 内部 ID (CFS uid, Mux asset id) |
| `video_playback_id` | 公開再生 ID (CFS は uid と同じ、Mux は別) |
| `video_status` | `'pending' \| 'ready' \| 'errored' \| null` |
| `video_duration_sec` | 再生時間 (webhook で確定) |
| `video_provider_metadata` | provider 固有の付帯データ (jsonb) |
| `video_url` (legacy) | 旧形式の生 URL。新規発行では NULL |

## ファイル構成

```
src/lib/video/
├── types.ts                  VideoProvider interface, NormalizedWebhookEvent
├── provider.ts               getProvider(name) / getDefaultProvider()
├── cloudflareStream.ts       CFS 実装 (本番有効)
├── mux.ts                    Mux skeleton (NOT_IMPLEMENTED)
├── youtube.ts                YouTube unlisted pass-through
├── external.ts               生 URL pass-through (legacy)
└── resolveLessonPlayback.ts  lesson row → playback URL/thumbnail
```

## 環境変数

```bash
# Cloudflare Stream (初期 provider)
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_STREAM_API_TOKEN=...           # Stream:Edit 権限
CLOUDFLARE_STREAM_WEBHOOK_SECRET=...      # webhook 署名
CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN=videos.ledra.co.jp  # 任意 (custom domain)

# 切替時
DEFAULT_VIDEO_PROVIDER=mux                # 新規 lesson の保存先
MUX_TOKEN_ID=...
MUX_TOKEN_SECRET=...
MUX_WEBHOOK_SECRET=...
```

## アップロードフロー

1. **クライアント**: `POST /api/admin/academy/lessons/[id]/video/upload-url`
   ```json
   { "filename": "lesson-01.mp4", "max_duration_sec": 3600 }
   ```
2. **サーバ**: `getDefaultProvider().createDirectUpload()` を呼び、
   `academy_lessons` に `video_provider`, `video_asset_id`,
   `video_playback_id`, `video_status='pending'` を upsert
3. **クライアント**: 返却された `upload_url` に動画を **直接 PUT/tus**
   (オリジンを経由しない)
4. **provider**: ingest 完了で webhook を `/api/webhooks/video/{provider}`
   に POST
5. **サーバ**: 署名検証 → `video_status='ready'` + `video_duration_sec`
   を更新

## 受講側の playback 解決

API (`GET /api/admin/academy/lessons/[id]`) が `video` フィールドに
`{ provider, ready, playback_url, thumbnail_url, status, duration_sec }`
を返します。フロントは provider に依存しない、HLS 再生は HLS.js /
`<video>` (Safari ネイティブ) で OK。YouTube だけは `<iframe>`。

## Mux への移行

```
Phase 1: Mux 並走 (新規だけ Mux)
  ├─ src/lib/video/mux.ts の NOT_IMPLEMENTED を実装
  ├─ MUX_TOKEN_ID 等を env に設定
  └─ DEFAULT_VIDEO_PROVIDER=mux に切替
     → 新規アップロードのみ Mux に乗る、既存 lesson は CFS のまま

Phase 2: 既存 lesson の Mux 移行
  ├─ scripts/backfill-video-provider.ts (要実装):
  │    SELECT * FROM academy_lessons WHERE video_provider='cloudflare'
  │    for each: cfs.getDownloadUrl() → mux.createUploadFromUrl()
  │    成功時 academy_lessons.video_provider='mux', asset_id/playback_id 更新
  └─ webhook で video_status='ready' になるのを待ってから次へ

Phase 3: CFS 解約
  └─ video_provider='cloudflare' の行が 0 になったら CFS 契約解除
```

ユーザに見える機能変更は **無し**。差分は CDN 経路と analytics 仕様のみ。

## 残作業

- [ ] フロント側に `<LessonVideoPlayer>` コンポーネント
      (HLS / iframe を `provider` で切替)
- [ ] `pending` 状態の UI 反映 (進捗バー or 「処理中…」)
- [ ] CFS の signed playback URL (token mint API)
- [ ] webhook 失敗時のフォールバック cron
      (`provider.getAsset()` で reconcile)
- [ ] `scripts/backfill-video-provider.ts` (Phase 2 用)
- [ ] Mux SDK 配線 (`@mux/mux-node`) を `src/lib/video/mux.ts` に
- [ ] CFS の direct_upload TUS protocol 用クライアント例
      (`@uppy/tus` を推奨)
