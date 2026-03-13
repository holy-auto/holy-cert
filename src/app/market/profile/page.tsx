import { requireDealerSession } from "@/lib/market/auth";
import MarketNav from "@/app/market/_components/MarketNav";
import ProfileFormClient from "./_ProfileFormClient";

export default async function ProfilePage() {
  const session = await requireDealerSession();
  return (
    <>
      <MarketNav dealer={session.dealer} />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-6">プロフィール設定</h1>
        <ProfileFormClient dealer={session.dealer} />
      </main>
    </>
  );
}
