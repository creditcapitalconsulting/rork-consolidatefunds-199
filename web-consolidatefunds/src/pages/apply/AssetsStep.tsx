import { Landmark, Plus, Trash2 } from "lucide-react";
import { DefField } from "@/components/fields";
import { EmptyState, KV, Prelim } from "@/components/ui-kit";
import { ASSET_ORDER, ASSET_TYPES } from "@/lib/config";
import { usd } from "@/lib/format";
import { newAsset } from "@/lib/sample";
import { useStore } from "@/lib/store";
import type { AssetCategory } from "@/lib/types";
import type { FullAnalysis } from "@/lib/underwriting";

export function AssetsStep({ analysis }: { analysis: FullAnalysis }) {
  const { draft, updateDraft, settings } = useStore();
  const col = analysis.collateral;
  const add = (c: AssetCategory) => updateDraft((d) => ({ ...d, assets: [...d.assets, newAsset(c)] }));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-4">
        <div className="panel p-5">
          <h2 className="text-sm font-medium">Add an asset</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {ASSET_ORDER.map((c) => (
              <button key={c} onClick={() => add(c)} title={ASSET_TYPES[c].description} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-sm transition-colors hover:border-primary/50 hover:text-primary">
                <Plus className="h-3.5 w-3.5" /> {ASSET_TYPES[c].label}
              </button>
            ))}
          </div>
        </div>

        {draft.assets.length === 0 && (
          <EmptyState icon={<Landmark className="h-8 w-8" />} title="No assets listed" body="Real estate, receivables, equipment and other assets can support longer terms and lower payments. Skip this step if you have none." />
        )}

        {draft.assets.map((a) => {
          const cfg = ASSET_TYPES[a.category];
          const row = col.rows.find((r) => r.asset.id === a.id);
          return (
            <article key={a.id} className="panel p-5 sm:p-6">
              <header className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{row?.label ?? cfg.label}</h3>
                  <p className="text-xs text-muted-foreground">{cfg.description}</p>
                </div>
                <button onClick={() => updateDraft((d) => ({ ...d, assets: d.assets.filter((x) => x.id !== a.id) }))} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-danger" aria-label={`Remove ${cfg.label}`}>
                  <Trash2 className="h-4 w-4" /> <span className="hidden sm:inline">Remove</span>
                </button>
              </header>
              <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                {cfg.fields.map((f) => (
                  <DefField key={f.key} def={f} values={a.fields} onChange={(k, v) => updateDraft((d) => ({ ...d, assets: d.assets.map((x) => (x.id === a.id ? { ...x, fields: { ...x.fields, [k]: v } } : x)) }))} />
                ))}
              </div>
              {row && (
                <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-2 rounded-lg bg-secondary/60 px-4 py-3 text-sm">
                  <span className="text-muted-foreground">
                    Value <span className="num ml-1 text-foreground">{usd(row.value)}</span>
                  </span>
                  <span className="text-muted-foreground">
                    Liens <span className="num ml-1 text-foreground">{usd(row.liens)}</span>
                  </span>
                  <span className="text-muted-foreground">
                    Advance <span className="num ml-1 text-foreground">{Math.round(row.advanceRate * 100)}%</span>
                  </span>
                  <span className="ml-auto flex items-center gap-2">
                    <span className="num font-semibold text-primary">{usd(row.capacity)}</span>
                    <Prelim />
                  </span>
                </div>
              )}
            </article>
          );
        })}
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="panel p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Collateral summary</h2>
            <Prelim />
          </div>
          <div className="num mt-5 text-3xl font-bold tracking-tight text-primary">{usd(col.capacity)}</div>
          <div className="text-sm text-muted-foreground">Preliminary borrowing capacity</div>
          <div className="mt-5 divide-y divide-border/60">
            <KV k="Gross asset value" v={usd(col.grossValue)} />
            <KV k="Existing liens" v={usd(col.liens)} />
            <KV k="Net equity" v={usd(col.equity)} />
            <KV k="Total debt payoff" v={usd(analysis.debt.payoff)} />
            <KV k="Collateral coverage" v={analysis.debt.payoff ? `${Math.round((col.capacity / analysis.debt.payoff) * 100)}%` : "—"} strong />
          </div>
          <p className="mt-5 text-[11px] leading-snug text-muted-foreground/80">
            Capacity = value × advance rate − existing liens. Advance rates (e.g. real estate {Math.round(settings.advanceRates.real_estate * 100)}%, receivables {Math.round(settings.advanceRates.receivables * 100)}%, equipment {Math.round(settings.advanceRates.equipment * 100)}%) are illustrative. Final values require appraisal, title, UCC search and verification.
          </p>
        </div>
      </aside>
    </div>
  );
}
