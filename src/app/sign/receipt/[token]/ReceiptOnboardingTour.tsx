"use client";

import { useEffect, useState } from "react";
// CSS は ~3KB と小さいので side-effect import で先読み。重い JS 本体は遅延ロードする。
import "driver.js/dist/driver.css";

const TOUR_DONE_KEY = "ledra_receipt_tour_done";

/**
 * 受領サイン (/sign/receipt/[token]) ページのオンボーディングツアー。
 *
 * 顧客は本ページに不慣れなため、初回アクセス時に
 *   1. 受領内容の確認  2. メール入力  3. 電話下4桁の本人確認
 *   4. 同意文言  5. 受領サインボタン
 * の順で案内する。/admin の OnboardingTour と同じ pattern (driver.js + localStorage flag)。
 *
 * 一度完了すると localStorage の `ledra_receipt_tour_done` が立ち、
 * 同じ端末では再表示されない。
 */
export default function ReceiptOnboardingTour({ enabled }: { enabled: boolean }): null {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(TOUR_DONE_KEY)) return;

    // フォーム DOM の生成を待つ
    const timer = setTimeout(() => setReady(true), 500);
    return () => clearTimeout(timer);
  }, [enabled]);

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;
    let driverObj: { destroy: () => void; drive: () => void } | null = null;

    (async () => {
      const { driver } = await import("driver.js");
      if (cancelled) return;

      driverObj = driver({
        showProgress: true,
        animate: true,
        overlayColor: "rgba(0, 0, 0, 0.6)",
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
              title: "受領サインのお願い",
              description:
                "施工店から作業完了のご連絡です。内容をご確認の上、受領サイン (電子署名) をお願いします。所要時間 1 分程度です。",
            },
          },
          {
            element: "[data-tour='receipt-content']",
            popover: {
              title: "1. 作業完了内容の確認",
              description:
                "施工店・車両・施工種別など、本日の作業内容です。詳細 PDF が表示されている場合は別タブで原本もご確認いただけます。",
              side: "bottom",
              align: "start",
            },
          },
          {
            element: "[data-tour='receipt-email']",
            popover: {
              title: "2. メールアドレスの入力",
              description: "受領サインの証跡として記録されます。普段ご利用のメールアドレスをご入力ください。",
              side: "top",
              align: "start",
            },
          },
          {
            element: "[data-tour='receipt-phone']",
            popover: {
              title: "3. ご本人確認 (電話番号下4桁)",
              description:
                "なりすまし防止のため、施工依頼時にご登録いただいた電話番号の下4桁を入力します。3 回まで入力でき、超過するとリンクが無効になります。",
              side: "top",
              align: "start",
            },
          },
          {
            element: "[data-tour='receipt-consent']",
            popover: {
              title: "4. 同意文言の確認",
              description:
                "電子署名法 (平成12年法律第102号) に基づく受領サインの内容です。チェックを入れることで同意の意思表示となります。",
              side: "top",
              align: "start",
            },
          },
          {
            element: "[data-tour='receipt-submit']",
            popover: {
              title: "5. 受領サインを実行",
              description:
                "ボタンを押すと暗号署名が記録されます。完了後はサーバーと Polygon ブロックチェーン上に証跡が保管され、第三者がいつでも有効性を検証できます。",
              side: "top",
              align: "center",
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

/** ツアー完了 flag をリセット (デバッグ・再表示用) */
export function resetReceiptTour() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOUR_DONE_KEY);
  }
}
