/**
 * Lead auto-reply emails via Resend.
 *
 * Sent immediately after a lead is captured. Keeps copy consistent with
 * the marketing site brand voice.
 */

import { renderToBuffer } from "@react-pdf/renderer";
import { sendResendEmail, type ResendAttachment } from "@/lib/email/resendSend";
import { siteConfig } from "./config";
import type { LeadSource } from "./leads";
import { RESOURCE_PDFS } from "./resourcePdf";
import {
  RESOURCE_BUNDLE_FILENAME,
  RESOURCE_BUNDLE_KEY,
  isResourceBundleKey,
  renderResourceBundle,
} from "./resourceBundle";

const FROM =
  process.env.LEAD_REPLY_FROM_EMAIL ??
  process.env.RESEND_FROM ??
  `Ledra <noreply@${new URL(siteConfig.siteUrl).hostname}>`;

type ReplyCopy = { subject: string; body: string };

function copyFor(source: LeadSource, name?: string, downloadUrl?: string, hasAttachment: boolean = false): ReplyCopy {
  const greeting = name ? `${name} 様` : "ご担当者様";

  const closing = [
    "",
    "ご不明な点があれば、このメールにそのままご返信ください。",
    "",
    "— Ledra チーム",
    siteConfig.siteUrl,
  ].join("\n");

  switch (source) {
    case "document_dl":
    case "document_shop":
    case "document_agent":
    case "document_insurer": {
      const lines: string[] = [greeting, "", "このたびは Ledra の資料をご請求いただきありがとうございます。"];
      if (downloadUrl && hasAttachment) {
        lines.push(
          "資料は本メールに添付しております。",
          "また、以下のURLからもダウンロードいただけます。",
          "",
          downloadUrl,
        );
      } else if (downloadUrl) {
        lines.push("以下のURLよりダウンロードいただけます。", "", downloadUrl);
      } else {
        lines.push("ご記入内容を確認のうえ、担当より資料をお送りいたします。");
      }
      lines.push(
        "",
        "記録を、業界の共通言語にする。",
        "Ledra は、施工現場の記録を WEB 施工証明書としてデジタル化し、",
        "施工店・顧客・保険会社・代理店の間で同じ「事実」を共有できるサービスです。",
        closing,
      );
      return {
        subject: "【Ledra】資料のお届け",
        body: lines.join("\n"),
      };
    }
    case "demo":
      return {
        subject: "【Ledra】デモご依頼の受付",
        body: [
          `${greeting}`,
          "",
          "デモのご依頼ありがとうございます。",
          "担当より1営業日以内に、日程候補をお送りいたします。",
          "",
          "お急ぎの場合は、このメールにご返信ください。",
          closing,
        ].join("\n"),
      };
    case "roi":
      return {
        subject: "【Ledra】ROIシミュレーション結果をお送りしました",
        body: [
          `${greeting}`,
          "",
          "ROIシミュレーターのご利用ありがとうございます。",
          "算出結果のサマリーを本メールにてお送りいたします。",
          "",
          "より詳細な試算・現場データに基づく提案をご希望の場合は、",
          "このメールにご返信ください。",
          closing,
        ].join("\n"),
      };
    case "newsletter":
      return {
        subject: "【Ledra】メルマガご登録ありがとうございます",
        body: [
          `${greeting}`,
          "",
          "メルマガにご登録いただきありがとうございます。",
          "Ledra からの最新情報・事例・アップデートをお届けいたします。",
          closing,
        ].join("\n"),
      };
    case "pilot":
      return {
        subject: "【Ledra】パイロット参加へのご応募ありがとうございます",
        body: [
          `${greeting}`,
          "",
          "パイロットプログラムへのご応募ありがとうございます。",
          "担当より1営業日以内に、詳細のご案内をお送りいたします。",
          closing,
        ].join("\n"),
      };
    case "contact":
    default:
      return {
        subject: "【Ledra】お問い合わせの受付",
        body: [
          `${greeting}`,
          "",
          "お問い合わせありがとうございます。",
          "担当より1営業日以内にご返信いたします。",
          closing,
        ].join("\n"),
      };
  }
}

function buildResourceDownloadUrl(resourceKey: string, leadId?: string): string {
  const path = isResourceBundleKey(resourceKey)
    ? `/api/marketing/resources/all/zip`
    : `/api/marketing/resources/${encodeURIComponent(resourceKey)}/pdf`;
  const url = new URL(path, siteConfig.siteUrl);
  if (leadId) url.searchParams.set("lead", leadId);
  return url.toString();
}

async function renderResourcePdfAttachment(resourceKey: string): Promise<ResendAttachment | null> {
  const entry = RESOURCE_PDFS[resourceKey];
  if (!entry) return null;
  try {
    const docElement = await entry.doc({ locale: "ja" });
    const buffer = await renderToBuffer(docElement);
    return {
      filename: entry.filename({ locale: "ja" }),
      content: Buffer.from(buffer).toString("base64"),
    };
  } catch (err) {
    console.error("[lead-reply] pdf render failed:", err);
    return null;
  }
}

async function renderResourceBundleAttachment(): Promise<ResendAttachment | null> {
  try {
    const buffer = await renderResourceBundle();
    return {
      filename: RESOURCE_BUNDLE_FILENAME,
      content: Buffer.from(buffer).toString("base64"),
    };
  } catch (err) {
    console.error("[lead-reply] bundle render failed:", err);
    return null;
  }
}

export async function sendLeadAutoReply(opts: {
  to: string;
  source: LeadSource;
  name?: string;
  resource_key?: string;
  leadId?: string;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[lead-reply] dev mode — would send auto-reply to:", opts.to);
    }
    return;
  }

  // Document leads always get a download URL in the email body — and
  // the matching PDF/ZIP attached when render succeeds. Role-targeted
  // requests (`document_shop`/`_agent`/`_insurer`) and any document_dl
  // without a specific resource key default to the full bundle so the
  // recipient never gets an empty email.
  const isDocumentSource =
    opts.source === "document_dl" ||
    opts.source === "document_shop" ||
    opts.source === "document_agent" ||
    opts.source === "document_insurer";

  let attachments: ResendAttachment[] | undefined;
  let downloadUrl: string | undefined;

  if (isDocumentSource) {
    const requestedKey = opts.resource_key;
    const useBundle = !requestedKey || isResourceBundleKey(requestedKey) || !RESOURCE_PDFS[requestedKey];

    if (useBundle) {
      const attachment = await renderResourceBundleAttachment();
      if (attachment) attachments = [attachment];
      downloadUrl = buildResourceDownloadUrl(RESOURCE_BUNDLE_KEY, opts.leadId);
    } else {
      const attachment = await renderResourcePdfAttachment(requestedKey);
      if (attachment) attachments = [attachment];
      downloadUrl = buildResourceDownloadUrl(requestedKey, opts.leadId);
    }
  }

  const { subject, body } = copyFor(opts.source, opts.name, downloadUrl, !!attachments);

  const result = await sendResendEmail({
    from: FROM,
    to: opts.to,
    subject,
    text: body,
    attachments,
    idempotencyKey: opts.leadId ? `lead-reply-${opts.leadId}` : undefined,
  });

  if (!result.ok) {
    console.error("[lead-reply] send failed:", result.error);
  }
}
