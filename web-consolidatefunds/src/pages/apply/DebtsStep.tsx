import { Plus, Receipt } from "lucide-react";
import { useState } from "react";
import { BurdenPanel } from "@/components/BurdenPanel";
import { DebtCard } from "@/components/DebtCard";
import { DebtScheduleTable } from "@/components/DebtScheduleTable";
import { DebtBadge } from "@/components/badges";
import { EmptyState } from "@/components/ui-kit";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DEBT_TYPES, DEBT_TYPE_ORDER } from "@/lib/config";
import { newDebt } from "@/lib/sample";
import { useStore } from "@/lib/store";
import type { DebtType } from "@/lib/types";
import type { FullAnalysis } from "@/lib/underwriting";

export function DebtsStep({ analysis }: { analysis: FullAnalysis }) {
  const { draft, updateDraft, settings } = useStore();
  const [openId, setOpenId] = useState<string | null>(() => draft.debts[0]?.id ?? null);
  const [picker, setPicker] = useState(false);

  const add = (type: DebtType) => {
    const d = newDebt(type);
    updateDraft((a) => ({ ...a, debts: [...a.debts, d] }));
    setOpenId(d.id);
    setPicker(false);
    setTimeout(() => document.getElementById(`debt-${d.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_440px]">
      <div className="space-y-3">
        <DebtScheduleTable rows={analysis.debt.rows} />
        {draft.debts.length === 0 && (
          <EmptyState
            icon={<Receipt className="h-8 w-8" />}
            title="No debts added yet"
            body="Add every MCA, loan, line of credit, card, lease or tax obligation — the more complete, the better the structure we can find."
            action={
              <button onClick={() => setPicker(true)} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
                Add your first debt
              </button>
            }
          />
        )}
        {draft.debts.map((d) => (
          <div key={d.id} id={`debt-${d.id}`} className="scroll-mt-24">
            <DebtCard
              debt={d}
              row={analysis.debt.rows.find((r) => r.debt.id === d.id)}
              open={openId === d.id}
              onToggle={() => setOpenId((o) => (o === d.id ? null : d.id))}
              onChange={(nd) => updateDraft((a) => ({ ...a, debts: a.debts.map((x) => (x.id === nd.id ? nd : x)) }))}
              onRemove={() => updateDraft((a) => ({ ...a, debts: a.debts.filter((x) => x.id !== d.id) }))}
            />
          </div>
        ))}
        {draft.debts.length > 0 && (
          <button onClick={() => setPicker(true)} className="panel group flex w-full items-start gap-4 p-6 text-left transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Plus className="mt-0.5 h-6 w-6 text-primary transition-transform group-hover:rotate-90" />
            <span>
              <span className="block text-xl font-semibold text-primary">Add debt</span>
              <span className="mt-1 block text-sm text-muted-foreground">Add another MCA, loan, line of credit, equipment financing or other debt.</span>
            </span>
          </button>
        )}
      </div>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <BurdenPanel debt={analysis.debt} metrics={analysis.metrics} targetDscr={settings.targetDscr} />
      </div>

      <Dialog open={picker} onOpenChange={setPicker}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto border-border bg-card">
          <DialogHeader>
            <DialogTitle>What kind of debt?</DialogTitle>
            <DialogDescription>Each type asks only the questions that matter for it.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 sm:grid-cols-2">
            {DEBT_TYPE_ORDER.map((t) => (
              <button key={t} onClick={() => add(t)} className="flex items-start gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:border-primary/50 hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <DebtBadge type={t} className="mt-0.5 shrink-0" />
                <span>
                  <span className="block text-sm font-medium">{DEBT_TYPES[t].label}</span>
                  <span className="line-clamp-2 text-xs text-muted-foreground">{DEBT_TYPES[t].intro}</span>
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
