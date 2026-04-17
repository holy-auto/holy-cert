import nextDynamic from "next/dynamic";

export const dynamic = "force-dynamic";

const ReservationsModeSwitch = nextDynamic(() => import("./ReservationsModeSwitch"), {
  loading: () => (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
    </div>
  ),
});

export const revalidate = 0;

export default function Page() {
  return <ReservationsModeSwitch />;
}
