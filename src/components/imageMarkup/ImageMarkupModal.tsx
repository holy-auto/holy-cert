"use client";

/**
 * Phase 2: Image Markup の編集モーダル。
 *
 * - ImageMarkupEditor は SSR 不可。dynamic({ ssr: false }) でラップする。
 * - フォーカストラップと Esc クローズはここで実装し、Editor 側は描画に集中。
 *   既存の <Modal> は max-w-lg と狭く Konva Stage に合わないため、専用の
 *   フルスクリーン overlay を組む。
 */

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef } from "react";
import type { AnnotationDocument } from "./types";

const ImageMarkupEditor = dynamic(() => import("./ImageMarkupEditor"), { ssr: false });

type Props = {
  open: boolean;
  imageUrl: string;
  initial: AnnotationDocument | null;
  title?: string;
  onSave: (doc: AnnotationDocument) => void | Promise<void>;
  onClose: () => void;
};

export default function ImageMarkupModal({ open, imageUrl, initial, title, onSave, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);

  const handleSave = useCallback(
    async (doc: AnnotationDocument) => {
      await onSave(doc);
      onClose();
    },
    [onClose, onSave],
  );

  // body スクロール抑止 + Esc クローズ。
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4">
      <div className="absolute inset-0 bg-[var(--bg-overlay)] backdrop-blur-sm" aria-hidden="true" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? "画像注釈"}
        className="glass-card relative my-6 w-full max-w-[900px] p-5"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-primary">{title ?? "画像注釈"}</h2>
          <button onClick={onClose} className="btn-ghost p-1" aria-label="閉じる">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <ImageMarkupEditor imageUrl={imageUrl} initial={initial} onSave={handleSave} onCancel={onClose} />
      </div>
    </div>
  );
}
