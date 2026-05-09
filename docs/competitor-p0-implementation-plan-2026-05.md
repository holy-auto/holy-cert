# P0 機能 詳細実装プラン (Shop-Ware/Tekmetric/Shopmonkey 競合分析より)

> 作成: 2026-05-09
> 関連: [`docs/competitor-analysis-2026-05.md`](./competitor-analysis-2026-05.md)
> 対象 P0: (1) 施工テンプレート (Canned Jobs) / (2) 写真 Image Markup / (3) インタラクティブ証明書ビュー
> 進め方: ステップごとに承認、3 機能を順次積み上げる。1 機能 = 独立 PR。

---

## 0. 全体方針

| | 機能 | 出典 | 工数目安 | 依存 |
|---|---|---|---|---|
| **Phase 1** | 施工テンプレート (Canned Jobs) | Shop-Ware / Shopmonkey | 3〜5 営業日 | なし (Quick Win) |
| **Phase 2** | 写真 Image Markup | Tekmetric Mobile | 8〜12 営業日 | Konva 導入、PDF 焼き込み |
| **Phase 3** | インタラクティブ証明書ビュー | Shop-Ware DVX | 10〜15 営業日 | Phase 2 の注釈データを活用 |

**統一原則**
- マルチテナント RLS は既存規約 (`certimg_select` 系) を踏襲し、新テーブルにも `tenant_id` 経由のポリシーを必ず設定。
- 公開ビュー (`/c/[public_id]`) は SSR、編集系は CSR 主導 (Konva は SSR 不可のため `dynamic(() => import(...), { ssr: false })`)。
- モバイル (`apps/mobile`) 連動は **Phase 2 まで後回し**。Phase 1 のテンプレ選択 API のみ早めに `/api/mobile/*` に拡張。
- テストは Vitest (unit) + Playwright (e2e、`e2e/`) で必須カバレッジを担保。各 PR で `pnpm test` / `pnpm exec tsc --noEmit` をグリーンに。

---

## Phase 1: 施工テンプレート (Canned Jobs)

### 1.1 ゴール
「セラミックコーティング Lv2 標準」「PPF フルボディ標準」のような**品目バンドル**を 1 クリックで案件・見積・証明書フォームに展開できるようにする。

### 1.2 現状整理

| 既存資産 | 場所 | 役割 | Canned Jobs として使えるか |
|---|---|---|---|
| `menu_items` テーブル | `supabase/migrations/20260314000001_enhance_documents.sql` | 単品 (品目マスタ): name, unit_price, tax_category, unit | ◎ そのまま流用 |
| `templates` テーブル (schema_json) | 同上 + 後続 | 証明書コンテンツのテンプレ | ✕ 別概念 (内容テンプレ) なので別軸で残す |
| `template_options` 系 | `20260318000002_template_options.sql` | プラットフォーム配信テンプレ (代理店マーケットプレイス) | ✕ 範囲が違う |
| `reservations.menu_items_json` (jsonb 配列) | core | 案件で選んだ品目スナップショット | ◎ ここに展開する |
| `MenuItemsClient.tsx` | `src/app/admin/menu-items/` | 品目 CRUD + CSV import | 〇 拡張先 |

→ **不足: 品目を束ねる「Service Package」(= Canned Job) の概念**

### 1.3 スキーマ追加 (新規 migration)

ファイル: `supabase/migrations/<新タイムスタンプ>_service_packages.sql`

```sql
-- 1) service_packages: 品目セット (Canned Jobs)
create table if not exists service_packages (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  name         text not null,
  category     text not null check (category in ('coating','ppf','detailing','maintenance','body_repair','general')),
  description  text,
  default_price_strategy text not null default 'sum_of_items'
    check (default_price_strategy in ('sum_of_items','fixed','manual')),
  fixed_price  numeric(12,2),
  sort_order   integer not null default 0,
  is_archived  boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index idx_service_packages_tenant on service_packages(tenant_id) where is_archived = false;

-- 2) service_package_items: パッケージ内の品目展開
create table if not exists service_package_items (
  id              uuid primary key default gen_random_uuid(),
  package_id      uuid not null references service_packages(id) on delete cascade,
  menu_item_id    uuid not null references menu_items(id) on delete restrict,
  quantity        numeric(10,2) not null default 1,
  sort_order      integer not null default 0,
  note            text
);
create unique index uniq_pkg_menu on service_package_items(package_id, menu_item_id);

-- 3) RLS
alter table service_packages enable row level security;
alter table service_package_items enable row level security;

create policy svc_pkg_select on service_packages for select
  using (tenant_id = auth_tenant_id());
create policy svc_pkg_modify on service_packages for all
  using (tenant_id = auth_tenant_id())
  with check (tenant_id = auth_tenant_id());

create policy svc_pkg_items_select on service_package_items for select
  using (exists (select 1 from service_packages p
                 where p.id = service_package_items.package_id
                   and p.tenant_id = auth_tenant_id()));
create policy svc_pkg_items_modify on service_package_items for all
  using (exists (select 1 from service_packages p
                 where p.id = service_package_items.package_id
                   and p.tenant_id = auth_tenant_id()))
  with check (exists (select 1 from service_packages p
                      where p.id = service_package_items.package_id
                        and p.tenant_id = auth_tenant_id()));
```

> **要確認**: 既存 RLS で使われているテナント取得関数の正確な名前 (`auth_tenant_id()` か `current_tenant_id()` か) — 隣接 migration を参照して合わせる。

### 1.4 API 追加

| Method | Path | 実装ファイル | 用途 |
|---|---|---|---|
| GET | `/api/admin/service-packages` | `src/app/api/admin/service-packages/route.ts` | 一覧 (category フィルタ対応) |
| POST | `/api/admin/service-packages` | 同上 | 作成 (items を同一トランザクションで投入) |
| GET | `/api/admin/service-packages/[id]` | `[id]/route.ts` | 詳細 + items |
| PATCH | `/api/admin/service-packages/[id]` | 同上 | 編集 (items は差分マージ) |
| DELETE | `/api/admin/service-packages/[id]` | 同上 | 論理削除 (`is_archived = true`) |
| POST | `/api/admin/service-packages/[id]/expand` | `[id]/expand/route.ts` | 展開: items[] と合計 price を返す (案件/証明書フロー側で使用) |

モバイル経由でも参照したいので **GET と /expand のみ** `/api/mobile/service-packages` にも薄ラップを置く。

### 1.5 UI 追加・改修

#### 1.5.1 新規: `/admin/service-packages` 一覧 + 編集
- ファイル:
  - `src/app/admin/service-packages/page.tsx`
  - `src/app/admin/service-packages/ServicePackagesClient.tsx`
  - `src/app/admin/service-packages/[id]/page.tsx` (編集)
  - `src/app/admin/service-packages/[id]/PackageEditor.tsx` (品目ピッカー)
- 機能:
  - カテゴリ別グルーピング (coating/ppf/...)
  - DnD で品目並び替え (`@dnd-kit/core` は既存依存にあれば利用、無ければ最小実装で OK)
  - 既存 `menu_items` から検索ピッカー (Combobox)
  - 合計金額のリアルタイム計算プレビュー
  - 「複製」「アーカイブ」ボタン

#### 1.5.2 改修: 案件 (`/admin/jobs/[id]`) でパッケージ適用
- 触るファイル: `src/app/admin/jobs/[id]/JobDetailTabs.tsx`、`StorefrontJobWorkflow.tsx`、`types.ts`
- 「品目を追加」ボタン横に **「パッケージから適用」ドロップダウン**
- 選択 → `/api/admin/service-packages/[id]/expand` を fetch → `menu_items_json` に append (既存項目は保持してマージ、ユーザーが残量を編集可能)
- スナップショットルール: 適用時の単価を menu_items から **コピー** して `menu_items_json` に展開 (後で価格改定があってもジョブ単位で固定)。

#### 1.5.3 改修: 証明書発行 (`/admin/certificates/new`) で「テンプレ＋パッケージ」を 1 アクションで適用
- 触るファイル: `CertNewFormWrapper.tsx`
- 既存の **コンテンツテンプレ (`templates`)** はそのまま。新たに **パッケージ選択** UI を追加し、選択時:
  - コンテンツテンプレが未指定なら、そのカテゴリの「推奨テンプレ」を自動選択
  - 案件 (もし紐づいていれば) `menu_items_json` に展開済みなら省略
- メリット: 「Lv2 標準セット」を選ぶだけで料金 + 内容テンプレが揃う。

#### 1.5.4 改修: `/admin/menu-items` → 「このメニューを使うパッケージ」逆引き表示
- 削除/価格改定の影響範囲を可視化。

### 1.6 テスト
- Vitest:
  - `src/lib/service-packages/expand.test.ts`: `expand()` の合計計算、空パッケージ、アーカイブ品目除外。
  - RLS 越境テスト (別テナントの package を読めないこと)。
- Playwright e2e (`e2e/`):
  - 「パッケージ作成 → 案件で適用 → menu_items_json に正しい行が入ること」のシナリオ 1 本。
- 型チェック: `pnpm exec tsc --noEmit`。

### 1.7 データ移行 (任意)
- 既存テナントに対して、よく使われている `menu_items` の組み合わせ Top 5 を集計し、運用チームが「初期パッケージ」を投入できる SQL をスクリプト化 (`scripts/seed-default-packages.ts`)。一斉投入は **デフォルト OFF**、テナント設定画面でオプトイン。

### 1.8 ロールアウト
1. PR-A: スキーマ + API + 単体テスト
2. PR-B: 管理 UI (`/admin/service-packages`) + 案件側 UI 改修
3. PR-C: 証明書発行 UI 改修 + e2e
4. リリースノート + テナント向け使い方ページ (`/(marketing)/blog/...`) 起案

### 1.9 リスク
- 既存 `templates` (コンテンツテンプレ) と概念が紛らわしい → ドキュメントとラベルで「品目セット (Service Package)」と明示
- `menu_items_json` のスナップショット仕様が既に存在するので、二重展開しないよう適用時に既存 menu_item_id を重複チェック

---

## Phase 2: 写真 Image Markup

### 2.1 ゴール
証明書発行フロー・案件フローの写真に**矢印・矩形・円・テキスト・自由線**で注釈し、保存・公開・PDF まで一気通貫で反映する。

### 2.2 現状整理

| 既存資産 | 場所 | 状態 |
|---|---|---|
| `certificate_images` | `20260313020000_core_tables.sql` | annotations カラムなし |
| `PhotoUploadSection.tsx` | `src/app/admin/certificates/new/` | アップロードのみ |
| `src/app/api/certificates/images/upload/route.ts` | EXIF strip / SHA256 / 知覚ハッシュ / 真正性グレード | 注釈レイヤーなし |
| `sharp@^0.34.5`, `exifr@^7.1.3` | `package.json` | サーバ側で SVG 焼き込みに使用可能 |
| `pdfCertificate.tsx` | `src/lib/` | @react-pdf/renderer。注釈は受け付けていない |
| Konva / Fabric | — | **未導入** |
| `apps/mobile` | Expo + RN | 注釈 UI なし、本フェーズはスコープ外 |

### 2.3 スキーマ追加

ファイル: `supabase/migrations/<タイムスタンプ>_certificate_image_annotations.sql`

```sql
-- 1) annotations を画像行にぶら下げる
alter table certificate_images
  add column if not exists annotations jsonb,
  add column if not exists annotated_at timestamptz,
  add column if not exists annotated_by uuid references auth.users(id);

-- 2) 焼き込み済み派生画像の保存先 (公開時はこちらを優先)
alter table certificate_images
  add column if not exists rendered_storage_path text,
  add column if not exists rendered_at timestamptz;

create index if not exists idx_certimg_annotated
  on certificate_images (certificate_id) where annotations is not null;
```

**JSON フォーマット (固定スキーマ)**
```ts
type Annotation =
  | { id: string; type: 'arrow';   x1: number; y1: number; x2: number; y2: number; stroke: string; width: number }
  | { id: string; type: 'rect';    x: number; y: number; w: number; h: number; stroke: string; width: number; fill?: string }
  | { id: string; type: 'circle';  cx: number; cy: number; r: number; stroke: string; width: number; fill?: string }
  | { id: string; type: 'text';    x: number; y: number; text: string; size: number; color: string }
  | { id: string; type: 'path';    points: Array<[number, number]>; stroke: string; width: number };

type AnnotationsDoc = {
  version: 1;
  source: { width: number; height: number };  // 編集時の論理キャンバス座標系
  items: Annotation[];
};
```
> 座標は **元画像のピクセル空間** で保存する。表示側で実画像サイズに合わせて拡縮する設計。

### 2.4 ライブラリ選定

| 候補 | 採否 | 理由 |
|---|---|---|
| **Konva + react-konva** | ✅ 採用 | API がシンプル、SSR 不可だが client-only 利用で問題なし。バンドルサイズも妥当。 |
| Fabric.js | △ | 機能は豊富だが TypeScript 型と React 連携が薄い |
| tldraw | ✕ | 過剰機能 (描画ツール群)、ライセンス重め |
| Excalidraw | ✕ | ホワイトボード向きで写真注釈と相性悪い |

**追加依存** (`package.json`):
```
"konva": "^9.3.16",
"react-konva": "^18.2.10"
```

### 2.5 API 追加

| Method | Path | 実装 |
|---|---|---|
| PUT | `/api/certificates/images/[id]/annotations` | annotations JSON を保存。RLS は `certimg_*` ポリシーを継承。 |
| POST | `/api/certificates/images/[id]/render` | sharp + svg-overlay で焼き込み、`rendered_storage_path` を更新。バックグラウンド可。 |

焼き込み実装 (要点):
```ts
// src/lib/imageMarkup/render.ts
import sharp from 'sharp';
import { annotationsToSvg } from './toSvg';
export async function renderAnnotated(originalBuf: Buffer, doc: AnnotationsDoc) {
  const svg = annotationsToSvg(doc);
  return sharp(originalBuf)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .jpeg({ quality: 90 })
    .toBuffer();
}
```
**理由**: PDF (react-pdf) は SVG 直接合成が弱いので、サーバで先に焼き込んだ JPEG を `pdfCertificate.tsx` に渡す。公開 Web ビューでは原画像 + SVG オーバーレイでクリッカブルに保つ二系統運用。

### 2.6 UI 追加・改修

#### 2.6.1 新規: `ImageMarkupEditor`
- ファイル:
  - `src/components/imageMarkup/ImageMarkupEditor.tsx` (Konva ステージ、SSR 不可なので親で `dynamic(..., { ssr: false })`)
  - `src/components/imageMarkup/Toolbar.tsx` (色/太さ/ツール選択)
  - `src/components/imageMarkup/types.ts` (上記 `Annotation` 定義)
  - `src/lib/imageMarkup/toSvg.ts` (annotations → SVG 文字列)
- 操作:
  - 矢印 / 矩形 / 円 / テキスト / 自由線 / 消しゴム
  - Undo/Redo (ローカルスタック、保存後リセット)
  - 「保存」「焼き込み生成」「破棄」
- パフォーマンス: 画像は表示用にダウンスケール、座標保存時に元画像比に再投影。

#### 2.6.2 改修: `PhotoUploadSection.tsx`
- 各画像サムネに「注釈」アイコンを追加 → モーダルで Editor を開く
- 注釈ありの画像は**バッジ表示** + 数

#### 2.6.3 改修: `/c/[public_id]/page.tsx` 公開ビュー
- 画像表示部 (現在 `<img>`) を `<AnnotatedImage>` コンポーネントに置換
- annotations があれば SVG オーバーレイで重ねる
- `prefers-reduced-motion` 配慮 (アニメ無し)

#### 2.6.4 改修: PDF (`src/lib/pdfCertificate.tsx`)
- `rendered_storage_path` を優先的に読み込む (なければ原画像)
- 画像が大きい場合の最大幅制限は既存ルールを踏襲

### 2.7 セキュリティ・整合性

- 既存の `EXIF strip / SHA256 / authenticityGrade` を**注釈追加後の派生画像にも再計算しない** (オリジナルが真正性の根拠)。
- Polygon アンカリング (`src/lib/anchoring/`) は **オリジナル画像ハッシュをアンカー**するルールを維持。注釈はメタとして独立保存。
- 公開ビューの注釈データは Server Component で読み込み、未認証ユーザーが API を叩いても書き換えられないこと (RLS で write を阻止) を e2e で検証。

### 2.8 テスト
- Vitest:
  - `toSvg.test.ts`: 各 annotation 型 → SVG の生成
  - `render.test.ts`: sharp 合成のスナップショット
- Playwright:
  - 「注釈追加 → 保存 → 公開ビューで注釈が見える → PDF DL に注釈が焼き込まれている」
- a11y: ツールバーをキーボード操作可能にする (Tab/Enter)。

### 2.9 ロールアウト
1. PR-A: スキーマ + API + Konva 導入 + 単体
2. PR-B: Editor UI + PhotoUploadSection 改修
3. PR-C: 公開ビュー反映 + PDF 反映 + e2e
4. PR-D (任意): 焼き込み非同期化 (ジョブキュー化)

### 2.10 リスク
- Konva は SSR 不可 → 動的インポート徹底。`apps/mobile` (RN) では Konva 使えない → モバイル注釈は将来 Phase で `react-native-skia` を別実装。
- 大きな画像でのパフォーマンス → アップロード時に長辺 4096px までリサイズ済みであることを再確認 (現行 `upload/route.ts` の挙動を要確認)。

---

## Phase 3: インタラクティブ証明書ビュー (DVX 風)

### 3.1 ゴール
`/c/[public_id]` を**動画 / Before-After スライダー / イベントタイムライン**を備えたリッチビューに進化させ、Shop-Ware DVX が標榜する「承認率 89%」相当の体験を提供する。
**360° パノラマは初版スコープ外** (将来拡張)。スキーマにはプレースホルダだけ残す。

### 3.2 現状整理 (重要箇所のみ)

- `/c/[public_id]/page.tsx`:
  - 542 行目に「添付画像」セクション、`<img>` グリッドのみ。
  - 584 行目に「履歴」セクション、`vehicle_histories` のみ表示。
- `certificate_images` は image 専用 (`content_type` カラムはあるが video を許可していない)。
- Remotion (`remotion/`) は別軸 (動画レンダ) で本ゴールには不要。

### 3.3 スキーマ追加

新メディア種別を扱うため、`certificate_images` を拡張せず**新テーブル**を作る (画像の RLS 等を変えずに済む):

ファイル: `supabase/migrations/<タイムスタンプ>_certificate_media.sql`

```sql
create table if not exists certificate_media (
  id              uuid primary key default gen_random_uuid(),
  certificate_id  uuid not null references certificates(id) on delete cascade,
  media_type      text not null check (media_type in ('video','before_after','panorama360')),
  -- 初版実装は 'video' / 'before_after' のみ。'panorama360' は将来拡張用にスキーマに残す。
  storage_path    text not null,            -- video / "after" image (将来 panorama)
  before_path     text,                     -- before_after 専用
  poster_path     text,                     -- video の poster
  duration_ms     integer,
  width           integer,
  height          integer,
  caption         text,
  sort_order      integer not null default 0,
  content_type    text,
  file_size       bigint default 0,
  created_at      timestamptz not null default now()
);

create index idx_certmedia_cert on certificate_media(certificate_id);

alter table certificate_media enable row level security;

-- 既存 certimg_* と同等のポリシーを踏襲 (parent certificate の tenant をチェック)
create policy certmedia_select on certificate_media for select
  using (exists (select 1 from certificates c
                 where c.id = certificate_media.certificate_id
                   and c.tenant_id = auth_tenant_id()));
create policy certmedia_modify on certificate_media for all
  using (exists (select 1 from certificates c
                 where c.id = certificate_media.certificate_id
                   and c.tenant_id = auth_tenant_id()))
  with check (exists (select 1 from certificates c
                      where c.id = certificate_media.certificate_id
                        and c.tenant_id = auth_tenant_id()));
```

> Storage バケットは `certificate-attachments` を流用 (既存)。サイズ制限と MIME 許可リストはアップロード API で更新。

### 3.4 ライブラリ選定

| 用途 | 採用 |
|---|---|
| Before/After スライダー | **自前実装** (range input + clip-path)。依存追加せず。 |
| 動画 | ネイティブ `<video controls poster>` + HLS は不要 (短尺前提)。 |
| ~~360° パノラマ~~ | 初版スコープ外。将来 `@photo-sphere-viewer/core` 等を検討。 |

### 3.5 API 追加・改修

| Method | Path | 実装 |
|---|---|---|
| POST | `/api/certificates/[id]/media` | 多種 media のアップロード (multipart)。MIME 厳格チェック (video/mp4, video/quicktime, image/jpeg, image/png)。 |
| DELETE | `/api/certificates/media/[id]` | 削除 |
| GET (公開) | `/api/public/certificates/[public_id]/media` | 公開取得。`/c/[public_id]/page.tsx` 内で直接 supabase 経由でも可。 |

`/api/public/verify/route.ts` 系の既存ルートと整合させる。

### 3.6 UI 改修

#### 3.6.1 公開ビューの分割
肥大化を避けるため `/c/[public_id]/page.tsx` の**「添付画像」「履歴」セクションをコンポーネントに分割**:

新規:
- `src/app/c/[public_id]/MediaGallery.tsx` — 画像 + 動画 + Before/After を **1 つのギャラリー**として束ねる
- `src/app/c/[public_id]/UnifiedTimeline.tsx` — vehicle_histories + certificate events + reservations を時系列に統合 (`ServiceTimeline` ロジックを公開向けに簡素化)
- `src/app/c/[public_id]/BeforeAfterSlider.tsx` (自前実装、依存追加なし)
- `src/app/c/[public_id]/CertificateVideo.tsx`
- ~~`PanoramaViewer.tsx`~~ — 初版スコープ外

#### 3.6.2 タイムライン
管理側に既にある `ServiceTimeline` の概念 (FEATURES.md 65 行目以降) を**公開向けに匿名化して再利用**:
- 表示: 来店 → 作業開始 → 完了 → 証明書発行 → NFC 書込 → 過去施工 (車両単位)
- 顧客名は `maskName()` (既存) 適用
- アイコンは Tailwind + 既存 SVG セット

#### 3.6.3 編集側 (`/admin/certificates/[public_id]` / `new`)
- 「メディアを追加」ドロップダウン: 画像 / 動画 / Before-After ペア (360 は将来)
- Before-After は **2 枚を 1 つのレコードとして** UI 上で扱う (DB は `before_path` + `storage_path`)
- 既存 `PhotoUploadSection.tsx` を **`MediaUploadSection.tsx` にリネームせず**、隣接コンポーネント `MediaUploadSection.tsx` を新設して両立 (既存挙動は保つ)

### 3.7 PDF / モバイルでの扱い
- PDF: 動画は PDF に焼けないので、**ポスター画像 + QR (公開 URL)** を載せる仕様にする。Before/After は 2 枚並列でレイアウト。`pdfCertificate.tsx` を改修。
- モバイル (`apps/mobile`): **Phase 1〜3 すべての Web 実装が完了してから着手** (確定方針)。公開 URL を WebView で開く暫定経路は許容。

### 3.8 パフォーマンス・配信
- 動画は Supabase Storage 直配信で十分 (短尺前提)。長尺になる場合は CDN / HLS を将来検討。
- 公開ページの Lighthouse スコア低下を避けるため、動画は **インタラクション後に load** (poster 表示 → クリックで再生)。

### 3.9 テスト
- Vitest:
  - `MediaGallery.test.tsx`: 3 種混在 (画像 + 動画 + Before/After) のソート・空ケース
  - `BeforeAfterSlider.test.tsx`: range / clip-path 値の境界
  - `UnifiedTimeline.test.tsx`: マージ・並び替え・名前マスク
- Playwright:
  - 「動画 + Before/After のメディアを発行 → 公開 URL でそれぞれ表示・操作」
- a11y: 動画にキャプション (caption カラム) を載せる、`<video>` に `<track>` 任意。Before/After スライダーはキーボード (←/→) で操作可能に。

### 3.10 ロールアウト
1. PR-A: スキーマ + アップロード API
2. PR-B: 公開ビュー分割 + MediaGallery + 動画
3. PR-C: Before/After スライダー (自前)
4. PR-D: 統合タイムライン + PDF QR 連携
5. PR-E (任意): Phase 2 の Image Markup を写真メディアに統合適用

### 3.11 リスク
- 動画ストレージコスト → テナントプランごとに容量上限を設ける (P1 「Add-on モデル」と連動するためここでは設計のみ)。
- 動画自動再生による帯域消費 → poster + クリック再生で抑制。

---

## 4. 横断: 共通の運用事項

### 4.1 ブランチ戦略
- 本ドキュメント: `claude/ledra-feature-implementation-hKI9C` (作業ブランチ)
- 各 PR は機能・フェーズごとに分けて main へマージ
- データベース migration はタイムスタンプ衝突回避のため、PR 着手直前に最終リネーム

### 4.2 観測
- Sentry (`sentry.*.config.ts`) で新 API のエラーレートを監視
- 公開ビューの新コンポーネントは Web Vitals を計測 (instrumentation-client.ts に既存の仕組みあれば追加)

### 4.3 ドキュメント更新
各フェーズ完了時に以下を更新:
- `FEATURES.md` 12.3 ロードマップの該当行を「実装済み」に
- `README.md` の機能一覧
- 必要に応じて `(marketing)/blog/` に告知記事

### 4.4 国際化
日本語固定で着手 (現行 `messages/` 構造に合わせる)。英語化は別タスク。

---

## 5. 確定事項 (2026-05-09 合意)

| # | 論点 | 決定 |
|---|---|---|
| 1 | Phase 1 スキーマ命名 | **`service_packages` / `service_package_items` で確定** |
| 2 | Phase 2 ライブラリ | **Konva + react-konva で確定** |
| 3 | Phase 3 Before/After | **自前実装 (range input + clip-path)、依存追加なし** |
| 4 | Phase 3 360° パノラマ | **初版スコープ外** (将来拡張)。スキーマの media_type CHECK にはプレースホルダだけ残す |
| 5 | モバイル統合タイミング | **Web 完成後に着手**。Phase 1〜3 のモバイル API ラッピングは後フェーズ |

---

## 6. 出力物まとめ

| 機能 | 新規ファイル数 (概算) | 改修ファイル数 (概算) | Migration |
|---|---|---|---|
| Phase 1 Canned Jobs | 8 | 5 | 1 |
| Phase 2 Image Markup | 6 | 4 | 1 |
| Phase 3 Interactive View | 6 | 4 | 1 |

合計: 新規 20 / 改修 13 / migration 3。3 機能合わせて **概ね 4〜6 週** (1 人月相当) のスコープ。
※ Phase 3 から `PanoramaViewer.tsx` を除外したため新規 -1。
