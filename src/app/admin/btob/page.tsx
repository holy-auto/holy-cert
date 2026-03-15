import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import BtoBHubClient from "./BtoBHubClient";

export const dynamic = "force-dynamic";

export default async function BtoBHubPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes?.user) redirect("/login?next=/admin/btob");

  return (
    <Suspense fallback={<div className="text-sm text-muted">読み込み中...</div>}>
      <BtoBHubClient />
    </Suspense>
  );
}
