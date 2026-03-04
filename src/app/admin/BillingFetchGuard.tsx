"use client";

import { useEffect } from "react";

function redirectToBilling(billingUrl: string | null) {
  if (window.location.pathname.startsWith("/admin/billing")) return;

  const dest = new URL(billingUrl || "/admin/billing", window.location.origin);
  const ret = window.location.pathname + window.location.search;
  dest.searchParams.set("return", ret);

  window.location.href = dest.toString();
}

export default function BillingFetchGuard() {
  useEffect(() => {
    if ((window as any).__billingFetchGuardInstalled) return;
    (window as any).__billingFetchGuardInstalled = true;

    console.log("[billing-guard] installed");

    // --- fetch hook ---
    const origFetch = window.fetch.bind(window);
    window.fetch = async (input: any, init?: any) => {
      const res = await origFetch(input, init);

      try {
        const rawUrl = typeof input === "string" ? input : input?.url;
        if (!rawUrl) return res;

        const u = new URL(rawUrl, window.location.origin);
        if (u.origin !== window.location.origin) return res;
        if (!u.pathname.startsWith("/api/")) return res;

        if (res.status === 402 || res.status === 403) {
          let billingUrl: string | null = null;

          // header 優先（将来用）
          billingUrl = res.headers.get("x-billing-url");

          // なければ body（guard.ts の JSON）
          if (!billingUrl) {
            try {
              const j = await res.clone().json();
              billingUrl = j?.billing_url ?? null;
            } catch {}
          }

          redirectToBilling(billingUrl);
        }
      } catch {}

      return res;
    };

    // --- XHR hook (axios等対策) ---
    const OrigOpen = XMLHttpRequest.prototype.open;
    const OrigSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method: string, url: string, ...rest: any[]) {
      (this as any).__billing_guard_url = url;
      return OrigOpen.call(this, method, url, ...rest);
    };

    XMLHttpRequest.prototype.send = function (...args: any[]) {
      this.addEventListener("loadend", function () {
        try {
          const status = (this as any).status as number;
          if (status !== 402 && status !== 403) return;

          const rawUrl = (this as any).__billing_guard_url as string | undefined;
          if (!rawUrl) return;

          const u = new URL(rawUrl, window.location.origin);
          if (u.origin !== window.location.origin) return;
          if (!u.pathname.startsWith("/api/")) return;

          redirectToBilling("/admin/billing");
        } catch {}
      });

      return OrigSend.apply(this, args as any);
    };

    return () => {};
  }, []);

  return null;
}
