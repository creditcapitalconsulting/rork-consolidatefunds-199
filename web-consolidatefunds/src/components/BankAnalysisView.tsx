import { AlertTriangle, CheckCircle2, Plus } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { BankAnalysis, DetectedLender } from "@/lib/bank";
import { fmtDate, pct, usd } from "@/lib/format";
import { Stat } from "./ui-kit";
import { cn } from "@/lib/utils";

const monthLabel = (m: string) => new Date(m + "-15").toLocaleDateString("en-US", { month: "short", year: "2-digit" });

export function BankAnalysisView({ bank, onAddDebt, staff }: { bank: BankAnalysis; onAddDebt?: (l: DetectedLender) => void; staff?: boolean }) {
  const chart = bank.months.map((m) => ({ month: monthLabel(m.month), Revenue: Math.round(m.revenue), "Lender payments": Math.round(m.lenderPayments) }));
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Avg monthly revenue deposits" value={usd(bank.avgMonthlyRevenue)} sub={bank.trendPct === null ? undefined : `${bank.trendPct >= 0 ? "+" : ""}${pct(bank.trendPct, 1)} trend`} />
        <Stat label="Avg daily balance" value={bank.avgDailyBalance === null ? "—" : usd(bank.avgDailyBalance)} />
        <Stat label="Negative balance days" value={<span className={bank.negativeDays > 3 ? "text-danger" : bank.negativeDays > 0 ? "text-warning" : ""}>{bank.negativeDays}</span>} />
        <Stat label="NSF / returned items" value={<span className={bank.nsfCount + bank.returnedCount > 2 ? "text-danger" : bank.nsfCount + bank.returnedCount > 0 ? "text-warning" : ""}>{`${bank.nsfCount} / ${bank.returnedCount}`}</span>} />
        <Stat label="Payroll / month" value={usd(bank.payrollMonthly)} />
        <Stat label="Tax payments / month" value={usd(bank.taxMonthly)} />
        <Stat label="Internal transfers excluded" value={usd(bank.internalTransfers)} sub="Not counted as revenue" />
        <Stat label="Revenue consistency" value={bank.consistencyCv === null ? "—" : bank.consistencyCv < 0.15 ? "Stable" : bank.consistencyCv < 0.3 ? "Moderate" : "Volatile"} sub={bank.consistencyCv === null ? undefined : `CV ${bank.consistencyCv.toFixed(2)}`} />
      </div>

      {chart.length > 0 && (
        <div className="rounded-xl border border-border p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium">Monthly revenue vs. lender withdrawals</h3>
            <span className="text-xs text-muted-foreground">
              {fmtDate(bank.periodStart)} – {fmtDate(bank.periodEnd)} · {bank.totalTransactions} txns
            </span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ left: 0, right: 0, top: 5, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fill: "#8A8F98", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v: number) => usd(v, { compact: true })} tick={{ fill: "#8A8F98", fontSize: 12 }} axisLine={false} tickLine={false} width={56} />
                <Tooltip cursor={{ fill: "rgba(255,255,255,0.03)" }} contentStyle={{ background: "#17191D", border: "1px solid #2A2D33", borderRadius: 10 }} formatter={(v: number) => usd(v)} />
                <Bar dataKey="Revenue" fill="#C6F432" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Lender payments" fill="#FF5A4F" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-medium">Recurring lender withdrawals detected</h3>
        <div className="mt-2 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="bg-secondary/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-normal">Lender</th>
                <th className="px-4 py-2.5 font-normal">Frequency</th>
                <th className="px-4 py-2.5 text-right font-normal">Typical debit</th>
                <th className="px-4 py-2.5 text-right font-normal">Est. monthly</th>
                <th className="px-4 py-2.5 font-normal">Status</th>
              </tr>
            </thead>
            <tbody>
              {bank.lenders.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                    No recurring lender debits found.
                  </td>
                </tr>
              )}
              {bank.lenders.map((l) => {
                const undisclosed = !l.matchedDebtId;
                return (
                  <tr key={l.name} className={cn("border-t border-border/60", undisclosed && "bg-danger/[0.06]")}>
                    <td className="px-4 py-3 font-medium">{l.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {l.frequency} · {l.count}×
                    </td>
                    <td className="num px-4 py-3 text-right">{usd(l.typicalAmount)}</td>
                    <td className="num px-4 py-3 text-right">{usd(l.monthlyEstimate)}</td>
                    <td className="px-4 py-3">
                      {undisclosed ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 text-danger">
                            <AlertTriangle className="h-4 w-4" /> Not disclosed
                          </span>
                          {onAddDebt && (
                            <button onClick={() => onAddDebt(l)} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:border-primary/50 hover:text-primary">
                              <Plus className="h-3 w-3" /> Add to {staff ? "debts" : "my debts"}
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-success">
                          <CheckCircle2 className="h-4 w-4" /> Matches disclosed debt
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {bank.disclosedNotSeen.length > 0 && (
          <p className="mt-3 text-sm text-warning">
            Disclosed but not seen in bank activity: {bank.disclosedNotSeen.join(", ")}. These may be paid from another account.
          </p>
        )}
      </div>

      {bank.unusual.length > 0 && (
        <div>
          <h3 className="text-sm font-medium">Unusual transactions</h3>
          <ul className="mt-2 divide-y divide-border/60 rounded-xl border border-border">
            {bank.unusual.slice(0, 8).map((u, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                <span>
                  <span className="mono text-xs text-muted-foreground">{u.date}</span> <span className="ml-2">{u.description}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-xs text-warning">{u.reason}</span>
                  <span className={cn("num", u.amount < 0 ? "text-danger" : "text-success")}>{usd(u.amount)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
