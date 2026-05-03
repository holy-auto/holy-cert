import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";

import { useTerminal } from "@/hooks/useTerminal";

/**
 * Apple Tap to Pay 要件 1.5:
 *   "At the launch of your app or when it comes to the foreground,
 *    your app must trigger the initial preparation and warming-up of
 *    Tap to Pay on an iPhone."
 *
 * このフックを Root レイアウトに1度だけマウントすると、
 *   - iPhoneアプリ起動直後
 *   - background → foreground 復帰時
 * の両方で Stripe Terminal を初期化（warmup）し、
 * チェックアウト時に1秒以内（要件 5.6）で Tap to Pay UI を呼び出せる状態にする。
 *
 * iPhone 以外（iPad / Android / web）では何もしない。
 */
export function useTapToPayWarmup() {
  const { initTerminal } = useTerminal();
  const lastWarmupAt = useRef<number>(0);

  // タブレット判定はランタイム要素のため iPhone 限定でも厳密性を担保するため
  // ここでは Platform.OS のみで判定（iPad は Tap to Pay 非対応のため warmup
  // しても問題なし）
  const isIos = Platform.OS === "ios";

  useEffect(() => {
    if (!isIos) return;

    // 起動時 warmup
    void runWarmup();

    // フォアグラウンド復帰時 warmup
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") {
        void runWarmup();
      }
    });

    return () => {
      sub.remove();
    };

    async function runWarmup() {
      // 5秒以内の連続呼び出しは抑制（Stripe Terminal の二重初期化を回避）
      const now = Date.now();
      if (now - lastWarmupAt.current < 5000) return;
      lastWarmupAt.current = now;

      try {
        await initTerminal();
      } catch {
        // warmup 失敗はチェックアウト時に再試行されるので握りつぶす
      }
    }
  }, [isIos, initTerminal]);
}
