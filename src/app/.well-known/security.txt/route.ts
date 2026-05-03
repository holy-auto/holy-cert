import { NextResponse } from "next/server";
import { siteConfig } from "@/lib/marketing/config";

export const runtime = "edge";
export const revalidate = 86400;

/**
 * RFC 9116 — security.txt at /.well-known/security.txt
 *
 * 企業 PoC / API 連携先のセキュリティチームが脆弱性を報告できる正式窓口を
 * 公開する。報告窓口を明示すると bug bounty / responsible disclosure の
 * 信頼コストが下がるため、エンタープライズ取引で問われる定番項目。
 *
 * Expires はメンテナンスを忘れないために 1 年先で固定し、再生成のたびに
 * 自動更新する (revalidate=24h で日次更新)。
 */
export async function GET() {
  const contact = process.env.SECURITY_CONTACT_EMAIL ?? `security@${hostnameOf(siteConfig.siteUrl)}`;
  const policyUrl = `${siteConfig.siteUrl}/security`;
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  const body = [
    `Contact: mailto:${contact}`,
    `Expires: ${expires}`,
    `Preferred-Languages: ja, en`,
    `Canonical: ${siteConfig.siteUrl}/.well-known/security.txt`,
    `Policy: ${policyUrl}`,
    "",
    "# Ledra のセキュリティ報告は、上記メールアドレスへお願いします。",
    "# Responsible disclosure をお守りいただいた研究者には、48 時間以内に",
    "# 受領確認の返信を行います。",
    "",
  ].join("\n");

  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=86400, s-maxage=86400",
    },
  });
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "ledra.co.jp";
  }
}
