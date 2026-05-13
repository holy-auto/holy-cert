"use client";

import { useCallback, useEffect, useState } from "react";
import type { Role } from "./roles";
import { normalizeRole } from "./roles";
import { hasPermission, type Permission } from "./permissions";
import { isKnownAddonKey, type AddonKey } from "@/lib/billing/addons";

type MeData = {
  user_id: string;
  email: string;
  tenant_id: string;
  tenant_name: string | null;
  plan_tier: string;
  role: Role;
  enabled_addons: AddonKey[];
};

let cachedData: MeData | null = null;
let fetchPromise: Promise<MeData | null> | null = null;

async function fetchMe(): Promise<MeData | null> {
  try {
    const res = await fetch("/api/admin/me", { cache: "no-store" });
    if (!res.ok) return null;
    const j = await res.json();
    // Defensive parse: the API may not yet include enabled_addons on a
    // server still running pre-deploy code, so filter to known keys and
    // default to an empty array.
    const rawAddons = Array.isArray(j.enabled_addons) ? (j.enabled_addons as unknown[]) : [];
    const enabled_addons = rawAddons.filter((v): v is AddonKey => typeof v === "string" && isKnownAddonKey(v));
    return { ...j, role: normalizeRole(j.role), enabled_addons };
  } catch {
    return null;
  }
}

/**
 * Client hook to get the current user's role and permissions.
 * Caches the result for the session.
 */
export function useCurrentRole() {
  const [data, setData] = useState<MeData | null>(cachedData);
  const [loading, setLoading] = useState(!cachedData);

  const refresh = useCallback(async () => {
    if (!fetchPromise) {
      fetchPromise = fetchMe();
    }
    const result = await fetchPromise;
    fetchPromise = null;
    cachedData = result;
    setData(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!cachedData) refresh();
  }, [refresh]);

  const can = useCallback(
    (permission: Permission): boolean => {
      if (!data) return false;
      return hasPermission(data.role, permission);
    },
    [data],
  );

  const hasAddon = useCallback(
    (key: AddonKey): boolean => {
      if (!data?.enabled_addons) return false;
      return data.enabled_addons.includes(key);
    },
    [data],
  );

  return {
    data,
    loading,
    role: data?.role ?? null,
    can,
    hasAddon,
    refresh,
  };
}
