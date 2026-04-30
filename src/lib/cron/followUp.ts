import { SupabaseClient } from "@supabase/supabase-js";
import { sendExpiryReminder, sendFollowUpEmail, sendMaintenanceReminder } from "@/lib/follow-up/email";
import { normalizePlanTier } from "@/lib/billing/planFeatures";
import {
  generateFollowUpContent,
  getSeasonalTrigger,
  getDaysUntilWarrantyEnd,
  type FollowUpTriggerType,
} from "@/lib/ai/followUpContent";

/** follow_up_settings テーブルの行型 */
export type FollowUpSetting = {
  tenant_id: string;
  enabled: boolean;
  reminder_days_before: number[] | null;
  follow_up_days_after: number[] | null;
  send_on_issue: boolean | null;
  first_reminder_days: number | null;
  warranty_end_days: number | null;
  inspection_pre_days: number | null;
  seasonal_enabled: boolean | null;
  /** Anniversary months (1-based) for maintenance reminders. Default [6, 12]. */
  maintenance_reminder_months: number[] | null;
  /**
   * 施工種別ごとのリマインド月数 override。例 `{ "ppf": [6,12,24] }`。
   * キー未指定の種別は `maintenance_reminder_months` (テナント既定) を使う。
   * `{}` (default) のときは全種別が既定値で動く。
   */
  maintenance_schedule_by_service: Record<string, number[]> | null;
};

export type TenantInfo = {
  id: string;
  name: string | null;
  phone: string | null;
  plan_tier: string | null;
};

export type FollowUpResult = {
  remindersSent: number;
  followUpsSent: number;
  seasonalSent: number;
};

const isAiPlan = (tier: string) => ["standard", "pro"].includes(tier);

// ─── 共通: 通知送信 ─────────────────────────────────────────────
async function sendNotification(
  supabase: SupabaseClient,
  params: {
    tenantId: string;
    certId: string;
    customerId: string;
    customerName: string;
    customerEmail?: string | null;
    lineUserId?: string | null;
    serviceName: string;
    issuedAt: string;
    warrantyPeriod?: string | null;
    trigger: FollowUpTriggerType;
    notifType: string;
    shopName: string;
    shopPhone?: string | null;
    planTier: string;
    vehicleMaker?: string | null;
    vehicleModel?: string | null;
    vehicleColor?: string | null;
  },
): Promise<boolean> {
  const useAI = isAiPlan(params.planTier);
  let sent = false;

  try {
    if (useAI) {
      await generateFollowUpContent({
        trigger: params.trigger,
        customer: { name: params.customerName },
        certificate: {
          label: params.serviceName,
          issued_at: params.issuedAt,
          warranty_period: params.warrantyPeriod ?? undefined,
        },
        vehicle: {
          maker: params.vehicleMaker ?? undefined,
          model: params.vehicleModel ?? undefined,
          color: params.vehicleColor ?? undefined,
        },
        shop: { name: params.shopName, phone: params.shopPhone ?? undefined },
      });

      if (params.customerEmail) {
        sent = await sendFollowUpEmail({
          shopName: params.shopName,
          customerEmail: params.customerEmail,
          customerName: params.customerName,
          certificateLabel: params.serviceName,
          daysSince: 0,
        });
      }
    } else {
      if (params.customerEmail) {
        sent = await sendFollowUpEmail({
          shopName: params.shopName,
          customerEmail: params.customerEmail,
          customerName: params.customerName,
          certificateLabel: params.serviceName,
          daysSince: 30,
        });
      }
    }
  } catch (err) {
    console.error(`[follow-up] notification error (${params.notifType}):`, err);
  }

  await supabase.from("notification_logs").insert({
    tenant_id: params.tenantId,
    type: params.notifType,
    target_type: "certificate",
    target_id: params.certId,
    recipient_email: params.customerEmail ?? null,
    status: sent ? "sent" : "failed",
  });

  return sent;
}

// ─── 1. 有効期限リマインダー ──────────────────────────────────────
export async function processExpiryReminders(
  supabase: SupabaseClient,
  setting: FollowUpSetting,
  shopName: string,
  today: Date,
): Promise<number> {
  let sent = 0;
  const reminderDays: number[] = setting.reminder_days_before ?? [30, 7, 1];
  const targetDates = reminderDays.map((days) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return { days, dateStr: d.toISOString().slice(0, 10) };
  });

  for (const { days, dateStr } of targetDates) {
    const { data: certs } = await supabase
      .from("certificates")
      .select("id, customer_id, customer_name, service_name, expiry_date")
      .eq("tenant_id", setting.tenant_id)
      .eq("expiry_date", dateStr)
      .neq("status", "void");

    const certList = certs ?? [];
    if (!certList.length) continue;

    const certIds = certList.map((c) => c.id);
    const notifType = `expiry_reminder_${days}d`;
    const { data: existingLogs } = await supabase
      .from("notification_logs")
      .select("target_id")
      .in("target_id", certIds)
      .eq("type", notifType);
    const alreadyNotifiedIds = new Set((existingLogs ?? []).map((l) => l.target_id));

    const customerIds = [...new Set(certList.map((c) => c.customer_id).filter(Boolean))] as string[];
    const customerMap = new Map<string, { name: string | null; email: string | null }>();
    if (customerIds.length) {
      const { data: customers } = await supabase.from("customers").select("id, name, email").in("id", customerIds);
      for (const c of customers ?? []) {
        customerMap.set(c.id, { name: c.name, email: c.email });
      }
    }

    for (const cert of certList) {
      if (!cert.customer_id) continue;
      if (alreadyNotifiedIds.has(cert.id)) continue;

      const customer = customerMap.get(cert.customer_id);
      if (!customer?.email) continue;

      const ok = await sendExpiryReminder({
        shopName,
        customerEmail: customer.email,
        customerName: customer.name ?? cert.customer_name ?? "お客様",
        certificateLabel: cert.service_name ?? "施工証明書",
        expiryDate: cert.expiry_date,
        daysUntil: days,
      });
      await supabase.from("notification_logs").insert({
        tenant_id: setting.tenant_id,
        type: notifType,
        target_type: "certificate",
        target_id: cert.id,
        recipient_email: customer.email,
        status: ok ? "sent" : "failed",
      });
      if (ok) sent++;
    }
  }

  return sent;
}

// ─── 2. 通常フォローアップ（90日・180日等） ──────────────────────
export async function processRegularFollowUps(
  supabase: SupabaseClient,
  setting: FollowUpSetting,
  tenant: TenantInfo,
  shopName: string,
  planTier: string,
  today: Date,
): Promise<number> {
  let sent = 0;
  const followUpDays: number[] = setting.follow_up_days_after ?? [90, 180];

  for (const days of followUpDays) {
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() - days);
    const dateStr = targetDate.toISOString().slice(0, 10);

    const { data: certs } = await supabase
      .from("certificates")
      .select(
        "id, customer_id, customer_name, service_name, created_at, warranty_period, vehicle_maker, vehicle_model, vehicle_color",
      )
      .eq("tenant_id", setting.tenant_id)
      .neq("status", "void")
      .gte("created_at", `${dateStr}T00:00:00`)
      .lte("created_at", `${dateStr}T23:59:59`);

    const certList = certs ?? [];
    if (!certList.length) continue;

    const certIds = certList.map((c) => c.id);
    const notifType = `follow_up_${days}d`;
    const { data: existingLogs } = await supabase
      .from("notification_logs")
      .select("target_id")
      .in("target_id", certIds)
      .eq("type", notifType);
    const alreadyNotifiedIds = new Set((existingLogs ?? []).map((l) => l.target_id));

    const customerIds = [...new Set(certList.map((c) => c.customer_id).filter(Boolean))] as string[];
    const customerMap = new Map<string, { name: string | null; email: string | null; line_user_id: string | null }>();
    if (customerIds.length) {
      const { data: customers } = await supabase
        .from("customers")
        .select("id, name, email, line_user_id")
        .in("id", customerIds);
      for (const c of customers ?? []) {
        customerMap.set(c.id, { name: c.name, email: c.email, line_user_id: c.line_user_id });
      }
    }

    for (const cert of certList) {
      if (!cert.customer_id) continue;
      if (alreadyNotifiedIds.has(cert.id)) continue;

      const customer = customerMap.get(cert.customer_id);
      if (!customer?.email) continue;

      const trigger: FollowUpTriggerType = days <= 90 ? "mid_followup" : "recoat_proposal";
      const ok = await sendNotification(supabase, {
        tenantId: setting.tenant_id,
        certId: cert.id,
        customerId: cert.customer_id,
        customerName: customer.name ?? cert.customer_name ?? "お客様",
        customerEmail: customer.email,
        lineUserId: customer.line_user_id,
        serviceName: cert.service_name ?? "施工証明書",
        issuedAt: cert.created_at,
        warrantyPeriod: cert.warranty_period,
        trigger,
        notifType,
        shopName,
        shopPhone: tenant.phone ?? undefined,
        planTier,
        vehicleMaker: cert.vehicle_maker,
        vehicleModel: cert.vehicle_model,
        vehicleColor: cert.vehicle_color,
      });
      if (ok) sent++;
    }
  }

  return sent;
}

// ─── 3. 発行直後フォロー ──────────────────────────────────────────
export async function processPostIssueFollowUps(
  supabase: SupabaseClient,
  setting: FollowUpSetting,
  tenant: TenantInfo,
  shopName: string,
  planTier: string,
  todayStr: string,
): Promise<number> {
  if (!setting.send_on_issue) return 0;

  let sent = 0;
  const { data: newCerts } = await supabase
    .from("certificates")
    .select(
      "id, customer_id, customer_name, service_name, created_at, warranty_period, vehicle_maker, vehicle_model, vehicle_color",
    )
    .eq("tenant_id", setting.tenant_id)
    .neq("status", "void")
    .gte("created_at", `${todayStr}T00:00:00`)
    .lte("created_at", `${todayStr}T23:59:59`);

  const newCertList = newCerts ?? [];
  const newCertIds = newCertList.map((c) => c.id);
  let postIssueNotifiedIds = new Set<string>();
  if (newCertIds.length) {
    const { data: existingLogs } = await supabase
      .from("notification_logs")
      .select("target_id")
      .in("target_id", newCertIds)
      .eq("type", "post_issue");
    postIssueNotifiedIds = new Set((existingLogs ?? []).map((l) => l.target_id));
  }

  const customerIds = [...new Set(newCertList.map((c) => c.customer_id).filter(Boolean))] as string[];
  const customerMap = new Map<string, { name: string | null; email: string | null }>();
  if (customerIds.length) {
    const { data: customers } = await supabase.from("customers").select("id, name, email").in("id", customerIds);
    for (const c of customers ?? []) {
      customerMap.set(c.id, { name: c.name, email: c.email });
    }
  }

  for (const cert of newCertList) {
    if (!cert.customer_id) continue;
    if (postIssueNotifiedIds.has(cert.id)) continue;

    const customer = customerMap.get(cert.customer_id);
    if (!customer?.email) continue;

    const ok = await sendNotification(supabase, {
      tenantId: setting.tenant_id,
      certId: cert.id,
      customerId: cert.customer_id,
      customerName: customer.name ?? cert.customer_name ?? "お客様",
      customerEmail: customer.email,
      serviceName: cert.service_name ?? "施工証明書",
      issuedAt: cert.created_at,
      warrantyPeriod: cert.warranty_period,
      trigger: "post_issue",
      notifType: "post_issue",
      shopName,
      shopPhone: tenant.phone ?? undefined,
      planTier,
      vehicleMaker: cert.vehicle_maker,
      vehicleModel: cert.vehicle_model,
      vehicleColor: cert.vehicle_color,
    });
    if (ok) sent++;
  }

  return sent;
}

// ─── 4. 30日後フォロー ────────────────────────────────────────────
export async function processFirstReminderFollowUps(
  supabase: SupabaseClient,
  setting: FollowUpSetting,
  tenant: TenantInfo,
  shopName: string,
  planTier: string,
  today: Date,
): Promise<number> {
  let sent = 0;
  const firstReminderDays = setting.first_reminder_days ?? 30;
  const targetDate = new Date(today);
  targetDate.setDate(targetDate.getDate() - firstReminderDays);
  const dateStr = targetDate.toISOString().slice(0, 10);

  const { data: certs } = await supabase
    .from("certificates")
    .select(
      "id, customer_id, customer_name, service_name, created_at, warranty_period, vehicle_maker, vehicle_model, vehicle_color",
    )
    .eq("tenant_id", setting.tenant_id)
    .neq("status", "void")
    .gte("created_at", `${dateStr}T00:00:00`)
    .lte("created_at", `${dateStr}T23:59:59`);

  const certList = certs ?? [];
  const notifType = `first_reminder_${firstReminderDays}d`;

  const certIds = certList.map((c) => c.id);
  let notifiedIds = new Set<string>();
  if (certIds.length) {
    const { data: existingLogs } = await supabase
      .from("notification_logs")
      .select("target_id")
      .in("target_id", certIds)
      .eq("type", notifType);
    notifiedIds = new Set((existingLogs ?? []).map((l) => l.target_id));
  }

  const customerIds = [...new Set(certList.map((c) => c.customer_id).filter(Boolean))] as string[];
  const customerMap = new Map<string, { name: string | null; email: string | null }>();
  if (customerIds.length) {
    const { data: customers } = await supabase.from("customers").select("id, name, email").in("id", customerIds);
    for (const c of customers ?? []) {
      customerMap.set(c.id, { name: c.name, email: c.email });
    }
  }

  for (const cert of certList) {
    if (!cert.customer_id) continue;
    if (notifiedIds.has(cert.id)) continue;

    const customer = customerMap.get(cert.customer_id);
    if (!customer?.email) continue;

    const ok = await sendNotification(supabase, {
      tenantId: setting.tenant_id,
      certId: cert.id,
      customerId: cert.customer_id,
      customerName: customer.name ?? cert.customer_name ?? "お客様",
      customerEmail: customer.email,
      serviceName: cert.service_name ?? "施工証明書",
      issuedAt: cert.created_at,
      warrantyPeriod: cert.warranty_period,
      trigger: "first_reminder",
      notifType,
      shopName,
      shopPhone: tenant.phone ?? undefined,
      planTier,
      vehicleMaker: cert.vehicle_maker,
      vehicleModel: cert.vehicle_model,
      vehicleColor: cert.vehicle_color,
    });
    if (ok) sent++;
  }

  return sent;
}

// ─── 5. 保証終了前フォロー ────────────────────────────────────────
export async function processWarrantyEndFollowUps(
  supabase: SupabaseClient,
  setting: FollowUpSetting,
  tenant: TenantInfo,
  shopName: string,
  planTier: string,
): Promise<number> {
  let sent = 0;
  const warrantyEndDays = setting.warranty_end_days ?? 60;

  const { data: activeCerts } = await supabase
    .from("certificates")
    .select(
      "id, customer_id, customer_name, service_name, created_at, warranty_period, vehicle_maker, vehicle_model, vehicle_color",
    )
    .eq("tenant_id", setting.tenant_id)
    .not("warranty_period", "is", null)
    .neq("status", "void");

  const filtered = (activeCerts ?? []).filter((cert) => {
    if (!cert.customer_id) return false;
    const daysUntilEnd = getDaysUntilWarrantyEnd(cert.created_at, cert.warranty_period);
    return daysUntilEnd !== null && daysUntilEnd === warrantyEndDays;
  });

  const notifType = "warranty_end_reminder";
  const certIds = filtered.map((c) => c.id);
  let notifiedIds = new Set<string>();
  if (certIds.length) {
    const { data: existingLogs } = await supabase
      .from("notification_logs")
      .select("target_id")
      .in("target_id", certIds)
      .eq("type", notifType);
    notifiedIds = new Set((existingLogs ?? []).map((l) => l.target_id));
  }

  const customerIds = [...new Set(filtered.map((c) => c.customer_id).filter(Boolean))] as string[];
  const customerMap = new Map<string, { name: string | null; email: string | null }>();
  if (customerIds.length) {
    const { data: customers } = await supabase.from("customers").select("id, name, email").in("id", customerIds);
    for (const c of customers ?? []) {
      customerMap.set(c.id, { name: c.name, email: c.email });
    }
  }

  for (const cert of filtered) {
    if (notifiedIds.has(cert.id)) continue;

    const customer = customerMap.get(cert.customer_id!);
    if (!customer?.email) continue;

    const ok = await sendNotification(supabase, {
      tenantId: setting.tenant_id,
      certId: cert.id,
      customerId: cert.customer_id!,
      customerName: customer.name ?? cert.customer_name ?? "お客様",
      customerEmail: customer.email,
      serviceName: cert.service_name ?? "施工証明書",
      issuedAt: cert.created_at,
      warrantyPeriod: cert.warranty_period,
      trigger: "warranty_end",
      notifType,
      shopName,
      shopPhone: tenant.phone ?? undefined,
      planTier,
      vehicleMaker: cert.vehicle_maker,
      vehicleModel: cert.vehicle_model,
      vehicleColor: cert.vehicle_color,
    });
    if (ok) sent++;
  }

  return sent;
}

// ─── 6. 季節提案 ──────────────────────────────────────────────────
export async function processSeasonalProposals(
  supabase: SupabaseClient,
  setting: FollowUpSetting,
  shopName: string,
  today: Date,
): Promise<number> {
  if (!setting.seasonal_enabled) return 0;

  const currentMonth = today.getMonth() + 1;
  const seasonalTrigger = getSeasonalTrigger(currentMonth);
  if (!seasonalTrigger) return 0;
  if (today.getDate() !== 1) return 0;

  let sent = 0;
  const todayStr = today.toISOString().slice(0, 10);

  const { data: allCustomers } = await supabase
    .from("customers")
    .select("id, name, email")
    .eq("tenant_id", setting.tenant_id)
    .not("email", "is", null)
    .limit(100);

  const notifType = `seasonal_${currentMonth}_${today.getFullYear()}`;
  const { data: existingLogs } = await supabase
    .from("notification_logs")
    .select("target_id")
    .eq("tenant_id", setting.tenant_id)
    .eq("type", notifType);
  const alreadySentIds = new Set((existingLogs ?? []).map((l) => l.target_id));

  for (const customer of allCustomers ?? []) {
    if (alreadySentIds.has(customer.id)) continue;
    await generateFollowUpContent({
      trigger: seasonalTrigger,
      customer: { name: customer.name ?? "お客様" },
      certificate: { label: "季節メンテナンス", issued_at: todayStr },
      vehicle: {},
      shop: { name: shopName },
    });
    const ok = await sendFollowUpEmail({
      shopName,
      customerEmail: customer.email!,
      customerName: customer.name ?? "お客様",
      certificateLabel: "季節メンテナンスのご案内",
      daysSince: 0,
    });
    await supabase.from("notification_logs").insert({
      tenant_id: setting.tenant_id,
      type: notifType,
      target_type: "customer",
      target_id: customer.id,
      recipient_email: customer.email,
      status: ok ? "sent" : "failed",
    });
    if (ok) sent++;
  }

  return sent;
}

// ─── 7. メンテナンスリマインダー（6/12 ヶ月点検） ──────────────────
//
// 月単位の節目で発火する点検リマインダー。recoat_proposal は「再施工
// 提案」のトーンで再度の売上を狙うのに対し、maintenance_reminder は
// 「点検にいらしてください」のトーンで信頼関係維持を狙う。
//
// 月計算は同日付で一致させる（例: 4/29 発行 → 10/29, 翌年 4/29 に発火）。
// うるう日 (2/29) のように翌月に同日が無い場合は月末日を使う。

/**
 * 今日から N ヶ月前の日付 (yyyy-mm-dd) を返す。
 *
 * 月末オーバーフロー時 (例: 3/31 から 1 ヶ月戻る → 2/28 or 2/29) は
 * 直前月の月末日に丸める。テスト容易性のため切り出している。
 */
export function monthsBackDateStr(today: Date, months: number): string {
  const target = new Date(today);
  const day = target.getDate();
  target.setMonth(target.getMonth() - months);
  if (target.getDate() !== day) {
    // overflow → previous month's last day
    target.setDate(0);
  }
  return target.toISOString().slice(0, 10);
}

/**
 * 施工種別に応じたリマインド月配列を返す。
 *
 * - `byService` にキーがある → そちらを使う
 * - 無い or `serviceType` 未指定 → `defaults` (テナント全体の既定値)
 * - 1..120 の整数のみに絞る (DB 制約と整合)
 *
 * 純関数。cron / 管理 UI / プレビュー API などから流用する想定。
 */
export function pickMaintenanceMonths(
  serviceType: string | null | undefined,
  byService: Record<string, number[]> | null | undefined,
  defaults: number[] | null | undefined,
): number[] {
  const sanitize = (arr: number[] | null | undefined): number[] =>
    (arr ?? []).filter((m) => Number.isInteger(m) && m > 0 && m <= 120);

  const fallback = sanitize(defaults ?? [6, 12]);
  if (!serviceType) return fallback;

  const key = serviceType.trim().toLowerCase();
  if (!key || !byService) return fallback;
  if (Object.prototype.hasOwnProperty.call(byService, key)) {
    const override = sanitize(byService[key]);
    return override; // 空配列なら "無効化" の意味で意図的にそのまま返す
  }
  return fallback;
}

export async function processMaintenanceReminders(
  supabase: SupabaseClient,
  setting: FollowUpSetting,
  tenant: TenantInfo,
  shopName: string,
  planTier: string,
  today: Date,
): Promise<number> {
  // テナント既定 + 全 override の和集合 = 「今日が節目になり得る月数」
  const defaultMonths = (setting.maintenance_reminder_months ?? [6, 12]).filter((m) => m > 0 && m <= 120);
  const byService = setting.maintenance_schedule_by_service ?? {};
  const allMonths = new Set<number>(defaultMonths);
  for (const arr of Object.values(byService)) {
    for (const m of arr ?? []) {
      if (Number.isInteger(m) && m > 0 && m <= 120) allMonths.add(m);
    }
  }
  if (!allMonths.size) return 0;

  let sent = 0;

  for (const m of allMonths) {
    const dateStr = monthsBackDateStr(today, m);

    const { data: certs } = await supabase
      .from("certificates")
      .select("id, customer_id, customer_name, service_name, service_type, vehicle_id, expiry_value, created_at")
      .eq("tenant_id", setting.tenant_id)
      .neq("status", "void")
      .gte("created_at", `${dateStr}T00:00:00`)
      .lte("created_at", `${dateStr}T23:59:59`);

    const certList = certs ?? [];
    if (!certList.length) continue;

    // service_type 別スケジュールに照らして「今月は対象でない」種別を間引く
    const eligibleCerts = certList.filter((c) =>
      pickMaintenanceMonths(c.service_type, byService, defaultMonths).includes(m),
    );
    if (!eligibleCerts.length) continue;

    const certIds = eligibleCerts.map((c) => c.id);
    const notifType = `maintenance_reminder_${m}m`;
    const { data: existingLogs } = await supabase
      .from("notification_logs")
      .select("target_id")
      .in("target_id", certIds)
      .eq("type", notifType);
    const alreadyNotifiedIds = new Set((existingLogs ?? []).map((l) => l.target_id));

    const customerIds = [...new Set(eligibleCerts.map((c) => c.customer_id).filter(Boolean))] as string[];
    type CustomerRow = {
      id: string;
      name: string | null;
      email: string | null;
      line_user_id: string | null;
      followup_opt_out: boolean | null;
    };
    const customerMap = new Map<string, CustomerRow>();
    if (customerIds.length) {
      const { data: customers } = (await supabase
        .from("customers")
        .select("id, name, email, line_user_id, followup_opt_out")
        .in("id", customerIds)) as { data: CustomerRow[] | null };
      for (const c of customers ?? []) customerMap.set(c.id, c);
    }

    // 車両情報 (AI パーソナライズ用)。失敗してもメインフローは止めない。
    const vehicleIds = [...new Set(eligibleCerts.map((c) => c.vehicle_id).filter(Boolean))] as string[];
    type VehicleRow = { id: string; maker: string | null; model: string | null; color: string | null };
    const vehicleMap = new Map<string, VehicleRow>();
    if (vehicleIds.length) {
      const { data: vehicles } = (await supabase
        .from("vehicles")
        .select("id, maker, model, color")
        .in("id", vehicleIds)) as { data: VehicleRow[] | null };
      for (const v of vehicles ?? []) vehicleMap.set(v.id, v);
    }

    const useAI = isAiPlan(planTier);

    for (const cert of eligibleCerts) {
      if (!cert.customer_id) continue;
      if (alreadyNotifiedIds.has(cert.id)) continue;
      const customer = customerMap.get(cert.customer_id);
      if (!customer) continue;
      if (customer.followup_opt_out) continue;
      if (!customer.email) continue; // LINE Push は別途対応 (現状 email 送信のみ)

      const customerName = customer.name ?? cert.customer_name ?? "お客様";
      const certLabel = cert.service_name ?? "施工証明書";

      // Standard / Pro プランでは AI でメッセージのトーンをパーソナライズし、
      // それ以外はテンプレートで送る。AI 失敗時はテンプレートにフォールバック。
      if (useAI) {
        try {
          const vehicle = cert.vehicle_id ? vehicleMap.get(cert.vehicle_id) : undefined;
          await generateFollowUpContent({
            trigger: "maintenance_reminder",
            customer: { name: customerName },
            certificate: {
              label: certLabel,
              issued_at: cert.created_at,
              warranty_period: cert.expiry_value ?? undefined,
            },
            vehicle: {
              maker: vehicle?.maker ?? undefined,
              model: vehicle?.model ?? undefined,
              color: vehicle?.color ?? undefined,
            },
            shop: { name: shopName, phone: tenant.phone ?? undefined },
            daysElapsed: m * 30,
          });
          // 生成内容自体はログ用に既存のテンプレートメールへ流用 (件名/本文は
          // 第二段で email body へ差し込めるよう拡張予定)。MVP では AI 生成
          // は呼ばれていることを保証し、配信は既存テンプレートで行う。
        } catch (err) {
          console.error("[follow-up] maintenance AI personalization failed:", err);
        }
      }

      const ok = await sendMaintenanceReminder({
        shopName,
        customerEmail: customer.email,
        customerName,
        certificateLabel: certLabel,
        monthsSince: m,
      });
      await supabase.from("notification_logs").insert({
        tenant_id: setting.tenant_id,
        type: notifType,
        target_type: "certificate",
        target_id: cert.id,
        recipient_email: customer.email,
        status: ok ? "sent" : "failed",
      });
      if (ok) sent++;
    }
  }

  return sent;
}
