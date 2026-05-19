export type SentryIssue = {
  id: string;
  shortId: string;
  title: string;
  culprit: string | null;
  level: string;
  count: string;
  userCount: number;
  lastSeen: string;
  permalink: string;
};

export type SentryIssuesResult =
  | { configured: false }
  | { configured: true; ok: true; issues: SentryIssue[] }
  | { configured: true; ok: false; error: string };

type RawSentryIssue = {
  id?: unknown;
  shortId?: unknown;
  title?: unknown;
  culprit?: unknown;
  level?: unknown;
  count?: unknown;
  userCount?: unknown;
  lastSeen?: unknown;
  permalink?: unknown;
};

/**
 * Fetch the top unresolved Sentry issues for the monitoring site.
 *
 * Mirrors the codebase's "skip cleanly if not configured" Sentry policy:
 * when SENTRY_ORG / SENTRY_PROJECT / SENTRY_AUTH_TOKEN are absent we return
 * { configured: false } and the UI shows a setup hint instead of an error.
 *
 * Bounded by a 5s AbortController so a slow Sentry can never stall the
 * monitoring overview (it aggregates this alongside DB-backed data).
 *
 * SENTRY_API_BASE overrides the host for self-hosted / regional Sentry
 * (default https://sentry.io; the DSN region is independent of the API
 * host so we keep it explicit rather than guessing).
 */
export async function fetchSentryIssues(limit = 10): Promise<SentryIssuesResult> {
  const org = process.env.SENTRY_ORG;
  const project = process.env.SENTRY_PROJECT;
  const token = process.env.SENTRY_AUTH_TOKEN;

  if (!org || !project || !token) {
    return { configured: false };
  }

  const base = (process.env.SENTRY_API_BASE ?? "https://sentry.io").replace(/\/+$/, "");
  const url =
    `${base}/api/0/projects/${encodeURIComponent(org)}/${encodeURIComponent(project)}/issues/` +
    `?query=${encodeURIComponent("is:unresolved")}&statsPeriod=24h&limit=${Math.min(Math.max(limit, 1), 25)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) {
      return { configured: true, ok: false, error: `Sentry API ${res.status}` };
    }

    const raw: unknown = await res.json();
    const rows: RawSentryIssue[] = Array.isArray(raw) ? raw : [];

    const issues: SentryIssue[] = rows.map((i) => ({
      id: String(i.id ?? ""),
      shortId: String(i.shortId ?? ""),
      title: String(i.title ?? "(no title)"),
      culprit: i.culprit ? String(i.culprit) : null,
      level: String(i.level ?? "error"),
      count: String(i.count ?? "0"),
      userCount: Number(i.userCount ?? 0),
      lastSeen: String(i.lastSeen ?? ""),
      permalink: String(i.permalink ?? ""),
    }));

    return { configured: true, ok: true, issues };
  } catch (e) {
    const msg = e instanceof Error && e.name === "AbortError" ? "Sentry API timed out" : "Sentry API unreachable";
    return { configured: true, ok: false, error: msg };
  } finally {
    clearTimeout(timer);
  }
}
