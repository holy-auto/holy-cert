import type { ReactNode } from "react";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default: "bg-[rgba(255,255,255,0.06)] text-[#a1a1a6] border-[rgba(255,255,255,0.08)]",
  success: "bg-[rgba(48,209,88,0.1)] text-[#30d158] border-[rgba(48,209,88,0.2)]",
  warning: "bg-[rgba(255,159,10,0.1)] text-[#ff9f0a] border-[rgba(255,159,10,0.2)]",
  danger: "bg-[rgba(255,69,58,0.1)] text-[#ff453a] border-[rgba(255,69,58,0.2)]",
  info: "bg-[rgba(10,132,255,0.1)] text-[#0a84ff] border-[rgba(10,132,255,0.2)]",
};

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
}

export default function Badge({ children, variant = "default" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${VARIANT_CLASSES[variant]}`}
    >
      {children}
    </span>
  );
}
