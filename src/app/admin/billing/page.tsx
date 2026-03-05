import { Suspense } from "react";
import BillingClient from "./BillingClient";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <BillingClient />
    </Suspense>
  );
}