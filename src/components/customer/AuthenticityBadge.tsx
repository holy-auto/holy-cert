import type { AuthenticityGrade } from "@/lib/anchoring/authenticityGrade";

/**
 * Badge shown on the public certificate page to communicate that
 * the photos attached to the certificate have been hashed / signed
 * / verified on the server side. Phase 1 only emits `basic`, but
 * the component is ready for `verified` and `premium` once the
 * C2PA / deepfake pipeline lands in Phase 3.
 *
 * `unverified` (legacy data without a server-side SHA-256) renders
 * nothing so we don't downgrade existing certificates visually.
 */
export default function AuthenticityBadge({ grade }: { grade: AuthenticityGrade }) {
  if (grade === "unverified") return null;

  const copy = BADGE_COPY[grade];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${copy.className}`}
      title={copy.tooltip}
    >
      <span aria-hidden>✓</span>
      {copy.label}
    </span>
  );
}

const BADGE_COPY: Record<
  Exclude<AuthenticityGrade, "unverified">,
  { label: string; className: string; tooltip: string }
> = {
  basic: {
    label: "記録ハッシュ検証済み",
    className: "border-sky-500/30 bg-[rgba(56,189,248,0.1)] text-sky-300",
    tooltip: "写真がサーバ側で SHA-256 ハッシュ化され、改ざん検知が有効になっています。",
  },
  verified: {
    label: "ブロックチェーン検証済み",
    className: "border-blue-500/30 bg-[rgba(59,130,246,0.12)] text-blue-300",
    tooltip: "C2PA 署名とデバイス証明で、撮影から保存までの来歴が記録されています。",
  },
  premium: {
    label: "完全検証済み",
    className: "border-emerald-500/30 bg-[rgba(16,185,129,0.12)] text-emerald-300",
    tooltip: "C2PA 署名・デバイス証明・deepfake 検出のすべてを通過しています。",
  },
};
