"use client";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-base p-8">
      <div className="max-w-md text-center">
        <h2 className="mb-4 text-xl font-semibold text-text-primary">エラーが発生しました</h2>
        <p className="mb-6 text-sm text-text-secondary">予期しないエラーが発生しました。再度お試しください。</p>
        <button onClick={reset} className="btn-primary px-6 py-2">
          再試行
        </button>
      </div>
    </div>
  );
}
