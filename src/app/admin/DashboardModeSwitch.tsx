"use client";

import type { ReactNode } from "react";
import { useViewMode } from "@/lib/view-mode/ViewModeContext";
import StorefrontDashboard from "./StorefrontDashboard";

/**
 * DashboardModeSwitch
 * ------------------------------------------------------------
 * ダッシュボード (/admin) の表示切替ラッパー。
 * - storefront (店頭モード): POS 風の大ボタン + カンバン UI
 * - admin (管理モード): 従来の統計・分析・クイックアクション一覧
 *
 * サーバーで生成した管理モードの JSX は `adminContent` として受け取り、
 * クライアント側でモードに応じて出し分ける。
 */
export default function DashboardModeSwitch({ adminContent }: { adminContent: ReactNode }) {
  const { mode, hydrated } = useViewMode();

  // hydration 前は SSR と同じ admin 表示を出して画面フラッシュを避ける
  if (!hydrated || mode === "admin") {
    return <>{adminContent}</>;
  }
  return <StorefrontDashboard />;
}
