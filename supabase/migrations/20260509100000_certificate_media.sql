-- =============================================================================
-- certificate_media: 動画 / Before-After スライダー / (将来用) 360°パノラマ を
-- 1 枚の証明書に紐づけるためのテーブル。
--
-- - certificate_images は静止画専用 (JPEG/PNG/WebP/HEIC)。本テーブルは
--   インタラクティブメディア (Phase 3 「インタラクティブ証明書ビュー」) を
--   別レコードで扱うことで、既存の認証性グレード/ハッシュ計算系を巻き込まず、
--   公開ページ /c/[public_id] のメディアギャラリーで合算表示する。
-- - media_type: 'video' | 'before_after' | 'panorama360'
--   panorama360 は将来用プレースホルダ (Phase 3 初版では未実装)。
-- - storage_path: 主たるメディアの Storage パス
--     video: 動画ファイル (mp4 / mov)
--     before_after: After 画像
--     panorama360: パノラマ画像 (将来)
-- - before_path: Before 画像 (before_after のみ)
-- - poster_path: 動画のポスター画像 (video のみ)
-- - duration_ms / width / height: 動画やメディアの寸法情報 (任意)
-- - caption: 公開ページ表示用キャプション (a11y も兼ねる)
-- - sort_order: certificate_images とは独立の並び (0 始まり)
-- =============================================================================

-- before_after は 2 枚 (storage_path = After, before_path = Before) を要求する。
-- video は poster_path 推奨 (public 表示で初期描画用)。スキーマレベルでは緩く
-- 強制し、必須化はアプリ層の MIME 検証で行う。CREATE TABLE 内に inline する
-- ことで ACCESS EXCLUSIVE ロックを伴う後付け CHECK を避ける。
create table if not exists certificate_media (
  id              uuid primary key default gen_random_uuid(),
  certificate_id  uuid not null references certificates (id) on delete cascade,
  tenant_id       uuid not null references tenants (id) on delete cascade,
  media_type      text not null
                    check (media_type in ('video','before_after','panorama360')),
  storage_path    text not null,
  before_path     text,
  poster_path     text,
  duration_ms     integer,
  width           integer,
  height          integer,
  caption         text,
  sort_order      integer not null default 0,
  content_type    text,
  file_size       bigint default 0,
  created_at      timestamptz not null default now(),
  constraint certmedia_before_after_requires_before
    check (media_type <> 'before_after' or before_path is not null)
);

create index if not exists idx_certmedia_cert on certificate_media (certificate_id);
create index if not exists idx_certmedia_tenant on certificate_media (tenant_id);
create index if not exists idx_certmedia_cert_sort on certificate_media (certificate_id, sort_order);

-- =============================================================================
-- RLS: certificate_images と同じく、親 certificate の tenant に所属するユーザのみ
-- read / insert / update / delete 可能。公開ページからは service-role 経由で読む。
-- =============================================================================
alter table certificate_media enable row level security;

create policy "certmedia_select" on certificate_media
  for select using (
    tenant_id in (select my_tenant_ids())
  );

create policy "certmedia_insert" on certificate_media
  for insert with check (
    tenant_id in (select my_tenant_ids())
    and certificate_id in (
      select id from certificates where tenant_id in (select my_tenant_ids())
    )
  );

create policy "certmedia_update" on certificate_media
  for update using (
    tenant_id in (select my_tenant_ids())
  );

create policy "certmedia_delete" on certificate_media
  for delete using (
    tenant_id in (select my_tenant_ids())
  );
