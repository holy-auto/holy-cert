import { redirect } from "next/navigation";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import PriceStatsClient from "./PriceStatsClient";

export const dynamic = "force-dynamic";

export default async function PriceStatsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes?.user) redirect("/login?next=/admin/price-stats");

  return <PriceStatsClient />;
}
