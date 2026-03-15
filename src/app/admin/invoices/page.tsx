import { Suspense } from "react";
import BillingHubClient from "./BillingHubClient";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<div className="text-sm text-muted">読み込み中...</div>}>
      <BillingHubClient />
    </Suspense>
  );
}
