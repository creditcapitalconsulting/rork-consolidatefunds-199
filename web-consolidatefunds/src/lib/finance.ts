import { ASSET_TYPES, DEBT_TYPES } from "./config";
import type { Asset, Debt, Financials, Frequency, UnderwritingSettings } from "./types";

/** Parse a user-typed numeric string ("$1,200.50", "1.38", "12%") safely. */
export const n = (s?: string | number | null): number => {
  if (s === undefined || s === null || s === "") return 0;
  if (typeof s === "number") return isFinite(s) ? s : 0;
  const v = parseFloat(String(s).replace(/[^0-9.-]/g, ""));
  return isFinite(v) ? v : 0;
};

// ---------- Business-day calendar (US federal holidays, observed) ----------

const nthWeekday = (year: number, month: number, weekday: number, nth: number) => {
  const d = new Date(year, month, 1);
  const shift = (weekday - d.getDay() + 7) % 7;
  return new Date(year, month, 1 + shift + (nth - 1) * 7);
};
const lastWeekday = (year: number, month: number, weekday: number) => {
  const d = new Date(year, month + 1, 0);
  const shift = (d.getDay() - weekday + 7) % 7;
  return new Date(year, month, d.getDate() - shift);
};
const observed = (d: Date) => {
  if (d.getDay() === 6) return new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
  if (d.getDay() === 0) return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  return d;
};
const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

export function federalHolidays(year: number): Set<string> {
  const list = [
    observed(new Date(year, 0, 1)),
    nthWeekday(year, 0, 1, 3),
    nthWeekday(year, 1, 1, 3),
    lastWeekday(year, 4, 1),
    observed(new Date(year, 5, 19)),
    observed(new Date(year, 6, 4)),
    nthWeekday(year, 8, 1, 1),
    nthWeekday(year, 9, 1, 2),
    observed(new Date(year, 10, 11)),
    nthWeekday(year, 10, 4, 4),
    observed(new Date(year, 11, 25)),
  ];
  return new Set(list.map(key));
}

const bizCache = new Map<string, number>();
/** Actual ACH business days in the next 12 months from today. */
export function businessDaysPerYear(excludeHolidays: boolean): number {
  const today = new Date();
  const cacheKey = `${today.toDateString()}-${excludeHolidays}`;
  const cached = bizCache.get(cacheKey);
  if (cached) return cached;
  const holidays = new Set<string>([
    ...federalHolidays(today.getFullYear()),
    ...federalHolidays(today.getFullYear() + 1),
  ]);
  let count = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    const wd = d.getDay();
    if (wd === 0 || wd === 6) continue;
    if (excludeHolidays && holidays.has(key(d))) continue;
    count++;
  }
  bizCache.set(cacheKey, count);
  return count;
}

export function paymentsPerYear(freq: Frequency, debt: Debt | null, s: UnderwritingSettings): number {
  switch (freq) {
    case "daily":
      return 365;
    case "business_daily":
      return businessDaysPerYear(s.excludeHolidays);
    case "weekly":
      return 52;
    case "biweekly":
      return 26;
    case "semimonthly":
      return 24;
    case "monthly":
      return 12;
    case "quarterly":
      return 4;
    case "annually":
      return 1;
    case "custom":
      return n(debt?.fields.customPerYear) || 12;
    case "variable":
      return 12;
  }
}

export const isMcaLike = (d: Debt) => DEBT_TYPES[d.type].family === "mca";
export const isRevolving = (d: Debt) => d.structure === "revolving" || DEBT_TYPES[d.type].family === "revolving";

/** Payment amount actually leaving the account per period. */
export const periodPayment = (d: Debt) => (d.type === "mca" ? n(d.fields.actualAch) || n(d.fields.payment) : n(d.fields.payment));

export function monthlyEquivalent(d: Debt, s: UnderwritingSettings): number {
  if (d.frequency === "variable") {
    return n(d.fields.variableMonthlyAvg) || periodPayment(d);
  }
  return (periodPayment(d) * paymentsPerYear(d.frequency, d, s)) / 12;
}

export function factorRate(d: Debt): number {
  const explicit = n(d.fields.factorRate);
  if (explicit) return explicit;
  if (d.type === "mca") {
    const pp = n(d.fields.purchasePrice);
    const pa = n(d.fields.purchasedAmount);
    return pp > 0 && pa > 0 ? pa / pp : 0;
  }
  const oa = n(d.fields.originalAmount);
  const or = n(d.fields.originalRepayment);
  return oa > 0 && or > 0 ? or / oa : 0;
}

export function remainingContractual(d: Debt): number {
  const f = d.fields;
  const balloon = d.structure === "balloon" ? n(f.balloonAmount) : 0;
  if (isMcaLike(d)) {
    const purchased = n(f.purchasedAmount) || n(f.originalRepayment);
    return n(f.remainingReceivables) || Math.max(0, purchased - n(f.collectionsToDate)) || n(f.payoff);
  }
  if (isRevolving(d)) return n(f.balance);
  const pay = periodPayment(d);
  const rem = n(f.paymentsRemaining);
  if (pay > 0 && rem > 0 && d.frequency !== "variable") return pay * rem + balloon + n(f.buyoutAmount);
  return n(f.balance) + balloon || n(f.payoff);
}

export function payoffAmount(d: Debt): number {
  return n(d.fields.payoff) || n(d.fields.balance) || remainingContractual(d);
}

export function remainingMonths(d: Debt, s: UnderwritingSettings): number | null {
  const rem = n(d.fields.paymentsRemaining);
  if (rem > 0 && d.frequency !== "variable") return (rem / paymentsPerYear(d.frequency, d, s)) * 12;
  if (isMcaLike(d)) {
    const m = monthlyEquivalent(d, s);
    const r = remainingContractual(d);
    return m > 0 ? r / m : null;
  }
  if (d.fields.maturityDate) {
    const ms = new Date(d.fields.maturityDate).getTime() - Date.now();
    return ms > 0 ? ms / (1000 * 60 * 60 * 24 * 30.44) : 0;
  }
  return null;
}

export function costLabel(d: Debt): string {
  if (isMcaLike(d)) {
    const fr = factorRate(d);
    return fr ? `${fr.toFixed(2)} factor` : "Factor —";
  }
  if (d.type === "factoring") return d.fields.factoringFee ? `${d.fields.factoringFee}% / 30d fee` : "Fee —";
  return n(d.fields.rate) ? `${n(d.fields.rate)}% APR` : "Rate —";
}

export interface DebtRow {
  debt: Debt;
  label: string;
  monthly: number;
  annual: number;
  daily: number;
  businessDaily: number;
  weekly: number;
  contractual: number;
  payoff: number;
  earlySavings: number;
  remainingInterest: number; // interest-bearing only
  remainingCost: number; // MCA: remaining purchased receivables above payoff, others: interest
  months: number | null;
  /** Cash drain ratio: monthly payment per $ of payoff (higher = more expensive to carry). */
  drain: number;
}

export interface DebtSummary {
  rows: DebtRow[];
  monthly: number;
  annual: number;
  daily: number;
  businessDaily: number;
  weekly: number;
  contractual: number;
  payoff: number;
  earlySavings: number;
  remainingInterest: number;
  mcaPurchasedRemaining: number;
  mcaCount: number;
  balloonDue: number;
  bizDays: number;
}

export function debtLabel(d: Debt, index: number, all: Debt[]): string {
  const sameType = all.filter((x) => x.type === d.type);
  const pos = sameType.indexOf(d) + 1;
  const badge = DEBT_TYPES[d.type].badge;
  const base = d.type === "mca" ? `MCA #${pos}` : DEBT_TYPES[d.type].label.replace("Traditional ", "");
  return d.creditor ? `${base} · ${d.creditor}` : sameType.length > 1 && d.type !== "mca" ? `${base} #${pos}` : base || `${badge} ${index + 1}`;
}

export function summarizeDebts(debts: Debt[], s: UnderwritingSettings): DebtSummary {
  const bizDays = businessDaysPerYear(s.excludeHolidays);
  const rows: DebtRow[] = debts.map((d, i) => {
    const monthly = monthlyEquivalent(d, s);
    const annual = monthly * 12;
    const contractual = remainingContractual(d);
    const payoff = payoffAmount(d);
    const mca = isMcaLike(d);
    const remainingInterest = !mca && !isRevolving(d) && DEBT_TYPES[d.type].family !== "obligation" ? Math.max(0, contractual - n(d.fields.balance || d.fields.payoff)) : 0;
    return {
      debt: d,
      label: debtLabel(d, i, debts),
      monthly,
      annual,
      daily: annual / 365,
      businessDaily: annual / bizDays,
      weekly: annual / 52,
      contractual,
      payoff,
      earlySavings: Math.max(0, contractual - payoff),
      remainingInterest,
      remainingCost: mca ? Math.max(0, contractual - payoff) : remainingInterest,
      months: remainingMonths(d, s),
      drain: payoff > 0 ? monthly / payoff : 0,
    };
  });
  const sum = (k: keyof DebtRow) => rows.reduce((a, r) => a + (typeof r[k] === "number" ? (r[k] as number) : 0), 0);
  return {
    rows,
    monthly: sum("monthly"),
    annual: sum("annual"),
    daily: sum("daily"),
    businessDaily: sum("businessDaily"),
    weekly: sum("weekly"),
    contractual: sum("contractual"),
    payoff: sum("payoff"),
    earlySavings: sum("earlySavings"),
    remainingInterest: sum("remainingInterest"),
    mcaPurchasedRemaining: rows.filter((r) => isMcaLike(r.debt)).reduce((a, r) => a + r.contractual, 0),
    mcaCount: debts.filter((d) => d.type === "mca").length,
    balloonDue: debts.reduce((a, d) => a + (d.structure === "balloon" ? n(d.fields.balloonAmount) : 0), 0),
    bizDays,
  };
}

// ---------- Business financial metrics ----------

export interface FinancialMetrics {
  monthlyRevenue: number;
  annualRevenue: number;
  growthPct: number | null;
  grossMarginPct: number | null;
  noi: number; // annual, before debt service
  cfads: number; // annual cash flow available for debt service
  dscr: number | null;
  burdenPct: number | null;
  workingCapital: number;
}

export function computeMetrics(f: Financials, debt: DebtSummary): FinancialMetrics {
  const annualRevenue = n(f.annualRevenue) || n(f.monthlyRevenue) * 12;
  const monthlyRevenue = n(f.monthlyRevenue) || annualRevenue / 12;
  const prior = n(f.priorYearRevenue);
  const gp = n(f.grossProfit);
  const noi = gp ? gp - n(f.operatingExpenses) : 0;
  const cfads = n(f.ebitda) || noi;
  return {
    monthlyRevenue,
    annualRevenue,
    growthPct: prior > 0 && annualRevenue > 0 ? (annualRevenue / prior - 1) * 100 : null,
    grossMarginPct: annualRevenue > 0 && gp > 0 ? (gp / annualRevenue) * 100 : null,
    noi,
    cfads,
    dscr: debt.annual > 0 && cfads !== 0 ? cfads / debt.annual : null,
    burdenPct: monthlyRevenue > 0 ? (debt.monthly / monthlyRevenue) * 100 : null,
    workingCapital: n(f.cash) + n(f.accountsReceivable) - n(f.accountsPayable),
  };
}

// ---------- Collateral ----------

export interface CollateralRow {
  asset: Asset;
  label: string;
  value: number;
  liens: number;
  advanceRate: number;
  capacity: number;
}

export function assetValue(a: Asset): number {
  const cfg = ASSET_TYPES[a.category];
  if (a.category === "receivables") {
    const eligible = n(a.fields.aging0) + n(a.fields.aging31) + n(a.fields.aging61);
    const total = n(a.fields.totalAR);
    if (eligible > 0) return eligible;
    return Math.max(0, total - n(a.fields.aging90));
  }
  if (a.category === "inventory") return n(a.fields.liquidationValue) || n(a.fields.costBasis) * 0.5;
  for (const k of cfg.valueKeys) {
    const v = n(a.fields[k]);
    if (v) return v;
  }
  return 0;
}

export function assetLabel(a: Asset): string {
  const f = a.fields;
  const name = f.address || f.description || [f.year, f.make, f.model].filter(Boolean).join(" ") || f.customer || f.counterparty || f.institution || f.inventoryType;
  return name ? `${ASSET_TYPES[a.category].label} · ${name}` : ASSET_TYPES[a.category].label;
}

export function summarizeCollateral(assets: Asset[], s: UnderwritingSettings) {
  const rows: CollateralRow[] = assets.map((a) => {
    const value = assetValue(a);
    const liens = ASSET_TYPES[a.category].lienKeys.reduce((acc, k) => acc + n(a.fields[k]), 0);
    let rate = s.advanceRates[a.category];
    if (a.category === "receivables" && a.fields.factored === "All invoices factored") rate = 0;
    if (a.category === "real_estate" && a.fields.ownershipPct) rate = rate * Math.min(1, n(a.fields.ownershipPct) / 100);
    const capacity = Math.max(0, value * rate - liens);
    return { asset: a, label: assetLabel(a), value, liens, advanceRate: rate, capacity };
  });
  return {
    rows,
    grossValue: rows.reduce((a, r) => a + r.value, 0),
    liens: rows.reduce((a, r) => a + r.liens, 0),
    equity: rows.reduce((a, r) => a + Math.max(0, r.value - r.liens), 0),
    capacity: rows.reduce((a, r) => a + r.capacity, 0),
  };
}

/** Standard amortizing payment. */
export function amortizedPayment(principal: number, annualRatePct: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}
