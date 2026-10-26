import { BarChart3, Calculator, ShieldCheck } from "lucide-react";
import type { DebtSummary, FinancialMetrics } from "@/lib/finance";
import { pct, ratio, usd } from "@/lib/format";
import { cn } from "@/lib/utils";
import { FREQ_SHORT } from "@/lib/config";

export function BurdenPanel({ debt, metrics, targetDscr, compact }: { debt: DebtSummary; metrics: FinancialMetrics; targetDscr: number; compact?: boolean }) {
  const dscrTone = metrics.dscr === null ? "" : metrics.dscr >= targetDscr ? "text-success" : metrics.dscr >= 1 ? "text-warning" : "text-danger";
  const burdenTone = metrics.burdenPct === null ? "" : metrics.burdenPct < 20 ? "text-success" : metrics.burdenPct < 35 ? "text-warning" : "text-danger";
  return (
    <aside className="panel p-5 sm:p-6" aria-label="Live burden calculator">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-secondary text-primary">
          <Calculator className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-semibold">Live Burden Calculator</h2>
          <p className="text-xs text-muted-foreground">Based on current entries</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-[1.2fr_1fr] gap-4 border-b border-border pb-5">
        <div>
          <div className="text-sm text-muted-foreground">Total monthly burden</div>
          <div className="num mt-1 text-[40px] font-bold leading-none tracking-tight text-primary" aria-live="polite">
            {usd(debt.monthly)}
          </div>
        </div>
        <div className="space-y-1.5 border-l border-border pl-4 text-sm">
          {[
            ["Biz day", debt.businessDaily],
            ["Daily", debt.daily],
            ["Weekly", debt.weekly],
            ["Annual", debt.annual],
          ].map(([k, v]) => (
            <div key={k as string} className="flex justify-between gap-2">
              <span className="text-muted-foreground">{k}</span>
              <span className="num font-semibold">{usd(v as number)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 rounded-lg border border-border p-3">
          <BarChart3 className="h-5 w-5 text-primary" />
          <div>
            <div className={cn("num text-xl font-semibold", burdenTone)}>{pct(metrics.burdenPct)}</div>
            <div className="text-xs text-muted-foreground">of revenue</div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-border p-3">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <div>
            <div className={cn("num text-xl font-semibold", dscrTone)}>{ratio(metrics.dscr)}</div>
            <div className="text-xs text-muted-foreground">DSCR</div>
          </div>
        </div>
      </div>

      {!compact && debt.rows.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-medium">Debt breakdown (monthly equivalent)</h3>
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="py-2 font-normal">Debt</th>
                <th className="py-2 text-right font-normal">Monthly</th>
                <th className="py-2 text-right font-normal">%</th>
              </tr>
            </thead>
            <tbody>
              {debt.rows.map((r) => (
                <tr key={r.debt.id} className="border-t border-border/60">
                  <td className="py-2 pr-2">
                    <div className="max-w-[180px] truncate">{r.label}</div>
                    <div className="text-[11px] text-muted-foreground">{FREQ_SHORT[r.debt.frequency]}</div>
                  </td>
                  <td className="num py-2 text-right">{usd(r.monthly)}</td>
                  <td className="num py-2 text-right text-muted-foreground">{debt.monthly ? Math.round((r.monthly / debt.monthly) * 100) : 0}%</td>
                </tr>
              ))}
              <tr className="border-t border-border font-semibold">
                <td className="py-2.5">Total</td>
                <td className="num py-2.5 text-right">{usd(debt.monthly)}</td>
                <td className="num py-2.5 text-right">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
        {[
          ["Remaining contractual obligations", debt.contractual],
          ["Total payoff amounts", debt.payoff],
          ["Potential early-payoff savings", debt.earlySavings],
          ["Remaining interest (loans)", debt.remainingInterest],
          ["MCA receivables still owed", debt.mcaPurchasedRemaining],
        ].map(([k, v]) => (
          <div key={k as string} className="flex justify-between gap-3">
            <span className="text-muted-foreground">{k}</span>
            <span className="num">{usd(v as number)}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[11px] leading-snug text-muted-foreground/80">
        Business-daily payments use {debt.bizDays} actual ACH days in the next 12 months (weekends and federal holidays excluded). MCA factor rates are shown as cost multiples, never as APR.
      </p>
    </aside>
  );
}
