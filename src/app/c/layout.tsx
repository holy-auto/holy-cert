import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PublicBillingBanner from "./PublicBillingBanner";

async function AdminBar() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: mem } = await supabase
      .from("tenant_memberships")
      .select("role")
      .limit(1)
      .maybeSingle();

    if (!mem?.role) return null;

    return (
      <div className="mb-3 flex items-center justify-between rounded-xl border border-accent/20 bg-accent/5 px-4 py-2 text-xs text-accent">
        <span>管理者としてログイン中</span>
        <Link href="/admin/certificates" className="underline hover:no-underline">
          管理画面（証明書一覧）へ
        </Link>
      </div>
    );
  } catch {
    return null;
  }
}

export default function CLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-base p-4 text-primary">
      <AdminBar />
      <PublicBillingBanner />
      {children}
    </main>
  );
}
