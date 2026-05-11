"use client";

import { useState } from "react";

interface Props {
  /** Pre-fill when the page came back from the `sso=1` redirect. */
  defaultDomain?: string;
  /** Post-SSO destination. Carried through as `next` so the callback can route. */
  next?: string;
}

/**
 * Two-stage SSO entry button.
 *
 *   stage 1 — collapsed: a single "会社の SSO でログイン" button.
 *   stage 2 — expanded:  domain input + submit + cancel.
 *
 * Submits to POST /api/auth/sso/start, expects { url } on success, then
 * does a full-page navigation to the IdP. Errors render inline; we do not
 * surface server-side codes to avoid hinting at provisioning state.
 */
export function SsoSignInButton({ defaultDomain, next }: Props) {
  const [expanded, setExpanded] = useState(!!defaultDomain);
  const [domain, setDomain] = useState(defaultDomain ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startSso() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/sso/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domain.trim().toLowerCase(), next }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const code = (body as { error?: string }).error ?? "sso_error";
        if (code === "invalid_domain") setError("ドメインの形式が正しくありません。");
        else if (code === "sso_not_configured") setError("このドメインの SSO 設定が見つかりません。");
        else if (code === "sso_unsupported") setError("SSO 機能が有効化されていません。");
        else if (code === "rate_limited") setError("リクエストが多すぎます。少し待ってから再度お試しください。");
        else setError("SSO ログインを開始できませんでした。");
        return;
      }
      const url = (body as { url?: string }).url;
      if (!url) {
        setError("SSO ログインを開始できませんでした。");
        return;
      }
      // Full navigation — leaves the SPA context, IdP needs to take over.
      window.location.href = url;
    } catch {
      setError("ネットワークエラーが発生しました。");
    } finally {
      setBusy(false);
    }
  }

  if (!expanded) {
    return (
      <button type="button" onClick={() => setExpanded(true)} className="btn-secondary w-full">
        会社の SSO でログイン
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs text-muted">会社のメールドメイン (例: acme.co.jp)</label>
      <input
        type="text"
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
        placeholder="acme.co.jp"
        className="input-field w-full"
        autoComplete="off"
        spellCheck={false}
        disabled={busy}
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={startSso}
          disabled={busy || domain.trim().length < 3}
          className="btn-primary flex-1"
        >
          {busy ? "リダイレクト中..." : "SSO でログイン"}
        </button>
        <button
          type="button"
          onClick={() => {
            setExpanded(false);
            setError(null);
          }}
          disabled={busy}
          className="btn-secondary"
        >
          キャンセル
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
