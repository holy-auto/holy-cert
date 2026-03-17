import { redirect } from "next/navigation";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import OperatorSidebar from "./OperatorSidebar";
import OperatorSetup from "./OperatorSetup";

export const dynamic = "force-dynamic";

export default async function OperatorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/operator");

  const admin = createSupabaseAdminClient();

  // Check if operator_users table exists and user has access
  let opUser: { role: string } | null = null;
  let tableExists = true;
  try {
    const { data, error } = await admin
      .from("operator_users")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (error?.message?.includes("does not exist") || error?.code === "42P01") {
      tableExists = false;
    } else {
      opUser = data as { role: string } | null;
    }
  } catch {
    tableExists = false;
  }

  // Show setup page if table doesn't exist or user isn't registered
  if (!tableExists || !opUser) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center p-4">
        <OperatorSetup
          userId={user.id}
          email={user.email ?? user.id}
          tableExists={tableExists}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f5f5f7]">
      <OperatorSidebar role={opUser.role} />
      <main className="flex-1 lg:ml-60 px-4 sm:px-6 lg:px-8 py-6 pt-16 lg:pt-6">
        {children}
      </main>
    </div>
  );
}
