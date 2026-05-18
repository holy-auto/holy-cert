"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type FeaturePrefs = {
  tenantDisabled: string[];
  userVisible: string[];
};

const EMPTY: string[] = [];

// Session cache shared across every Sidebar mount (mirrors useCurrentRole).
let cachedData: FeaturePrefs | null = null;
let fetchPromise: Promise<FeaturePrefs | null> | null = null;

async function fetchPrefs(): Promise<FeaturePrefs | null> {
  try {
    const res = await fetch("/api/admin/feature-prefs", { cache: "no-store" });
    if (!res.ok) return null;
    const j = await res.json();
    if (!j?.ok) return null;
    return {
      tenantDisabled: Array.isArray(j.tenantDisabled) ? j.tenantDisabled : [],
      userVisible: Array.isArray(j.userVisible) ? j.userVisible : [],
    };
  } catch {
    return null;
  }
}

/**
 * Current feature-visibility preferences for the signed-in user.
 *
 * While loading (or on fetch failure) the lists are empty, which means
 * advanced features stay hidden — the safe default that matches the
 * "hidden until opted-in" behaviour and avoids a flash of the full menu.
 */
export function useFeaturePrefs() {
  const [data, setData] = useState<FeaturePrefs | null>(cachedData);
  const [loading, setLoading] = useState(!cachedData);

  const refresh = useCallback(async () => {
    if (!fetchPromise) {
      fetchPromise = fetchPrefs();
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

  const tenantDisabled = useMemo(() => data?.tenantDisabled ?? EMPTY, [data]);
  const userVisible = useMemo(() => data?.userVisible ?? EMPTY, [data]);

  return { tenantDisabled, userVisible, loading, refresh };
}
