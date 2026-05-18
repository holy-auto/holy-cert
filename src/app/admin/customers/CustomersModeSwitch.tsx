"use client";

import { useSearchParams } from "next/navigation";
import { useViewMode } from "@/lib/view-mode/ViewModeContext";
import CustomersClient from "./CustomersClient";
import StorefrontCustomers from "./StorefrontCustomers";

/**
 * CustomersModeSwitch
 * ------------------------------------------------------------
 * /admin/customers のモード切替ラッパー。
 * - storefront: 大きめ顧客カード + 検索 + 1 タップ発信
 * - admin: 従来のテーブル + インライン編集
 *
 * 例外: URL に `create=1` がある場合は、モードに関わらず管理モード UI
 * (CustomersClient) を表示し、新規登録フォームを自動で開く。
 * (飛び込み案件画面などから「+ 新規顧客登録」で渡ってくるクエリを
 * 確実に拾うため。BillingModeSwitch と同じ規約)
 */
export default function CustomersModeSwitch() {
  const { mode, hydrated } = useViewMode();
  const sp = useSearchParams();
  const forceAdmin = sp.get("create") === "1";

  if (!hydrated || mode === "admin" || forceAdmin) {
    return <CustomersClient />;
  }
  return <StorefrontCustomers />;
}
