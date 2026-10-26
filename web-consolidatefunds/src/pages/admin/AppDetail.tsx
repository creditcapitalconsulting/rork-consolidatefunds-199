import { ArrowLeft, CheckCircle2, Download, FileText, Printer, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { BankAnalysisView } from "@/components/BankAnalysisView";
import { BeforeAfterChart, ScenarioCard, ScenarioSheet } from "@/components/ScenarioViews";
import { DebtBadge, RiskBadge, StatusBadge, riskMeta } from "@/components/badges";
import { KV, Prelim, Section, Stat } from "@/components/ui-kit";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DOC_CATEGORIES, FACTOR_LABELS, FREQ_SHORT, PAYMENT_STATUSES, STATUS_META, UNDERWRITERS } from "@/lib/config";
import { costLabel, periodPayment } from "@/lib/finance";
import { fmtDate, fmtDateTime, maskSsn, months, pct, ratio, timeAgo, usd } from "@/lib/format";
import { newDebt, uid } from "@/lib/sample";
import { useStore } from "@/lib/store";
import type { AppStatus } from "@/lib/types";
import { analyzeApplication, yearsInBusiness, type Scenario } from "@/lib/underwriting";
import { cn } from "@/lib/utils";
import { lenderToFrequency } from "../apply/BankingStep";
import { DecisionDialog, RequestDocsDialog, exportApplicationCsv } from "./actions";
import { FindingIcon } from "./Queue";

const selectCls = "h-9 appearance-none rounded-lg border border-border bg-card px-3 pr-7 text-sm focus-visible:border-primary focus-visible:outline-none";

export default function AppDetail() {
  const { id } = useParams();
  const { getApp, settings, updateApp, staff } = useStore();
  const app = getApp(id ?? "");
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<"docs" | "approve" | "decline" | null>(null);
  const [detail, setDetail] = useState<Scenario | null>(null);
  const [note, setNote] = useState("");
  const a = useMemo(() => (app ? analyzeApplication(app, settings, excluded) : null), [app, settings, excluded]);

  if (!app || !a) return <Navigate to="/underwriting" replace />;
  const b = app.business;
  const best = a.scenarios.find((s) => s.best) ?? a.scenarios[0];
  const yrs = yearsInBusiness(b.established);

  return (
    <div className="px-4 py-7 lg:px-7">
      <Link to="/underwriting" className="no-print inline-flex items-center gap-2 rounded text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to queue
      </Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{b.legalName || "Untitled business"}</h1>
            <RiskBadge risk={a.uw.risk} className="text-sm" />
            <StatusBadge status={app.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="mono">{app.ref}</span> · {b.industry} · {[b.city, b.state].filter(Boolean).join(", ")} · submitted {fmtDate(app.submittedAt)}
          </p>
        </div>
        <div className="no-print flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="assign">
            Assigned underwriter
          </label>
          <select id="assign" value={app.assignedTo} onChange={(e) => updateApp(app.id, (x) => ({ ...x, assignedTo: e.target.value }), { action: "Assigned", detail: e.target.value })} className={selectCls}>
            {UNDERWRITERS.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
          <label className="sr-only" htmlFor="status">
            Status
          </label>
          <select id="status" value={app.status} onChange={(e) => updateApp(app.id, (x) => ({ ...x, status: e.target.value as AppStatus }), { action: "Status changed", detail: STATUS_META[e.target.value as AppStatus].label })} className={selectCls}>
            {(Object.keys(STATUS_META) as AppStatus[]).filter((s) => s !== "draft").map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </select>
          <button onClick={() => exportApplicationCsv(app, a)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm" title="Export for Excel">
            <Download className="h-4 w-4" /> CSV
          </button>
          <button onClick={() => window.print()} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm" title="Print or save as PDF">
            <Printer className="h-4 w-4" /> PDF
          </button>
          <button onClick={() => setDialog("docs")} className="h-9 rounded-lg border border-border bg-secondary px-3 text-sm font-medium">
            Request documents
          </button>
          <button onClick={() => setDialog("approve")} className="h-9 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground">
            Approve structure
          </button>
          <button onClick={() => setDialog("decline")} className="h-9 rounded-lg bg-danger px-3 text-sm font-semibold text-white">
            Decline
          </button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="mt-6">
        <TabsList className="no-print h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
          {["overview", "financials", "debts", "bank", "collateral", "documents", "scenarios", "notes"].map((t) => (
            <TabsTrigger key={t} value={t} className="rounded-lg border border-transparent px-3.5 py-2 capitalize text-muted-foreground data-[state=active]:border-border data-[state=active]:bg-secondary data-[state=active]:text-foreground data-[state=active]:shadow-none">
              {t === "notes" ? "Notes & audit" : t === "bank" ? "Bank analysis" : t}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-5 space-y-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Stat label="Risk score" value={<span className={riskMeta(a.uw.risk).cls.split(" ").find((c) => c.startsWith("text-"))}>{a.uw.score}/100</span>} sub={riskMeta(a.uw.risk).long} />
            <Stat label="Total payoff" value={usd(a.debt.payoff)} sub={`${app.debts.length} obligations`} />
            <Stat label="Monthly debt service" value={usd(a.debt.monthly)} sub={`${pct(a.metrics.burdenPct)} of revenue`} />
            <Stat label="DSCR" value={ratio(a.metrics.dscr)} sub={`Target ${settings.targetDscr.toFixed(2)}`} />
            <Stat label="Collateral capacity" value={usd(a.collateral.capacity, { compact: true })} sub={<Prelim />} />
            <Stat label="Best structure" value={best.key} sub={`${usd(best.monthlyImprovement, { sign: true, compact: true })}/mo`} accent />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <Section title="Risk factors" description={`Weighted score — Green ≥ ${settings.thresholds.green}, Yellow ≥ ${settings.thresholds.yellow}.`}>
              <ul className="space-y-3.5">
                {a.uw.factors.map((f) => (
                  <li key={f.key}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span>{FACTOR_LABELS[f.key]}</span>
                      <span className="num text-muted-foreground">
                        <span className="text-foreground">{f.score}</span> · w{f.weight}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div className={cn("h-full rounded-full", f.score >= settings.thresholds.green ? "bg-success" : f.score >= settings.thresholds.yellow ? "bg-warning" : "bg-danger")} style={{ width: `${f.score}%` }} />
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{f.detail}</div>
                  </li>
                ))}
              </ul>
            </Section>
            <Section title="Findings">
              <ul className="space-y-3">
                {a.uw.findings.map((f, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <FindingIcon level={f.level} />
                    <span>{f.text}</span>
                  </li>
                ))}
              </ul>
            </Section>
          </div>
          <Section title="Business profile">
            <div className="grid gap-x-10 md:grid-cols-2 xl:grid-cols-3">
              <KV k="DBA" v={b.dba || "—"} />
              <KV k="EIN" v={b.ein || "—"} />
              <KV k="Entity" v={[b.entity, b.stateOfIncorporation].filter(Boolean).join(" · ") || "—"} />
              <KV k="Time in business" v={yrs === null ? "—" : `${yrs.toFixed(1)} years`} />
              <KV k="Employees" v={b.employees || "—"} />
              <KV k="Contact" v={[b.contactName, b.contactEmail].filter(Boolean).join(" · ") || "—"} />
              {b.owners.filter((o) => o.name).map((o) => (
                <KV
                  key={o.id}
                  k={`Owner · ${o.title || "—"}`}
                  v={`${o.name} · ${o.ownership || "?"}% · credit ${o.creditRange || "n/a"} · DOB ${o.dob || "—"} · SSN ${maskSsn(o.ssn)}${o.homeCity ? ` · ${[o.homeStreet, o.homeCity, o.homeState, o.homeZip].filter(Boolean).join(", ")}` : ""}`}
                />
              ))}
            </div>
            {b.affiliates && <p className="mt-3 text-sm text-muted-foreground">Affiliates: {b.affiliates}</p>}
          </Section>
        </TabsContent>

        <TabsContent value="financials" className="mt-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <Section title="Reported financials">
              {(
                [
                  ["Monthly revenue", app.financials.monthlyRevenue],
                  ["Annual revenue", app.financials.annualRevenue],
                  ["Prior year revenue", app.financials.priorYearRevenue],
                  ["Two years ago", app.financials.twoYearsAgoRevenue],
                  ["Avg monthly deposits (stated)", app.financials.avgMonthlyDeposits],
                  ["Gross profit", app.financials.grossProfit],
                  ["Operating expenses", app.financials.operatingExpenses],
                  ["EBITDA", app.financials.ebitda],
                  ["Cash", app.financials.cash],
                  ["Accounts receivable", app.financials.accountsReceivable],
                  ["Accounts payable", app.financials.accountsPayable],
                  ["Applicant's estimate of monthly debt", app.financials.reportedMonthlyDebt],
                ] as [string, string][]
              ).map(([k, v]) => (
                <KV key={k} k={k} v={v ? usd(Number(v)) : "—"} />
              ))}
              <KV k="Seasonality" v={app.financials.seasonality || "—"} />
              <KV k="Top customer concentration" v={app.financials.topCustomerPct ? `${app.financials.topCustomerPct}%` : "—"} />
            </Section>
            <Section title="Calculated">
              <KV k="Annual revenue (used)" v={usd(a.metrics.annualRevenue)} />
              <KV k="Bank-verified avg monthly revenue" v={a.bank.hasData ? usd(a.bank.avgMonthlyRevenue) : "—"} />
              <KV k="Stated vs. verified variance" v={a.bank.hasData && a.metrics.monthlyRevenue ? pct(((a.bank.avgMonthlyRevenue - a.metrics.monthlyRevenue) / a.metrics.monthlyRevenue) * 100, 1) : "—"} />
              <KV k="Growth (YoY)" v={pct(a.metrics.growthPct, 1)} />
              <KV k="Gross margin" v={pct(a.metrics.grossMarginPct, 1)} />
              <KV k="CFADS (annual)" v={usd(a.metrics.cfads)} strong />
              <KV k="Annual debt service" v={usd(a.debt.annual)} />
              <KV k="DSCR" v={ratio(a.metrics.dscr)} strong />
              <KV k="Debt burden % of revenue" v={pct(a.metrics.burdenPct, 1)} />
              <KV k="Debt-to-revenue (payoff ÷ annual)" v={a.metrics.annualRevenue ? `${(a.debt.payoff / a.metrics.annualRevenue).toFixed(2)}×` : "—"} />
              <KV k="Working capital" v={usd(a.metrics.workingCapital)} />
              <KV k="Balloon payments due" v={usd(a.debt.balloonDue)} />
            </Section>
          </div>
        </TabsContent>

        <TabsContent value="debts" className="mt-5 space-y-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Stat label="Monthly" value={usd(a.debt.monthly)} />
            <Stat label="Business-daily" value={usd(a.debt.businessDaily)} sub={`${a.debt.bizDays} ACH days`} />
            <Stat label="Weekly" value={usd(a.debt.weekly)} />
            <Stat label="Annual" value={usd(a.debt.annual)} />
            <Stat label="MCA receivables owed" value={usd(a.debt.mcaPurchasedRemaining)} sub="Not principal" />
          </div>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="bg-secondary/40 text-left text-xs text-muted-foreground">
                <tr>
                  {["Debt", "Frequency", "Payment", "Monthly equiv.", "Payoff", "Remaining contractual", "Early-payoff savings", "Cost", "Time left", "First debit", "Last debit", "Status", "PG"].map((h) => (
                    <th key={h} className="px-3 py-2.5 font-normal">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {a.debt.rows.map((r) => (
                  <tr key={r.debt.id} className="border-t border-border/60">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <DebtBadge type={r.debt.type} />
                        <span className="font-medium">{r.label}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{FREQ_SHORT[r.debt.frequency]}</td>
                    <td className="num px-3 py-3">{usd(periodPayment(r.debt))}</td>
                    <td className="num px-3 py-3">{usd(r.monthly)}</td>
                    <td className="num px-3 py-3">{usd(r.payoff)}</td>
                    <td className="num px-3 py-3">{usd(r.contractual)}</td>
                    <td className="num px-3 py-3">{usd(r.earlySavings)}</td>
                    <td className="px-3 py-3">{costLabel(r.debt)}</td>
                    <td className="num px-3 py-3">{months(r.months)}</td>
                    <td className="num px-3 py-3 text-muted-foreground">{fmtDate(r.debt.fields.firstDebit) || "—"}</td>
                    <td className="num px-3 py-3 text-muted-foreground">{fmtDate(r.debt.fields.lastDebit) || "—"}</td>
                    <td className={cn("px-3 py-3", r.debt.status !== "current" && "text-warning")}>{PAYMENT_STATUSES.find((p) => p.value === r.debt.status)?.label}</td>
                    <td className="px-3 py-3">{r.debt.personalGuarantee ? "Yes" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="bank" className="mt-5">
          {a.bank.hasData ? (
            <Section title="Bank statement analysis" description={app.bank.source === "demo_connection" ? `${app.bank.institution} · demo connection` : `Uploaded: ${app.bank.fileNames.join(", ")}`}>
              <BankAnalysisView
                staff
                bank={a.bank}
                onAddDebt={(l) => {
                  const d = newDebt("mca");
                  d.creditor = l.name;
                  d.frequency = lenderToFrequency(l.frequency);
                  d.fields = { payment: String(Math.round(l.typicalAmount)), actualAch: String(Math.round(l.typicalAmount)), payoff: String(Math.round(l.typicalAmount * 60)) };
                  updateApp(app.id, (x) => ({ ...x, debts: [...x.debts, d] }), { action: "Undisclosed debt added", detail: `${l.name} (payoff estimated — verify)` });
                  toast.success(`${l.name} added with an estimated payoff`, { description: "Request a payoff letter to confirm." });
                }}
              />
            </Section>
          ) : (
            <Section title="No bank data" description="The applicant hasn't connected or uploaded statements.">
              <button onClick={() => setDialog("docs")} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                Request bank statements
              </button>
            </Section>
          )}
        </TabsContent>

        <TabsContent value="collateral" className="mt-5">
          <Section title="Collateral" description="Value × advance rate − liens. All figures preliminary until appraisal, title and UCC search." action={<Prelim />}>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="Gross value" value={usd(a.collateral.grossValue)} />
              <Stat label="Liens" value={usd(a.collateral.liens)} />
              <Stat label="Equity" value={usd(a.collateral.equity)} />
              <Stat label="Borrowing capacity" value={usd(a.collateral.capacity)} accent />
            </div>
            <div className="mt-5 overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-secondary/40 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2.5 font-normal">Asset</th>
                    <th className="px-3 py-2.5 text-right font-normal">Value</th>
                    <th className="px-3 py-2.5 text-right font-normal">Liens</th>
                    <th className="px-3 py-2.5 text-right font-normal">Advance</th>
                    <th className="px-3 py-2.5 text-right font-normal">Capacity</th>
                  </tr>
                </thead>
                <tbody>
                  {a.collateral.rows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                        No assets disclosed.
                      </td>
                    </tr>
                  )}
                  {a.collateral.rows.map((r) => (
                    <tr key={r.asset.id} className="border-t border-border/60">
                      <td className="px-3 py-3">{r.label}</td>
                      <td className="num px-3 py-3 text-right">{usd(r.value)}</td>
                      <td className="num px-3 py-3 text-right">{usd(r.liens)}</td>
                      <td className="num px-3 py-3 text-right">{Math.round(r.advanceRate * 100)}%</td>
                      <td className="num px-3 py-3 text-right font-semibold text-primary">{usd(r.capacity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </TabsContent>

        <TabsContent value="documents" className="mt-5 space-y-5">
          <Section title={`Documents (${app.documents.length})`}>
            {app.documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No documents uploaded.</p>
            ) : (
              <ul className="divide-y divide-border/60">
                {app.documents.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center gap-3 py-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{d.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {DOC_CATEGORIES.find((c) => c.value === d.category)?.label} · {fmtDate(d.uploadedAt)} · by {d.uploadedBy}
                        {d.extracted && ` · ${Object.keys(d.extracted).length} fields extracted`}
                      </div>
                    </div>
                    {d.status === "verified" ? (
                      <span className="inline-flex items-center gap-1.5 text-sm text-success">
                        <CheckCircle2 className="h-4 w-4" /> Verified
                      </span>
                    ) : (
                      <button
                        onClick={() => updateApp(app.id, (x) => ({ ...x, documents: x.documents.map((y) => (y.id === d.id ? { ...y, status: "verified" } : y)) }), { action: "Document verified", detail: d.name })}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs hover:border-success/50 hover:text-success"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" /> Mark verified
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Section>
          <Section title="Document requests">
            {app.docRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No requests sent.</p>
            ) : (
              <ul className="space-y-3">
                {app.docRequests.map((r) => (
                  <li key={r.id} className="rounded-lg border border-border p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{r.items.join(", ")}</span>
                      <button
                        onClick={() => updateApp(app.id, (x) => ({ ...x, docRequests: x.docRequests.map((y) => (y.id === r.id ? { ...y, fulfilled: !y.fulfilled } : y)) }), { action: r.fulfilled ? "Request reopened" : "Request fulfilled" })}
                        className={cn("rounded-full border px-2 py-0.5 text-xs", r.fulfilled ? "border-success/40 text-success" : "border-warning/40 text-warning")}
                      >
                        {r.fulfilled ? "Fulfilled" : "Outstanding"}
                      </button>
                    </div>
                    {r.message && <p className="mt-1 text-muted-foreground">{r.message}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {r.by} · {timeAgo(r.at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </TabsContent>

        <TabsContent value="scenarios" className="mt-5 space-y-5">
          <div className="flex flex-wrap gap-2">
            {a.debt.rows.map((r) => (
              <label key={r.debt.id} className={cn("flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs", excluded.has(r.debt.id) ? "border-border text-muted-foreground line-through" : "border-primary/40")}>
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 accent-[hsl(var(--primary))]"
                  checked={!excluded.has(r.debt.id)}
                  onChange={() =>
                    setExcluded((p) => {
                      const n = new Set(p);
                      if (n.has(r.debt.id)) n.delete(r.debt.id);
                      else n.add(r.debt.id);
                      return n;
                    })
                  }
                />
                {r.label}
              </label>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {a.scenarios.map((s) => (
              <ScenarioCard key={s.key} s={s} onDetails={() => setDetail(s)} />
            ))}
          </div>
          <Section title={`Before vs after — Option ${best.key}`}>
            <BeforeAfterChart debt={a.debt} s={best} />
          </Section>
        </TabsContent>

        <TabsContent value="notes" className="mt-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <Section title="Underwriter notes">
              <div className="flex gap-2">
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Add an internal note…" aria-label="New note" className="flex-1 rounded-lg border border-border bg-background/60 p-3 text-sm focus-visible:border-primary focus-visible:outline-none" />
              </div>
              <button
                disabled={!note.trim()}
                onClick={() => {
                  updateApp(app.id, (x) => ({ ...x, notes: [{ id: uid(), author: staff?.name ?? "Staff", text: note.trim(), at: new Date().toISOString() }, ...x.notes] }), { action: "Note added" });
                  setNote("");
                }}
                className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
              >
                Save note
              </button>
              <ul className="mt-5 space-y-3">
                {app.notes.map((n) => (
                  <li key={n.id} className="rounded-lg border border-border p-3 text-sm">
                    <p className="leading-relaxed">{n.text}</p>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {n.author} · {fmtDateTime(n.at)}
                    </p>
                  </li>
                ))}
              </ul>
            </Section>
            <Section title="Audit trail" description="Every action on this file, newest first.">
              <ol className="relative space-y-4 border-l border-border pl-5">
                {app.audit.map((e) => (
                  <li key={e.id} className="relative">
                    <span className="absolute -left-[25px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                    <div className="text-sm">
                      <span className="font-medium">{e.action}</span> <span className="text-muted-foreground">· {e.actor}</span>
                    </div>
                    {e.detail && <div className="text-xs text-muted-foreground">{e.detail}</div>}
                    <div className="mono text-[11px] text-muted-foreground/70">{fmtDateTime(e.at)}</div>
                  </li>
                ))}
              </ol>
            </Section>
          </div>
        </TabsContent>
      </Tabs>

      <RequestDocsDialog app={app} open={dialog === "docs"} onOpenChange={(o) => setDialog(o ? "docs" : null)} />
      <DecisionDialog app={app} analysis={a} outcome="approved" open={dialog === "approve"} onOpenChange={(o) => setDialog(o ? "approve" : null)} />
      <DecisionDialog app={app} analysis={a} outcome="declined" open={dialog === "decline"} onOpenChange={(o) => setDialog(o ? "decline" : null)} />
      <ScenarioSheet s={detail} open={!!detail} onOpenChange={(o) => !o && setDetail(null)} currentMonthly={a.debt.monthly} />
    </div>
  );
}
