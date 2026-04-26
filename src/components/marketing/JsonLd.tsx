/**
 * JSON-LD structured data for marketing pages.
 * Renders a <script type="application/ld+json"> tag.
 *
 * These are async server components so they can read the per-request CSP
 * nonce (set by src/proxy.ts) and attach it to the inline script. Without
 * the nonce, the strict CSP would block the tag.
 */

import { headers } from "next/headers";
import { siteConfig } from "@/lib/marketing/config";

async function getNonce(): Promise<string | undefined> {
  return (await headers()).get("x-nonce") ?? undefined;
}

export async function OrganizationJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: siteConfig.siteName,
    description: siteConfig.siteDescription,
    url: siteConfig.siteUrl,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "JPY",
      lowPrice: "9800",
      highPrice: "49800",
      offerCount: "3",
    },
    provider: {
      "@type": "Organization",
      name: "Ledra",
      url: siteConfig.siteUrl,
      email: siteConfig.contactEmail,
    },
  };

  const nonce = await getNonce();
  return <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

export async function WebSiteJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.siteName,
    url: siteConfig.siteUrl,
    description: siteConfig.siteDescription,
    inLanguage: "ja",
  };

  const nonce = await getNonce();
  return <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

type FaqItem = { question: string; answer: string };

export async function FAQJsonLd({ items }: { items: FaqItem[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };

  const nonce = await getNonce();
  return <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

type PlanOffer = { name: string; price: string; description: string };

export async function PricingJsonLd({ plans }: { plans: PlanOffer[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: siteConfig.siteName,
    url: siteConfig.siteUrl,
    applicationCategory: "BusinessApplication",
    offers: plans.map(({ name, description, price }) => ({
      "@type": "Offer",
      name,
      description,
      price: price.replace(/[¥,]/g, ""),
      priceCurrency: "JPY",
    })),
  };

  const nonce = await getNonce();
  return <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

type BreadcrumbItem = { name: string; url: string };

export async function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map(({ name, url }, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
      item: `${siteConfig.siteUrl}${url}`,
    })),
  };

  const nonce = await getNonce();
  return <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
