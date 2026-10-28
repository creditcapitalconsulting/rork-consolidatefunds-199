import { ArrowLeft, ArrowRight, Check, Eraser, FlaskConical, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { SiteHeader } from "@/components/SiteHeader";
import { ownerComplete } from "@/lib/format";
import { toast } from "sonner";
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
  { slug: "financials", label: "Financials", title: "Business financials", sub: "Revenue, profitability and balance sheet; estimates are fine for now." },
  { slug: "debts", label: "Debts", title: "Your Existing Debts", sub: "Add and configure your business debts so we can find your best consolidation options." },
  { slug: "assets", label: "Assets", title: "Assets & collateral", sub: "Assets can unlock lower-cost, longer-term structures. Values are preliminary until verified." },
  { slug: "banking", label: "Banking", title: "Business banking", sub: "Bank activity lets us verify revenue and every recurring lender withdrawal." },
  { slug: "documents", label: "Documents", title: "Supporting documents", sub: "Upload what you have; we'll request anything else we need." },
  { slug: "review", label: "Review", title: "Review & submit", sub: "Check everything once more. You can edit any section before submitting." },
] as const;

export type StepSlug = (typeof STEPS)[number]["slug"];

function LoadSampleControl({ compact = false, onLoad }: { compact?: boolean; onLoad: () => void }) {
  const trigger = (
    <button
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border border-border font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-primary",
        compact ? "px-3 py-1.5 text-[13px]" : "px-3.5 py-2 text-[13px]",
      )}
      aria-label="Load the sample business"
    >
      <Sparkles className="h-3.5 w-3.5" /> Load sample
    </button>
  );
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent className="border-border bg-card">
        <AlertDialogHeader>
          <AlertDialogTitle>Replace your answers with the sample?</AlertDialogTitle>
          <AlertDialogDescription>
            The sample business overwrites everything you've entered so far. This can't be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep my answers</AlertDialogCancel>
          <AlertDialogAction className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={onLoad}>
            Yes, load the sample
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ClearDraftControl({ compact = false, onClear }: { compact?: boolean; onClear: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border border-danger/50 bg-danger/10 font-semibold text-danger transition-colors hover:bg-danger/20 active:bg-danger/25",
            compact ? "px-3 py-1.5 text-[13px]" : "px-3.5 py-2 text-[13px]",
          )}
          aria-label="Clear the saved draft and start over"
        >
          <Trash2 className="h-3.5 w-3.5" /> Clear
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent className="border-border bg-card">
        <AlertDialogHeader>
          <AlertDialogTitle>Clear this application?</AlertDialogTitle>
          <AlertDialogDescription>
            This deletes everything you've entered so far. This can't be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep my answers</AlertDialogCancel>
          <AlertDialogAction className="bg-danger text-white hover:bg-danger/85" onClick={onClear}>
            Yes, clear everything
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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
  const { draft, loadSampleDraft, resetDraft, settings } = useStore();
  const idx = STEPS.findIndex((s) => s.slug === step);
  const analysis = useMemo(() => analyzeApplication(draft, settings), [draft, settings]);

  useEffect(() => {
    try {
      window.scrollTo({ top: 0 });
    } catch {
      /* some embedded browsers restrict scrolling — ignore */
    }
  }, [idx]);

  if (!step) return <Navigate to="/apply/business" replace />;
  if (idx < 0) return <Navigate to="/apply/business" replace />;
  const cur = STEPS[idx];
  const empty = !draft.business.legalName && draft.debts.length === 0;
  const isSample = draft.sample === true;

  const clearSample = () => {
    resetDraft();
    toast.success("Sample data cleared", { description: "The wizard is now empty. Start entering your own business details." });
    nav("/apply/business");
  };

  const go = (i: number) => nav(`/apply/${STEPS[i].slug}`);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-[1400px] px-5 pb-24 pt-5 lg:px-10 lg:pt-7">
        <div className="flex items-center justify-between gap-3">
          <Link to={idx === 0 ? "/" : `/apply/${STEPS[idx - 1].slug}`} className="inline-flex items-center gap-2 rounded text-[15px] text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> {idx === 0 ? "Back to Home" : `Back to ${STEPS[idx - 1].label}`}
          </Link>
          {!empty && (
            <div className="flex items-center gap-2 sm:hidden">
              {!isSample && (
                <LoadSampleControl
                  compact
                  onLoad={() => {
                    loadSampleDraft();
                    toast.success("Sample business loaded", { description: "Explore the numbers, then clear it to start your own." });
                    nav("/apply/business");
                  }}
                />
              )}
              <ClearDraftControl
                compact
                onClear={() => {
                  resetDraft();
                  toast.success("Application cleared", { description: "Everything was deleted. You're starting fresh." });
                  nav("/apply/business");
                }}
              />
            </div>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl sm:leading-[1.15]">{cur.title}</h1>
            <p className="mt-2 text-[15px] text-muted-foreground sm:text-[17px]">{cur.sub}</p>
          </div>
          <div className="hidden flex-wrap items-center gap-x-4 gap-y-2 pb-1 sm:flex">
            <span className="text-[15px] text-muted-foreground">
              Application <span className="num text-foreground">{idx + 1}</span> of 7
            </span>
            {!empty && !isSample && (
              <LoadSampleControl
                onLoad={() => {
                  loadSampleDraft();
                  toast.success("Sample business loaded", { description: "Explore the numbers, then clear it to start your own." });
                  nav("/apply/business");
                }}
              />
            )}
            {!empty && (
              <ClearDraftControl
                onClear={() => {
                  resetDraft();
                  toast.success("Application cleared", { description: "Everything was deleted. You're starting fresh." });
                  nav("/apply/business");
                }}
              />
            )}
          </div>
        </div>

        {isSample ? (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning/[0.07] px-5 py-3.5">
            <p className="flex items-center gap-2.5 text-sm">
              <FlaskConical className="h-4 w-4 shrink-0 text-warning" /> You're viewing sample data for a demo business. Clear it when you're ready to start your own application.
            </p>
            <button
              onClick={clearSample}
              className="inline-flex items-center gap-2 rounded-lg border border-warning/50 px-4 py-2 text-sm font-semibold text-warning transition-colors hover:bg-warning/10"
            >
              <Eraser className="h-4 w-4" /> Clear sample data
            </button>
          </div>
        ) : empty && (
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
