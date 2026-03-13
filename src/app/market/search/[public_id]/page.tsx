import { requireDealerSession } from "@/lib/market/auth";
import { getListingByPublicId } from "@/lib/market/db";
import { createAdminClient } from "@/lib/supabase/admin";
import MarketNav from "@/app/market/_components/MarketNav";
import Link from "next/link";
import { notFound } from "next/navigation";
import InquiryFormClient from "./_InquiryFormClient";
import ImageSlider from "./_ImageSlider";
import CopyLinkButton from "./_CopyLinkButton";

type Params = { params: Promise<{ public_id: string }> };

function fmt(price: number | null) {
  if (price == null) return "応相談";
  return `${(price / 10000).toFixed(0)}万円`;
}

export default async function ListingDetailPage({ params }: Params) {
  const session = await requireDealerSession();
  const { public_id } = await params;

  const listing = await getListingByPublicId(public_id);
  if (!listing) notFound();

  // 非公開・売却済みの場合は自社以外には非表示
  if (
    (listing.status === "hidden" || listing.status === "sold") &&
    listing.dealer_id !== session.dealer.id
  ) {
    notFound();
  }

  const isOwner = listing.dealer_id === session.dealer.id;

  // 既存問い合わせ確認
  const admin = createAdminClient();
  const { data: existingInquiry } = await admin
    .from("listing_inquiries")
    .select("id, status")
    .eq("listing_id", listing.id)
    .eq("from_dealer_id", session.dealer.id)
    .single();

  return (
    <>
      <MarketNav dealer={session.dealer} />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* パンくず */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link href="/market/search" className="hover:text-gray-700">在庫を探す</Link>
          <span>/</span>
          <span className="text-gray-900">{listing.make} {listing.model}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左: 画像 + 詳細 */}
          <div className="lg:col-span-2 space-y-4">
            {/* 画像スライダー */}
            <ImageSlider
              images={listing.images ?? []}
              alt={`${listing.make} ${listing.model}`}
            />

            {/* 車両情報テーブル */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">車両情報</h2>
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-50">
                  {[
                    ["メーカー", listing.make],
                    ["モデル", listing.model],
                    ["グレード", listing.grade ?? "-"],
                    ["年式", listing.year ? `${listing.year}年` : "-"],
                    ["走行距離", listing.mileage != null ? `${listing.mileage.toLocaleString()} km` : "-"],
                    ["ボディタイプ", listing.body_type ?? "-"],
                    ["色", listing.color ?? "-"],
                    ["燃料", listing.fuel_type ?? "-"],
                    ["ミッション", listing.transmission ?? "-"],
                    ["車検", listing.has_vehicle_inspection
                      ? (listing.inspection_expiry ? `あり（${listing.inspection_expiry} まで）` : "あり")
                      : "なし"],
                    ["修復歴", listing.has_repair_history ? `あり${listing.repair_history_notes ? `（${listing.repair_history_notes}）` : ""}` : "なし"],
                  ].map(([label, value]) => (
                    <tr key={label}>
                      <td className="px-4 py-2.5 font-medium text-gray-500 bg-gray-50 w-28">{label}</td>
                      <td className="px-4 py-2.5 text-gray-900">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 説明 */}
            {listing.description && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h2 className="font-semibold text-gray-900 mb-2">説明</h2>
                <p className="text-sm text-gray-700 whitespace-pre-line">{listing.description}</p>
              </div>
            )}

            {/* 内部メモ（オーナーのみ） */}
            {isOwner && listing.notes && (
              <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
                <p className="text-xs font-medium text-amber-700 mb-1">内部メモ（自社のみ表示）</p>
                <p className="text-sm text-amber-800 whitespace-pre-line">{listing.notes}</p>
              </div>
            )}
          </div>

          {/* 右: 価格・問い合わせ */}
          <div className="space-y-4">
            {/* 価格カード */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-2xl font-bold text-blue-700">{fmt(listing.price)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">業者間卸値</p>
                </div>
                <StatusBadge status={listing.status} />
              </div>

              <div className="border-t border-gray-100 pt-3 mt-3">
                <p className="text-sm font-medium text-gray-700">{listing.dealer?.company_name}</p>
                {listing.dealer?.prefecture && (
                  <p className="text-xs text-gray-400 mt-0.5">{listing.dealer.prefecture}</p>
                )}
              </div>
            </div>

            {/* 問い合わせ / 自社管理 */}
            {isOwner ? (
              <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
                <p className="text-sm font-medium text-gray-700">自社掲載</p>
                <Link
                  href={`/market/inventory/${listing.id}/edit`}
                  className="block w-full py-2 text-center border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  編集する
                </Link>
                <CopyLinkButton publicId={listing.public_id} />
              </div>
            ) : (
              <InquiryFormClient
                listingId={listing.id}
                listingPublicId={listing.public_id}
                existingInquiryId={existingInquiry?.id ?? null}
                existingInquiryStatus={existingInquiry?.status ?? null}
                listingStatus={listing.status}
              />
            )}
          </div>
        </div>
      </main>
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    active: { label: "掲載中", className: "bg-green-100 text-green-700" },
    reserved: { label: "商談中", className: "bg-amber-100 text-amber-700" },
    sold: { label: "売却済", className: "bg-gray-100 text-gray-600" },
    hidden: { label: "非公開", className: "bg-red-100 text-red-700" },
  };
  const s = map[status] ?? { label: status, className: "bg-gray-100 text-gray-600" };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.className}`}>
      {s.label}
    </span>
  );
}
