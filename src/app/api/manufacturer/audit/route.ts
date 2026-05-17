import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveManufacturerCaller } from "@/lib/auth/manufacturerCaller";
import { createServiceRoleAdmin } from "@/lib/supabase/admin";
import { apiJson, apiUnauthorized, apiInternalError } from "@/lib/api/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Audit feed is derived from manufacturer_certified_tenants rows
// (certified_at/by + revoked_at/by). 1000 certification rows → up to
// 2000 events covers the full lifetime for any realistic manufacturer.
const ROW_LIMIT = 1000;

type AuditEvent = {
  type: "certified" | "revoked";
  at: string;
  tenant_name: string | null;
  actor_label: string;
  notes: string | null;
};

/**
 * GET /api/manufacturer/audit
 *
 * Chronological feed of certification grant/revoke events for the
 * caller's manufacturer. Actor names are resolved from manufacturer
 * memberships first (shows "メーカー: 花子"), then auth email
 * (typically a Ledra 運営 operator), so the manufacturer can see
 * who changed what and when. Read-only.
 */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const caller = await resolveManufacturerCaller(supabase);
  if (!caller) return apiUnauthorized();

  try {
    const admin = createServiceRoleAdmin("manufacturer audit feed — caller-scoped read of own certification history");
    const manufacturerId = caller.manufacturerId;

    const { data: certs, error } = await admin
      .from("manufacturer_certified_tenants")
      .select("tenant_id, status, notes, certified_at, certified_by, revoked_at, revoked_by, tenants(name)")
      .eq("manufacturer_id", manufacturerId)
      .order("certified_at", { ascending: false })
      .limit(ROW_LIMIT);
    if (error) return apiInternalError(error, "manufacturer audit feed");

    type Row = {
      tenant_id: string;
      status: string;
      notes: string | null;
      certified_at: string | null;
      certified_by: string | null;
      revoked_at: string | null;
      revoked_by: string | null;
      tenants: { name: string | null } | { name: string | null }[] | null;
    };
    const rows = (certs ?? []) as unknown as Row[];

    // Resolve actor labels. First map manufacturer member display
    // names, then fall back to auth email for non-member actors
    // (= Ledra 運営 who granted via the platform-admin endpoint).
    const actorIds = new Set<string>();
    for (const r of rows) {
      if (r.certified_by) actorIds.add(r.certified_by);
      if (r.revoked_by) actorIds.add(r.revoked_by);
    }

    const actorLabel = new Map<string, string>();
    if (actorIds.size > 0) {
      const ids = Array.from(actorIds);
      const { data: members } = await admin
        .from("manufacturer_memberships")
        .select("user_id, display_name")
        .eq("manufacturer_id", manufacturerId)
        .in("user_id", ids)
        .returns<{ user_id: string; display_name: string | null }[]>();
      for (const m of members ?? []) {
        if (m.display_name) actorLabel.set(m.user_id, `メーカー: ${m.display_name}`);
      }
      // Anyone not resolved as a member → look up email (paged scan,
      // bounded). Treat as Ledra 運営 operator.
      const unresolved = ids.filter((id) => !actorLabel.has(id));
      if (unresolved.length > 0) {
        let page = 1;
        while (page <= 20 && unresolved.some((id) => !actorLabel.has(id))) {
          const { data: pageData } = await admin.auth.admin.listUsers({ page, perPage: 200 });
          if (!pageData?.users?.length) break;
          for (const u of pageData.users) {
            if (unresolved.includes(u.id) && !actorLabel.has(u.id)) {
              actorLabel.set(u.id, u.email ? `運営: ${u.email}` : "Ledra 運営");
            }
          }
          if (pageData.users.length < 200) break;
          page++;
        }
      }
    }

    const labelFor = (id: string | null): string => {
      if (!id) return "（記録なし）";
      return actorLabel.get(id) ?? "Ledra 運営";
    };

    const events: AuditEvent[] = [];
    for (const r of rows) {
      const tj = Array.isArray(r.tenants) ? r.tenants[0] : r.tenants;
      const tenantName = tj?.name ?? null;
      if (r.certified_at) {
        events.push({
          type: "certified",
          at: r.certified_at,
          tenant_name: tenantName,
          actor_label: labelFor(r.certified_by),
          notes: r.notes,
        });
      }
      if (r.revoked_at) {
        events.push({
          type: "revoked",
          at: r.revoked_at,
          tenant_name: tenantName,
          actor_label: labelFor(r.revoked_by),
          notes: r.notes,
        });
      }
    }
    events.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));

    return apiJson({ events });
  } catch (e) {
    return apiInternalError(e, "manufacturer audit GET");
  }
}
