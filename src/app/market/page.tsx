import { redirect } from "next/navigation";
import { getDealerSession } from "@/lib/market/auth";

export default async function MarketIndexPage() {
  const session = await getDealerSession();
  if (session) {
    redirect("/market/dashboard");
  } else {
    redirect("/market/login");
  }
}
