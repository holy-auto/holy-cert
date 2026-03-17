import { redirect } from "next/navigation";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import OperatorSidebar from "./OperatorSidebar";

export const dynamic = "force-dynamic";

export default async function OperatorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/operator");

  // Check if user is an operator
  const admin = createSupabaseAdminClient();
  const { data: opUser } = await admin
    .from("operator_users")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (!opUser) redirect("/admin");

  return (
    <div className="flex min-h-screen bg-[#f5f5f7]">
      <OperatorSidebar role={opUser.role as string} />
      <main className="flex-1 lg:ml-60 px-4 sm:px-6 lg:px-8 py-6 pt-16 lg:pt-6">
        {children}
      </main>
    </div>
  );
}
