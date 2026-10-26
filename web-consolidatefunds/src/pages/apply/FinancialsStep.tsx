import { Field } from "@/components/fields";
import { Grid, KV, Section } from "@/components/ui-kit";
import { n } from "@/lib/finance";
import { pct, ratio, usd } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Financials } from "@/lib/types";
import type { FullAnalysis } from "@/lib/underwriting";
import { Callout } from "@/components/fields";

const SEASON = ["Highly seasonal", "Moderately seasonal", "Stable year-round"].map((x) => ({ value: x, label: x }));

export function FinancialsStep({ analysis }: { analysis: FullAnalysis }) {
  const { draft, updateDraft, settings } = useStore();
  const f = draft.financials;
  const set = (k: keyof Financials) => (v: string) => updateDraft((d) => ({ ...d, financials: { ...d.financials, [k]: v } }));
  const { metrics, debt } = analysis;
  const reported = n(f.reportedMonthlyDebt);
  const gap = reported && debt.monthly ? debt.monthly - reported : 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        <Section title="Revenue">
          <Grid>
            <Field label="Average monthly revenue" kind="money" required value={f.monthlyRevenue} onChange={set("monthlyRevenue")} />
            <Field label="Annual revenue (trailing 12 mo)" kind="money" value={f.annualRevenue} onChange={set("annualRevenue")} />
            <Field label="Average monthly deposits" kind="money" value={f.avgMonthlyDeposits} onChange={set("avgMonthlyDeposits")} hint="Excluding transfers and loan proceeds" />
            <Field label="Prior year revenue" kind="money" value={f.priorYearRevenue} onChange={set("priorYearRevenue")} />
            <Field label="Revenue two years ago" kind="money" value={f.twoYearsAgoRevenue} onChange={set("twoYearsAgoRevenue")} />
            <Field label="Projected next-12-month revenue" kind="money" value={f.projectedRevenue} onChange={set("projectedRevenue")} />
            <Field label="Seasonality" kind="select" options={SEASON} value={f.seasonality} onChange={set("seasonality")} />
            <Field label="Largest customer % of revenue" kind="percent" value={f.topCustomerPct} onChange={set("topCustomerPct")} />
          </Grid>
        </Section>
        <Section title="Profitability" description="Annual figures from your most recent P&L or tax return.">
          <Grid>
            <Field label="Gross profit" kind="money" value={f.grossProfit} onChange={set("grossProfit")} />
            <Field label="Operating expenses" kind="money" value={f.operatingExpenses} onChange={set("operatingExpenses")} hint="Excluding debt payments" />
            <Field label="EBITDA" kind="money" value={f.ebitda} onChange={set("ebitda")} hint="If blank we use gross profit minus operating expenses" />
          </Grid>
        </Section>
        <Section title="Balance sheet & debt">
          <Grid>
            <Field label="Cash on hand" kind="money" value={f.cash} onChange={set("cash")} />
            <Field label="Accounts receivable" kind="money" value={f.accountsReceivable} onChange={set("accountsReceivable")} />
            <Field label="Accounts payable" kind="money" value={f.accountsPayable} onChange={set("accountsPayable")} />
            <Field label="Your estimate of total monthly debt payments" kind="money" value={f.reportedMonthlyDebt} onChange={set("reportedMonthlyDebt")} hint="We'll compare this to the debts you list next" />
          </Grid>
        </Section>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="panel p-6">
          <h2 className="font-semibold">Calculated metrics</h2>
          <p className="mt-1 text-xs text-muted-foreground">Updates as you type</p>
          <div className="mt-4 divide-y divide-border/60">
            <KV k="Monthly revenue" v={usd(metrics.monthlyRevenue)} />
            <KV k="Annual revenue" v={usd(metrics.annualRevenue)} />
            <KV k="Year-over-year growth" v={metrics.growthPct === null ? "—" : `${metrics.growthPct >= 0 ? "+" : ""}${pct(metrics.growthPct, 1)}`} />
            <KV k="Gross margin" v={pct(metrics.grossMarginPct, 1)} />
            <KV k="Cash flow available for debt service" v={usd(metrics.cfads)} strong />
            <KV k="Working capital" v={usd(metrics.workingCapital)} />
            <KV k="Monthly debt (from your debt list)" v={usd(debt.monthly)} />
            <KV k="Debt-to-revenue burden" v={pct(metrics.burdenPct)} />
            <KV k={`DSCR (target ${settings.targetDscr.toFixed(2)})`} v={ratio(metrics.dscr)} strong />
          </div>
          {gap > 500 && (
            <div className="mt-4">
              <Callout tone="warn">Your listed debts total {usd(debt.monthly)}/mo — {usd(gap)} more than your estimate. Daily and weekly payments often add up faster than expected.</Callout>
            </div>
          )}
          {debt.rows.length === 0 && <p className="mt-4 text-xs text-muted-foreground">Add your debts in the next step to see DSCR and burden.</p>}
        </div>
      </aside>
    </div>
  );
}
