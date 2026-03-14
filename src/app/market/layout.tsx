import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "HolyMarket - BtoB中古車在庫共有プラットフォーム",
  description: "業者間で在庫を共有する中古車マーケットプレイス",
};

export default function MarketLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
