import { ArrowRight, BarChart3, Building2, Check, FileText, Landmark, Layers, Receipt, Search, ShieldCheck, Truck, Warehouse } from "lucide-react";
import { Link } from "react-router-dom";
import { SiteHeader } from "@/components/SiteHeader";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DEBT_TYPES, DEBT_TYPE_ORDER } from "@/lib/config";
import { DebtBadge } from "@/components/badges";
import { LogoMark } from "@/components/Logo";

const BEFORE = [
  { label: "Merchant cash advances", value: 31700, color: "bg-danger" },
  { label: "Business loan", value: 4000, color: "bg-warning" },
  { label: "Equipment financing", value: 1500, color: "bg-muted-foreground/60" },
  { label: "Credit card", value: 1000, color: "bg-muted-foreground/40" },
  { label: "Tax payment plan", value: 800, color: "bg-muted-foreground/30" },
];

export default function Landing() {
  const max = Math.max(...BEFORE.map((b) => b.value));
  return (
    <div className="min-h-screen">
      <SiteHeader variant="public" />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="grid-bg pointer-events-none absolute inset-0" />
        <div className="relative mx-auto grid max-w-[1400px] gap-14 px-5 pb-16 pt-10 lg:grid-cols-[1.05fr_1fr] lg:px-10 lg:pt-16">
          <div className="fade-up">
            <p className="eyebrow mb-5">Business debt restructuring · Commercial finance brokerage</p>
            <h1 className="text-[34px] font-bold leading-[1.02] tracking-[-0.03em] sm:text-5xl xl:text-[60px]">
              Every Debt.
              <br />
              Every Asset.
              <br />
              <span className="text-primary">One Smarter</span>
              <br />
              Financial Solution.
            </h1>
            <p className="mt-7 max-w-xl text-[15px] leading-relaxed text-muted-foreground sm:text-base">
              Tell us about every MCA, loan, card, mortgage and tax balance you carry, and every asset you own. Our underwriting engine figures out the consolidation or refinancing structure that frees up the most cash, then we place it with the right funding partner.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Link to="/apply" className="group inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-[15px] font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5">
                Start your application <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">No obligation · No hard pull · Autosaves</p>
            </div>
          </div>

          {/* Example panel */}
          <div className="fade-up panel self-center p-6 sm:p-8 [animation-delay:120ms]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">A real example. A brighter tomorrow.</h2>
              <span className="rounded-full bg-secondary px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">Typical result</span>
            </div>
            <div className="mt-6 grid gap-8 sm:grid-cols-[1fr_auto_1fr] sm:items-start">
              <div>
                <p className="eyebrow">Before consolidation</p>
                <p className="num mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                  $39,000<span className="text-xl font-medium text-muted-foreground">/mo</span>
                </p>
                <ul className="mt-5 space-y-3">
                  {BEFORE.map((b) => (
                    <li key={b.label}>
                      <div className="flex justify-between text-[13px]">
                        <span className="text-muted-foreground">{b.label}</span>
                        <span className="num">${b.value.toLocaleString()}</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-secondary">
                        <div className={`h-full rounded-full ${b.color}`} style={{ width: `${(b.value / max) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <ArrowRight className="mx-auto hidden h-6 w-6 text-muted-foreground sm:mt-10 sm:block" />
              <div>
                <p className="eyebrow">After consolidation</p>
                <p className="num mt-2 text-4xl font-bold tracking-tight text-primary sm:text-[44px]">
                  $17,400<span className="text-xl font-medium opacity-70">/mo</span>
                </p>
                <div className="mt-5 h-2 rounded-full bg-secondary">
                  <div className="h-full w-[45%] rounded-full bg-success" />
                </div>
                <ul className="mt-6 space-y-3 text-[14px]">
                  {["One monthly payment", "No more daily ACH pulls", "+$21,600 monthly cash flow", "48-month term"].map((t) => (
                    <li key={t} className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-success" /> {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5 text-sm">
              <span>MCAs, loans, mortgages, equipment, tax debt</span>
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">All in one solution</span>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="relative mx-auto grid max-w-[1400px] gap-5 px-5 pb-16 md:grid-cols-3 lg:px-10">
          {[
            { icon: FileText, title: "Every debt type", body: "MCAs, term loans, lines of credit, mortgages, equipment, factoring, tax debt and judgments, each with its own questions.", link: "#solutions", cta: "See all eligible debt types" },
            { icon: BarChart3, title: "Cash-flow first underwriting", body: "We normalize every payment schedule into true monthly burden and measure what your business can actually sustain.", link: "#how", cta: "How our analysis works" },
            { icon: ShieldCheck, title: "Asset-backed options", body: "Receivables, real estate, equipment and inventory can unlock cheaper, longer financing than cash-flow loans alone.", link: "#assets", cta: "Explore asset-based solutions" },
          ].map((f) => (
            <article key={f.title} className="panel group p-7 transition-colors hover:border-primary/40">
              <span className="grid h-12 w-12 place-items-center rounded-lg bg-secondary text-primary">
                <f.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-6 text-2xl font-semibold">{f.title}</h3>
              <p className="mt-3 leading-relaxed text-muted-foreground">{f.body}</p>
              <a href={f.link} className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary">
                {f.cta} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
            </article>
          ))}
        </div>

        <div className="mx-auto grid max-w-[1400px] grid-cols-2 gap-px overflow-hidden border-y border-border bg-border md:grid-cols-4">
          {[
            ["16", "debt types understood"],
            ["10", "payment schedules normalized"],
            ["5", "consolidation structures compared"],
            ["1", "application for everything"],
          ].map(([k, v]) => (
            <div key={v} className="bg-background px-6 py-7 lg:px-10">
              <div className="num text-3xl font-bold text-primary sm:text-4xl">{k}</div>
              <div className="mt-1 text-sm text-muted-foreground">{v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW */}
      <section id="how" className="mx-auto max-w-[1400px] scroll-mt-20 px-5 py-16 lg:py-20 lg:px-10">
        <p className="eyebrow">How it works</p>
        <h2 className="mt-3 max-w-3xl text-3xl font-bold leading-tight sm:text-4xl">We don't lend. We figure out the solution, then find who should fund it.</h2>
        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Layers, n: "01", t: "Disclose everything once", d: "Seven short steps. You only see questions that apply to the debts and assets you add." },
            { icon: Search, n: "02", t: "We verify with your bank", d: "Connect or upload statements. We detect lender withdrawals, NSFs and transfers automatically." },
            { icon: BarChart3, n: "03", t: "Engine builds scenarios", d: "Full, MCA-only, asset-based, partial and hybrid structures, ranked by sustainable cash-flow benefit." },
            { icon: Landmark, n: "04", t: "We place it with partners", d: "An underwriter reviews, then we match you with the lender best suited to fund the winning structure." },
          ].map((s) => (
            <div key={s.n} className="panel relative p-7">
              <span className="mono absolute right-6 top-6 text-sm text-muted-foreground">{s.n}</span>
              <s.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-6 text-xl font-semibold">{s.t}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SOLUTIONS */}
      <section id="solutions" className="scroll-mt-20 border-y border-border bg-card/40">
        <div className="mx-auto max-w-[1400px] px-5 py-16 lg:py-20 lg:px-10">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="eyebrow">Debt solutions</p>
              <h2 className="mt-3 text-3xl font-bold sm:text-4xl">If it's an obligation, we can analyze it.</h2>
            </div>
            <p className="max-w-md text-muted-foreground">MCA factor rates are treated as purchased receivables, never confused with APR. Every schedule, from business-daily ACH to quarterly tax installments, is normalized to the same monthly yardstick.</p>
          </div>
          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {DEBT_TYPE_ORDER.map((t) => (
              <div key={t} className="flex items-start gap-3 rounded-xl border border-border bg-background/60 p-4">
                <DebtBadge type={t} />
                <div>
                  <div className="text-[15px] font-medium">{DEBT_TYPES[t].label}</div>
                  <div className="mt-0.5 text-xs leading-snug text-muted-foreground">{DEBT_TYPES[t].intro}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ASSETS */}
      <section id="assets" className="mx-auto grid max-w-[1400px] scroll-mt-20 gap-14 px-5 py-16 lg:py-20 lg:grid-cols-2 lg:px-10">
        <div>
          <p className="eyebrow">Asset-based financing</p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Your balance sheet is leverage. Use it.</h2>
          <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground sm:text-base">We estimate preliminary borrowing capacity from every asset you disclose, then use it to replace expensive daily-pay debt with longer, cheaper secured financing.</p>
          <Link to="/apply" className="mt-8 inline-flex items-center gap-2 rounded-xl border border-border px-6 py-3.5 font-medium hover:border-primary hover:text-primary">
            See what your assets support <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { icon: Receipt, t: "Accounts receivable", d: "Up to 80% of eligible invoices" },
            { icon: Building2, t: "Commercial real estate", d: "Up to 75% loan-to-value less liens" },
            { icon: Truck, t: "Equipment & vehicles", d: "50–60% of appraised value" },
            { icon: Warehouse, t: "Inventory & purchase orders", d: "Liquidation-value based" },
          ].map((a) => (
            <div key={a.t} className="panel p-6">
              <a.icon className="h-6 w-6 text-primary" />
              <div className="mt-5 text-lg font-semibold">{a.t}</div>
              <div className="mt-1 text-sm text-muted-foreground">{a.d}</div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground sm:col-span-2">Advance rates are illustrative and preliminary until collateral is verified and appraised.</p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-[900px] scroll-mt-20 px-5 pb-24">
        <h2 className="text-center text-3xl font-bold sm:text-4xl">Questions, answered</h2>
        <Accordion type="single" collapsible className="mt-10">
          {[
            ["Are you a lender?", "No. ConsolidateFunds is a broker and analysis platform. We evaluate your full financial position, design the structure that fits, and place it with third-party funding partners."],
            ["Will applying hurt my credit?", "No. Completing the application and receiving scenarios does not trigger a hard credit inquiry. A lender may request one only once you choose to move forward."],
            ["Why do you ask about every debt?", "Consolidation only works if the new payment is sustainable. Missing an obligation, especially a daily MCA, makes the numbers wrong. We also cross-check bank activity for withdrawals you might have missed."],
            ["Can you help if I'm already behind on MCAs?", "Often, yes. Stacked or defaulted MCAs are one of the most common situations we analyze. Restructuring, settlements and asset-based refinances can all be options."],
            ["Is my information secure?", "Data is encrypted in transit and at rest, access is role-based with multi-factor authentication for staff, and every view and change is recorded in an audit trail."],
          ].map(([q, a]) => (
            <AccordionItem key={q} value={q} className="border-border">
              <AccordionTrigger className="py-5 text-left text-[17px] hover:no-underline">{q}</AccordionTrigger>
              <AccordionContent className="pb-5 text-[15px] leading-relaxed text-muted-foreground">{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-[1400px] px-5 pb-20 lg:px-10">
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-primary p-10 text-primary-foreground md:flex-row md:items-center lg:p-14">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">See your true monthly debt burden in minutes.</h2>
            <p className="mt-2 text-primary-foreground/75">Your progress saves automatically; finish whenever you're ready.</p>
          </div>
          <Link to="/apply" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-background px-7 py-4 font-semibold text-foreground transition-transform hover:-translate-y-0.5">
            Start your application <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-5 py-10 text-sm text-muted-foreground lg:flex-row lg:items-start lg:justify-between lg:px-10">
          <div className="flex items-center gap-2 text-foreground">
            <LogoMark className="h-6 w-6" /> ConsolidateFunds.com
          </div>
          <p className="max-w-3xl text-xs leading-relaxed">
            ConsolidateFunds.com is a commercial financing broker and does not make loans or purchase receivables. Scenarios, collateral values and borrowing capacity are preliminary estimates, not offers or commitments to lend, and remain subject to underwriting review, verification and applicable law. Business purpose financing only.
          </p>
        </div>
      </footer>
    </div>
  );
}
