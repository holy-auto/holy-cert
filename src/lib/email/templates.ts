/**
 * Tenant-customizable email templates.
 *
 * 各 topic に対し:
 *   1. tenant_email_templates から (tenant_id, topic, is_active=true) を引く
 *   2. ヒットすれば subject/body をそのテンプレートで {{var}} 置換してレンダ
 *   3. なければ default テンプレを使う (built-in, この module 内に定義)
 *
 * variables は `Record<string, string | number | undefined>`。
 * undefined は空文字列に置換。HTML エスケープは「body_html を信頼する」
 * 立て付け (テナント編集者は加盟店オーナーで、自テナント宛にしか配信しない)。
 *
 * セキュリティ: テンプレ自体に <script> を埋めると XSS 化するので、
 * 編集 UI 側で sanitize-html 等を通してから保存する想定。
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, any, any>;

export type TemplateVars = Record<string, string | number | null | undefined>;

export interface RenderedEmail {
  subject: string;
  body_html: string;
  body_text: string;
}

interface DefaultTemplate {
  subject: string;
  body_html: string;
  body_text: string;
}

/**
 * Built-in default templates. Adding a new tenant-customizable email
 * means: (a) add a row here, (b) enumerate vars in JSDoc, (c) call
 * `renderEmailTemplate(db, tenantId, topic, vars)` from the sender.
 */
const DEFAULTS: Record<string, DefaultTemplate> = {
  booking_confirmation: {
    subject: "ご予約を承りました — {{tenant_name}}",
    body_html:
      "<p>{{customer_name}} 様</p>" +
      "<p>下記の内容でご予約を承りました。</p>" +
      "<p>日時: {{scheduled_at}}<br>店舗: {{tenant_name}}</p>" +
      "<p>当日お待ちしております。</p>",
    body_text:
      "{{customer_name}} 様\n\n" +
      "下記の内容でご予約を承りました。\n\n" +
      "日時: {{scheduled_at}}\n店舗: {{tenant_name}}\n\n" +
      "当日お待ちしております。",
  },
  certificate_issued: {
    subject: "施工証明書を発行しました — {{tenant_name}}",
    body_html:
      "<p>{{customer_name}} 様</p>" +
      "<p>本日の施工に対する証明書を発行いたしました。</p>" +
      '<p><a href="{{certificate_url}}">こちら</a> から閲覧できます。</p>',
    body_text: "{{customer_name}} 様\n\n" + "本日の施工に対する証明書を発行いたしました。\n\n" + "{{certificate_url}}",
  },
  customer_data_export: {
    subject: "個人データのダウンロード準備が完了しました — {{tenant_name}}",
    body_html:
      "<p>{{customer_name}} 様</p>" +
      "<p>ご請求のあった個人データのダウンロード URL をお送りします。" +
      "URL は 7 日後に失効します。</p>" +
      '<p><a href="{{download_url}}">{{download_url}}</a></p>',
    body_text:
      "{{customer_name}} 様\n\n" +
      "ご請求のあった個人データのダウンロード URL をお送りします。\n" +
      "URL は 7 日後に失効します。\n\n" +
      "{{download_url}}",
  },
};

const VAR_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

export function applyTemplate(text: string, vars: TemplateVars): string {
  return text.replace(VAR_RE, (_m, key: string) => {
    const v = vars[key];
    if (v === undefined || v === null) return "";
    return String(v);
  });
}

export async function renderEmailTemplate(
  db: Db,
  tenantId: string,
  topic: string,
  vars: TemplateVars,
): Promise<RenderedEmail> {
  const { data, error } = await db
    .from("tenant_email_templates")
    .select("subject, body_html, body_text, is_active")
    .eq("tenant_id", tenantId)
    .eq("topic", topic)
    .eq("is_active", true)
    .maybeSingle();

  const fallback = DEFAULTS[topic];
  if (!fallback && (!data || error)) {
    throw new Error(`unknown_email_topic:${topic}`);
  }

  const tpl =
    data && !error
      ? {
          subject: data.subject as string,
          body_html: data.body_html as string,
          body_text: (data.body_text as string | null) ?? "",
        }
      : fallback;

  if (!data && error) {
    logger.warn("tenant_email_templates lookup failed", { tenantId, topic, error: error.message });
  }

  return {
    subject: applyTemplate(tpl.subject, vars),
    body_html: applyTemplate(tpl.body_html, vars),
    body_text: applyTemplate(tpl.body_text || tpl.body_html.replace(/<[^>]+>/g, ""), vars),
  };
}

/** Test/runtime helper — enumerate built-in topics. */
export function listBuiltinTopics(): string[] {
  return Object.keys(DEFAULTS);
}
