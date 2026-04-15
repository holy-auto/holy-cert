"use client";

import { useViewMode } from "@/lib/view-mode/ViewModeContext";
import BillingHubClient from "./BillingHubClient";
import StorefrontBilling from "./StorefrontBilling";

/**
 * BillingModeSwitch
 * ------------------------------------------------------------
 * /admin/invoices のモード切替ラッパー。
 * - storefront: 未入金請求書 1 タップ入金 + 作成系大ボタン
 * - admin: 既存の帳票ハブ (請求書 / 見積 / 領収 / 納品 / 発注 一覧)
 */
export default function BillingModeSwitch() {
  const { mode, hydrated } = useViewMode();

  if (!hydrated || mode === "admin") {
    return <BillingHubClient />;
  }
  return <StorefrontBilling />;
}
