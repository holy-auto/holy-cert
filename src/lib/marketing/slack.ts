/**
 * Slack Incoming Webhook notifier for marketing leads.
 *
 * Configure via env: `SLACK_LEADS_WEBHOOK_URL`
 *
 * No-ops silently if the webhook URL is not configured, so local dev and
 * preview deployments don't fail when the secret is absent.
 */

type SlackField = { title: string; value: string; short?: boolean };

type SlackPayload = {
  text: string;
  fields?: SlackField[];
};

export async function notifySlack(payload: SlackPayload): Promise<void> {
  const url = process.env.SLACK_LEADS_WEBHOOK_URL;
  if (!url) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[slack] webhook not configured, skipping:", payload.text);
    }
    return;
  }

  const attachments = payload.fields && payload.fields.length > 0
    ? [
        {
          color: "#60a5fa",
          fields: payload.fields,
        },
      ]
    : undefined;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: payload.text,
        attachments,
      }),
    });
    if (!res.ok) {
      console.error("[slack] webhook responded non-OK:", res.status);
    }
  } catch (err) {
    console.error("[slack] webhook error:", err);
  }
}
