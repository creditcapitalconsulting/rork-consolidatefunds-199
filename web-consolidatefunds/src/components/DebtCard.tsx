import { ChevronDown, Trash2 } from "lucide-react";
import { COMMON_DEBT_FIELDS, DEBT_TYPES, FREQ_SHORT, FREQUENCIES, PAYMENT_STATUSES, STRUCTURES, type FieldDef } from "@/lib/config";
import { factorRate, n, type DebtRow } from "@/lib/finance";
import { months, usd } from "@/lib/format";
import type { Debt } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DebtBadge } from "./badges";
import { Callout, DefField, Field, Toggle } from "./fields";

export function DebtCard({ debt, row, open, onToggle, onChange, onRemove }: { debt: Debt; row?: DebtRow; open: boolean; onToggle: () => void; onChange: (d: Debt) => void; onRemove: () => void }) {
  const cfg = DEBT_TYPES[debt.type];
  const set = (key: string, v: string) => onChange({ ...debt, fields: { ...debt.fields, [key]: v } });
  const common: FieldDef[] = COMMON_DEBT_FIELDS.filter((f) => !cfg.hide?.includes(f.key));
  const isMca = cfg.family === "mca";
  const payment = debt.type === "mca" ? n(debt.fields.actualAch) || n(debt.fields.payment) : n(debt.fields.payment);
  const title = `${row?.label ?? cfg.label}`;
  const fr = factorRate(debt);

  const renderDefs = (defs: FieldDef[]) => defs.map((d) => <DefField key={d.key} def={d} values={debt.fields} onChange={set} labelOverride={cfg.relabel?.[d.key]} />);

  return (
    <article className={cn("panel transition-colors", open && "border-muted-foreground/30")}>
      <header className="flex items-center gap-3 p-4 sm:px-6">
        <button onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-expanded={open}>
          <DebtBadge type={debt.type} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[16px] font-semibold sm:text-lg">
              {title}
              <span className="text-muted-foreground"> · {FREQ_SHORT[debt.frequency]}</span>
              {payment > 0 && <span className="num"> · {usd(payment)}</span>}
            </div>
            {!open && row && (
              <div className="num text-xs text-muted-foreground">
                {usd(row.monthly)}/mo equivalent · payoff {usd(row.payoff)}
              </div>
            )}
          </div>
          <ChevronDown className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
        <span className="hidden h-6 w-px bg-border sm:block" />
        <button onClick={onRemove} className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground hover:text-danger" aria-label={`Remove ${title}`}>
          <Trash2 className="h-4 w-4" />
          <span className="hidden sm:inline">Remove</span>
        </button>
      </header>

      {open && (
        <div className="space-y-6 border-t border-border px-4 pb-6 pt-5 sm:px-6">
          <p className="text-sm text-muted-foreground">{cfg.intro}</p>
          <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label={cfg.relabel?.creditor ?? (isMca ? "Funder name" : "Creditor / lender")} value={debt.creditor} onChange={(v) => onChange({ ...debt, creditor: v })} placeholder="As it appears on statements" />
            <Field label="Payment frequency" kind="select" value={debt.frequency} options={FREQUENCIES} onChange={(v) => onChange({ ...debt, frequency: (v || cfg.defaultFrequency) as Debt["frequency"] })} />
            <Field label="Payment structure" kind="select" value={debt.structure} options={STRUCTURES} onChange={(v) => onChange({ ...debt, structure: (v || cfg.defaultStructure) as Debt["structure"] })} />
            {debt.frequency === "variable" && <Field label="Average monthly payment / collections" kind="money" value={debt.fields.variableMonthlyAvg ?? ""} onChange={(v) => set("variableMonthlyAvg", v)} hint="Used to normalize variable remittances" />}
            {debt.frequency === "custom" && (
              <>
                <Field label="Payments per year" kind="number" value={debt.fields.customPerYear ?? ""} onChange={(v) => set("customPerYear", v)} />
                <Field label="Describe the schedule" value={debt.fields.customDescription ?? ""} onChange={(v) => set("customDescription", v)} placeholder="e.g. Mon/Wed/Fri" />
              </>
            )}
            {debt.structure === "balloon" && (
              <>
                <Field label="Balloon amount" kind="money" value={debt.fields.balloonAmount ?? ""} onChange={(v) => set("balloonAmount", v)} />
                <Field label="Balloon due date" kind="date" value={debt.fields.balloonDate ?? ""} onChange={(v) => set("balloonDate", v)} />
              </>
            )}
            <Field label="Current payment status" kind="select" value={debt.status} options={PAYMENT_STATUSES} onChange={(v) => onChange({ ...debt, status: (v || "current") as Debt["status"] })} />
          </div>

          {isMca && (
            <>
              <Callout>Factor rate is a total cost multiple on purchased receivables — not an annual interest rate (APR). We keep MCA purchased amounts separate from loan principal and interest.</Callout>
              <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">{renderDefs(cfg.extra)}</div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Readout k="Factor rate" v={fr ? `${fr.toFixed(2)}×` : "—"} />
                <Readout k="Cost of capital" v={n(debt.fields.purchasedAmount) && n(debt.fields.purchasePrice) ? usd(n(debt.fields.purchasedAmount) - n(debt.fields.purchasePrice)) : "—"} />
                <Readout k="Collected" v={n(debt.fields.purchasedAmount) ? `${Math.round((n(debt.fields.collectionsToDate) / n(debt.fields.purchasedAmount)) * 100)}%` : "—"} />
                <Readout k="Est. time to payoff" v={months(row?.months ?? null)} />
              </div>
              <h3 className="eyebrow pt-2">Schedule, payoff & security</h3>
              <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">{renderDefs(common)}</div>
            </>
          )}

          {!isMca && (
            <>
              <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">{renderDefs(common)}</div>
              {cfg.extra.length > 0 && (
                <>
                  <h3 className="eyebrow pt-2">{cfg.label} details</h3>
                  <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">{renderDefs(cfg.extra)}</div>
                </>
              )}
            </>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Toggle label="Personally guaranteed" description="An owner signed a personal guarantee" checked={debt.personalGuarantee} onChange={(v) => onChange({ ...debt, personalGuarantee: v })} />
          </div>

          {row && (
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-secondary/60 p-4 sm:grid-cols-5">
              <Readout k="Monthly equiv." v={usd(row.monthly)} accent />
              <Readout k="Weekly equiv." v={usd(row.weekly)} />
              <Readout k="Annual" v={usd(row.annual)} />
              <Readout k="Remaining contractual" v={usd(row.contractual)} />
              <Readout k="Early payoff savings" v={usd(row.earlySavings)} />
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function Readout({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground">{k}</div>
      <div className={cn("num text-[15px] font-semibold", accent && "text-primary")}>{v}</div>
    </div>
  );
}
