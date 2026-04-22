"use client";

import { LeadForm } from "./LeadForm";

/**
 * Public contact form.
 *
 * Thin wrapper over `LeadForm` with `source="contact"` and a required
 * message. All leads are persisted via `/api/marketing/leads` →
 * `marketing_leads` + Slack + auto-reply.
 */
export function ContactForm() {
  return (
    <LeadForm
      source="contact"
      fields={{
        phone: true,
        message: {
          required: true,
          label: "お問い合わせ内容",
          placeholder: "お問い合わせ内容をご記入ください",
          rows: 5,
        },
      }}
      success={{
        title: "送信完了",
        body: "お問い合わせいただきありがとうございます。\n1営業日以内にご返信いたします。",
      }}
    />
  );
}
