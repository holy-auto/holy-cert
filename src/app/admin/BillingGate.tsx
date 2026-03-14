"use client";

import { useAdminBillingStatus } from "@/lib/billing/useAdminBillingStatus";

/**
 * BillingGate: redirects to /admin/billing if tenant is inactive.
 * Now delegates to useAdminBillingStatus (single fetch, cached).
 */
export default function BillingGate() {
  useAdminBillingStatus({ redirectOnInactive: true });
  return null;
}
