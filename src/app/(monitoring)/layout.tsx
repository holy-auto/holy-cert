import type { ReactNode } from "react";
import Link from "next/link";

export const metadata = {
  title: "Ledra 監視センター",
  description: "Ledra システム監視・稼働率・エラー対策コンソール",
  robots: { index: false, follow: false },
};

/**
 * Independent monitoring shell.
 *
 * Deliberately does NOT import the admin SidebarShell / nav — the 監視
 * センター is its own site (own URL namespace, own chrome, own polling
 * lifecycle) so it stays usable and visually distinct even while the
 * main admin app is the thing being investigated. It still inherits the
 * root layout's <html>/theme/fonts (single Next app), which is desirable.
 */
export default function MonitoringLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-base text-primary">
      <header className="sticky top-0 z-10 border-b border-border-default bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-accent-dim text-accent-text text-sm font-bold">
              L
            </span>
            <div className="leading-tight">
              <div className="text-sm font-semibold">Ledra 監視センター</div>
              <div className="text-[11px] text-secondary">稼働率・エラー・対策コンソール（運営専用）</div>
            </div>
          </div>
          <nav className="flex items-center gap-4 text-xs text-secondary">
            <a href="/api/health" target="_blank" rel="noreferrer" className="hover:text-primary">
              /api/health
            </a>
            <Link href="/admin" className="hover:text-primary">
              管理画面へ戻る
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-6">{children}</main>
    </div>
  );
}
