"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-6">
      <div className="text-center space-y-6 max-w-md">
        <div className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-semibold tracking-[0.22em] text-rose-600">
          500
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
          エラーが発生しました
        </h1>
        <p className="text-sm text-neutral-500">
          予期せぬエラーが発生しました。時間をおいて再度お試しください。
        </p>
        <div className="flex flex-col gap-3 sm:flex-row justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center rounded-2xl border border-neutral-900 bg-neutral-900 px-6 py-3 text-sm font-medium text-white transition hover:opacity-90"
          >
            再試行
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-2xl border border-neutral-200 bg-white px-6 py-3 text-sm font-medium text-neutral-900 transition hover:bg-neutral-50"
          >
            トップへ戻る
          </a>
        </div>
      </div>
    </div>
  );
}
