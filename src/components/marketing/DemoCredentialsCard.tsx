"use client";

import { useState } from "react";

type Field = {
  label: string;
  value: string;
};

function CopyButton({ value, ariaLabel }: { value: string; ariaLabel: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // クリップボード API が使えない場合（HTTPでの閲覧など）は静かに失敗させる。
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={ariaLabel}
      className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/[0.08]"
    >
      {copied ? (
        <>
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          コピー済み
        </>
      ) : (
        <>
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <path d="M5 15V5a2 2 0 012-2h10" />
          </svg>
          コピー
        </>
      )}
    </button>
  );
}

export function DemoCredentialsCard({ email, password }: { email: string; password: string }) {
  const fields: Field[] = [
    { label: "メールアドレス", value: email },
    { label: "パスワード", value: password },
  ];

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 md:p-8 backdrop-blur-sm shadow-[0_1px_24px_rgba(0,0,0,0.25)]">
      <div className="mb-5 flex items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-blue-500/15 px-2.5 py-1 text-[0.7rem] font-semibold tracking-wider text-blue-300">
          DEMO ACCOUNT
        </span>
        <span className="text-xs text-white">下記のIDとパスワードでログインできます</span>
      </div>

      <dl className="space-y-3">
        {fields.map((field) => (
          <div
            key={field.label}
            className="flex flex-col gap-2 rounded-lg border border-white/[0.06] bg-black/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <dt className="text-[0.7rem] uppercase tracking-wider text-white">{field.label}</dt>
              <dd className="mt-1 break-all font-mono text-sm text-white">{field.value}</dd>
            </div>
            <CopyButton value={field.value} ariaLabel={`${field.label}をコピー`} />
          </div>
        ))}
      </dl>
    </div>
  );
}
