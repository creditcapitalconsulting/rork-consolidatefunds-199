import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { SiteHeader } from "@/components/SiteHeader";
import { ownerComplete } from "@/lib/format";
import { useStore } from "@/lib/store";
import { analyzeApplication } from "@/lib/underwriting";
import { cn } from "@/lib/utils";
import { AssetsStep } from "./AssetsStep";
import { BankingStep } from "./BankingStep";
import { BusinessStep } from "./BusinessStep";
import { DebtsStep } from "./DebtsStep";
import { DocumentsStep } from "./DocumentsStep";
import { FinancialsStep } from "./FinancialsStep";
import { ReviewStep } from "./ReviewStep";

export const STEPS = [
  { slug: "business", label: "Business", title: "Tell us about your business", sub: "Basic company, contact and ownership details." },
  { slug: "financials", label: "Financials", title: "Business financials", sub: "Revenue, profitability and balance sheet — estimates are fine for now." },
  { slug: "debts", label: "Debts", title: "Your Existing Debts", sub: "Add and configure your business debts so we can find your best consolidation options." },
  { slug: "assets", label: "Assets", title: "Assets & collateral", sub: "Assets can unlock lower-cost, longer-term structures. Values are preliminary until verified." },
  { slug: "banking", label: "Banking", title: "Business banking", sub: "Bank activity lets us verify revenue and every recurring lender withdrawal." },
  { slug: "documents", label: "Documents", title: "Supporting documents", sub: "Upload what you have — we'll request anything else we need." },
  { slug: "review", label: "Review", title: "Review & submit", sub: "Check everything once more. You can edit any section before submitting." },
] as const;

export type StepSlug = (typeof STEPS)[number]["slug"];

function useNow(ms = 15000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

function AutosaveIndicator({ lastSaved }: { lastSaved: number | null }) {
  const now = useNow();
  const secs = lastSaved ? Math.max(0, Math.round((now - lastSaved) / 1000)) : null;
  const label = secs === null ? "Autosave on" : secs < 10 ? "Autosaved just now" : secs < 60 ? `Autosaved ${secs}s ago` : `Autosaved ${Math.round(secs / 60)} min ago`;
  return (
    <span className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
      <span className="h-2.5 w-2.5 rounded-full bg-success" />
      {label}
    </span>
  );
}

function stepComplete(slug: StepSlug, d: ReturnType<typeof useStore>["draft"]) {
  switch (slug) {
    case "business":
      return !!(d.business.legalName && d.business.industry && d.business.contactEmail) && d.business.owners.every(ownerComplete);
    case "financials":
      return !!(d.financials.monthlyRevenue || d.financials.annualRevenue);
    case "debts":
      return d.debts.length > 0;
    case "assets":
      return d.assets.length > 0;
    case "banking":
      return d.bank.source !== "none";
    case "documents":
      return d.documents.length > 0;
    default:
      return !!d.submittedAt;
  }
}

export default function Apply() {
  const { step } = useParams();
  const nav = useNavigate();
  const { draft, lastSaved, loadSampleDraft, settings } = useStore();
  const idx = STEPS.findIndex((s) => s.slug === step);
  const analysis = useMemo(() => analyzeApplication(draft, settings), [draft, settings]);

  useEffect(() => window.scrollTo({ top: 0 }), [idx]);

  if (!step) return <Navigate to="/apply/business" replace />;
  if (idx < 0) return <Navigate to="/apply/business" replace />;
  const cur = STEPS[idx];
  const empty = !draft.business.legalName && draft.debts.length === 0;

  const go = (i: number) => nav(`/apply/${STEPS[i].slug}`);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-[1400px] px-5 pb-24 pt-7 lg:px-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link to={idx === 0 ? "/" : `/apply/${STEPS[idx - 1].slug}`} className="inline-flex items-center gap-2 rounded text-[15px] text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> {idx === 0 ? "Back to Home" : `Back to ${STEPS[idx - 1].label}`}
            </Link>
            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-[40px] sm:leading-[1.1]">{cur.title}</h1>
            <p className="mt-2 text-[15px] text-muted-foreground sm:text-[17px]">{cur.sub}</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1 sm:pt-8">
            <span className="text-[15px] text-muted-foreground">
              Application <span className="num text-foreground">{idx + 1}</span> of 7
            </span>
            <AutosaveIndicator lastSaved={lastSaved} />
          </div>
        </div>

        {empty && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/[0.06] px-5 py-3.5">
            <p className="flex items-center gap-2.5 text-sm">
              <Sparkles className="h-4 w-4 text-primary" /> Just exploring? Load a sample business to see the full analysis instantly.
            </p>
            <button onClick={loadSampleDraft} className="rounded-lg border border-primary/50 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10">
              Load sample business
            </button>
          </div>
        )}

        <nav aria-label="Application steps" className="mt-8 overflow-x-auto pb-2">
          <ol className="flex min-w-[640px] items-start">
            {STEPS.map((s, i) => {
              const done = i !== idx && stepComplete(s.slug, draft);
              const active = i === idx;
              return (
                <li key={s.slug} className="relative flex flex-1 flex-col items-center">
                  {i > 0 && <span className={cn("absolute right-1/2 top-[18px] h-px w-full -translate-y-1/2", i <= idx ? "bg-primary/60" : "bg-border")} aria-hidden />}
                  <button
                    onClick={() => go(i)}
                    aria-current={active ? "step" : undefined}
                    className="group relative z-10 flex flex-col items-center gap-2 rounded-lg px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span
                      className={cn(
                        "num grid h-9 w-9 place-items-center rounded-full border text-sm font-semibold transition-colors",
                        active ? "border-primary bg-primary text-primary-foreground" : done ? "border-primary/70 bg-background text-primary" : "border-muted-foreground/40 bg-background text-foreground/80 group-hover:border-foreground/60",
                      )}
                    >
                      {done && !active ? <Check className="h-4 w-4" /> : i + 1}
                    </span>
                    <span className={cn("text-[15px]", active ? "font-semibold text-primary" : "text-foreground/80")}>{s.label}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="fade-up mt-6" key={cur.slug}>
          {cur.slug === "business" && <BusinessStep />}
          {cur.slug === "financials" && <FinancialsStep analysis={analysis} />}
          {cur.slug === "debts" && <DebtsStep analysis={analysis} />}
          {cur.slug === "assets" && <AssetsStep analysis={analysis} />}
          {cur.slug === "banking" && <BankingStep analysis={analysis} />}
          {cur.slug === "documents" && <DocumentsStep />}
          {cur.slug === "review" && <ReviewStep analysis={analysis} />}
        </div>

        {cur.slug !== "review" && (
          <div className="no-print mt-8 flex items-center justify-between gap-3 border-t border-border pt-6">
            <button
              onClick={() => (idx === 0 ? nav("/") : go(idx - 1))}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:border-muted-foreground/50"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button onClick={() => go(idx + 1)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-px">
              Continue to {STEPS[idx + 1].label} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
