"use client";

/**
 * Phase 2: 既存 certificate_image 単位での「注釈を編集」ボタン。
 *
 * 用法 (cert 詳細ページ):
 *   <AnnotateExistingImageButton imageId={img.id} imageUrl={img.url} initial={img.annotations} />
 *
 * 仕様:
 *   - クリック → ImageMarkupModal が開く
 *   - 保存 → PUT /api/certificates/images/[id]/annotations
 *   - その後 POST /api/certificates/images/[id]/render で焼き込み画像を生成
 *   - 完了後 router.refresh() で最新表示にする
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ImageMarkupModal from "./ImageMarkupModal";
import type { AnnotationDocument } from "./types";

type Props = {
  imageId: string;
  imageUrl: string;
  initial?: AnnotationDocument | null;
  fileName?: string | null;
  /** ボタンの見た目を icon のみにしたい場合 true。デフォルトはラベル付き。 */
  iconOnly?: boolean;
};

export default function AnnotateExistingImageButton({
  imageId,
  imageUrl,
  initial = null,
  fileName,
  iconOnly = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSave = async (doc: AnnotationDocument) => {
    setError(null);
    // 1) 注釈を保存
    const putRes = await fetch(`/api/certificates/images/${encodeURIComponent(imageId)}/annotations`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ annotations: doc.annotations.length === 0 ? null : doc }),
    });
    if (!putRes.ok) {
      const body = await putRes.json().catch(() => null);
      setError(body?.message ?? "注釈の保存に失敗しました。");
      throw new Error("annotations PUT failed");
    }

    // 2) 注釈が空でないなら焼き込みも実行 (失敗しても致命的ではないので警告に留める)。
    if (doc.annotations.length > 0) {
      try {
        const renderRes = await fetch(`/api/certificates/images/${encodeURIComponent(imageId)}/render`, {
          method: "POST",
        });
        if (!renderRes.ok) {
          console.warn("[markup] render failed", await renderRes.text());
        }
      } catch (e) {
        console.warn("[markup] render exception", e);
      }
    }

    // 3) UI を最新化
    startTransition(() => router.refresh());
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={isPending}
        className="inline-flex items-center gap-1 rounded-lg border border-border-default bg-surface px-3 py-1.5 text-xs font-medium text-secondary hover:bg-surface-hover hover:border-border-strong"
        aria-label={`${fileName ?? "画像"} に注釈を追加`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path
            d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897l11.682-11.682Z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {iconOnly ? null : <span>{initial && initial.annotations.length > 0 ? "注釈を編集" : "注釈を追加"}</span>}
      </button>

      {error ? <div className="text-xs text-error mt-1">{error}</div> : null}

      <ImageMarkupModal
        open={open}
        imageUrl={imageUrl}
        initial={initial ?? null}
        title={fileName ?? "画像注釈"}
        onSave={handleSave}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
