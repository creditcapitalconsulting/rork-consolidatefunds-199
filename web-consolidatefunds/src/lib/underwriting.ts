import { analyzeBank, type BankAnalysis } from "./bank";
import { DEBT_TYPES, FACTOR_LABELS } from "./config";
import {
  amortizedPayment,
  computeMetrics,
  isMcaLike,
  n,
  summarizeCollateral,
  summarizeDebts,
  type DebtRow,
  type DebtSummary,
  type FinancialMetrics,
} from "./finance";
import type { Application, FactorKey, RiskLevel, UnderwritingSettings } from "./types";

export interface Factor {
  key: FactorKey;
  label: string;
  score: number;
  weight: number;
  detail: string;
}

export interface Finding {
  level: "red" | "yellow" | "info" | "green";
  text: string;
}

export interface Underwriting {
  score: number;
  risk: RiskLevel;
  factors: Factor[];
  findings: Finding[];
}

export interface FullAnalysis {
  debt: DebtSummary;
  metrics: FinancialMetrics;
  collateral: ReturnType<typeof summarizeCollateral>;
  bank: BankAnalysis;
  uw: Underwriting;
  scenarios: Scenario[];
}

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
const step = (v: number, table: [number, number][], fallback: number) => {
  for (const [limit, score] of table) if (v >= limit) return score;
  return fallback;
};

export function yearsInBusiness(established: string): number | null {
  if (!established) return null;
  const t = new Date(established).getTime();
  if (isNaN(t)) return null;
  return (Date.now() - t) / (365.25 * 86400000);
}

export function runUnderwriting(app: Application, s: UnderwritingSettings, debt: DebtSummary, metrics: FinancialMetrics, collateral: ReturnType<typeof summarizeCollateral>, bank: BankAnalysis): Underwriting {
  const findings: Finding[] = [];
  const f: Record<FactorKey, { score: number; detail: string }> = {} as Record<FactorKey, { score: number; detail: string }>;

  // 1. Revenue stability
  {
    let score = 70;
    const parts: string[] = [];
    if (metrics.growthPct !== null) {
      score += Math.max(-30, Math.min(20, metrics.growthPct));
      parts.push(`${metrics.growthPct >= 0 ? "+" : ""}${metrics.growthPct.toFixed(0)}% YoY`);
      if (metrics.growthPct >= 10) findings.push({ level: "green", text: `Strong revenue growth (${metrics.growthPct.toFixed(0)}% YoY)` });
      if (metrics.growthPct <= -10) findings.push({ level: "yellow", text: `Revenue declined ${Math.abs(metrics.growthPct).toFixed(0)}% year over year` });
    }
    const season = app.financials.seasonality;
    if (season === "Highly seasonal") score -= 15;
    if (season === "Moderately seasonal") score -= 5;
    if (bank.consistencyCv !== null) {
      score -= Math.max(0, (bank.consistencyCv - 0.15) * 100);
      parts.push(`deposit variability ${(bank.consistencyCv * 100).toFixed(0)}%`);
    }
    const conc = n(app.financials.topCustomerPct);
    if (conc >= 40) {
      score -= 15;
      findings.push({ level: "yellow", text: `Customer concentration: largest customer is ${conc}% of revenue` });
    }
    f.revenue = { score: clamp(score), detail: parts.join(", ") || "Self-reported revenue only" };
  }

  // 2. Debt burden
  {
    const b = metrics.burdenPct;
    const score = b === null ? 50 : step(-b, [[-10, 100], [-20, 80], [-30, 60], [-40, 40], [-50, 25]], 10);
    f.burden = { score, detail: b === null ? "Revenue not provided" : `${b.toFixed(0)}% of monthly revenue goes to debt service` };
    if (b !== null && b >= 35) findings.push({ level: "red", text: `Debt payments consume ${b.toFixed(0)}% of revenue` });
  }

  // 3. DSCR
  {
    const d = metrics.dscr;
    const score = d === null ? 50 : step(d, [[1.5, 100], [s.targetDscr, 80], [1.0, 55], [0.8, 35]], 15);
    f.dscr = { score, detail: d === null ? "Cash flow not provided" : `DSCR ${d.toFixed(2)} vs target ${s.targetDscr.toFixed(2)}` };
    if (d !== null && d < 1) findings.push({ level: "red", text: `Current cash flow does not cover debt service (DSCR ${d.toFixed(2)})` });
  }

  // 4. Banking
  {
    if (!bank.hasData) {
      f.banking = { score: 50, detail: "No bank data connected" };
      findings.push({ level: "info", text: "Bank statements not yet connected or uploaded" });
    } else {
      const score = 100 - bank.nsfCount * 8 - bank.negativeDays * 2 - bank.returnedCount * 10;
      f.banking = { score: clamp(score), detail: `${bank.nsfCount} NSF, ${bank.negativeDays} negative days, ${bank.returnedCount} returned ACH` };
      if (bank.nsfCount > 0) findings.push({ level: bank.nsfCount >= 3 ? "red" : "yellow", text: `${bank.nsfCount} NSF fee${bank.nsfCount > 1 ? "s" : ""} in statement period` });
      if (bank.negativeDays > 0) findings.push({ level: bank.negativeDays > 5 ? "red" : "yellow", text: `${bank.negativeDays} negative balance day${bank.negativeDays > 1 ? "s" : ""}` });
      bank.undisclosed.forEach((l) => findings.push({ level: "red", text: `Undisclosed lender withdrawals detected: ${l.name} (${l.frequency.toLowerCase()}, ~$${Math.round(l.typicalAmount).toLocaleString()})` }));
      const declared = metrics.monthlyRevenue;
      if (declared > 0 && bank.avgMonthlyRevenue > 0) {
        const gap = (declared - bank.avgMonthlyRevenue) / declared;
        if (gap > 0.2) findings.push({ level: "yellow", text: `Stated revenue is ${(gap * 100).toFixed(0)}% higher than verified bank deposits` });
      }
    }
  }

  // 5. Collateral
  {
    const cov = debt.payoff > 0 ? collateral.capacity / debt.payoff : 0;
    const score = debt.payoff === 0 ? 70 : step(cov, [[1, 100], [0.5, 70], [0.25, 45]], 25);
    f.collateral = { score, detail: `Preliminary capacity covers ${(cov * 100).toFixed(0)}% of payoffs` };
    if (cov >= 0.5) findings.push({ level: "green", text: `Preliminary collateral capacity supports ${(cov * 100).toFixed(0)}% of total payoffs` });
  }

  // 6. Payment & credit history
  {
    const worst = app.debts.reduce((w, d) => {
      const rank = { current: 0, modified: 1, late_30: 2, late_60: 3, negotiating: 3, late_90: 4, default: 5 }[d.status];
      return Math.max(w, rank);
    }, 0);
    const statusScore = [100, 75, 65, 45, 30, 15][worst];
    const credit = app.business.owners.map((o) => o.creditRange).filter(Boolean);
    const creditScore = credit.length
      ? credit.reduce((a, c) => a + ({ "760+": 100, "700–759": 85, "650–699": 65, "600–649": 45, "Below 600": 25 }[c] ?? 60), 0) / credit.length
      : 60;
    f.history = { score: clamp(statusScore * 0.6 + creditScore * 0.4), detail: worst > 0 ? "Delinquent or modified obligations reported" : "All obligations reported current" };
    if (worst >= 4) findings.push({ level: "red", text: "One or more obligations 90+ days late or in default" });
  }

  // 7. Operating history
  {
    const y = yearsInBusiness(app.business.established);
    const score = y === null ? 50 : step(y, [[5, 100], [3, 80], [2, 65], [1, 45]], 25);
    f.operating = { score, detail: y === null ? "Date established not provided" : `${y.toFixed(1)} years in business` };
  }

  // 8. Liens & legal
  {
    const judgments = app.debts.filter((d) => d.type === "judgment").length;
    const taxLiens = app.debts.filter((d) => d.type === "tax" && d.fields.taxLien === "Lien filed").length;
    const taxDebts = app.debts.filter((d) => d.type === "tax").length;
    const stacking = Math.max(0, debt.mcaCount - 1);
    const cojs = app.debts.filter((d) => d.fields.defaultStatus === "Confession of judgment filed").length;
    const score = 100 - judgments * 25 - taxLiens * 15 - (taxDebts - taxLiens) * 5 - stacking * 12 - bank.undisclosed.length * 15 - cojs * 20;
    f.legal = {
      score: clamp(score),
      detail: [`${debt.mcaCount} MCA position${debt.mcaCount === 1 ? "" : "s"}`, judgments ? `${judgments} judgment(s)` : "", taxLiens ? `${taxLiens} tax lien(s)` : ""].filter(Boolean).join(", "),
    };
    if (taxLiens) findings.push({ level: "yellow", text: `Tax lien${taxLiens > 1 ? "s" : ""} reported (${taxLiens})` });
    if (debt.mcaCount >= 3) findings.push({ level: "yellow", text: `${debt.mcaCount} stacked MCA positions` });
    if (judgments) findings.push({ level: "red", text: `${judgments} judgment(s) or settlement(s) outstanding` });
  }

  const factors: Factor[] = (Object.keys(FACTOR_LABELS) as FactorKey[]).map((k) => ({
    key: k,
    label: FACTOR_LABELS[k],
    score: f[k].score,
    weight: s.weights[k],
    detail: f[k].detail,
  }));
  const totalW = factors.reduce((a, x) => a + x.weight, 0) || 1;
  const score = Math.round(factors.reduce((a, x) => a + x.score * x.weight, 0) / totalW);
  const risk: RiskLevel = score >= s.thresholds.green ? "green" : score >= s.thresholds.yellow ? "yellow" : "red";
  const order = { red: 0, yellow: 1, info: 2, green: 3 };
  findings.sort((a, b) => order[a.level] - order[b.level]);
  return { score, risk, factors, findings };
}

// ---------- Scenario generator ----------

export interface Scenario {
  key: "A" | "B" | "C" | "D" | "E";
  name: string;
  tagline: string;
  feasible: boolean;
  feasibilityNote?: string;
  financing: number;
  paidOff: DebtRow[];
  remaining: DebtRow[];
  frequency: string;
  newPayment: number; // monthly, new facility
  remainingPayment: number; // monthly, debts left in place
  monthlyImprovement: number;
  annualImprovement: number;
  totalCost: number;
  collateral: string;
  termMonths: number;
  rateLabel: string;
  postDscr: number | null;
  best?: boolean;
}

function build(
  key: Scenario["key"],
  name: string,
  tagline: string,
  rows: DebtRow[],
  payIds: Set<string>,
  tranches: { principal: number; rate: number; months: number }[],
  ctx: { current: number; cfads: number; fee: number },
  collateral: string,
  feasible = true,
  note?: string,
): Scenario {
  const paidOff = rows.filter((r) => payIds.has(r.debt.id));
  const remaining = rows.filter((r) => !payIds.has(r.debt.id));
  const financing = tranches.reduce((a, t) => a + t.principal, 0);
  const newPayment = tranches.reduce((a, t) => a + amortizedPayment(t.principal, t.rate, t.months), 0);
  const remainingPayment = remaining.reduce((a, r) => a + r.monthly, 0);
  const totalNew = newPayment + remainingPayment;
  const monthlyImprovement = ctx.current - totalNew;
  const totalCost = tranches.reduce((a, t) => a + amortizedPayment(t.principal, t.rate, t.months) * t.months - t.principal, 0) + financing * ctx.fee;
  const term = Math.max(...tranches.map((t) => t.months), 0);
  const rateLabel = tranches.length > 1 ? tranches.map((t) => `${t.rate}%`).join(" / ") + " est. APR" : tranches[0] ? `${tranches[0].rate}% est. APR` : "—";
  return {
    key,
    name,
    tagline,
    feasible: feasible && paidOff.length > 0,
    feasibilityNote: paidOff.length === 0 ? "No eligible obligations for this structure" : note,
    financing,
    paidOff,
    remaining,
    frequency: "Monthly",
    newPayment,
    remainingPayment,
    monthlyImprovement,
    annualImprovement: monthlyImprovement * 12,
    totalCost,
    collateral,
    termMonths: term,
    rateLabel,
    postDscr: totalNew > 0 && ctx.cfads ? ctx.cfads / (totalNew * 12) : null,
  };
}

export function generateScenarios(debt: DebtSummary, metrics: FinancialMetrics, capacity: number, s: UnderwritingSettings, excluded: Set<string> = new Set()): Scenario[] {
  const all = debt.rows;
  const eligible = all.filter((r) => !excluded.has(r.debt.id) && r.payoff > 0);
  const fee = s.originationFeePct / 100;
  const gross = (x: number) => x * (1 + fee);
  const ctx = { current: debt.monthly, cfads: metrics.cfads, fee };
  const T = s.terms;
  const ids = (rows: DebtRow[]) => new Set(rows.map((r) => r.debt.id));
  const sumPayoff = (rows: DebtRow[]) => rows.reduce((a, r) => a + r.payoff, 0);

  // A — Full consolidation
  const A = build("A", "Full Consolidation", "Combine every eligible debt into one payment", all, ids(eligible), [{ principal: gross(sumPayoff(eligible)), rate: T.full.rate, months: T.full.months }], ctx, "Blanket UCC lien + personal guarantee");

  // B — MCA consolidation
  const mcas = eligible.filter((r) => isMcaLike(r.debt));
  const B = build("B", "MCA Consolidation", "Eliminate daily and weekly MCA withdrawals", all, ids(mcas), [{ principal: gross(sumPayoff(mcas)), rate: T.mca.rate, months: T.mca.months }], ctx, "Blanket UCC lien (1st position)");

  // C — Asset-based: pay highest-drain debts first up to collateral capacity
  const byDrain = [...eligible].sort((a, b) => b.drain - a.drain);
  const cPick: DebtRow[] = [];
  let cTotal = 0;
  for (const r of byDrain) {
    if (gross(cTotal + r.payoff) <= capacity) {
      cPick.push(r);
      cTotal += r.payoff;
    }
  }
  const C = build("C", "Asset-Based Refinance", "Use receivables, property and equipment to refinance", all, ids(cPick), [{ principal: gross(cTotal), rate: T.asset.rate, months: T.asset.months }], ctx, "Specific collateral: real estate, A/R, equipment (preliminary)", capacity > 0, capacity > 0 ? undefined : "No collateral capacity disclosed");

  // D — Partial: highest monthly drain (frequent, short payback) obligations up to ~60% of payoff, cheap debt stays
  const dPick: DebtRow[] = [];
  let dTotal = 0;
  const cap = sumPayoff(eligible) * 0.65;
  for (const r of byDrain) {
    const cheap = ["sba", "mortgage"].includes(r.debt.type) || (!isMcaLike(r.debt) && n(r.debt.fields.rate) > 0 && n(r.debt.fields.rate) < T.partial.rate);
    if (cheap) continue;
    if (dTotal + r.payoff <= cap || dPick.length === 0) {
      dPick.push(r);
      dTotal += r.payoff;
    }
  }
  const D = build("D", "Partial Consolidation", "Pay off only the costliest obligations; keep cheap debt", all, ids(dPick), [{ principal: gross(dTotal), rate: T.partial.rate, months: T.partial.months }], ctx, "Blanket UCC lien (subordinate to existing secured lenders)");

  // E — Hybrid: asset-based tranche up to capacity + term tranche for the rest
  const totalEligible = sumPayoff(eligible);
  const assetPart = Math.min(capacity / (1 + fee), totalEligible);
  const remainder = Math.max(0, totalEligible - assetPart);
  const E = build(
    "E",
    "Hybrid Financing",
    "Asset-backed facility plus a working-capital term loan",
    all,
    ids(eligible),
    [
      { principal: gross(assetPart), rate: T.asset.rate, months: T.asset.months },
      ...(remainder > 0 ? [{ principal: gross(remainder), rate: T.hybridRemainder.rate, months: T.hybridRemainder.months }] : []),
    ].filter((t) => t.principal > 0),
    ctx,
    "Specific collateral + blanket lien on remaining assets",
    capacity > 0,
    capacity > 0 ? undefined : "Requires collateral capacity",
  );

  const list = [A, B, C, D, E];
  // Best sustainable benefit: meets target DSCR (or best DSCR) and largest monthly improvement.
  const feasible = list.filter((x) => x.feasible && x.monthlyImprovement > 0);
  const scoreOf = (x: Scenario) => {
    const dscrOk = x.postDscr === null ? 0.5 : Math.min(1.2, x.postDscr / s.targetDscr);
    return x.monthlyImprovement * dscrOk - x.totalCost / Math.max(1, x.termMonths) * 0.25;
  };
  const best = feasible.sort((a, b) => scoreOf(b) - scoreOf(a))[0];
  if (best) best.best = true;
  return list;
}

export function analyzeApplication(app: Application, s: UnderwritingSettings, excluded?: Set<string>): FullAnalysis {
  const debt = summarizeDebts(app.debts, s);
  const metrics = computeMetrics(app.financials, debt);
  const collateral = summarizeCollateral(app.assets, s);
  const bank = analyzeBank(app.bank.transactions, app.debts);
  const uw = runUnderwriting(app, s, debt, metrics, collateral, bank);
  const scenarios = generateScenarios(debt, metrics, collateral.capacity, s, excluded);
  return { debt, metrics, collateral, bank, uw, scenarios };
}

export const typeGroupLabel = (row: DebtRow) => {
  const fam = DEBT_TYPES[row.debt.type].family;
  if (fam === "mca") return "MCA / RBF";
  if (row.debt.type === "equipment" || row.debt.type === "vehicle") return "Equipment & Auto";
  if (fam === "revolving") return "Credit Lines";
  if (row.debt.type === "tax") return "Tax Debt";
  if (fam === "real_estate") return "Real Estate";
  if (fam === "installment") return "Term Loans";
  return "Other";
};
