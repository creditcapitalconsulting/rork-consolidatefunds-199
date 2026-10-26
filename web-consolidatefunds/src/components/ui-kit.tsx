import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Section({ title, description, children, action, className }: { title: string; description?: string; children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <section className={cn("panel p-5 sm:p-7", className)}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Grid({ children, cols = 3, className }: { children: ReactNode; cols?: 2 | 3 | 4; className?: string }) {
  return <div className={cn("grid gap-x-5 gap-y-4 sm:grid-cols-2", cols === 3 && "lg:grid-cols-3", cols === 4 && "lg:grid-cols-4", className)}>{children}</div>;
}

export function Stat({ label, value, sub, accent, className }: { label: string; value: ReactNode; sub?: ReactNode; accent?: boolean; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-border bg-background/40 p-4", className)}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("num mt-1 text-xl font-semibold tracking-tight", accent && "text-primary")}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function KV({ k, v, strong }: { k: ReactNode; v: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className={cn("num text-right", strong && "font-semibold")}>{v}</span>
    </div>
  );
}

export function Prelim({ className }: { className?: string }) {
  return <span className={cn("rounded border border-warning/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-warning", className)}>Preliminary</span>;
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-border px-6 py-12 text-center">
      <div className="text-primary">{icon}</div>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
