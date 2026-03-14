import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-6">
      <div className="text-center space-y-6 max-w-md">
        <div className="inline-flex rounded-full border border-neutral-300 bg-white px-3 py-1 text-[11px] font-semibold tracking-[0.22em] text-neutral-600">
          404
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
          ページが見つかりません
        </h1>
        <p className="text-sm text-neutral-500">
          お探しのページは存在しないか、移動した可能性があります。
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-2xl border border-neutral-900 bg-neutral-900 px-6 py-3 text-sm font-medium text-white transition hover:opacity-90"
        >
          トップへ戻る
        </Link>
      </div>
    </div>
  );
}
