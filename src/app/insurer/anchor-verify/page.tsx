import Link from "next/link";
import AnchorVerifyClient from "./AnchorVerifyClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ブロックチェーン検証 | 保険会社ポータル",
  description:
    "施工画像の SHA-256 ハッシュを Polygon 上の LedraAnchor コントラクトで独立検証します。",
};

export default function Page() {
  return (
    <main className="min-h-screen bg-neutral-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="inline-flex rounded-full border border-neutral-300 bg-white px-3 py-1 text-[11px] font-semibold tracking-[0.22em] text-neutral-600">
              ブロックチェーン検証
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
                ブロックチェーン検証
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-neutral-600">
                施工画像の SHA-256 ハッシュを直接入力するか、画像ファイルを
                ドロップして、Polygon 上の LedraAnchor コントラクトで独立に
                真正性を検証します。契約済みの施工店が発行した証明書に紐づく
                画像に限り、詳細メタデータを開示します。
              </p>
            </div>
          </div>

          <div className="flex gap-3 items-center">
            <Link
              href="/insurer"
              className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
            >
              保険会社TOPへ
            </Link>
          </div>
        </header>

        <AnchorVerifyClient />

        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold tracking-[0.18em] text-neutral-500">
            HOW IT WORKS
          </div>
          <div className="mt-1 text-lg font-semibold text-neutral-900">
            検証の仕組み
          </div>
          <ol className="mt-4 list-decimal space-y-2 pl-6 text-sm text-neutral-700">
            <li>
              保険会社側ブラウザで画像から SHA-256 を計算します (画像自体は
              Ledra サーバーに送信されません)。
            </li>
            <li>
              ハッシュを Polygon PoS 上の LedraAnchor コントラクトに照会し、
              アンカー済みかを判定します (読み取り専用、ガス代なし)。
            </li>
            <li>
              アンカー済みかつ契約済み施工店の証明書に紐づく場合、
              DB 上のメタデータ (撮影日時、端末モデル、真正性グレードなど) を
              開示します。
            </li>
            <li>
              Polygonscan / OKLink 上で同じ tx_hash を参照することで、
              Ledra のサーバーに依らず独立に検証できます。
            </li>
          </ol>
        </section>
      </div>
    </main>
  );
}
