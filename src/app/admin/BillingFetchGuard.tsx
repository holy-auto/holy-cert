"use client";

import { useEffect } from "react";

export default function BillingFetchGuard() {
  useEffect(() => {
    const orig = window.fetch.bind(window);

    // 2重適用防止
    if ((window as any).__billingFetchGuardInstalled) return;
    (window as any).__billingFetchGuardInstalled = true;

    window.fetch = async (input: any, init?: any) => {
      const res = await orig(input, init);

      try {
        // /admin/billing 自体ではリダイレクトしない（ループ防止）
        if (window.location.pathname.startsWith("/admin/billing")) return res;

        const rawUrl = typeof input === "string" ? input : input?.url;
        if (!rawUrl) return res;

        const u = new URL(rawUrl, window.location.origin);

        // 同一オリジン & /api/* のみ対象
        if (u.origin !== window.location.origin) return res;
        if (!u.pathname.startsWith("/api/")) return res;

        if (res.status === 402 || res.status === 403) {
          // 可能なら billing_url を読む（guard.ts の JSON）
          let billingUrl = "/admin/billing";
          try {
            const j = await res.clone().json();
            if (j?.billing_url) billingUrl = j.billing_url;
          } catch {}

          // return 付きで請求画面へ
          const ret = window.location.pathname + window.location.search;
          const dest = new URL(billingUrl, window.location.origin);
          dest.searchParams.set("return", ret);

          window.location.href = dest.toString();
        }
      } catch {
        // 失敗しても元のresは返す
      }

      return res;
    };

    return () => {
      // 解除はしない（admin UI 全体で統一挙動にする）
    };
  }, []);

  return null;
}
