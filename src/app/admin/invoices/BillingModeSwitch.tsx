"use client";

import { useSearchParams } from "next/navigation";
import { useViewMode } from "@/lib/view-mode/ViewModeContext";
import BillingHubClient from "./BillingHubClient";
import StorefrontBilling from "./StorefrontBilling";

/**
 * BillingModeSwitch
 * ------------------------------------------------------------
 * /admin/invoices のモード切替ラッパー。
 * - storefront: 未入金請求書 1 タップ入金 + 作成系大ボタン
 * - admin: 既存の帳票ハブ (請求書 / 見積 / 領収 / 納品 / 発注 一覧)
 *
 * 例外: URL に `create=1` や `view=...` がある場合は、モードに関わらず
 * 管理モード UI (BillingHubClient) を表示する。
 * (ジョブ画面から「請求書作成」で渡ってきたクエリを確実に拾うため)
 */
export default function BillingModeSwitch() {
  const { mode, hydrated } = useViewMode();
  const sp = useSearchParams();
  const forceAdmin = sp.get("create") === "1" || sp.get("view") != null;

  if (!hydrated || mode === "admin" || forceAdmin) {
    return <BillingHubClient />;
  }
  return <StorefrontBilling />;
}
