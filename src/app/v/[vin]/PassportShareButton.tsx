"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

type Props = {
  vehicleLabel: string;
  vinCodeNormalized: string;
  anchoredCertCount: number;
};

// Web Share API support is client-only. useSyncExternalStore lets us read it
// without an effect-driven render, keeping the SSR snapshot deterministic
// (always "copy" label on the server) while letting the client upgrade the
// label after hydration without triggering lint's set-state-in-effect rule.
function subscribe() {
  return () => {};
}
function getShareSupportSnapshot(): boolean {
  return typeof navigator !== "undefined" && typeof (navigator as Navigator & { share?: unknown }).share === "function";
}
function getShareSupportServerSnapshot(): boolean {
  return false;
}

export default function PassportShareButton({ vehicleLabel, vinCodeNormalized, anchoredCertCount }: Props) {
  const shareSupported = useSyncExternalStore(subscribe, getShareSupportSnapshot, getShareSupportServerSnapshot);
  const [feedback, setFeedback] = useState<"idle" | "copied" | "shared" | "error">("idle");

  useEffect(() => {
    if (feedback === "idle") return;
    const t = setTimeout(() => setFeedback("idle"), 2000);
    return () => clearTimeout(t);
  }, [feedback]);

  const handleShare = useCallback(async () => {
    const url = typeof window === "undefined" ? "" : window.location.href;
    const title = vehicleLabel ? `${vehicleLabel} — Ledra 車両パスポート` : "Ledra 車両パスポート";
    const text = `${vehicleLabel || "車両"} (VIN: ${vinCodeNormalized}) のアンカー済み施工証明 ${anchoredCertCount}件。Polygon ネットワークで改ざん検知可能。`;

    if (shareSupported) {
      try {
        await navigator.share({ title, text, url });
        setFeedback("shared");
        return;
      } catch (e) {
        // User cancelled share — treat as no-op, no error UI needed.
        const name = (e as { name?: string } | null)?.name;
        if (name === "AbortError") {
          setFeedback("idle");
          return;
        }
        // Fall through to clipboard fallback below.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setFeedback("copied");
    } catch {
      setFeedback("error");
    }
  }, [vehicleLabel, vinCodeNormalized, anchoredCertCount, shareSupported]);

  const label =
    feedback === "copied"
      ? "URL をコピーしました"
      : feedback === "shared"
        ? "共有しました"
        : feedback === "error"
          ? "コピーに失敗しました"
          : shareSupported
            ? "このパスポートを共有"
            : "URL をコピー";

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-live="polite"
      className="inline-flex items-center gap-1.5 rounded-lg border border-border-default bg-surface px-3 py-1.5 text-xs font-medium text-secondary transition-colors hover:border-accent/50 hover:text-primary"
    >
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
        />
      </svg>
      {label}
    </button>
  );
}
