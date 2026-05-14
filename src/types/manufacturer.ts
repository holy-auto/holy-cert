// ============================================================
// Manufacturer · Manufacturer Templates · Certified Tenants
// ============================================================
// Domain types backing the 認定施工店 / メーカー指定デザイン feature.
// See supabase/migrations/20260514100000_manufacturer_certifications.sql

import type { TemplateConfig } from "./templateOption";

export type ManufacturerServiceType = "coating" | "ppf" | "maintenance" | "body_repair" | "general";

export type ManufacturerCertificationStatus = "active" | "revoked";

// ---- DB Row Types ----------------------------------------------------------

export type ManufacturerRow = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  logo_asset_path: string | null;
  website_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ManufacturerTemplateRow = {
  id: string;
  manufacturer_id: string;
  name: string;
  description: string | null;
  service_type: ManufacturerServiceType | null;
  config_json: TemplateConfig;
  layout_key: string;
  thumbnail_path: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ManufacturerCertifiedTenantRow = {
  id: string;
  manufacturer_id: string;
  tenant_id: string;
  status: ManufacturerCertificationStatus;
  notes: string | null;
  certified_at: string;
  certified_by: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ManufacturerMembershipRole = "admin" | "viewer";

export type ManufacturerMembershipRow = {
  id: string;
  manufacturer_id: string;
  user_id: string;
  role: ManufacturerMembershipRole;
  display_name: string | null;
  is_active: boolean;
  invited_by: string | null;
  created_at: string;
  updated_at: string;
};

// ---- Display labels --------------------------------------------------------

export const MANUFACTURER_SERVICE_TYPE_LABELS: Record<ManufacturerServiceType, string> = {
  coating: "コーティング",
  ppf: "PPF",
  maintenance: "整備",
  body_repair: "鈑金塗装",
  general: "汎用",
};

export const MANUFACTURER_CERTIFICATION_STATUS_LABELS: Record<ManufacturerCertificationStatus, string> = {
  active: "認定中",
  revoked: "解除済み",
};
