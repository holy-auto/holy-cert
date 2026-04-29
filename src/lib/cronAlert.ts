const RESEND_API = "https://api.resend.com/emails";

/** Lazily forward to Sentry without blocking cron completion. */
function captureSentry(jobName: string, error: unknown) {
  import("@sentry/nextjs")
    .then((Sentry) => {
      Sentry.withScope((scope) => {
        scope.setTag("cron_job", jobName);
        scope.setLevel("error");
        Sentry.captureException(error);
      });
    })
    .catch(() => {});
}

/**
 * Send an alert email when a cron job fails.
 *
 * 二重通知 (Sentry + email) で見逃しを防ぐ:
 *   1. Sentry に `cron_job` タグ付きで送信 (検知・集計・グラフ化)
 *   2. CONTACT_TO_EMAIL に通知 (即応性 / メーリス共有)
 * 環境変数が無い場合でも console.error は必ず出る。
 */
export async function sendCronFailureAlert(jobName: string, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  console.error(`[cron/${jobName}] FAILURE:`, message);
  captureSentry(jobName, error);

  const apiKey = process.env.RESEND_API_KEY;
  const alertEmail = process.env.CONTACT_TO_EMAIL;
  const from = process.env.RESEND_FROM ?? "noreply@ledra.co.jp";

  if (!apiKey || !alertEmail) return;

  try {
    await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: alertEmail,
        subject: `[Ledra Cron Alert] ${jobName} failed`,
        text: [
          `Cron job "${jobName}" failed at ${new Date().toISOString()}`,
          "",
          `Error: ${message}`,
          ...(stack ? ["", "Stack:", stack] : []),
        ].join("\n"),
      }),
    });
  } catch {
    console.error(`[cron/${jobName}] Failed to send alert email`);
  }
}
