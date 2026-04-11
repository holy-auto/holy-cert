"use client";

import IdleAutoLogout from "@/app/admin/IdleAutoLogout";

/**
 * Idle auto-logout for the insurer portal.
 * Delegates to the shared IdleAutoLogout component with insurer-specific logout URL.
 */
export default function InsurerIdleAutoLogout() {
  return <IdleAutoLogout logoutUrl="/insurer/login" />;
}
