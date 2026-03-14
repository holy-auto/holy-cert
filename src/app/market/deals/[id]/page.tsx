import { requireDealerSession } from "@/lib/market/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import MarketNav from "@/app/market/_components/MarketNav";
import Link from "next/link";
import { notFound } from "next/navigation";
import DealStatusClient from "./_DealStatusClient";
import DealNotesClient from "./_DealNotesClient";

type Params = { params: Promise<{ id: string }> };

export default async function DealDetailPage({ params }: Params) {
  const session = await requireDealerSession();
  const { id } = await params;

  const admin = createAdminClient();
  const { data } = await admin
    .from("deals")
    .select(`
      *,
      listing:inventory_listings(id, public_id, make, model, year, price),
      buyer:dealers!deals_buyer_dealer_id_fkey(id, company_name, phone, prefecture),
      seller:dealers!deals_seller_dealer_id_fkey(id, company_name, phone, prefecture)
    `)
    .eq("id", id)
    .or(`buyer_dealer_id.eq.${session.dealer.id},seller_dealer_id.eq.${session.dealer.id}`)
    .single();

  if (!data) notFound();

  const deal = data as any;
  const isSeller = deal.seller_dealer_id === session.dealer.id;

  return (
    <>
      <MarketNav dealer={session.dealer} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link href="/market/deals" className="hover:text-gray-700">商談</Link>
          <span>/</span>
          <span className="text-gray-900">{deal.listing?.make} {deal.listing?.model}</span>
        </nav>

        {/* 商談概要カード */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                {deal.listing?.make} {deal.listing?.model}
                {deal.listing?.year && <span className="text-gray-400 font-normal text-base ml-2">{deal.listing.year}年</span>}
              </h1>
              <Link
                href={`/market/search/${deal.listing?.public_id}`}
                className="text-xs text-blue-600 hover:underline mt-0.5 inline-block"
              >
                在庫ページを見る →
              </Link>
            </div>
            <StatusBadge status={deal.status} />
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm border-t border-gray-100 pt-4">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">出品業者</p>
              <p className="font-medium text-gray-900">{deal.seller?.company_name}</p>
              {deal.seller?.prefecture && <p className="text-xs text-gray-400">{deal.seller.prefecture}</p>}
              {deal.seller?.phone && <p className="text-xs text-gray-500">{deal.seller.phone}</p>}
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">購入業者</p>
              <p className="font-medium text-gray-900">{deal.buyer?.company_name}</p>
              {deal.buyer?.prefecture && <p className="text-xs text-gray-400">{deal.buyer.prefecture}</p>}
              {deal.buyer?.phone && <p className="text-xs text-gray-500">{deal.buyer.phone}</p>}
            </div>
          </div>

          {deal.agreed_price != null && (
            <div className="border-t border-gray-100 pt-4 mt-4">
              <p className="text-xs text-gray-400 mb-0.5">合意価格</p>
              <p className="text-xl font-bold text-blue-700">
                {(deal.agreed_price / 10000).toFixed(0)}万円
              </p>
            </div>
          )}

          <DealNotesClient dealId={id} initialNotes={deal.notes ?? null} />
        </div>

        {/* ステータス変更 */}
        {(deal.status === "negotiating" || deal.status === "agreed") && (
          <DealStatusClient
            dealId={id}
            currentStatus={deal.status}
            isSeller={isSeller}
          />
        )}

        {/* 関連する問い合わせメッセージ（価格交渉履歴） */}
        {deal.inquiry_id && <NegotiationHistory dealId={id} />}
      </main>
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    negotiating: { label: "交渉中",     className: "bg-blue-100 text-blue-700"   },
    agreed:      { label: "合意済み",   className: "bg-green-100 text-green-700" },
    completed:   { label: "成立",       className: "bg-gray-100 text-gray-600"   },
    cancelled:   { label: "キャンセル", className: "bg-red-100 text-red-600"     },
  };
  const s = map[status] ?? { label: status, className: "bg-gray-100 text-gray-500" };
  return (
    <span className={`text-sm px-3 py-1 rounded-full font-medium ${s.className}`}>
      {s.label}
    </span>
  );
}

async function NegotiationHistory({ dealId }: { dealId: string }) {
  const admin = createAdminClient();
  const { data: deal } = await admin
    .from("deals")
    .select("inquiry_id")
    .eq("id", dealId)
    .single();

  if (!deal?.inquiry_id) return null;

  const { data: messages } = await admin
    .from("inquiry_messages")
    .select(`
      *,
      sender:dealers!inquiry_messages_sender_dealer_id_fkey(id, company_name)
    `)
    .eq("inquiry_id", deal.inquiry_id)
    .order("created_at", { ascending: true });

  if (!messages?.length) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mt-4">
      <h2 className="font-semibold text-gray-900 mb-3">交渉履歴</h2>
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {messages.map((msg: any) => (
          <div key={msg.id} className="text-sm">
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="font-medium text-gray-700">{msg.sender?.company_name ?? "?"}</span>
              <span className="text-xs text-gray-400">
                {new Date(msg.created_at).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <p className="text-gray-600 whitespace-pre-line pl-0.5">{msg.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
