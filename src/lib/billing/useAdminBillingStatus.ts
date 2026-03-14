"use client";

import { useEffect, useState } from "react";

export type AdminBillingStatus = {
  tenant_id: string;
  tenant_name?: string | null;
  plan_tier: string;
  is_active: boolean;
};

const CACHE_KEY = "admin_billing_status";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(): AdminBillingStatus | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    return data as AdminBillingStatus;
  } catch {
    return null;
  }
}

function setCache(data: AdminBillingStatus) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch {}
}

export function useAdminBillingStatus({ redirectOnInactive = false }: { redirectOnInactive?: boolean } = {}) {
  const [data, setData] = useState<AdminBillingStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const cached = getCached();
    if (cached) {
      setData(cached);
      setLoading(false);
      // Redirect if inactive (replaces BillingGate)
      if (redirectOnInactive && cached.is_active === false) {
        redirectToBilling();
      }
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/admin/billing-status", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const j = (await res.json()) as AdminBillingStatus;
        if (alive) {
          setData(j);
          setCache(j);
          // Redirect if inactive (replaces BillingGate)
          if (redirectOnInactive && j.is_active === false) {
            redirectToBilling();
          }
        }
      } catch {
        // 失敗時は null のまま（UIは従来どおり表示、API側で止まる）
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [redirectOnInactive]);

  return { data, loading };
}

function redirectToBilling() {
  if (typeof window === "undefined") return;
  if (window.location.pathname.startsWith("/admin/billing")) return;
  const ret = window.location.pathname + window.location.search;
  const dest = new URL("/admin/billing", window.location.origin);
  dest.searchParams.set("reason", "inactive");
  dest.searchParams.set("return", ret);
  window.location.replace(dest.toString());
}
