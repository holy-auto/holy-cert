"use client";

import { useViewMode } from "@/lib/view-mode/ViewModeContext";
import ReservationsClient from "./ReservationsClient";
import StorefrontReservations from "./StorefrontReservations";

/**
 * ReservationsModeSwitch
 * ------------------------------------------------------------
 * /admin/reservations のモード切替ラッパー。
 * - storefront: 日付範囲 + 4 列カンバン + 1 タップ遷移
 * - admin: 従来の検索・カレンダー・詳細編集 UI
 */
export default function ReservationsModeSwitch() {
  const { mode, hydrated } = useViewMode();

  if (!hydrated || mode === "admin") {
    return <ReservationsClient />;
  }
  return <StorefrontReservations />;
}
