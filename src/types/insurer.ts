export type InsurerRole = "admin" | "member" | "viewer" | "auditor";

export type InsuranceCaseStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "info_requested"
  | "approved"
  | "rejected"
  | "closed"
  | "cancelled";

export type InsuranceCaseType =
  | "accident"
  | "vehicle_insurance"
  | "rework_check"
  | "damage_check"
  | "other";

export type InsuranceCaseSummary = {
  id: string;
  case_number: string;
  title: string;
  case_type: InsuranceCaseType;
  status: InsuranceCaseStatus;
  tenant_name: string;
  vehicle_summary: string;
  submitted_at: string | null;
  updated_at: string;
  last_message_at: string | null;
};

export type InsuranceCaseDetail = InsuranceCaseSummary & {
  description: string | null;
  damage_summary: string | null;
  admitted_at: string | null;
  messages: InsuranceCaseMessage[];
  participants: InsuranceCaseParticipant[];
};

export type InsuranceCaseMessage = {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  body: string;
  visibility: "shared" | "internal";
  created_at: string;
};

export type InsuranceCaseParticipant = {
  id: string;
  user_id: string;
  role: string;
  display_name: string | null;
  is_active: boolean;
};

export type InsuranceCaseStats = {
  total: number;
  active: number;
  pending_review: number;
  info_requested: number;
  resolved: number;
};

export type InsurerDashboardStats = {
  total_views: number;
  unique_certs: number;
  month_actions: number;
  recent_activity: { date: string; count: number }[];
  action_breakdown: { action: string; count: number }[];
  recent_certs: {
    public_id: string;
    customer_name: string;
    status: string;
    vehicle_info_json: Record<string, string> | null;
    viewed_at: string;
  }[];
  case_stats: InsuranceCaseStats;
  active_cases: InsuranceCaseSummary[];
};
