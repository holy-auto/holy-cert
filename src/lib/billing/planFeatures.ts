export type PlanTier = "mini" | "standard" | "pro";
export type FeatureKey =
  | "issue_certificate"
  | "export_one_csv"
  | "pdf_one"
  | "export_search_csv"
  | "export_selected_csv"
  | "pdf_zip_selected"
  | "templates_manage"
  | "logo_upload";

/**
 * UIの見た目制限用（APIガードとズレたらまずここを合わせる）
 * - 不明な plan_tier は "pro" 扱い（UIは緩く→実際はAPI/402で止まる）
 */
const FEATURES: Record<PlanTier, Record<FeatureKey, boolean>> = {
  mini: {
    issue_certificate: true,
    export_one_csv: true,
    pdf_one: false,
    export_search_csv: false,
    export_selected_csv: false,
    pdf_zip_selected: false,
    templates_manage: false,
    logo_upload: false,
  },
  standard: {
    issue_certificate: true,
    export_one_csv: true,
    pdf_one: true,
    export_search_csv: true,
    export_selected_csv: false,
    pdf_zip_selected: false,
    templates_manage: true,
    logo_upload: true,
  },
  pro: {
    issue_certificate: true,
    export_one_csv: true,
    pdf_one: true,
    export_search_csv: true,
    export_selected_csv: true,
    pdf_zip_selected: true,
    templates_manage: true,
    logo_upload: true,
  },
};

export function normalizePlanTier(v: any): PlanTier {
  const s = String(v ?? "").toLowerCase();
  if (s === "mini" || s === "standard" || s === "pro") return s;
  return "pro";
}

export function canUseFeature(planTier: any, feature: FeatureKey): boolean {
  const p = normalizePlanTier(planTier);
  return !!FEATURES[p]?.[feature];
}
