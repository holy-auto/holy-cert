"use client";

import { useEffect, useState } from "react";
// CSS is small (~3KB) and harmless to ship eagerly; keep it as a side-effect
// import so PostCSS/Next picks it up. The heavy JS module is loaded lazily.
import "driver.js/dist/driver.css";

const TOUR_DONE_KEY = "ledra_tour_done";

export default function OnboardingTour(): null {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Only show tour for first-time users
    if (localStorage.getItem(TOUR_DONE_KEY)) return;

    // Wait for sidebar and dashboard to render
    const timer = setTimeout(() => setReady(true), 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;
    let driverObj: { destroy: () => void; drive: () => void } | null = null;

    // Defer the driver.js bundle until we actually need to render the tour.
    // Returning users (TOUR_DONE_KEY set) never trigger this, so they no
    // longer pay for the parse/eval cost on every /admin visit.
    (async () => {
      const { driver } = await import("driver.js");
      if (cancelled) return;

      driverObj = driver({
        showProgress: true,
        animate: true,
        overlayColor: "rgba(0, 0, 0, 0.5)",
        stagePadding: 8,
        stageRadius: 12,
        popoverClass: "ledra-tour-popover",
        nextBtnText: "次へ",
        prevBtnText: "戻る",
        doneBtnText: "はじめる",
        progressText: "{{current}} / {{total}}",
        onDestroyStarted: () => {
          localStorage.setItem(TOUR_DONE_KEY, "1");
          driverObj?.destroy();
        },
        steps: [
          {
            popover: {
              title: "Ledra へようこそ！",
              description:
                "施工証明書の発行・管理を簡単に行えるプラットフォームです。最短で使い始めるための流れを、30 秒でご案内します。",
            },
          },
          {
            element: "[data-tour='setup-checklist']",
            popover: {
              title: "1. ここから順に進めましょう",
              description:
                "設定〜最初の証明書発行までの必要なステップが、実際の進捗に合わせて自動でチェックされます。各行のボタンを押すだけで対応する画面に進めます。",
              side: "bottom",
              align: "start",
            },
          },
          {
            element: "[data-tour='quick-actions']",
            popover: {
              title: "2. 主要な操作はここから",
              description:
                "証明書発行・飛び込み案件・顧客追加など、よく使う作業はクイックアクションから1クリックで起動できます。",
              side: "bottom",
              align: "start",
            },
          },
          {
            popover: {
              title: "3. 素早く検索・移動するには",
              description:
                "画面のどこでも Cmd+K (Mac) / Ctrl+K (Win) を押すとコマンドパレットが開きます。ページ名や顧客名で素早く移動できます。",
            },
          },
          {
            element: 'a[href="/admin/support"]',
            popover: {
              title: "困ったときは",
              description:
                "ご不明な点があれば、サポートから運営チームへ直接お問い合わせいただけます。チャット感覚でご利用ください。",
              side: "right",
            },
          },
        ],
      });

      driverObj.drive();
    })();

    return () => {
      cancelled = true;
      driverObj?.destroy();
    };
  }, [ready]);

  return null;
}

/** Reset tour flag — call this to re-enable the tour */
export function resetTour() {
  localStorage.removeItem(TOUR_DONE_KEY);
}
