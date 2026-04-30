import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  monthsBackDateStr,
  pickMaintenanceMonths,
  processMaintenanceReminders,
  type FollowUpSetting,
  type TenantInfo,
} from "../followUp";

// email 送信は mock — sendMaintenanceReminder を実際の Resend に飛ばさない
vi.mock("@/lib/follow-up/email", () => ({
  sendExpiryReminder: vi.fn(async () => true),
  sendFollowUpEmail: vi.fn(async () => true),
  sendMaintenanceReminder: vi.fn(async () => true),
}));

// AI 呼び出しは mock — テスト中に Anthropic に行かないようにする
vi.mock("@/lib/ai/followUpContent", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ai/followUpContent")>("@/lib/ai/followUpContent");
  return {
    ...actual,
    generateFollowUpContent: vi.fn(async () => ({
      emailSubject: "x",
      emailBody: "<p>x</p>",
      lineMessage: "x",
    })),
  };
});

/**
 * monthsBackDateStr は cron が「今日が施工後 N ヶ月の節目に当たるか」
 * 判定するための日付逆算ヘルパー。同日付一致 + 月末オーバーフロー時は
 * 月末日に丸める仕様。
 */
describe("monthsBackDateStr", () => {
  it("returns same-day date 6 months earlier", () => {
    // 2026-04-29 → 2025-10-29 (普通の同日一致)
    expect(monthsBackDateStr(new Date("2026-04-29T00:00:00Z"), 6)).toBe("2025-10-29");
  });

  it("returns same-day date 12 months earlier", () => {
    expect(monthsBackDateStr(new Date("2026-04-29T00:00:00Z"), 12)).toBe("2025-04-29");
  });

  it("rolls 3/31 back 1 month to 2/28 (non-leap)", () => {
    // setMonth(-1) on 2026-03-31 carries to 2026-03-03; we expect rollback to 2026-02-28
    expect(monthsBackDateStr(new Date("2026-03-31T00:00:00Z"), 1)).toBe("2026-02-28");
  });

  it("rolls 3/31 back 1 month to 2/29 (leap year)", () => {
    expect(monthsBackDateStr(new Date("2024-03-31T00:00:00Z"), 1)).toBe("2024-02-29");
  });

  it("rolls 1/31 back 1 month to 12/31 across year boundary", () => {
    expect(monthsBackDateStr(new Date("2026-01-31T00:00:00Z"), 1)).toBe("2025-12-31");
  });

  it("handles 12-month back across year boundary", () => {
    expect(monthsBackDateStr(new Date("2026-04-29T00:00:00Z"), 12)).toBe("2025-04-29");
  });

  it("handles 24-month back", () => {
    expect(monthsBackDateStr(new Date("2026-04-29T00:00:00Z"), 24)).toBe("2024-04-29");
  });
});

/**
 * pickMaintenanceMonths は cron が「この施工種別ではどの月にリマインドを
 * 送るべきか」を決めるための純関数。テナント既定 + service_type 別 override
 * + サニタイズ (1..120 / 整数) を一括で扱う。
 */
describe("pickMaintenanceMonths", () => {
  it("returns the tenant default when no override exists", () => {
    expect(pickMaintenanceMonths("ppf", {}, [6, 12])).toEqual([6, 12]);
  });

  it("returns the service-specific override when present", () => {
    expect(pickMaintenanceMonths("ppf", { ppf: [6, 12, 24] }, [6, 12])).toEqual([6, 12, 24]);
  });

  it("falls back to default when serviceType is null/undefined/empty", () => {
    expect(pickMaintenanceMonths(null, { ppf: [99] }, [6, 12])).toEqual([6, 12]);
    expect(pickMaintenanceMonths(undefined, { ppf: [99] }, [6, 12])).toEqual([6, 12]);
    expect(pickMaintenanceMonths("   ", { ppf: [99] }, [6, 12])).toEqual([6, 12]);
  });

  it("normalizes serviceType to lowercase before lookup", () => {
    expect(pickMaintenanceMonths("PPF", { ppf: [3] }, [6])).toEqual([3]);
  });

  it("treats an explicit empty array override as 'disabled for this service'", () => {
    // ppf キーは存在するが配列は空 → このサービスではリマインダーを送らない
    expect(pickMaintenanceMonths("ppf", { ppf: [] }, [6, 12])).toEqual([]);
  });

  it("filters out non-integer / out-of-range values from the override", () => {
    expect(pickMaintenanceMonths("ppf", { ppf: [0, 6, 121, 12.5, 12] }, [3])).toEqual([6, 12]);
  });

  it("filters out non-integer / out-of-range values from the default", () => {
    expect(pickMaintenanceMonths("coating", {}, [0, 6, 121, -1, 12])).toEqual([6, 12]);
  });

  it("treats undefined byService as no override", () => {
    expect(pickMaintenanceMonths("ppf", undefined, [6])).toEqual([6]);
  });

  it("falls back to built-in [6, 12] when defaults is null/undefined", () => {
    expect(pickMaintenanceMonths("ppf", {}, null)).toEqual([6, 12]);
    expect(pickMaintenanceMonths("ppf", {}, undefined)).toEqual([6, 12]);
  });

  it("treats explicit empty defaults as 'disabled for the whole tenant'", () => {
    // テナント側で意図的に [] を設定しているケース → 全種別で送らない
    expect(pickMaintenanceMonths("ppf", {}, [])).toEqual([]);
  });
});

/**
 * processMaintenanceReminders の振る舞い: 軽量な supabase mock を組んで
 * opt-out / service_type 絞り / 既送信スキップ / 既定 vs override の組み合わせ
 * が正しく動くかを直接確認する。
 */
type Cert = {
  id: string;
  tenant_id: string;
  status: string;
  customer_id: string | null;
  customer_name: string | null;
  service_name: string | null;
  service_type: string | null;
  vehicle_id: string | null;
  expiry_value: string | null;
  created_at: string;
};

const cert = (over: Partial<Cert> = {}): Cert => ({
  id: "c-" + Math.random().toString(36).slice(2, 6),
  tenant_id: "t1",
  status: "active",
  customer_id: "u1",
  customer_name: "山田",
  service_name: "PPF",
  service_type: "ppf",
  vehicle_id: null,
  expiry_value: null,
  created_at: "2025-10-29T10:00:00Z",
  ...over,
});
type Customer = {
  id: string;
  name: string | null;
  email: string | null;
  line_user_id: string | null;
  followup_opt_out: boolean | null;
};

interface FixtureWorld {
  certificates: Cert[];
  customers: Customer[];
  notificationLogs: Array<{ target_id: string; type: string; status: string }>;
  insertCalls: Array<Record<string, unknown>>;
}

function makeSupabaseMock(world: FixtureWorld): any {
  function chain(table: string) {
    let rows: any[] = [];
    let mode: "insert" | "select" = "select";
    if (table === "certificates") rows = world.certificates;
    else if (table === "customers") rows = world.customers;
    else if (table === "notification_logs") rows = world.notificationLogs;
    else if (table === "vehicles") rows = [];

    const filters: Array<(r: any) => boolean> = [];
    let inFilter: { col: string; values: any[] } | null = null;

    const builder: any = {
      select: () => {
        mode = "select";
        return builder;
      },
      eq: (col: string, val: any) => {
        filters.push((r) => r[col] === val);
        return builder;
      },
      neq: (col: string, val: any) => {
        filters.push((r) => r[col] !== val);
        return builder;
      },
      gte: (col: string, val: any) => {
        filters.push((r) => String(r[col] ?? "") >= val);
        return builder;
      },
      lte: (col: string, val: any) => {
        filters.push((r) => String(r[col] ?? "") <= val);
        return builder;
      },
      in: (col: string, values: any[]) => {
        inFilter = { col, values };
        filters.push((r) => values.includes(r[col]));
        return builder;
      },
      insert: (payload: any) => {
        mode = "insert";
        world.insertCalls.push({ table, ...payload });
        if (table === "notification_logs") {
          world.notificationLogs.push({
            target_id: payload.target_id,
            type: payload.type,
            status: payload.status,
          });
        }
        return Promise.resolve({ data: null, error: null });
      },
      then: (resolve: any) => {
        if (mode !== "select") return resolve({ data: null, error: null });
        const out = rows.filter((r) => filters.every((f) => f(r)));
        return resolve({ data: out, error: null });
      },
    };
    return builder;
  }
  return { from: (t: string) => chain(t) };
}

const baseSetting = (over: Partial<FollowUpSetting> = {}): FollowUpSetting => ({
  tenant_id: "t1",
  enabled: true,
  reminder_days_before: null,
  follow_up_days_after: null,
  send_on_issue: null,
  first_reminder_days: null,
  warranty_end_days: null,
  inspection_pre_days: null,
  seasonal_enabled: null,
  maintenance_reminder_months: [6, 12],
  maintenance_schedule_by_service: null,
  ...over,
});

const tenant: TenantInfo = { id: "t1", name: "Shop A", phone: null, plan_tier: "starter" };
const TODAY = new Date("2026-04-29T00:00:00Z"); // 6 ヶ月前 → 2025-10-29

describe("processMaintenanceReminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends reminders for matching certificates", async () => {
    const world: FixtureWorld = {
      certificates: [cert({ id: "c1" })],
      customers: [{ id: "u1", name: "山田", email: "u1@example.com", line_user_id: null, followup_opt_out: false }],
      notificationLogs: [],
      insertCalls: [],
    };
    const sent = await processMaintenanceReminders(
      makeSupabaseMock(world),
      baseSetting(),
      tenant,
      "Shop A",
      "starter",
      TODAY,
    );
    expect(sent).toBe(1);
    const log = world.insertCalls.find((c) => c.table === "notification_logs");
    expect(log?.type).toBe("maintenance_reminder_6m");
    expect(log?.status).toBe("sent");
  });

  it("skips a customer marked as followup_opt_out", async () => {
    const world: FixtureWorld = {
      certificates: [cert({ id: "c1" })],
      customers: [{ id: "u1", name: "山田", email: "u1@example.com", line_user_id: null, followup_opt_out: true }],
      notificationLogs: [],
      insertCalls: [],
    };
    const sent = await processMaintenanceReminders(
      makeSupabaseMock(world),
      baseSetting(),
      tenant,
      "Shop A",
      "starter",
      TODAY,
    );
    expect(sent).toBe(0);
    expect(world.insertCalls.find((c) => c.table === "notification_logs")).toBeUndefined();
  });

  it("skips certificates whose service_type is excluded by override", async () => {
    // ppf → [12] のみ (= 6 ヶ月節目では送らない), coating → [6] (送る)
    const world: FixtureWorld = {
      certificates: [
        cert({ id: "c1", customer_id: "u1", service_type: "ppf" }),
        cert({ id: "c2", customer_id: "u2", service_type: "coating" }),
      ],
      customers: [
        { id: "u1", name: "山田", email: "u1@example.com", line_user_id: null, followup_opt_out: false },
        { id: "u2", name: "鈴木", email: "u2@example.com", line_user_id: null, followup_opt_out: false },
      ],
      notificationLogs: [],
      insertCalls: [],
    };
    const setting = baseSetting({ maintenance_schedule_by_service: { ppf: [12], coating: [6] } });
    const sent = await processMaintenanceReminders(
      makeSupabaseMock(world),
      setting,
      tenant,
      "Shop A",
      "starter",
      TODAY,
    );
    expect(sent).toBe(1);
    const logs = world.insertCalls.filter((c) => c.table === "notification_logs");
    expect(logs).toHaveLength(1);
    expect(logs[0].target_id).toBe("c2");
  });

  it("does not double-send for already-notified certificates", async () => {
    const world: FixtureWorld = {
      certificates: [cert({ id: "c1" })],
      customers: [{ id: "u1", name: "山田", email: "u1@example.com", line_user_id: null, followup_opt_out: false }],
      // 既に 6m リマインダーを送ったログが存在する
      notificationLogs: [{ target_id: "c1", type: "maintenance_reminder_6m", status: "sent" }],
      insertCalls: [],
    };
    const sent = await processMaintenanceReminders(
      makeSupabaseMock(world),
      baseSetting(),
      tenant,
      "Shop A",
      "starter",
      TODAY,
    );
    expect(sent).toBe(0);
  });

  it("returns 0 when there are no months configured at all", async () => {
    const world: FixtureWorld = {
      certificates: [],
      customers: [],
      notificationLogs: [],
      insertCalls: [],
    };
    const setting = baseSetting({ maintenance_reminder_months: [], maintenance_schedule_by_service: {} });
    const sent = await processMaintenanceReminders(
      makeSupabaseMock(world),
      setting,
      tenant,
      "Shop A",
      "starter",
      TODAY,
    );
    expect(sent).toBe(0);
  });
});
