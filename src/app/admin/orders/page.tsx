import { redirect } from "next/navigation";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import dynamic from "next/dynamic";
import { requireAddonOrGateView } from "@/lib/billing/addonGuard";

const OrdersClient = dynamic(() => import("./OrdersClient"), {
  loading: () => (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
    </div>
  ),
});

export const revalidate = 0;

export default async function OrdersPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes?.user) redirect("/login?next=/admin/orders");

  const gate = await requireAddonOrGateView("btob", {
    feature: "案件受発注 (BtoB)",
    href: "/admin/orders",
  });
  if (gate) return gate;

  return <OrdersClient />;
}
