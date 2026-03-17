"use client";

import { useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import InquiriesClient from "./InquiriesClient";
import SupportTicketsClient from "./SupportTicketsClient";

const TABS = [
  { key: "market", label: "バイヤーからの問い合わせ" },
  { key: "support", label: "運営への問い合わせ" },
] as const;

type Tab = (typeof TABS)[number]["key"];

export default function InquiriesPageTabs() {
  const [tab, setTab] = useState<Tab>("market");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        tag="問い合わせ"
        title="問い合わせ管理"
        description="バイヤーからの問い合わせと運営への問い合わせを管理します。"
      />

      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl bg-[rgba(0,0,0,0.04)] p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              tab === t.key
                ? "bg-white text-[#1d1d1f] shadow-sm"
                : "text-[#6e6e73] hover:text-[#1d1d1f]"
            }`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "market" && <InquiriesClient />}
      {tab === "support" && <SupportTicketsClient />}
    </div>
  );
}
