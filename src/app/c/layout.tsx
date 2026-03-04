import PublicBillingBanner from "./PublicBillingBanner";

export default function CLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="p-4">
      <PublicBillingBanner />
      {children}
    </main>
  );
}
