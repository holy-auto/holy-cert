import { redirect } from "next/navigation";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import dynamic from "next/dynamic";

const PackageEditor = dynamic(() => import("./PackageEditor"), {
  loading: () => (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
    </div>
  ),
});

export const revalidate = 0;

export default async function ServicePackageEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();
  const { id } = await params;
  if (!userRes?.user) redirect(`/login?next=/admin/service-packages/${id}`);
  return <PackageEditor packageId={id === "new" ? null : id} />;
}
