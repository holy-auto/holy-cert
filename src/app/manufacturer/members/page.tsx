import { redirect } from "next/navigation";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveManufacturerCaller } from "@/lib/auth/manufacturerCaller";
import PageHeader from "@/components/ui/PageHeader";
import MembersClient from "./MembersClient";

export const dynamic = "force-dynamic";

export default async function ManufacturerMembersPage() {
  const supabase = await createSupabaseServerClient();
  const caller = await resolveManufacturerCaller(supabase);
  if (!caller) redirect("/manufacturer/login");
  // viewer がURL直打ちで来ても API 側で 403 になるが、画面側でも
  // ダッシュボードに戻して無用な 403 表示を避ける。
  if (caller.role !== "admin") redirect("/manufacturer");

  return (
    <div className="space-y-6">
      <PageHeader
        tag="MEMBERS"
        title="ポータルメンバー"
        description="自社のメーカーポータルにアクセスできる担当者を管理します。招待メールからパスワードを設定するとログインできます。"
      />
      <MembersClient />
    </div>
  );
}
