"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

type Resp = {
  billing_active: boolean;
  tenant_name: string | null;
  certificate_status: string | null;
};

function extractPublicId(pathname: string): string | null {
  // /c/<public_id>
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length >= 2 && parts[0] === "c") return parts[1];
  return null;
}

export default function PublicBillingBanner() {
  const pathname = usePathname();
  const pid = useMemo(() => extractPublicId(pathname), [pathname]);
  const [data, setData] = useState<Resp | null>(null);

  useEffect(() => {
    if (!pid) return;

    (async () => {
      const res = await fetch(`/api/certificate/public-status?pid=${encodeURIComponent(pid)}`, { cache: "no-store" });
      if (!res.ok) return;
      const j = (await res.json()) as Resp;
      setData(j);
    })().catch(() => {});
  }, [pid]);

  if (!data) return null;

  // サブスク停止中のみバナー表示（閲覧は継続）
  if (data.billing_active) return null;

  return (
    <div className="mb-4 rounded border p-3 text-sm">
      <div className="font-semibold">この施工証明書は閲覧できますが、現在「検証」はできません</div>
      <div className="mt-1 opacity-80">
        施工店のサブスクリプションが停止中のため、最新状態の保証・再発行・各種出力は行えません。
      </div>
    </div>
  );
}
