"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = {
  publicId: string;
  remaining: number;
  maxPhotos: number;
};

export default function CertImageUpload({ publicId, remaining, maxPhotos }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const toUpload = Array.from(files).slice(0, remaining);
    if (toUpload.length === 0) {
      setError("写真の上限に達しています。");
      return;
    }

    setError(null);
    setMessage(`アップロード中 (0/${toUpload.length})…`);

    startTransition(async () => {
      try {
        const form = new FormData();
        form.append("public_id", publicId);
        toUpload.forEach((f) => form.append("photos", f));
        const res = await fetch("/api/certificates/images/upload", {
          method: "POST",
          body: form,
        });
        const json = await res.json();
        if (!res.ok) {
          setMessage(null);
          setError(json?.message ?? json?.error ?? "アップロードに失敗しました。");
          return;
        }
        const uploaded = json?.uploaded ?? 0;
        setMessage(`${uploaded} 枚の写真を追加しました。`);
        router.refresh();
      } catch (e) {
        console.warn("upload error", e);
        setMessage(null);
        setError("アップロードに失敗しました。");
      } finally {
        setTimeout(() => setMessage(null), 3000);
      }
    });
  };

  const full = remaining <= 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          disabled={isPending || full}
          className="inline-flex items-center gap-2 rounded-lg border border-border-default bg-surface px-4 py-2 text-sm font-medium text-primary shadow-sm hover:bg-surface-hover hover:border-border-strong disabled:opacity-50"
        >
          カメラで撮影
        </button>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isPending || full}
          className="inline-flex items-center gap-2 rounded-lg border border-border-default bg-surface px-4 py-2 text-sm font-medium text-primary shadow-sm hover:bg-surface-hover hover:border-border-strong disabled:opacity-50"
        >
          {isPending ? "アップロード中…" : "写真を追加"}
        </button>
        <span className="text-xs text-muted">
          残り {Math.max(remaining, 0)} / {maxPhotos} 枚
        </span>
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        capture="environment"
        className="hidden"
        onChange={(e) => upload(e.target.files)}
        onClick={(e) => {
          (e.target as HTMLInputElement).value = "";
        }}
      />
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        multiple
        className="hidden"
        onChange={(e) => upload(e.target.files)}
        onClick={(e) => {
          (e.target as HTMLInputElement).value = "";
        }}
      />

      {message && (
        <div className="rounded-xl border border-accent/20 bg-accent-dim px-3 py-2 text-xs text-accent">{message}</div>
      )}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-danger">{error}</div>
      )}
    </div>
  );
}
