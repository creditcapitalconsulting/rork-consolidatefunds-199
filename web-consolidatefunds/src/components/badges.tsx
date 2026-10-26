import { STATUS_META, DEBT_TYPES } from "@/lib/config";
import type { AppStatus, DebtType, RiskLevel } from "@/lib/types";
import { cn } from "@/lib/utils";

const RISK = {
  green: { label: "Green", cls: "bg-success/15 text-success border-success/30", dot: "bg-success", long: "Strong candidate" },
  yellow: { label: "Yellow", cls: "bg-warning/15 text-warning border-warning/30", dot: "bg-warning", long: "Review or restructuring required" },
  red: { label: "Red", cls: "bg-danger/15 text-danger border-danger/30", dot: "bg-danger", long: "High risk — further evaluation" },
} as const;

export const riskMeta = (r: RiskLevel) => RISK[r];

export function RiskBadge({ risk, className }: { risk: RiskLevel; className?: string }) {
  const m = RISK[risk];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium", m.cls, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} />
      {m.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: AppStatus }) {
  const m = STATUS_META[status];
  return <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium", m.tone)}>{m.label}</span>;
}

export function DebtBadge({ type, className }: { type: DebtType; className?: string }) {
  const c = DEBT_TYPES[type];
  return <span className={cn("inline-flex min-w-[52px] justify-center rounded-md px-2 py-1 text-[11px] font-semibold tracking-wide", c.tone, className)}>{c.badge}</span>;
}
