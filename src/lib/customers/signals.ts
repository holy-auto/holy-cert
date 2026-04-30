/**
 * 顧客 360° ビューの「次アクション」用 signals 抽出。
 *
 * 純関数のため UI / cron / AI prompt などから自由に流用できる。Phase 1 では
 * deterministic な数値判定だけで「次の一手」を導く。LLM での文章化は後段
 * (Phase 2) で signals を入力にして行う。
 *
 * Pure: 同じ入力に対して同じ結果を返す。`now` を引数にしているのはテスト時間
 * を固定するためで、実際の呼び出しでは `new Date()` を渡せば良い。
 */

export interface SignalCustomer {
  id: string;
  created_at?: string | null;
}

export interface SignalVehicle {
  id: string;
  maker?: string | null;
  model?: string | null;
}

export interface SignalCertificate {
  public_id: string;
  status: string | null;
  created_at: string;
  service_price?: number | null;
}

export interface SignalReservation {
  id: string;
  status: string | null; // 'confirmed' | 'arrived' | 'in_progress' | 'completed' | 'cancelled'
  scheduled_date: string; // ISO date 'YYYY-MM-DD'
  title?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  estimated_amount?: number | null;
}

export interface SignalInvoice {
  id: string;
  status: string | null; // 'draft' | 'sent' | 'accepted' | 'paid' | 'overdue' | 'rejected' | 'cancelled'
  total: number | null;
  due_date: string | null; // ISO date or null
  issued_at?: string | null;
  doc_number?: string | null;
}

export interface NextAction {
  /** UI key / e2e selector / 重複検知の安定 ID */
  id:
    | "register_vehicle"
    | "review_overdue_invoice"
    | "prepare_upcoming_reservation"
    | "open_in_progress_job"
    | "issue_certificate_for_completed"
    | "reengage_dormant_customer"
    | "follow_up_unpaid";
  label: string;
  reason: string;
  cta: { href: string; text: string };
  priority: "high" | "medium" | "low";
}

export interface CustomerSignals {
  vehicleCount: number;
  totalCertificateCount: number;
  activeCertificateCount: number;

  /** 直近の completed 予約からの経過日数。完了予約が無ければ null */
  daysSinceLastVisit: number | null;
  /** 直近の completed 予約 (display 用) */
  lastCompletedReservation: SignalReservation | null;

  /** 今後の予約 (confirmed / arrived) のうち最も近いもの */
  upcomingReservation: SignalReservation | null;
  /** 進行中 (in_progress) の予約 */
  inProgressReservation: SignalReservation | null;
  /** 完了済みだが証明書がまだ発行されていない予約 (= 発行漏れ候補) */
  completedReservationWithoutCertificate: SignalReservation | null;

  overdueInvoiceCount: number;
  overdueInvoiceTotal: number;
  unpaidInvoiceCount: number;
  unpaidInvoiceTotal: number;

  /**
   * 優先度順に並べた次アクション (最大 3 件)。Phase 2 では LLM が文章化し直す
   * が、Phase 1 ではこの配列をそのまま UI に流す。
   */
  nextActions: NextAction[];
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function dayDiff(later: Date, earlier: Date): number {
  return Math.floor((later.getTime() - earlier.getTime()) / MS_PER_DAY);
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const t = Date.parse(value);
  if (Number.isNaN(t)) return null;
  return new Date(t);
}

function isUnpaidStatus(status: string | null): boolean {
  return status === "sent" || status === "overdue";
}

function isOverdue(invoice: SignalInvoice, now: Date): boolean {
  if (invoice.status === "overdue") return true;
  if (invoice.status !== "sent") return false;
  const due = parseDate(invoice.due_date);
  if (!due) return false;
  return due.getTime() < now.getTime();
}

export function deriveSignals(input: {
  customer: SignalCustomer;
  vehicles: SignalVehicle[];
  certificates: SignalCertificate[];
  reservations: SignalReservation[];
  invoices: SignalInvoice[];
  now?: Date;
}): CustomerSignals {
  const now = input.now ?? new Date();
  const vehicles = input.vehicles ?? [];
  const certificates = input.certificates ?? [];
  const reservations = input.reservations ?? [];
  const invoices = input.invoices ?? [];

  const activeCertificateCount = certificates.filter((c) => c.status === "active").length;

  // 直近の completed 予約 (= 最後の来店)
  const completedReservations = reservations
    .filter((r) => r.status === "completed")
    .slice()
    .sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date));
  const lastCompletedReservation = completedReservations[0] ?? null;
  const daysSinceLastVisit = (() => {
    const d = parseDate(lastCompletedReservation?.scheduled_date);
    return d ? dayDiff(now, d) : null;
  })();

  // 完了済みだが証明書未発行の予約 (= 発行漏れ候補)
  // 簡易判定: 完了予約があるのに有効な証明書が 1 件も無い場合に最新の完了予約を出す。
  // (案件と証明書の正確な紐付けはスキーマに無いため heuristic)
  const completedReservationWithoutCertificate =
    activeCertificateCount === 0 && completedReservations.length > 0 ? completedReservations[0] : null;

  // 今後の予約
  const upcomingReservation = (() => {
    const candidates = reservations
      .filter((r) => r.status === "confirmed" || r.status === "arrived")
      .filter((r) => {
        const d = parseDate(r.scheduled_date);
        return d ? d.getTime() >= startOfDay(now).getTime() : false;
      })
      .slice()
      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
    return candidates[0] ?? null;
  })();
  const inProgressReservation = reservations.find((r) => r.status === "in_progress") ?? null;

  // 請求書集計
  let overdueInvoiceCount = 0;
  let overdueInvoiceTotal = 0;
  let unpaidInvoiceCount = 0;
  let unpaidInvoiceTotal = 0;
  for (const inv of invoices) {
    if (!isUnpaidStatus(inv.status)) continue;
    unpaidInvoiceCount += 1;
    unpaidInvoiceTotal += inv.total ?? 0;
    if (isOverdue(inv, now)) {
      overdueInvoiceCount += 1;
      overdueInvoiceTotal += inv.total ?? 0;
    }
  }

  const nextActions = buildNextActions({
    customerId: input.customer.id,
    vehicleCount: vehicles.length,
    upcomingReservation,
    inProgressReservation,
    completedReservationWithoutCertificate,
    overdueInvoiceCount,
    overdueInvoiceTotal,
    unpaidInvoiceCount,
    unpaidInvoiceTotal,
    daysSinceLastVisit,
  });

  return {
    vehicleCount: vehicles.length,
    totalCertificateCount: certificates.length,
    activeCertificateCount,
    daysSinceLastVisit,
    lastCompletedReservation,
    upcomingReservation,
    inProgressReservation,
    completedReservationWithoutCertificate,
    overdueInvoiceCount,
    overdueInvoiceTotal,
    unpaidInvoiceCount,
    unpaidInvoiceTotal,
    nextActions,
  };
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function buildNextActions(args: {
  customerId: string;
  vehicleCount: number;
  upcomingReservation: SignalReservation | null;
  inProgressReservation: SignalReservation | null;
  completedReservationWithoutCertificate: SignalReservation | null;
  overdueInvoiceCount: number;
  overdueInvoiceTotal: number;
  unpaidInvoiceCount: number;
  unpaidInvoiceTotal: number;
  daysSinceLastVisit: number | null;
}): NextAction[] {
  const out: NextAction[] = [];
  const cid = args.customerId;

  if (args.inProgressReservation) {
    out.push({
      id: "open_in_progress_job",
      label: "進行中の案件を確認",
      reason: `「${args.inProgressReservation.title ?? "進行中の案件"}」が作業中です`,
      cta: { href: `/admin/jobs/${args.inProgressReservation.id}`, text: "案件を開く" },
      priority: "high",
    });
  }

  if (args.overdueInvoiceCount > 0) {
    out.push({
      id: "review_overdue_invoice",
      label: "期限超過の請求書を確認",
      reason: `${args.overdueInvoiceCount} 件 / ¥${args.overdueInvoiceTotal.toLocaleString("ja-JP")} が期限超過`,
      cta: { href: `/admin/customers/${cid}?tab=invoices`, text: "請求タブを開く" },
      priority: "high",
    });
  } else if (args.unpaidInvoiceCount > 0) {
    out.push({
      id: "follow_up_unpaid",
      label: "未払請求のフォロー",
      reason: `${args.unpaidInvoiceCount} 件 / ¥${args.unpaidInvoiceTotal.toLocaleString("ja-JP")} が未入金`,
      cta: { href: `/admin/customers/${cid}?tab=invoices`, text: "請求タブを開く" },
      priority: "medium",
    });
  }

  if (args.completedReservationWithoutCertificate) {
    out.push({
      id: "issue_certificate_for_completed",
      label: "完了済み案件の証明書を発行",
      reason: "完了した来店に紐付く有効な証明書がありません",
      cta: {
        href: `/admin/certificates/new?customer_id=${cid}`,
        text: "証明書を発行",
      },
      priority: "high",
    });
  }

  if (args.upcomingReservation) {
    out.push({
      id: "prepare_upcoming_reservation",
      label: "次回予約の準備",
      reason: `${args.upcomingReservation.scheduled_date} に「${args.upcomingReservation.title ?? "予約"}」`,
      cta: { href: `/admin/jobs/${args.upcomingReservation.id}`, text: "案件を開く" },
      priority: "medium",
    });
  }

  if (args.vehicleCount === 0) {
    out.push({
      id: "register_vehicle",
      label: "車両を登録",
      reason: "登録済みの車両がありません",
      cta: {
        href: `/admin/vehicles/new?customer_id=${cid}&returnTo=/admin/customers/${cid}`,
        text: "車両を登録",
      },
      priority: "medium",
    });
  }

  if (
    args.daysSinceLastVisit != null &&
    args.daysSinceLastVisit >= 180 &&
    args.upcomingReservation == null &&
    args.inProgressReservation == null
  ) {
    out.push({
      id: "reengage_dormant_customer",
      label: "リエンゲージメント",
      reason: `最終来店から ${args.daysSinceLastVisit} 日経過しています`,
      cta: { href: `/admin/jobs/new?customer_id=${cid}`, text: "飛び込み案件を作成" },
      priority: "low",
    });
  }

  // 優先度順にソート (high → medium → low)、同優先度は先勝ち
  const order = { high: 0, medium: 1, low: 2 } as const;
  out.sort((a, b) => order[a.priority] - order[b.priority]);

  return out.slice(0, 3);
}
