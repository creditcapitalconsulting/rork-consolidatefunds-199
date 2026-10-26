import { AlertCircle, ArrowRight, ChevronLeft, ChevronRight, Download, Info, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { RiskBadge, StatusBadge, riskMeta } from "@/components/badges";
import { STATUS_META, UNDERWRITERS } from "@/lib/config";
import { csvRow, downloadFile, timeAgo, usd } from "@/lib/format";
import { uid } from "@/lib/sample";
import { useStore } from "@/lib/store";
import type { AppStatus, Application, RiskLevel } from "@/lib/types";
import { analyzeApplication, type FullAnalysis, type Finding } from "@/lib/underwriting";
import { cn } from "@/lib/utils";
import { DecisionDialog, RequestDocsDialog } from "./actions";

const TABS: (AppStatus | "all")[] = ["all", "needs_review", "in_analysis", "conditional", "approved", "declined"];
const PAGE = 10;
const selectCls = "h-10 appearance-none rounded-lg border border-border bg-card px-3 pr-8 text-sm focus-visible:border-primary focus-visible:outline-none";

export function FindingIcon({ level }: { level: Finding["level"] }) {
  const cls = level === "red" ? "bg-danger text-white" : level === "yellow" ? "bg-warning text-black" : level === "green" ? "bg-success text-black" : "bg-muted-foreground/40 text-foreground";
  return <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full", cls)}>{level === "info" || level === "green" ? <Info className="h-3 w-3" /> : <AlertCircle className="h-3.5 w-3.5" />}</span>;
}

export default function Queue() {
  const { apps, settings, updateApp, staff } = useStore();
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const [tab, setTab] = useState<(typeof TABS)[number]>("all");
  const [risk, setRisk] = useState<RiskLevel | "">("");
  const [sort, setSort] = useState("newest");
  const [q, setQ] = useState(params.get("q") ?? "");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<"docs" | "approve" | "decline" | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    setQ(params.get("q") ?? "");
  }, [params]);

  const submitted = useMemo(() => apps.filter((a) => a.status !== "draft"), [apps]);
  const analyses = useMemo(() => new Map<string, FullAnalysis>(submitted.map((a) => [a.id, analyzeApplication(a, settings)])), [submitted, settings]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = submitted.filter(
      (a) =>
        (tab === "all" || a.status === tab) &&
        (!risk || analyses.get(a.id)?.uw.risk === risk) &&
        (!term || [a.business.legalName, a.business.dba, a.ref, a.business.industry, a.assignedTo, a.business.city].some((x) => x?.toLowerCase().includes(term))),
    );
    const amount = (a: Application) => analyses.get(a.id)?.debt.payoff ?? 0;
    list = [...list].sort((x, y) => {
      if (sort === "oldest") return (x.submittedAt ?? "").localeCompare(y.submittedAt ?? "");
      if (sort === "amount") return amount(y) - amount(x);
      if (sort === "risk") return (analyses.get(x.id)?.uw.score ?? 0) - (analyses.get(y.id)?.uw.score ?? 0);
      return (y.submittedAt ?? "").localeCompare(x.submittedAt ?? "");
    });
    return list;
  }, [submitted, tab, risk, q, sort, analyses]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const cur = Math.min(page, pages);
  const rows = filtered.slice((cur - 1) * PAGE, cur * PAGE);
  const selected = submitted.find((a) => a.id === selectedId) ?? rows[0];
  const sa = selected ? analyses.get(selected.id) : undefined;
  const count = (t: (typeof TABS)[number]) => (t === "all" ? submitted.length : submitted.filter((a) => a.status === t).length);

  const exportQueue = () => {
    const lines = [csvRow(["Reference", "Business", "Industry", "State", "Status", "Risk", "Score", "Total payoff", "Monthly debt", "DSCR", "Assigned", "Submitted"])];
    filtered.forEach((a) => {
      const x = analyses.get(a.id)!;
      lines.push(csvRow([a.ref, a.business.legalName, a.business.industry, a.business.state, STATUS_META[a.status].label, x.uw.risk, x.uw.score, Math.round(x.debt.payoff), Math.round(x.debt.monthly), x.metrics.dscr?.toFixed(2) ?? "", a.assignedTo, a.submittedAt ?? ""]));
    });
    downloadFile(`queue-${new Date().toISOString().slice(0, 10)}.csv`, lines.join("\n"));
  };

  const addNote = () => {
    if (!selected || !note.trim()) return;
    updateApp(selected.id, (a) => ({ ...a, notes: [{ id: uid(), author: staff?.name ?? "Staff", text: note.trim(), at: new Date().toISOString() }, ...a.notes] }), { action: "Note added" });
    setNote("");
  };

  return (
    <div className="flex flex-col xl:flex-row">
      <section className="min-w-0 flex-1 px-4 py-7 lg:px-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="eyebrow">Underwriting</div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-[36px]">Application Queue</h1>
            <p className="mt-1.5 text-[15px] text-muted-foreground">Review, analyze, and make a decision on business debt consolidation applications.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={exportQueue} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm hover:border-muted-foreground/50">
              <Download className="h-4 w-4" /> Export
            </button>
            <Link to="/apply/business" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
              <Plus className="h-4 w-4" /> New Application
            </Link>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Status">
          {TABS.map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => {
                setTab(t);
                setPage(1);
              }}
              className={cn("rounded-lg border px-4 py-2 text-sm transition-colors", tab === t ? "border-primary bg-primary/5 text-foreground" : "border-border text-foreground/80 hover:border-muted-foreground/50")}
            >
              {t === "all" ? "All" : STATUS_META[t].label} <span className="num">({count(t)})</span>
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
                setParams(e.target.value ? { q: e.target.value } : {}, { replace: true });
              }}
              placeholder="Search business name or reference…"
              aria-label="Filter applications"
              className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none"
            />
          </div>
          <select aria-label="Risk filter" value={risk} onChange={(e) => setRisk(e.target.value as RiskLevel | "")} className={selectCls}>
            <option value="">All risk levels</option>
            <option value="green">Green</option>
            <option value="yellow">Yellow</option>
            <option value="red">Red</option>
          </select>
          <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)} className={selectCls}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="amount">Largest amount</option>
            <option value="risk">Highest risk</option>
          </select>
        </div>

        {checked.size > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 px-4 py-2.5 text-sm">
            <span className="num">{checked.size} selected</span>
            <label className="flex items-center gap-2">
              Assign to
              <select
                className={cn(selectCls, "h-8")}
                defaultValue=""
                onChange={(e) => {
                  const who = e.target.value;
                  if (!who) return;
                  checked.forEach((id) => updateApp(id, (a) => ({ ...a, assignedTo: who }), { action: "Assigned", detail: who }));
                  toast.success(`${checked.size} application${checked.size > 1 ? "s" : ""} assigned to ${who}`);
                  setChecked(new Set());
                }}
              >
                <option value="">Choose…</option>
                {UNDERWRITERS.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </label>
            <button onClick={() => setChecked(new Set())} className="ml-auto text-muted-foreground hover:text-foreground">
              Clear
            </button>
          </div>
        )}

        <div className="mt-4 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="Select all on page"
                    checked={rows.length > 0 && rows.every((r) => checked.has(r.id))}
                    onChange={(e) => setChecked(e.target.checked ? new Set([...checked, ...rows.map((r) => r.id)]) : new Set([...checked].filter((id) => !rows.some((r) => r.id === id))))}
                    className="h-4 w-4 accent-[hsl(var(--primary))]"
                  />
                </th>
                <th className="px-3 py-3 font-medium">Business name</th>
                <th className="px-3 py-3 font-medium">Amount</th>
                <th className="px-3 py-3 font-medium">Risk</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Assigned</th>
                <th className="px-3 py-3 font-medium">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    No applications match these filters.
                  </td>
                </tr>
              )}
              {rows.map((a) => {
                const x = analyses.get(a.id)!;
                const isSel = selected?.id === a.id;
                return (
                  <tr
                    key={a.id}
                    onClick={() => setSelectedId(a.id)}
                    onDoubleClick={() => nav(`/underwriting/app/${a.id}`)}
                    className={cn("cursor-pointer border-b border-border/60 transition-colors last:border-0", isSel ? "bg-secondary/70" : "hover:bg-secondary/30")}
                    aria-selected={isSel}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Select ${a.business.legalName}`}
                        checked={checked.has(a.id)}
                        onChange={() => {
                          const n = new Set(checked);
                          if (n.has(a.id)) n.delete(a.id);
                          else n.add(a.id);
                          setChecked(n);
                        }}
                        className="h-4 w-4 accent-[hsl(var(--primary))]"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <button onClick={() => setSelectedId(a.id)} className="text-left font-medium hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        {a.business.legalName || "Untitled business"}
                      </button>
                      <div className="text-xs text-muted-foreground">{a.business.industry || "—"}</div>
                    </td>
                    <td className="num px-3 py-3">{usd(x.debt.payoff)}</td>
                    <td className="px-3 py-3">
                      <RiskBadge risk={x.uw.risk} />
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="px-3 py-3 text-foreground/85">{a.assignedTo}</td>
                    <td className="px-3 py-3 text-foreground/85">{timeAgo(a.submittedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">
            Showing <span className="num">{filtered.length ? (cur - 1) * PAGE + 1 : 0}–{Math.min(cur * PAGE, filtered.length)}</span> of <span className="num">{filtered.length}</span> applications
          </span>
          <nav className="flex gap-1.5" aria-label="Pagination">
            <button disabled={cur === 1} onClick={() => setPage(cur - 1)} className="grid h-9 w-9 place-items-center rounded-lg border border-border disabled:opacity-40" aria-label="Previous page">
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: pages }).map((_, i) => (
              <button key={i} onClick={() => setPage(i + 1)} aria-current={cur === i + 1 ? "page" : undefined} className={cn("num grid h-9 w-9 place-items-center rounded-lg border text-sm", cur === i + 1 ? "border-foreground" : "border-border text-muted-foreground")}>
                {i + 1}
              </button>
            ))}
            <button disabled={cur === pages} onClick={() => setPage(cur + 1)} className="grid h-9 w-9 place-items-center rounded-lg border border-border disabled:opacity-40" aria-label="Next page">
              <ChevronRight className="h-4 w-4" />
            </button>
          </nav>
        </div>
      </section>

      {selected && sa && (
        <aside className="border-t border-border p-4 xl:sticky xl:top-[68px] xl:h-[calc(100vh-68px)] xl:w-[440px] xl:shrink-0 xl:overflow-y-auto xl:border-l xl:border-t-0 xl:p-6" aria-label="Application summary">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">{selected.business.legalName}</h2>
              <p className="text-sm text-muted-foreground">
                {selected.business.industry} · {[selected.business.city, selected.business.state].filter(Boolean).join(", ")}
              </p>
            </div>
            <span className="mono shrink-0 pt-1.5 text-xs text-muted-foreground">Ref # {selected.ref}</span>
          </div>

          <div className={cn("mt-5 flex gap-4 rounded-xl border p-4", sa.uw.risk === "green" ? "border-success/40 bg-success/[0.07]" : sa.uw.risk === "yellow" ? "border-warning/40 bg-warning/[0.07]" : "border-danger/40 bg-danger/[0.07]")}>
            <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-full text-xl font-bold", sa.uw.risk === "green" ? "bg-success text-black" : sa.uw.risk === "yellow" ? "bg-warning text-black" : "bg-danger text-white")}>!</span>
            <div>
              <div className={cn("text-lg font-semibold", sa.uw.risk === "green" ? "text-success" : sa.uw.risk === "yellow" ? "text-warning" : "text-danger")}>
                {riskMeta(sa.uw.risk).label} – {riskMeta(sa.uw.risk).long.toLowerCase()}
              </div>
              <p className="text-sm text-foreground/85">
                Score <span className="num font-semibold">{sa.uw.score}</span>/100 across {sa.uw.factors.length} weighted factors.
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 divide-x divide-border">
            <div className="pr-3">
              <div className="num text-xl font-semibold">{usd(sa.debt.payoff, { compact: true })}</div>
              <div className="text-xs text-muted-foreground">Total debt</div>
            </div>
            <div className="px-3">
              <div className="num text-xl font-semibold">{usd(sa.metrics.annualRevenue, { compact: true })}</div>
              <div className="text-xs text-muted-foreground">Annual revenue</div>
            </div>
            <div className="pl-3">
              <div className="num text-xl font-semibold">{sa.metrics.dscr === null ? "—" : `${sa.metrics.dscr.toFixed(2)}×`}</div>
              <div className="text-xs text-muted-foreground">DSCR</div>
            </div>
          </div>

          <div className="mt-6 border-t border-border pt-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Key Findings</h3>
              <Link to={`/underwriting/app/${selected.id}`} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                View full analysis <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <ul className="mt-3 space-y-2.5">
              {sa.uw.findings.slice(0, 6).map((f, i) => (
                <li key={i} className="flex items-start gap-3 text-[15px]">
                  <FindingIcon level={f.level} />
                  <span className="leading-snug">{f.text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 border-t border-border pt-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Underwriter Notes</h3>
              {selected.notes[0] && <span className="text-xs text-muted-foreground">Last updated {timeAgo(selected.notes[0].at)}</span>}
            </div>
            {selected.notes[0] && (
              <div className="mt-3 rounded-xl border border-border bg-background/50 p-4 text-sm leading-relaxed text-foreground/90">
                {selected.notes[0].text}
                <div className="mt-2 text-xs text-muted-foreground">— {selected.notes[0].author}</div>
              </div>
            )}
            <div className="mt-3 flex gap-2">
              <input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addNote()} placeholder="Add a note…" aria-label="Add a note" className="h-10 flex-1 rounded-lg border border-border bg-background/60 px-3 text-sm focus-visible:border-primary focus-visible:outline-none" />
              <button onClick={addNote} disabled={!note.trim()} className="rounded-lg border border-border px-3 text-sm disabled:opacity-40">
                Save
              </button>
            </div>
          </div>

          {selected.decision ? (
            <div className={cn("mt-6 rounded-xl border p-4 text-sm", selected.decision.outcome === "approved" ? "border-success/40" : "border-danger/40")}>
              <span className={selected.decision.outcome === "approved" ? "text-success" : "text-danger"}>{selected.decision.outcome === "approved" ? `Structure ${selected.decision.scenarioKey} approved` : "Declined"}</span> by {selected.decision.by} · {timeAgo(selected.decision.at)}
            </div>
          ) : null}
          <div className="mt-6 grid grid-cols-3 gap-2">
            <button onClick={() => setDialog("docs")} className="rounded-lg border border-border bg-secondary px-2 py-3 text-sm font-medium hover:border-muted-foreground/50">
              Request documents
            </button>
            <button onClick={() => setDialog("approve")} className="rounded-lg bg-primary px-2 py-3 text-sm font-semibold text-primary-foreground">
              Approve structure
            </button>
            <button onClick={() => setDialog("decline")} className="rounded-lg bg-danger px-2 py-3 text-sm font-semibold text-white">
              Decline
            </button>
          </div>

          <RequestDocsDialog app={selected} open={dialog === "docs"} onOpenChange={(o) => setDialog(o ? "docs" : null)} />
          <DecisionDialog key={`${selected.id}-a`} app={selected} analysis={sa} outcome="approved" open={dialog === "approve"} onOpenChange={(o) => setDialog(o ? "approve" : null)} />
          <DecisionDialog key={`${selected.id}-d`} app={selected} analysis={sa} outcome="declined" open={dialog === "decline"} onOpenChange={(o) => setDialog(o ? "decline" : null)} />
        </aside>
      )}
    </div>
  );
}
