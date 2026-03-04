import BillingFetchGuard from "./BillingFetchGuard";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BillingFetchGuard />
      {children}
    </>
  );
}
