import type { Metadata } from "next";
import DeliveryReceiptClient from "./DeliveryReceiptClient";

export const metadata: Metadata = {
  title: "受領サイン | Ledra",
  description: "作業完了の内容を確認し、受領サイン (電子署名) を行ってください。",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function DeliveryReceiptPage({ params }: PageProps) {
  const { token } = await params;
  return <DeliveryReceiptClient token={token} />;
}
