"use client";

import { useViewMode } from "@/lib/view-mode/ViewModeContext";
import InventoryClient from "./InventoryClient";
import StorefrontInventory from "./StorefrontInventory";

/**
 * InventoryModeSwitch
 * ------------------------------------------------------------
 * /admin/inventory のモード切替ラッパー。
 * - storefront: 大型 入庫/出庫 ボタン + 低在庫アラート
 * - admin: テーブル + インライン編集 + 入出庫履歴
 */
export default function InventoryModeSwitch() {
  const { mode, hydrated } = useViewMode();

  if (!hydrated || mode === "admin") {
    return <InventoryClient />;
  }
  return <StorefrontInventory />;
}
