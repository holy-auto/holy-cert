"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const AUTH_ROUTES = ["/manufacturer/login"];

/**
 * Guards the /manufacturer portal. Redirects unauthenticated users to
 * /manufacturer/login and members deactivated by the platform admin to
 * an explicit "inactive" notice with a logout button. Mirrors the
 * insurer route guard contract.
 */
export default function ManufacturerRouteGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<"loading" | "ok" | "inactive">("loading");
  const [checked, setChecked] = useState(false);

  const isAuthPage = AUTH_ROUTES.some((r) => pathname.startsWith(r));

  useEffect(() => {
    if (isAuthPage) return;
    let cancelled = false;

    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.replace("/manufacturer/login");
          return;
        }

        const { data, error } = await supabase
          .from("manufacturer_memberships")
          .select("manufacturer_id, is_active")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (cancelled) return;

        if (error || !data) {
          router.replace("/manufacturer/login");
          return;
        }

        if (data.is_active === false) {
          setState("inactive");
          return;
        }
        setState("ok");
      } catch {
        if (!cancelled) router.replace("/manufacturer/login");
      } finally {
        if (!cancelled) setChecked(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, isAuthPage, pathname]);

  if (isAuthPage) return <>{children}</>;
  if (!checked || state === "loading") return null;

  if (state === "inactive") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="glass-card max-w-md p-6 text-center">
          <h2 className="text-lg font-semibold text-primary">アカウントが無効です</h2>
          <p className="mt-2 text-sm text-muted">
            お客様のアカウントは現在無効になっています。Ledra 運営までお問い合わせください。
          </p>
          <button
            type="button"
            onClick={async () => {
              try {
                const supabase = createClient();
                await supabase.auth.signOut();
              } catch {
                /* ignore */
              }
              window.location.replace("/manufacturer/login");
            }}
            className="btn-primary mt-6"
          >
            ログアウト
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
