import { ArrowLeft, ChevronDown, Layers, SlidersHorizontal, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BeforeAfterChart, ScenarioCard, ScenarioSheet } from "@/components/ScenarioViews";
import { SiteHeader } from "@/components/SiteHeader";
import { EmptyState } from "@/components/ui-kit";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { usd } from "@/lib/format";
import { useStore } from "@/lib/store";
import { analyzeApplication, type Scenario } from "@/lib/underwriting";
import { cn } from "@/lib/utils";

export default function Scenarios() {
  const { draft, settings, loadSampleDraft } = useStore();
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<Scenario | null>(null);
  const [chartKey, setChartKey] = useState<Scenario["key"] | null>(null);
  const a = useMemo(() => analyzeApplication(draft, settings, excluded), [draft, settings, excluded]);
  const best = a.scenarios.find((s) => s.best);
  const chartScenario = a.scenarios.find((s) => s.key === chartKey) ?? best ?? a.scenarios[0];
  const included = draft.debts.length - excluded.size;
  const ordered = [...a.scenarios].sort((x, y) => (x.best ? -1 : y.best ? 1 : 0) || (x.feasible === y.feasible ? 0 : x.feasible ? -1 : 1));
  const featured = ordered.slice(0, 3).sort((x, y) => x.key.localeCompare(y.key));
  const others = a.scenarios.filter((s) => !featured.includes(s));

  const toggle = (id: string) =>
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-[1400px] px-5 pb-24 pt-7 lg:px-10">
        <Link to="/apply/debts" className="inline-flex items-center gap-2 rounded text-[15px] text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Existing Debts
        </Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-[40px] sm:leading-[1.1]">Compare Your Consolidation Scenarios</h1>
            <p className="mt-2 text-[17px] text-muted-foreground">Same debts. Different solutions. See how much you could save.</p>
          </div>
          {draft.debts.length > 0 && (
            <Popover>
              <PopoverTrigger className="inline-flex min-w-[230px] items-center justify-between gap-3 rounded-lg border border-border px-4 py-2.5 text-[15px] hover:border-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {excluded.size === 0 ? `All debts included (${draft.debts.length})` : `${included} of ${draft.debts.length} debts included`}
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 border-border bg-card p-2">
                <p className="px-2 pb-2 pt-1 text-xs text-muted-foreground">Choose which debts may be consolidated</p>
                {a.debt.rows.map((r) => (
                  <label key={r.debt.id} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-secondary">
                    <input type="checkbox" checked={!excluded.has(r.debt.id)} onChange={() => toggle(r.debt.id)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
                    <span className="flex-1 truncate">{r.label}</span>
                    <span className="num text-xs text-muted-foreground">{usd(r.payoff, { compact: true })}</span>
                  </label>
                ))}
              </PopoverContent>
            </Popover>
          )}
        </div>

        {draft.debts.length === 0 ? (
          <div className="mt-10">
            <EmptyState
              icon={<Layers className="h-8 w-8" />}
              title="Add your debts to compare scenarios"
              body="We'll model full, MCA-only, asset-based, partial and hybrid structures from the debts you enter."
              action={
                <div className="flex flex-wrap justify-center gap-3">
                  <Link to="/apply/debts" className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
                    Add debts
                  </Link>
                  <button onClick={loadSampleDraft} className="rounded-lg border border-border px-5 py-2.5 text-sm">
                    Load sample business
                  </button>
                </div>
              }
            />
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-5 lg:grid-cols-3">
              {featured.map((s) => (
                <ScenarioCard key={s.key} s={s} onDetails={() => setDetail(s)} />
              ))}
            </div>
            {others.length > 0 && (
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                {others.map((s) => (
                  <ScenarioCard key={s.key} s={s} onDetails={() => setDetail(s)} />
                ))}
              </div>
            )}

            {chartScenario && (
              <section className="panel mt-6 p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold">Monthly Payments: Before vs After</h2>
                    <p className="mt-1 text-[15px] text-muted-foreground">See how consolidation can reduce your monthly debt payments.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span className="h-3 w-3 rounded-full bg-[#5B6069]" /> Current Payments
                    </span>
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span className="h-3 w-3 rounded-full bg-success" /> After (Option {chartScenario.key})
                    </span>
                    <div className="flex rounded-lg border border-border p-0.5" role="group" aria-label="Scenario shown in chart">
                      {a.scenarios.map((s) => (
                        <button key={s.key} onClick={() => setChartKey(s.key)} aria-pressed={s.key === chartScenario.key} className={cn("num h-7 w-7 rounded-md text-xs font-semibold", s.key === chartScenario.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                          {s.key}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <BeforeAfterChart debt={a.debt} s={chartScenario} />
                </div>
              </section>
            )}

            {best && (
              <section className="panel mt-6 flex flex-wrap items-center gap-5 p-5 sm:p-6">
                <span className="grid h-14 w-14 place-items-center rounded-lg bg-success/10 text-success">
                  <TrendingUp className="h-7 w-7" />
                </span>
                <div className="flex-1">
                  <p className="text-xl font-semibold">
                    You could save <span className="num text-primary">{usd(best.annualImprovement)}</span> per year
                  </p>
                  <p className="text-[15px] text-muted-foreground">Based on Option {best.key} compared to your current monthly payments.</p>
                </div>
                <Link to="/apply/debts" className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-3 text-[15px] font-medium hover:border-muted-foreground/50">
                  <SlidersHorizontal className="h-4 w-4" /> Edit debts
                </Link>
                <Link to="/apply/review" className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-[15px] font-semibold text-primary-foreground">
                  {draft.submittedAt ? "View application" : "Finish application"}
                </Link>
              </section>
            )}
            <p className="mt-6 text-xs text-muted-foreground/80">
              Scenarios are illustrative estimates using assumed rates and terms. ConsolidateFunds.com is a broker and does not lend; final offers come from lending partners after underwriting. MCA factor rates are never presented as APR.
            </p>
          </>
        )}
      </main>
      <ScenarioSheet s={detail} open={!!detail} onOpenChange={(o) => !o && setDetail(null)} currentMonthly={a.debt.monthly} />
    </div>
  );
}
