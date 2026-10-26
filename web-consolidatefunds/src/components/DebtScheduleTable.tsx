import { DEBT_TYPES, FREQ_SHORT } from "@/lib/config";
import { periodPayment, type DebtRow } from "@/lib/finance";
import { fmtDate, usd } from "@/lib/format";
import { DebtBadge } from "./badges";

/**
 * The professional debt schedule: one row per position, the way funders
 * and underwriters read a file — funder, type, frequency, current payment,
 * payoff, monthly equivalent and the debit dates used to verify against
 * bank statements.
 */
export function DebtScheduleTable({ rows, className }: { rows: DebtRow[]; className?: string }) {
  if (rows.length === 0) return null;
  const totals = rows.reduce((a, r) => ({ payoff: a.payoff + r.payoff, monthly: a.monthly + r.monthly }), { payoff: 0, monthly: 0 });

  return (
    <section className={`panel overflow-hidden ${className ?? ""}`} aria-label="Debt schedule">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-5">
        <h2 className="text-sm font-semibold">Debt schedule</h2>
        <span className="num text-xs text-muted-foreground">{rows.length} position{rows.length === 1 ? "" : "s"}</span>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th scope="col" className="px-4 py-2.5 font-medium">#</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Funder / creditor</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Type</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Freq.</th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">Payment</th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">Payoff / balance</th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">Monthly equiv.</th>
              <th scope="col" className="px-4 py-2.5 font-medium">First debit</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Last debit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.debt.id} className="border-b border-border/50 last:border-0">
                <td className="num px-4 py-2.5 text-muted-foreground">{i + 1}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <DebtBadge type={r.debt.type} />
                    <span className="font-medium">{r.debt.creditor || r.label}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{DEBT_TYPES[r.debt.type].label}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{FREQ_SHORT[r.debt.frequency]}</td>
                <td className="num px-4 py-2.5 text-right">{usd(periodPayment(r.debt))}</td>
                <td className="num px-4 py-2.5 text-right">{usd(r.payoff)}</td>
                <td className="num px-4 py-2.5 text-right font-semibold">{usd(r.monthly)}</td>
                <td className="num px-4 py-2.5 text-muted-foreground">{fmtDate(r.debt.fields.firstDebit) || "—"}</td>
                <td className="num px-4 py-2.5 text-muted-foreground">{fmtDate(r.debt.fields.lastDebit) || "—"}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-secondary/40 font-semibold">
              <td colSpan={5} className="px-4 py-3 text-right text-muted-foreground">Totals</td>
              <td className="num px-4 py-3 text-right">{usd(totals.payoff)}</td>
              <td className="num px-4 py-3 text-right text-primary">{usd(totals.monthly)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="border-t border-border/60 px-4 py-2.5 text-[11px] text-muted-foreground sm:px-5">
        Debit dates are matched against bank statements to verify each position and surface any funding not listed here.
      </p>
    </section>
  );
}
