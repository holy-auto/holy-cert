"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { grantAnalyticsConsent, revokeAnalyticsConsent } from "@/lib/marketing/analytics";

/**
 * Minimal consent banner.
 * Stores the choice in the `__ledra_consent` cookie for 365 days.
 * Shown once per browser until a choice is made.
 */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Sync with the browser cookie after hydration (avoids SSR/CSR mismatch).
    if (typeof document === "undefined") return;
    if (document.cookie.match(/__ledra_consent=(granted|denied)/)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: show banner only when no consent cookie is present
    setVisible(true);
  }, []);

  function persist(value: "granted" | "denied") {
    const oneYear = 60 * 60 * 24 * 365;
    document.cookie = `__ledra_consent=${value}; Max-Age=${oneYear}; Path=/; SameSite=Lax`;
    if (value === "granted") grantAnalyticsConsent();
    else revokeAnalyticsConsent();
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie の利用に関するお知らせ"
      className="fixed inset-x-3 bottom-3 z-[60] md:inset-x-auto md:right-6 md:bottom-6 md:max-w-md"
    >
      <div className="rounded-2xl border border-white/[0.08] bg-[#0b111c]/95 shadow-[0_10px_40px_rgba(0,0,0,0.5)] backdrop-blur-md p-5">
        <p className="text-sm leading-relaxed text-white/80">
          サイトの改善と利用状況の分析のため、Cookie を使用しています。
          詳細は{" "}
          <Link href="/privacy" className="underline hover:text-white">
            プライバシーポリシー
          </Link>
          {" "}をご覧ください。
        </p>
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => persist("granted")}
            className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-xs font-medium text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 shadow-[0_1px_12px_rgba(59,130,246,0.3)] transition-all"
          >
            同意する
          </button>
          <button
            type="button"
            onClick={() => persist("denied")}
            className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-xs font-medium text-white/70 border border-white/[0.12] hover:bg-white/[0.06] transition-colors"
          >
            必須のみ
          </button>
        </div>
      </div>
    </div>
  );
}
