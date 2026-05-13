import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "車両パスポート — 該当なし",
  robots: { index: false, follow: false },
};

export default function VehiclePassportNotFound() {
  return (
    <main className="mx-auto flex max-w-[640px] flex-col items-center justify-center gap-5 px-4 py-16 text-center">
      <div className="space-y-2">
        <div className="text-5xl font-bold text-muted">VIN</div>
        <h1 className="text-lg font-semibold text-primary">この車両のパスポートはまだ発行されていません</h1>
        <p className="text-sm leading-relaxed text-muted">
          入力された VIN に紐付くアンカー済み施工証明が見つかりませんでした。施工記録が Polygon
          ネットワークにアンカーされた時点で、自動的にパスポートが発行されます。
        </p>
      </div>
      <div className="grid w-full gap-2 text-left text-xs text-muted sm:grid-cols-2">
        <div className="rounded-xl border border-border-default bg-surface p-3">
          <div className="font-semibold text-primary">想定される理由</div>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            <li>VIN の入力ミス (大文字小文字 / ハイフン)</li>
            <li>未アンカーの証明書のみ存在する</li>
            <li>施工店がパスポート掲載を取り下げている</li>
          </ul>
        </div>
        <div className="rounded-xl border border-border-default bg-surface p-3">
          <div className="font-semibold text-primary">次にできること</div>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            <li>VIN を正しく再入力する</li>
            <li>NFC タグ / QR から直接アクセスする</li>
            <li>施工店に問い合わせて発行状況を確認する</li>
          </ul>
        </div>
      </div>
      <Link href="/" className="btn-primary px-4 py-2 text-sm">
        トップページに戻る
      </Link>
    </main>
  );
}
