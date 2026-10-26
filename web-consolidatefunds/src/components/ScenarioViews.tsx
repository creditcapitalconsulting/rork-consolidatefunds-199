import { ArrowRight, Trophy } from "lucide-react";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { months, ratio, usd } from "@/lib/format";
import { typeGroupLabel, type Scenario } from "@/lib/underwriting";
import type { DebtSummary } from "@/lib/finance";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { KV } from "./ui-kit";

export function ScenarioCard({ s, onDetails }: { s: Scenario; onDetails: () => void }) {
  const best = s.best;
  return (
    <article className={cn("panel relative flex flex-col p-6", best && "border-primary/80", !s.feasible && "opacity-60")} aria-label={`Option ${s.key}: ${s.name}`}>
      {best && (
        <div className="absolute -top-px left-0 right-0 flex items-center justify-between">
          <span className="rounded-br-lg rounded-tl-[11px] bg-primary px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-foreground">Best option</span>
          <span className="mr-4 mt-2 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
            <Trophy className="h-3.5 w-3.5" /> Best sustainable savings
          </span>
        </div>
      )}
      <div className={cn("flex items-center gap-4", best && "mt-5")}>
        <span className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-lg border text-xl font-semibold", best ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary")}>{s.key}</span>
        <div className="min-w-0">
          <h3 className="text-lg font-semibold leading-tight">{s.name}</h3>
          <p className="text-sm text-muted-foreground">{s.tagline}</p>
        </div>
      </div>
      <dl className="mt-5 flex-1 space-y-2.5 text-[15px]">
        {[
          ["Financing", usd(s.financing), ""],
          ["Monthly payment", usd(s.newPayment + s.remainingPayment), ""],
          ["Improvement", s.feasible ? `${usd(s.monthlyImprovement, { sign: true })}/mo` : "—", s.monthlyImprovement > 0 ? "text-primary" : "text-danger"],
          ["Annual", s.feasible ? usd(s.annualImprovement, { sign: true }) : "—", s.annualImprovement > 0 ? "text-primary" : "text-danger"],
          ["Term", `${s.termMonths} months`, ""],
          ["New DSCR", ratio(s.postDscr), ""],
        ].map(([k, v, c]) => (
          <div key={k} className="grid grid-cols-[1fr_auto] items-baseline gap-3">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className={cn("num text-right text-lg font-semibold", c)}>{v}</dd>
          </div>
        ))}
      </dl>
      {!s.feasible && s.feasibilityNote && <p className="mt-3 text-xs text-warning">{s.feasibilityNote}</p>}
      <button onClick={onDetails} className={cn("mt-6 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors", best ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border border-border hover:border-muted-foreground/50")}>
        View details <ArrowRight className="h-4 w-4" />
      </button>
    </article>
  );
}

export function ScenarioSheet({ s, open, onOpenChange, currentMonthly }: { s: Scenario | null; open: boolean; onOpenChange: (o: boolean) => void; currentMonthly: number }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto border-border bg-card sm:max-w-lg">
        {s && (
          <>
            <SheetHeader>
              <SheetTitle>
                Option {s.key} · {s.name}
              </SheetTitle>
              <SheetDescription>{s.tagline}</SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border p-4">
                  <div className="text-xs text-muted-foreground">Today</div>
                  <div className="num text-2xl font-bold">{usd(currentMonthly)}</div>
                  <div className="text-xs text-muted-foreground">per month</div>
                </div>
                <div className="rounded-lg border border-primary/50 p-4">
                  <div className="text-xs text-muted-foreground">After</div>
                  <div className="num text-2xl font-bold text-primary">{usd(s.newPayment + s.remainingPayment)}</div>
                  <div className="text-xs text-muted-foreground">per month</div>
                </div>
              </div>
              <div className="divide-y divide-border/60">
                <KV k="New financing (incl. est. fees)" v={usd(s.financing)} strong />
                <KV k="New facility payment" v={`${usd(s.newPayment)}/mo`} />
                <KV k="Debts left in place" v={`${usd(s.remainingPayment)}/mo`} />
                <KV k="Estimated rate" v={s.rateLabel} />
                <KV k="Term" v={months(s.termMonths)} />
                <KV k="Payment frequency" v={s.frequency} />
                <KV k="Estimated total financing cost" v={usd(s.totalCost)} />
                <KV k="Post-consolidation DSCR" v={ratio(s.postDscr)} />
                <KV k="Collateral" v={<span className="text-sm">{s.collateral}</span>} />
              </div>
              <div>
                <h3 className="eyebrow">Paid off ({s.paidOff.length})</h3>
                <ul className="mt-2 divide-y divide-border/60 text-sm">
                  {s.paidOff.map((r) => (
                    <li key={r.debt.id} className="flex justify-between gap-3 py-2">
                      <span className="truncate">{r.label}</span>
                      <span className="num text-muted-foreground">{usd(r.payoff)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {s.remaining.length > 0 && (
                <div>
                  <h3 className="eyebrow">Stays in place ({s.remaining.length})</h3>
                  <ul className="mt-2 divide-y divide-border/60 text-sm">
                    {s.remaining.map((r) => (
                      <li key={r.debt.id} className="flex justify-between gap-3 py-2">
                        <span className="truncate">{r.label}</span>
                        <span className="num text-muted-foreground">{usd(r.monthly)}/mo</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="text-[11px] leading-snug text-muted-foreground/80">Illustrative structure for comparison only. Rates, terms and approval are determined by our lending partners after full underwriting. ConsolidateFunds.com is a broker, not a lender.</p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

export function beforeAfterData(debt: DebtSummary, s: Scenario) {
  const paidPayoff = s.paidOff.reduce((a, r) => a + r.payoff, 0) || 1;
  const paidIds = new Set(s.paidOff.map((r) => r.debt.id));
  const groups = new Map<string, { before: number; after: number }>();
  for (const r of debt.rows) {
    const g = typeGroupLabel(r);
    const cur = groups.get(g) ?? { before: 0, after: 0 };
    cur.before += r.monthly;
    cur.after += paidIds.has(r.debt.id) ? s.newPayment * (r.payoff / paidPayoff) : r.monthly;
    groups.set(g, cur);
  }
  return [
    { name: "Total", before: Math.round(debt.monthly), after: Math.round(s.newPayment + s.remainingPayment) },
    ...[...groups.entries()].sort((a, b) => b[1].before - a[1].before).map(([name, v]) => ({ name, before: Math.round(v.before), after: Math.round(v.after) })),
  ];
}

export function BeforeAfterChart({ debt, s, height = 280 }: { debt: DebtSummary; s: Scenario; height?: number }) {
  const data = beforeAfterData(debt, s);
  const fmt = (v: number) => usd(v, { compact: true });
  return (
    <div style={{ height }} role="img" aria-label={`Monthly payments before and after option ${s.key}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 22, left: 0, right: 0, bottom: 0 }} barGap={6}>
          <CartesianGrid vertical={false} stroke="#2A2D33" strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fill: "#F2F2F0", fontSize: 13 }} axisLine={{ stroke: "#2A2D33" }} tickLine={false} interval={0} />
          <YAxis tickFormatter={fmt} tick={{ fill: "#8A8F98", fontSize: 12 }} axisLine={false} tickLine={false} width={52} />
          <Tooltip cursor={{ fill: "rgba(255,255,255,0.03)" }} contentStyle={{ background: "#17191D", border: "1px solid #2A2D33", borderRadius: 10 }} formatter={(v: number) => usd(v)} />
          <Bar dataKey="before" name="Current payments" fill="#5B6069" radius={[4, 4, 0, 0]} maxBarSize={56}>
            <LabelList dataKey="before" position="top" formatter={fmt} fill="#B5B9C0" fontSize={12} />
          </Bar>
          <Bar dataKey="after" name={`After consolidation (Option ${s.key})`} fill="#3DDC84" radius={[4, 4, 0, 0]} maxBarSize={56}>
            <LabelList dataKey="after" position="top" formatter={fmt} fill="#3DDC84" fontSize={12} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
