"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Dealer } from "@/types/market";

interface Props {
  dealer: Dealer;
}

const navItems = [
  { href: "/market/dashboard", label: "ダッシュボード" },
  { href: "/market/search",    label: "在庫を探す" },
  { href: "/market/inventory", label: "自社在庫" },
  { href: "/market/prices",    label: "相場" },
  { href: "/market/news",      label: "ニュース" },
  { href: "/market/jobs",      label: "受発注" },
  { href: "/market/inquiries", label: "問い合わせ" },
  { href: "/market/deals",     label: "商談" },
  { href: "/market/profile",   label: "プロフィール" },
];

export default function MarketNav({ dealer }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/market/login");
    router.refresh();
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* ロゴ */}
          <Link href="/market/dashboard" className="font-bold text-lg text-blue-700">
            HolyMarket
          </Link>

          {/* ナビ */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* ユーザー情報 */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 hidden sm:block truncate max-w-[180px]">
              {dealer.company_name}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
            >
              ログアウト
            </button>
          </div>
        </div>

        {/* モバイルナビ */}
        <nav className="flex md:hidden gap-1 pb-2 overflow-x-auto">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
