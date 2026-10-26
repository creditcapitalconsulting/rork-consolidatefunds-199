import { ArrowRight, CheckCircle2, Pencil, Send } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Callout } from "@/components/fields";
import { KV, Prelim, Stat } from "@/components/ui-kit";
import { ASSET_TYPES } from "@/lib/config";
import { pct, ratio, usd } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { FullAnalysis } from "@/lib/underwriting";

function Block({ title, step, children }: { title: string; step: string; children: React.ReactNode }) {
  return (
    <section className="panel p-5 sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        <Link to={`/apply/${step}`} className="inline-flex items-center gap-1.5 rounded text-sm text-primary hover:underline">
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Link>
      </div>
      {children}
    </section>
  );
}

export function ReviewStep({ analysis }: { analysis: FullAnalysis }) {
  const { draft, submitDraft, resetDraft } = useStore();
  const nav = useNavigate();
  const [consent, setConsent] = useState(false);
  const { debt, metrics, collateral, scenarios, bank } = analysis;
  const best = scenarios.find((s) => s.best);
  const b = draft.business;
  const missing = [!b.legalName && "business name", !b.contactEmail && "contact email", !(draft.financials.monthlyRevenue || draft.financials.annualRevenue) && "revenue", draft.debts.length === 0 && "at least one debt"].filter(Boolean) as string[];

  if (draft.submittedAt) {
    return (
      <div className="panel mx-auto max-w-2xl p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
        <h2 className="mt-4 text-2xl font-bold">Application submitted</h2>
        <p className="mt-2 text-muted-foreground">
          Reference <span className="mono text-foreground">{draft.ref}</span>. An underwriter will review your file and contact you within one business day. We may request additional documents.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/scenarios" className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
            View my scenarios <ArrowRight className="h-4 w-4" />
          </Link>
          <button onClick={() => { resetDraft(); nav("/apply/business"); }} className="rounded-lg border border-border px-5 py-2.5 text-sm">
            Start a new application
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-4">
        <Block title="Business" step="business">
          <div className="grid gap-x-8 sm:grid-cols-2">
            <KV k="Legal name" v={b.legalName || "—"} />
            <KV k="Industry" v={b.industry || "—"} />
            <KV k="Entity / state" v={[b.entity, b.stateOfIncorporation].filter(Boolean).join(" · ") || "—"} />
            <KV k="Location" v={[b.city, b.state].filter(Boolean).join(", ") || "—"} />
            <KV k="Contact" v={b.contactName || "—"} />
            <KV k="Owners" v={b.owners.filter((o) => o.name).map((o) => `${o.name} (${o.ownership || "?"}%)`).join(", ") || "—"} />
          </div>
        </Block>
        <Block title="Financials" step="financials">
          <div className="grid gap-x-8 sm:grid-cols-2">
            <KV k="Monthly revenue" v={usd(metrics.monthlyRevenue)} />
            <KV k="Annual revenue" v={usd(metrics.annualRevenue)} />
            <KV k="Cash flow for debt service" v={usd(metrics.cfads)} />
            <KV k="Growth" v={pct(metrics.growthPct, 1)} />
          </div>
        </Block>
        <Block title={`Debts (${draft.debts.length})`} step="debts">
          <ul className="divide-y divide-border/60 text-sm">
            {debt.rows.map((r) => (
              <li key={r.debt.id} className="flex justify-between gap-4 py-2">
                <span className="truncate">{r.label}</span>
                <span className="num shrink-0 text-muted-foreground">
                  {usd(r.monthly)}/mo · payoff {usd(r.payoff)}
                </span>
              </li>
            ))}
          </ul>
        </Block>
        <Block title={`Assets (${draft.assets.length})`} step="assets">
          {collateral.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No assets listed.</p>
          ) : (
            <ul className="divide-y divide-border/60 text-sm">
              {collateral.rows.map((r) => (
                <li key={r.asset.id} className="flex justify-between gap-4 py-2">
                  <span className="truncate">{r.label || ASSET_TYPES[r.asset.category].label}</span>
                  <span className="num shrink-0 text-muted-foreground">{usd(r.value)} value</span>
                </li>
              ))}
            </ul>
          )}
        </Block>
        <Block title="Banking & documents" step="banking">
          <div className="grid gap-x-8 sm:grid-cols-2">
            <KV k="Bank data" v={draft.bank.source === "none" ? "Not provided" : draft.bank.source === "upload" ? "CSV uploaded" : `${draft.bank.institution} (demo)`} />
            <KV k="Lenders detected" v={bank.hasData ? `${bank.lenders.length} (${bank.undisclosed.length} undisclosed)` : "—"} />
            <KV k="Documents uploaded" v={draft.documents.length} />
          </div>
        </Block>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="panel p-6">
          <h2 className="font-semibold">Your snapshot</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Stat label="Monthly burden" value={usd(debt.monthly)} />
            <Stat label="Of revenue" value={pct(metrics.burdenPct)} />
            <Stat label="DSCR" value={ratio(metrics.dscr)} />
            <Stat label="Collateral capacity" value={usd(collateral.capacity, { compact: true })} sub={<Prelim />} />
          </div>
          {best && (
            <div className="mt-4 rounded-lg border border-primary/40 bg-primary/[0.06] p-4">
              <div className="eyebrow text-primary">Best option · {best.key}</div>
              <div className="mt-1 font-semibold">{best.name}</div>
              <div className="num mt-1 text-sm text-muted-foreground">
                Could save <span className="text-primary">{usd(best.monthlyImprovement)}/mo</span>
              </div>
              <Link to="/scenarios" className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline">
                Compare scenarios <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>
        <div className="panel p-6">
          {missing.length > 0 && (
            <div className="mb-4">
              <Callout tone="warn">Still needed: {missing.join(", ")}.</Callout>
            </div>
          )}
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]" />
            <span className="text-muted-foreground">
              I certify the information is accurate and authorize ConsolidateFunds.com, as a broker, to share it with lending partners to obtain financing offers. No offer is guaranteed.
            </span>
          </label>
          <button
            disabled={!consent || missing.length > 0}
            onClick={() => {
              submitDraft();
              toast.success("Application submitted");
            }}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-4 w-4" /> Submit application
          </button>
        </div>
      </aside>
    </div>
  );
}
