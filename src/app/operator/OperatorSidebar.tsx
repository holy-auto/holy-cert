"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

type NavItem = {
  href: string;
  label: string;
  exact?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/operator", label: "ダッシュボード", exact: true },
  { href: "/operator/tenants", label: "テナント管理" },
  { href: "/operator/support-tickets", label: "サポート" },
  { href: "/operator/announcements", label: "お知らせ配信" },
];

export default function OperatorSidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl border border-[rgba(0,0,0,0.08)] bg-white/90 lg:hidden"
        style={{ backdropFilter: "blur(20px)" }}
        aria-label="メニュー"
      >
        {open ? (
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
          </svg>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />
      )}

      <aside
        className={`fixed left-0 top-0 z-40 flex h-screen w-60 flex-col transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
        style={{
          background: "rgba(255, 255, 255, 0.92)",
          backdropFilter: "blur(40px) saturate(180%)",
          borderRight: "1px solid rgba(0, 0, 0, 0.06)",
        }}
      >
        {/* Brand */}
        <div className="flex h-14 items-center gap-2.5 px-5" style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "linear-gradient(135deg, #e3002b, #d6005b)" }}>
            <span className="text-xs font-bold text-white">O</span>
          </div>
          <span className="text-[13px] font-semibold tracking-wide text-[#1d1d1f]">CARTRUST 運営</span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3">
          <ul className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all duration-150 ${
                      isActive
                        ? "bg-[rgba(227,0,43,0.08)] text-[#e3002b]"
                        : "text-[#6e6e73] hover:bg-[rgba(0,0,0,0.04)] hover:text-[#1d1d1f]"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="px-3 py-3" style={{ borderTop: "1px solid rgba(0,0,0,0.04)" }}>
          <div className="mb-2 flex items-center gap-2 px-2.5">
            <span className="inline-flex items-center rounded-md bg-[rgba(227,0,43,0.08)] px-2 py-0.5 text-[11px] font-medium text-[#e3002b]">
              {role === "super_admin" ? "スーパー管理者" : "運営者"}
            </span>
          </div>
          <Link
            href="/admin"
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-[#aeaeb2] hover:bg-[rgba(0,0,0,0.04)] hover:text-[#1d1d1f] transition-all"
          >
            テナント管理画面へ
          </Link>
        </div>
      </aside>
    </>
  );
}
