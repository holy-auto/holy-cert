"use client";

import { useRouter } from "next/navigation";

export default function RestartTourButton() {
  const router = useRouter();

  function handleClick() {
    localStorage.removeItem("cartrust_tour_done");
    router.push("/admin");
  }

  return (
    <button onClick={handleClick} className="btn-secondary">
      使い方ツアーを再表示
    </button>
  );
}
