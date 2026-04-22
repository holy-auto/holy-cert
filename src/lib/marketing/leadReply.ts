/**
 * Lead auto-reply emails via Resend.
 *
 * Sent immediately after a lead is captured. Keeps copy consistent with
 * the marketing site brand voice.
 */

import { Resend } from "resend";
import { siteConfig } from "./config";
import type { LeadSource } from "./leads";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? "");
}

const FROM = process.env.LEAD_REPLY_FROM_EMAIL ?? process.env.RESEND_FROM ?? `Ledra <noreply@${new URL(siteConfig.siteUrl).hostname}>`;

type ReplyCopy = { subject: string; body: string };

function copyFor(source: LeadSource, name?: string): ReplyCopy {
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
    case "document_insurer":
      return {
        subject: "【Ledra】資料のお届け",
        body: [
          `${greeting}`,
          "",
          "このたびは Ledra の資料をご請求いただきありがとうございます。",
          "資料は本メールに添付、またはダウンロードURLよりご確認いただけます。",
          "",
          "記録を、業界の共通言語にする。",
          "Ledra は、施工現場の記録を WEB 施工証明書としてデジタル化し、",
          "施工店・顧客・保険会社・代理店の間で同じ「事実」を共有できるサービスです。",
          closing,
        ].join("\n"),
      };
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

export async function sendLeadAutoReply(opts: {
  to: string;
  source: LeadSource;
  name?: string;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[lead-reply] dev mode — would send auto-reply to:", opts.to);
    }
    return;
  }

  const { subject, body } = copyFor(opts.source, opts.name);

  try {
    await getResend().emails.send({
      from: FROM,
      to: opts.to,
      subject,
      text: body,
    });
  } catch (err) {
    console.error("[lead-reply] send failed:", err);
  }
}
