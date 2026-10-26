import { Download } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { RiskBadge, StatusBadge } from "@/components/badges";
import { Section, Stat } from "@/components/ui-kit";
import { STATUS_META } from "@/lib/config";
import { csvRow, downloadFile, fmtDate, usd } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { AppStatus } from "@/lib/types";
import { analyzeApplication } from "@/lib/underwriting";

export default function Reports() {
  const { apps, settings } = useStore();
  const rows = useMemo(() => apps.filter((a) => a.status !== "draft").map((a) => ({ app: a, x: analyzeApplication(a, settings) })), [apps, settings]);
  const totalPayoff = rows.reduce((s, r) => s + r.x.debt.payoff, 0);
  const totalSavings = rows.reduce((s, r) => s + Math.max(0, r.x.scenarios.find((sc) => sc.best)?.monthlyImprovement ?? 0), 0);
  const risk = { green: 0, yellow: 0, red: 0 };
  rows.forEach((r) => risk[r.x.uw.risk]++);
  const statusData = (Object.keys(STATUS_META) as AppStatus[]).filter((s) => s !== "draft").map((s) => ({ name: STATUS_META[s].label, count: rows.filter((r) => r.app.status === s).length }));
  const decisions = rows.filter((r) => r.app.decision).sort((a, b) => b.app.decision!.at.localeCompare(a.app.decision!.at));
  const undisclosed = rows.filter((r) => r.x.bank.undisclosed.length > 0).length;

  const exportAll = () => {
    const L = [csvRow(["Reference", "Business", "Status", "Risk", "Score", "Payoff", "Monthly debt", "DSCR", "Best scenario", "Best improvement/mo", "Undisclosed lenders", "Decision", "Decided by"])];
    rows.forEach(({ app, x }) => {
      const b = x.scenarios.find((s) => s.best);
      L.push(csvRow([app.ref, app.business.legalName, app.status, x.uw.risk, x.uw.score, Math.round(x.debt.payoff), Math.round(x.debt.monthly), x.metrics.dscr?.toFixed(2) ?? "", b?.key ?? "", Math.round(b?.monthlyImprovement ?? 0), x.bank.undisclosed.map((u) => u.name).join("; "), app.decision ? `${app.decision.outcome} ${app.decision.scenarioKey}` : "", app.decision?.by ?? ""]));
    });
    downloadFile(`portfolio-report-${new Date().toISOString().slice(0, 10)}.csv`, L.join("\n"));
  };

  return (
    <div className="px-4 py-7 lg:px-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="eyebrow">Underwriting</div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Reports</h1>
          <p className="mt-1.5 text-[15px] text-muted-foreground">Pipeline, risk mix, offers and funding decisions.</p>
        </div>
        <button onClick={exportAll} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm">
          <Download className="h-4 w-4" /> Export portfolio (Excel)
        </button>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Applications" value={rows.length} />
        <Stat label="Debt under review" value={usd(totalPayoff, { compact: true })} />
        <Stat label="Monthly relief identified" value={usd(totalSavings, { compact: true })} accent />
        <Stat label="Files with undisclosed debt" value={undisclosed} />
        <Stat label="Risk mix" value={<span className="flex gap-2 text-base"><span className="text-success">{risk.green}</span>/<span className="text-warning">{risk.yellow}</span>/<span className="text-danger">{risk.red}</span></span>} sub="Green / Yellow / Red" />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Section title="Pipeline by status">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}>
                <CartesianGrid vertical={false} stroke="#2A2D33" strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fill: "#8A8F98", fontSize: 12 }} axisLine={false} tickLine={false} interval={0} />
                <YAxis allowDecimals={false} tick={{ fill: "#8A8F98", fontSize: 12 }} axisLine={false} tickLine={false} width={28} />
                <Tooltip cursor={{ fill: "rgba(255,255,255,0.03)" }} contentStyle={{ background: "#17191D", border: "1px solid #2A2D33", borderRadius: 10 }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {statusData.map((d, i) => (
                    <Cell key={i} fill={d.name === "Declined" ? "#FF5A4F" : d.name === "Approved" || d.name === "Funded" ? "#3DDC84" : "#C6F432"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
        <Section title="Recent decisions">
          {decisions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No decisions recorded yet.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {decisions.slice(0, 8).map(({ app, x }) => (
                <li key={app.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                  <Link to={`/underwriting/app/${app.id}`} className="flex-1 font-medium hover:text-primary">
                    {app.business.legalName}
                  </Link>
                  <RiskBadge risk={x.uw.risk} />
                  <StatusBadge status={app.status} />
                  <span className="text-xs text-muted-foreground">
                    {app.decision!.outcome === "approved" ? `Option ${app.decision!.scenarioKey}` : "—"} · {app.decision!.by} · {fmtDate(app.decision!.at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}
