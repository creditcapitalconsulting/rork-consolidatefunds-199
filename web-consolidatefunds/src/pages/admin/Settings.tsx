import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Field, Toggle } from "@/components/fields";
import { Section } from "@/components/ui-kit";
import { ASSET_ORDER, ASSET_TYPES, DEFAULT_SETTINGS, FACTOR_LABELS } from "@/lib/config";
import { useStore } from "@/lib/store";
import type { FactorKey, UnderwritingSettings } from "@/lib/types";

const TERM_LABELS: Record<keyof UnderwritingSettings["terms"], string> = {
  full: "A · Full consolidation",
  mca: "B · MCA consolidation",
  asset: "C · Asset-based (and hybrid asset tranche)",
  partial: "D · Partial consolidation",
  hybridRemainder: "E · Hybrid working-capital tranche",
};

export default function Settings() {
  const { settings: s, setSettings, staff, resetDemo } = useStore();
  const admin = staff?.role === "Admin";
  const num = (v: string) => (v === "" ? 0 : Number(v));
  const totalWeight = Object.values(s.weights).reduce((a, b) => a + b, 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-7 lg:px-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="eyebrow">Underwriting</div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Settings & rules</h1>
          <p className="mt-1.5 text-[15px] text-muted-foreground">Advance rates, risk thresholds, scenario terms and factor weights. Changes apply instantly to every file.</p>
        </div>
        <button
          disabled={!admin}
          onClick={() => {
            setSettings(DEFAULT_SETTINGS);
            toast.success("Defaults restored");
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm disabled:opacity-40"
        >
          <RotateCcw className="h-4 w-4" /> Restore defaults
        </button>
      </div>
      {!admin && <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">Read-only; only Admin users can change underwriting rules.</p>}

      <fieldset disabled={!admin} className="mt-6 space-y-6 disabled:opacity-80">
        <Section title="Risk thresholds">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Green at or above" kind="number" value={String(s.thresholds.green)} onChange={(v) => setSettings({ ...s, thresholds: { ...s.thresholds, green: num(v) } })} />
            <Field label="Yellow at or above" kind="number" value={String(s.thresholds.yellow)} onChange={(v) => setSettings({ ...s, thresholds: { ...s.thresholds, yellow: num(v) } })} hint="Below this is Red" />
            <Field label="Target DSCR" kind="number" value={String(s.targetDscr)} onChange={(v) => setSettings({ ...s, targetDscr: num(v) })} />
            <Field label="Origination fee" kind="percent" value={String(s.originationFeePct)} onChange={(v) => setSettings({ ...s, originationFeePct: num(v) })} />
            <div className="sm:col-span-2">
              <Toggle label="Exclude federal holidays from business-day payments" description="Affects every business-daily MCA calculation" checked={s.excludeHolidays} onChange={(v) => setSettings({ ...s, excludeHolidays: v })} />
            </div>
          </div>
        </Section>

        <Section title="Factor weights" description={`Total weight ${totalWeight}. Scores are normalized by total weight.`}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(Object.keys(s.weights) as FactorKey[]).map((k) => (
              <Field key={k} label={FACTOR_LABELS[k]} kind="number" value={String(s.weights[k])} onChange={(v) => setSettings({ ...s, weights: { ...s.weights, [k]: num(v) } })} />
            ))}
          </div>
        </Section>

        <Section title="Collateral advance rates" description="Preliminary lending value as a % of estimated value.">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ASSET_ORDER.map((c) => (
              <Field key={c} label={ASSET_TYPES[c].label} kind="percent" value={String(Math.round(s.advanceRates[c] * 100))} onChange={(v) => setSettings({ ...s, advanceRates: { ...s.advanceRates, [c]: num(v) / 100 } })} />
            ))}
          </div>
        </Section>

        <Section title="Scenario terms" description="Assumed rate and term for each consolidation structure.">
          <div className="space-y-3">
            {(Object.keys(s.terms) as (keyof UnderwritingSettings["terms"])[]).map((k) => (
              <div key={k} className="grid items-end gap-4 sm:grid-cols-[1fr_160px_160px]">
                <div className="pb-3 text-sm">{TERM_LABELS[k]}</div>
                <Field label="Est. APR" kind="percent" value={String(s.terms[k].rate)} onChange={(v) => setSettings({ ...s, terms: { ...s.terms, [k]: { ...s.terms[k], rate: num(v) } } })} />
                <Field label="Term (months)" kind="number" value={String(s.terms[k].months)} onChange={(v) => setSettings({ ...s, terms: { ...s.terms, [k]: { ...s.terms[k], months: num(v) } } })} />
              </div>
            ))}
          </div>
        </Section>

        <Section title="Demo data">
          <button
            type="button"
            onClick={() => {
              resetDemo();
              toast.success("Demo queue reset");
            }}
            className="rounded-lg border border-danger/50 px-4 py-2 text-sm text-danger hover:bg-danger/10"
          >
            Reset sample applications
          </button>
        </Section>
      </fieldset>
    </div>
  );
}
