import { Building2, FileSpreadsheet, Link2, Loader2, Lock, RotateCcw, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { BankAnalysisView } from "@/components/BankAnalysisView";
import { Callout } from "@/components/fields";
import { Section } from "@/components/ui-kit";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { generateSampleStatement, parseBankCsv, type DetectedLender } from "@/lib/bank";
import { n } from "@/lib/finance";
import { newDebt, seedFromId } from "@/lib/sample";
import { useStore } from "@/lib/store";
import type { Frequency } from "@/lib/types";
import type { FullAnalysis } from "@/lib/underwriting";

const BANKS = ["Chase", "Bank of America", "Wells Fargo", "Citi", "U.S. Bank", "PNC", "Truist", "Capital One", "TD Bank", "Other bank"];

export function lenderToFrequency(label: string): Frequency {
  if (label.startsWith("Business daily")) return "business_daily";
  if (label === "Weekly") return "weekly";
  if (label === "Biweekly") return "biweekly";
  if (label === "Monthly") return "monthly";
  return "variable";
}

export function BankingStep({ analysis }: { analysis: FullAnalysis }) {
  const { draft, updateDraft } = useStore();
  const [connectOpen, setConnectOpen] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bank = draft.bank;
  const rev = n(draft.financials.monthlyRevenue) || n(draft.financials.annualRevenue) / 12 || 60000;

  const connect = (inst: string) => {
    setConnecting(inst);
    setTimeout(() => {
      updateDraft((d) => ({ ...d, bank: { source: "demo_connection", institution: inst, fileNames: [], transactions: generateSampleStatement(d.debts, rev, seedFromId(d.id)) } }));
      setConnecting(null);
      setConnectOpen(false);
      toast.success(`${inst} connected (demo)`, { description: "6 months of transactions analyzed." });
    }, 1400);
  };

  const onFile = async (files: FileList | null) => {
    if (!files?.length) return;
    const file = files[0];
    if (!/\.csv$/i.test(file.name)) {
      toast.error("Please upload a CSV export", { description: "PDF statements can be added in the Documents step for underwriter review." });
      return;
    }
    const { transactions, error } = parseBankCsv(await file.text());
    if (error || transactions.length === 0) {
      toast.error("Couldn't read that file", { description: error ?? "No transactions found." });
      return;
    }
    updateDraft((d) => ({ ...d, bank: { source: "upload", institution: "CSV upload", fileNames: [file.name], transactions } }));
    toast.success(`${transactions.length} transactions imported`);
  };

  const addDebt = (l: DetectedLender) => {
    const d = newDebt("mca");
    d.creditor = l.name;
    d.frequency = lenderToFrequency(l.frequency);
    d.fields = { payment: String(Math.round(l.typicalAmount)), actualAch: String(Math.round(l.typicalAmount)), ...(d.frequency === "variable" ? { variableMonthlyAvg: String(Math.round(l.monthlyEstimate)) } : {}) };
    updateDraft((a) => ({ ...a, debts: [...a.debts, d] }));
    toast.success(`${l.name} added to your debts`, { description: "Please complete its details in the Debts step." });
  };

  if (bank.source === "none") {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <button onClick={() => setConnectOpen(true)} className="panel group p-6 text-left transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Link2 className="h-7 w-7 text-primary" />
            <h2 className="mt-4 text-lg font-semibold">Connect your bank</h2>
            <p className="mt-1 text-sm text-muted-foreground">Read-only access to 6 months of business transactions. Fastest path to an offer.</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" /> Bank-level encryption · we never see your credentials
            </span>
          </button>
          <button onClick={() => fileRef.current?.click()} className="panel group p-6 text-left transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <FileSpreadsheet className="h-7 w-7 text-primary" />
            <h2 className="mt-4 text-lg font-semibold">Upload a CSV export</h2>
            <p className="mt-1 text-sm text-muted-foreground">Export transactions from online banking (Date, Description, Amount or Debit/Credit columns).</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Upload className="h-3.5 w-3.5" /> Analyzed in your browser
            </span>
          </button>
        </div>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => onFile(e.target.files)} />
        <Callout>
          We look for revenue consistency, average daily balance, negative days, NSFs, payroll, taxes and every recurring lender withdrawal — then cross-check them against the debts you listed. Internal transfers are excluded from revenue. PDF statements can be uploaded in the Documents step.
        </Callout>

        <Dialog open={connectOpen} onOpenChange={(o) => !connecting && setConnectOpen(o)}>
          <DialogContent className="max-w-lg border-border bg-card">
            <DialogHeader>
              <DialogTitle>Choose your bank</DialogTitle>
              <DialogDescription>Demo connection — generates realistic sample activity from your disclosed debts. Live bank-aggregator connection launches in a later phase.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-2">
              {BANKS.map((b) => (
                <button key={b} disabled={!!connecting} onClick={() => connect(b)} className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-3 text-left text-sm transition-colors hover:border-primary/50 disabled:opacity-50">
                  {connecting === b ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Building2 className="h-4 w-4 text-muted-foreground" />}
                  {b}
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {analysis.bank.undisclosed.length > 0 && (
        <Callout tone="warn">
          We found {analysis.bank.undisclosed.length} recurring lender withdrawal{analysis.bank.undisclosed.length > 1 ? "s" : ""} that {analysis.bank.undisclosed.length > 1 ? "aren't" : "isn't"} in your debt list ({analysis.bank.undisclosed.map((u) => u.name).join(", ")}). Add {analysis.bank.undisclosed.length > 1 ? "them" : "it"} so your consolidation plan is complete.
        </Callout>
      )}
      <Section
        title={bank.source === "demo_connection" ? `${bank.institution} · connected` : `Imported: ${bank.fileNames.join(", ")}`}
        description={bank.source === "demo_connection" ? "Demo connection with sample activity generated from your disclosed debts." : "Parsed from your CSV export."}
        action={
          <button onClick={() => updateDraft((d) => ({ ...d, bank: { source: "none", institution: "", fileNames: [], transactions: [] } }))} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">
            <RotateCcw className="h-3.5 w-3.5" /> Disconnect
          </button>
        }
      >
        <BankAnalysisView bank={analysis.bank} onAddDebt={addDebt} />
      </Section>
    </div>
  );
}
