import { useState } from "react";
import { toast } from "sonner";
import { Field } from "@/components/fields";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DOC_CATEGORIES, FACTOR_LABELS, FREQ_SHORT } from "@/lib/config";
import { csvRow, downloadFile, usd } from "@/lib/format";
import { uid } from "@/lib/sample";
import { useStore } from "@/lib/store";
import type { Application } from "@/lib/types";
import type { FullAnalysis } from "@/lib/underwriting";
import { cn } from "@/lib/utils";

export function RequestDocsDialog({ app, open, onOpenChange }: { app: Application; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { updateApp, staff } = useStore();
  const [items, setItems] = useState<string[]>(["Business bank statements"]);
  const [message, setMessage] = useState("");
  const toggle = (l: string) => setItems((xs) => (xs.includes(l) ? xs.filter((x) => x !== l) : [...xs, l]));
  const send = () => {
    updateApp(
      app.id,
      (a) => ({ ...a, status: a.status === "needs_review" ? "in_analysis" : a.status, docRequests: [{ id: uid(), items, message, at: new Date().toISOString(), by: staff?.name ?? "Staff", fulfilled: false }, ...a.docRequests] }),
      { action: "Documents requested", detail: items.join(", ") },
    );
    toast.success("Document request sent", { description: `Emailed to ${app.business.contactEmail || "the applicant"}.` });
    onOpenChange(false);
    setMessage("");
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-border bg-card">
        <DialogHeader>
          <DialogTitle>Request documents</DialogTitle>
          <DialogDescription>{app.business.legalName} will be notified by email and see the request in their portal.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 sm:grid-cols-2">
          {DOC_CATEGORIES.map((c) => (
            <label key={c.value} className={cn("flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm", items.includes(c.label) ? "border-primary/60 bg-primary/5" : "border-border")}>
              <input type="checkbox" checked={items.includes(c.label)} onChange={() => toggle(c.label)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
              {c.label}
            </label>
          ))}
        </div>
        <Field label="Message to applicant" kind="textarea" value={message} onChange={setMessage} placeholder="e.g. Please include the last 3 months and the Vox Funding contract." />
        <DialogFooter>
          <button onClick={() => onOpenChange(false)} className="rounded-lg border border-border px-4 py-2 text-sm">
            Cancel
          </button>
          <button disabled={!items.length} onClick={send} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            Send request
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DecisionDialog({ app, analysis, outcome, open, onOpenChange }: { app: Application; analysis: FullAnalysis; outcome: "approved" | "declined"; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { updateApp, staff } = useStore();
  const best = analysis.scenarios.find((s) => s.best) ?? analysis.scenarios[0];
  const [key, setKey] = useState<string>(best.key);
  const [reason, setReason] = useState("");
  const approve = outcome === "approved";
  const submit = () => {
    const s = analysis.scenarios.find((x) => x.key === key)!;
    updateApp(
      app.id,
      (a) => ({ ...a, status: approve ? "approved" : "declined", decision: { scenarioKey: key, outcome, by: staff?.name ?? "Staff", at: new Date().toISOString(), reason } }),
      { action: approve ? `Approved structure ${key}` : "Declined", detail: approve ? `${s.name} · ${usd(s.financing)} · ${s.termMonths} mo${reason ? ` — ${reason}` : ""}` : reason },
    );
    toast.success(approve ? `Structure ${key} approved` : "Application declined");
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-border bg-card">
        <DialogHeader>
          <DialogTitle>{approve ? "Approve structure" : "Decline application"}</DialogTitle>
          <DialogDescription>{approve ? "Choose the structure to send to lending partners." : "Record the reason. The applicant receives an adverse-action notice."}</DialogDescription>
        </DialogHeader>
        {approve && (
          <div className="space-y-2" role="radiogroup">
            {analysis.scenarios.map((s) => (
              <label key={s.key} className={cn("flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm", key === s.key ? "border-primary/60 bg-primary/5" : "border-border", !s.feasible && "opacity-50")}>
                <input type="radio" name="scenario" checked={key === s.key} disabled={!s.feasible} onChange={() => setKey(s.key)} className="accent-[hsl(var(--primary))]" />
                <span className="num w-5 font-semibold">{s.key}</span>
                <span className="flex-1">
                  {s.name}
                  {s.best && <span className="ml-2 text-xs text-primary">recommended</span>}
                </span>
                <span className="num text-muted-foreground">{usd(s.financing, { compact: true })}</span>
                <span className={cn("num", s.monthlyImprovement > 0 ? "text-primary" : "text-danger")}>{usd(s.monthlyImprovement, { sign: true, compact: true })}/mo</span>
              </label>
            ))}
          </div>
        )}
        <Field label={approve ? "Conditions / notes (optional)" : "Decline reason"} kind="textarea" value={reason} onChange={setReason} />
        <DialogFooter>
          <button onClick={() => onOpenChange(false)} className="rounded-lg border border-border px-4 py-2 text-sm">
            Cancel
          </button>
          <button disabled={!approve && !reason.trim()} onClick={submit} className={cn("rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50", approve ? "bg-primary text-primary-foreground" : "bg-danger text-white")}>
            {approve ? `Approve ${key}` : "Decline"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function exportApplicationCsv(app: Application, a: FullAnalysis) {
  const L: string[] = [];
  L.push(csvRow(["ConsolidateFunds.com underwriting export"]), csvRow(["Reference", app.ref]), csvRow(["Business", app.business.legalName]), csvRow(["Status", app.status]), csvRow(["Risk", a.uw.risk, a.uw.score]), "");
  L.push(csvRow(["Metric", "Value"]));
  L.push(csvRow(["Monthly revenue", Math.round(a.metrics.monthlyRevenue)]), csvRow(["CFADS (annual)", Math.round(a.metrics.cfads)]), csvRow(["DSCR", a.metrics.dscr?.toFixed(2) ?? ""]), csvRow(["Burden % revenue", a.metrics.burdenPct?.toFixed(1) ?? ""]), csvRow(["Total monthly debt", Math.round(a.debt.monthly)]), csvRow(["Total payoff", Math.round(a.debt.payoff)]), csvRow(["Collateral capacity (preliminary)", Math.round(a.collateral.capacity)]), "");
  L.push(csvRow(["Debt", "Type", "Frequency", "Monthly equiv", "Annual", "Payoff", "Remaining contractual", "Status"]));
  a.debt.rows.forEach((r) => L.push(csvRow([r.label, r.debt.type, FREQ_SHORT[r.debt.frequency], Math.round(r.monthly), Math.round(r.annual), Math.round(r.payoff), Math.round(r.contractual), r.debt.status])));
  L.push("", csvRow(["Factor", "Score", "Weight", "Detail"]));
  a.uw.factors.forEach((f) => L.push(csvRow([FACTOR_LABELS[f.key], f.score, f.weight, f.detail])));
  L.push("", csvRow(["Scenario", "Name", "Financing", "New monthly", "Improvement/mo", "Term", "Post DSCR", "Best"]));
  a.scenarios.forEach((s) => L.push(csvRow([s.key, s.name, Math.round(s.financing), Math.round(s.newPayment + s.remainingPayment), Math.round(s.monthlyImprovement), s.termMonths, s.postDscr?.toFixed(2) ?? "", s.best ? "yes" : ""])));
  L.push("", csvRow(["Bank lender", "Frequency", "Est monthly", "Disclosed"]));
  a.bank.lenders.forEach((l) => L.push(csvRow([l.name, l.frequency, Math.round(l.monthlyEstimate), l.matchedDebtId ? "yes" : "NO"])));
  downloadFile(`${app.ref}-${app.business.legalName.replace(/\W+/g, "_")}.csv`, L.join("\n"));
}
