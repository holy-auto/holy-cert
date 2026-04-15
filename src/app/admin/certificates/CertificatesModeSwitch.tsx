"use client";

import type { ReactNode } from "react";
import { useViewMode } from "@/lib/view-mode/ViewModeContext";
import StorefrontCertificates from "./StorefrontCertificates";

/**
 * CertificatesModeSwitch
 * ------------------------------------------------------------
 * /admin/certificates のモード切替ラッパー。
 * サーバーでレンダリング済みの管理モード JSX は `adminContent` から受け取り、
 * クライアント側で view-mode に応じて出し分ける。
 */
export default function CertificatesModeSwitch({ adminContent }: { adminContent: ReactNode }) {
  const { mode, hydrated } = useViewMode();

  if (!hydrated || mode === "admin") {
    return <>{adminContent}</>;
  }
  return <StorefrontCertificates />;
}
