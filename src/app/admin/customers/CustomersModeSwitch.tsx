"use client";

import { useViewMode } from "@/lib/view-mode/ViewModeContext";
import CustomersClient from "./CustomersClient";
import StorefrontCustomers from "./StorefrontCustomers";

/**
 * CustomersModeSwitch
 * ------------------------------------------------------------
 * /admin/customers のモード切替ラッパー。
 * - storefront: 大きめ顧客カード + 検索 + 1 タップ発信
 * - admin: 従来のテーブル + インライン編集
 */
export default function CustomersModeSwitch() {
  const { mode, hydrated } = useViewMode();

  if (!hydrated || mode === "admin") {
    return <CustomersClient />;
  }
  return <StorefrontCustomers />;
}
