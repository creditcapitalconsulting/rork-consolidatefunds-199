import { CheckCircle2, Circle, FileText, ScanText, Trash2, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Callout, Field } from "@/components/fields";
import { Section } from "@/components/ui-kit";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DOC_CATEGORIES, REQUIRED_DOCS } from "@/lib/config";
import { EXTRACT_LABELS, extractTerms } from "@/lib/extract";
import { debtLabel } from "@/lib/finance";
import { fmtDate } from "@/lib/format";
import { uid } from "@/lib/sample";
import { useStore } from "@/lib/store";
import type { DocCategory, DocumentFile, Frequency } from "@/lib/types";
import { cn } from "@/lib/utils";

const kb = (b: number) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1000))} KB`);

export function DocumentsStep() {
  const { draft, updateDraft } = useStore();
  const [category, setCategory] = useState<DocCategory>("bank_statements");
  const [drag, setDrag] = useState(false);
  const [review, setReview] = useState<{ doc: DocumentFile; values: Record<string, string>; debtId: string } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const texts = useRef(new Map<string, string>());

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const docs: DocumentFile[] = [];
    for (const f of Array.from(files)) {
      const id = uid();
      if (/\.(txt|csv|md)$/i.test(f.name) || f.type.startsWith("text/")) texts.current.set(id, await f.text());
      docs.push({ id, name: f.name, size: f.size, category, uploadedAt: new Date().toISOString(), status: "uploaded", uploadedBy: "applicant" });
    }
    updateDraft((d) => ({ ...d, documents: [...d.documents, ...docs] }));
    toast.success(`${docs.length} file${docs.length > 1 ? "s" : ""} uploaded`);
  };

  const extract = (doc: DocumentFile) => {
    const text = texts.current.get(doc.id);
    const values = text ? extractTerms(text) : {};
    if (!Object.keys(values).length) {
      toast.message("No terms could be read automatically", { description: text ? "An underwriter will review this document." : "Automatic reading of PDFs and scans arrives in a later release — an underwriter will review it." });
      return;
    }
    setReview({ doc, values, debtId: doc.linkedDebtId ?? draft.debts[0]?.id ?? "" });
  };

  const confirm = () => {
    if (!review) return;
    const { values, debtId, doc } = review;
    updateDraft((d) => ({
      ...d,
      documents: d.documents.map((x) => (x.id === doc.id ? { ...x, status: "extracted", extracted: values, linkedDebtId: debtId || undefined } : x)),
      debts: d.debts.map((x) => {
        if (x.id !== debtId) return x;
        const { frequency, ...rest } = values;
        return { ...x, frequency: (frequency as Frequency) || x.frequency, fields: { ...x.fields, ...rest } };
      }),
    }));
    setReview(null);
    toast.success("Extracted terms applied", { description: "Marked as applicant-confirmed; an underwriter will verify against the document." });
  };

  const have = new Set(draft.documents.map((d) => d.category));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <Section title="Upload documents">
          <div className="mb-4 max-w-sm">
            <Field label="Document type" kind="select" options={DOC_CATEGORIES} value={category} onChange={(v) => setCategory((v || "other") as DocCategory)} />
          </div>
          <div
            role="button"
            tabIndex={0}
            onClick={() => input.current?.click()}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              addFiles(e.dataTransfer.files);
            }}
            className={cn("flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", drag ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/50")}
          >
            <UploadCloud className="h-8 w-8 text-primary" />
            <p className="mt-3 font-medium">Drop files here or click to browse</p>
            <p className="mt-1 text-sm text-muted-foreground">PDF, images, CSV or text · uploading as “{DOC_CATEGORIES.find((c) => c.value === category)?.label}”</p>
          </div>
          <input ref={input} type="file" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
        </Section>

        <Section title={`Your documents (${draft.documents.length})`}>
          {draft.documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing uploaded yet.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {draft.documents.map((doc) => (
                <li key={doc.id} className="flex flex-wrap items-center gap-3 py-3">
                  <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{doc.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {DOC_CATEGORIES.find((c) => c.value === doc.category)?.label} · {kb(doc.size)} · {fmtDate(doc.uploadedAt)}
                    </div>
                  </div>
                  <span className={cn("rounded-full border px-2 py-0.5 text-xs", doc.status === "verified" ? "border-success/40 text-success" : doc.status === "extracted" ? "border-warning/40 text-warning" : "border-border text-muted-foreground")}>
                    {doc.status === "verified" ? "Verified" : doc.status === "extracted" ? "Confirmed — pending verification" : "Uploaded"}
                  </span>
                  {(doc.category === "financing_contract" || doc.category === "payoff_letter") && doc.status === "uploaded" && (
                    <button onClick={() => extract(doc)} className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs hover:border-primary/50 hover:text-primary">
                      <ScanText className="h-3.5 w-3.5" /> Read terms
                    </button>
                  )}
                  <button onClick={() => updateDraft((d) => ({ ...d, documents: d.documents.filter((x) => x.id !== doc.id) }))} className="rounded p-1 text-muted-foreground hover:text-danger" aria-label={`Remove ${doc.name}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="panel p-6">
          <h2 className="font-semibold">Checklist</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {DOC_CATEGORIES.map((c) => {
              const ok = have.has(c.value) || (c.value === "bank_statements" && draft.bank.source !== "none");
              const req = REQUIRED_DOCS.includes(c.value);
              return (
                <li key={c.value} className="flex items-start gap-2.5">
                  {ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> : <Circle className={cn("mt-0.5 h-4 w-4 shrink-0", req ? "text-foreground/60" : "text-muted-foreground/40")} />}
                  <span className={cn(!ok && !req && "text-muted-foreground")}>
                    {c.label}
                    {req && !ok && <span className="ml-1.5 text-xs text-primary">required</span>}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="mt-5">
            <Callout>Information read from documents is never treated as verified until you confirm it and an underwriter checks it against the original.</Callout>
          </div>
        </div>
      </aside>

      <Dialog open={!!review} onOpenChange={(o) => !o && setReview(null)}>
        <DialogContent className="max-w-lg border-border bg-card">
          <DialogHeader>
            <DialogTitle>Confirm extracted terms</DialogTitle>
            <DialogDescription>We read these values from {review?.doc.name}. Correct anything that's wrong before applying.</DialogDescription>
          </DialogHeader>
          {review && (
            <div className="space-y-4">
              <Field
                label="Apply to debt"
                kind="select"
                value={review.debtId}
                options={draft.debts.map((d, i) => ({ value: d.id, label: debtLabel(d, i, draft.debts) }))}
                onChange={(v) => setReview({ ...review, debtId: v })}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(review.values).map(([k, v]) => (
                  <Field key={k} label={EXTRACT_LABELS[k] ?? k} value={v} onChange={(nv) => setReview({ ...review, values: { ...review.values, [k]: nv } })} />
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <button onClick={() => setReview(null)} className="rounded-lg border border-border px-4 py-2 text-sm">
              Cancel
            </button>
            <button onClick={confirm} disabled={!review?.debtId} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
              Confirm & apply
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
