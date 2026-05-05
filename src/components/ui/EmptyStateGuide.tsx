import Link from "next/link";
import type { ReactNode } from "react";

type Step = {
  title: string;
  description?: string;
};

type ActionLink = {
  label: string;
  href: string;
};

type ActionButton = {
  label: string;
  onClick: () => void;
};

type Action = ActionLink | ActionButton;

function isLinkAction(a: Action): a is ActionLink {
  return "href" in a;
}

interface EmptyStateGuideProps {
  /** 大きな絵文字 or アイコンノード。デフォルトでアイコン背景バッジが付く。 */
  icon?: ReactNode;
  title: string;
  description: string;
  /** 番号付きで表示される手順。最大4ステップ程度を想定。 */
  steps?: Step[];
  primaryAction: Action;
  secondaryAction?: Action;
  className?: string;
}

export default function EmptyStateGuide({
  icon,
  title,
  description,
  steps,
  primaryAction,
  secondaryAction,
  className = "",
}: EmptyStateGuideProps) {
  return (
    <div className={`glass-card px-6 py-10 sm:px-10 sm:py-12 text-center ${className}`}>
      {icon && (
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-dim text-accent text-3xl">
          {icon}
        </div>
      )}

      <h2 className="text-lg sm:text-xl font-bold text-primary">{title}</h2>
      <p className="mt-2 text-sm text-muted leading-relaxed max-w-lg mx-auto">{description}</p>

      {steps && steps.length > 0 && (
        <ol className="mt-6 grid gap-3 sm:grid-cols-3 max-w-2xl mx-auto text-left">
          {steps.map((step, idx) => (
            <li
              key={idx}
              className="rounded-xl border border-border-default bg-surface-hover/40 p-4 flex flex-col gap-1.5"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-dim text-accent text-xs font-bold">
                {idx + 1}
              </span>
              <span className="text-sm font-semibold text-primary leading-snug">{step.title}</span>
              {step.description && <span className="text-xs text-muted leading-relaxed">{step.description}</span>}
            </li>
          ))}
        </ol>
      )}

      <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
        {isLinkAction(primaryAction) ? (
          <Link href={primaryAction.href} className="btn-primary">
            {primaryAction.label}
          </Link>
        ) : (
          <button type="button" className="btn-primary" onClick={primaryAction.onClick}>
            {primaryAction.label}
          </button>
        )}
        {secondaryAction &&
          (isLinkAction(secondaryAction) ? (
            <Link href={secondaryAction.href} className="btn-secondary">
              {secondaryAction.label}
            </Link>
          ) : (
            <button type="button" className="btn-secondary" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </button>
          ))}
      </div>
    </div>
  );
}
