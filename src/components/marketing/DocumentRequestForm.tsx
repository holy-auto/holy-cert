"use client";

import { LeadForm } from "./LeadForm";
import type { LeadSource } from "@/lib/marketing/leads";

type RoleType = "shop" | "agent" | "insurer";

const roleToSource: Record<RoleType, LeadSource> = {
  shop: "document_shop",
  agent: "document_agent",
  insurer: "document_insurer",
};

const roleCompanyLabel: Record<RoleType, string> = {
  shop: "会社名・店舗名",
  agent: "会社名",
  insurer: "会社名",
};

const roleCompanyPlaceholder: Record<RoleType, string> = {
  shop: "〇〇自動車 〇〇店",
  agent: "株式会社〇〇",
  insurer: "〇〇損害保険株式会社",
};

/**
 * Role-targeted document request form.
 *
 * Thin wrapper over `LeadForm`. Emits leads with source=`document_{role}`
 * so the operations side can segment by audience.
 */
export function DocumentRequestForm({ role }: { role: RoleType }) {
  return (
    <LeadForm
      source={roleToSource[role]}
      fields={{
        phone: true,
        industry: role === "shop",
        locations: role === "shop",
        message: {
          label: "ご質問・ご要望",
          placeholder: "具体的なご質問やご要望があればご記入ください",
          rows: 4,
        },
      }}
      labels={{
        company: roleCompanyLabel[role],
        companyPlaceholder: roleCompanyPlaceholder[role],
        submit: "無料で資料を請求する",
      }}
      success={{
        title: "資料請求を受け付けました",
        body: "ご登録いただいたメールアドレスに資料をお送りいたします。\n通常1営業日以内にお届けします。",
      }}
    />
  );
}
