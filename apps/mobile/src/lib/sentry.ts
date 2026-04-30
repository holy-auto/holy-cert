/**
 * Sentry のラッパー。
 *
 * @sentry/react-native パッケージは expo prebuild が必要になるため、
 * このモジュールは「動的 require + 失敗時 no-op」で実装してある。
 * 導入手順:
 *   1. apps/mobile で `npx expo install @sentry/react-native`
 *   2. app.json の plugins に "@sentry/react-native/expo" を追加
 *   3. EXPO_PUBLIC_SENTRY_DSN を eas.json の各 env に追加
 *   4. (任意) `npx sentry-cli login` してソースマップ自動アップロード
 *
 * 使い方:
 *   import { initSentry, captureException } from "@/lib/sentry";
 *   initSentry(); // 起動時に1回
 *   captureException(err);
 */

interface SentryShape {
  init: (config: Record<string, unknown>) => void;
  captureException: (err: unknown, hint?: Record<string, unknown>) => void;
  captureMessage: (msg: string, level?: string) => void;
  setUser: (user: { id?: string; email?: string } | null) => void;
  setTag: (key: string, value: string) => void;
  addBreadcrumb: (b: Record<string, unknown>) => void;
}

function loadSentry(): SentryShape | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("@sentry/react-native") as Partial<SentryShape>;
    if (mod && typeof mod.init === "function") {
      return mod as SentryShape;
    }
    return null;
  } catch {
    return null;
  }
}

let sentry: SentryShape | null = null;
let initialized = false;

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
const ENV = process.env.EXPO_PUBLIC_ENV ?? "development";

export function initSentry() {
  if (initialized) return;
  initialized = true;

  sentry = loadSentry();
  if (!sentry) {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      // eslint-disable-next-line no-console
      console.info(
        "[sentry] @sentry/react-native is not installed; running as no-op"
      );
    }
    return;
  }
  if (!DSN) {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      // eslint-disable-next-line no-console
      console.info("[sentry] EXPO_PUBLIC_SENTRY_DSN not set; running as no-op");
    }
    return;
  }

  try {
    sentry.init({
      dsn: DSN,
      enabled: true,
      environment: ENV,
      // 本番では sample 1.0、preview/staging は 0.5、dev は 0
      tracesSampleRate:
        ENV === "production" ? 1.0 : ENV === "development" ? 0 : 0.5,
      // PII 除外。サーバ側 sentry.client.config.ts と同じ姿勢
      beforeSend(event: { user?: { email?: string; ip_address?: string } }) {
        if (event.user) {
          delete event.user.email;
          delete event.user.ip_address;
        }
        return event;
      },
    });
  } catch (e) {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      // eslint-disable-next-line no-console
      console.error("[sentry] init failed:", e);
    }
  }
}

export function captureException(err: unknown, context?: Record<string, unknown>) {
  if (!sentry) return;
  try {
    sentry.captureException(err, context ? { extra: context } : undefined);
  } catch {
    // swallow — observability must never break runtime
  }
}

export function captureMessage(msg: string, level: "info" | "warning" | "error" = "info") {
  if (!sentry) return;
  try {
    sentry.captureMessage(msg, level);
  } catch {
    /* noop */
  }
}

export function setSentryUser(user: { id?: string; tenantId?: string } | null) {
  if (!sentry) return;
  try {
    if (user) {
      sentry.setUser({ id: user.id });
      if (user.tenantId) sentry.setTag("tenant_id", user.tenantId);
    } else {
      sentry.setUser(null);
    }
  } catch {
    /* noop */
  }
}
