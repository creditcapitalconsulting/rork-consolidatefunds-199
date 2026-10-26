import type { Debt, Transaction } from "./types";

// Known lenders and MCA funders commonly seen in ACH descriptors.
const KNOWN_LENDERS = [
  "ONDECK",
  "KAPITUS",
  "LIBERTAS",
  "YELLOWSTONE",
  "PEARL CAPITAL",
  "RAPID FINANCE",
  "FORWARD FINANCING",
  "CREDIBLY",
  "FUNDBOX",
  "BLUEVINE",
  "KABBAGE",
  "SQUARE CAPITAL",
  "PAYPAL WORKING",
  "SHOPIFY CAPITAL",
  "CAN CAPITAL",
  "EVEREST BUSINESS",
  "MULLIGAN",
  "FORA FINANCIAL",
  "NATIONAL FUNDING",
  "VOX FUNDING",
  "IOU FINANCIAL",
  "BIZ2CREDIT",
  "AMEX",
  "AMERICAN EXPRESS",
  "SBA EIDL",
  "SBA LOAN",
  "CAT FINANCIAL",
  "DE LAGE LANDEN",
  "BALBOA CAPITAL",
  "TOYOTA FINANCIAL",
  "FORD CREDIT",
  "ALLY",
  "CHASE LOAN",
  "WELLS FARGO LOAN",
  "CLEARCO",
  "LENDIO",
  "GREENBOX",
  "LG FUNDING",
  "CFG MERCHANT",
];
const GENERIC_LENDER = /\b(FUNDING|CAPITAL|ADVANCE|LENDING|LOAN PMT|LOAN PAYMENT|FINANCIAL SVC|FINANCING)\b/;
const TRANSFER = /\b(TRANSFER|XFER|TFR|ONLINE BANKING TRANSFER)\b/;
const PAYROLL = /\b(ADP|GUSTO|PAYCHEX|PAYROLL|INTUIT PAYRL|RIPPLING)\b/;
const TAX = /\b(IRS|EFTPS|USATAXPYMT|DEPT OF REVENUE|FRANCHISE TAX|STATE TAX|TAX PMT)\b/;
const NSF = /\b(NSF|INSUFFICIENT|OVERDRAFT|OD FEE|RETURNED ITEM FEE)\b/;
const RETURNED = /\b(RETURN|RETURNED ACH|REVERSAL|R01|R02|R09)\b/;

export type TxnCategory = "revenue" | "transfer" | "lender" | "loan_proceeds" | "payroll" | "tax" | "nsf_fee" | "returned" | "expense" | "other_credit";

export function lenderName(desc: string): string | null {
  const u = desc.toUpperCase();
  const known = KNOWN_LENDERS.find((l) => u.includes(l));
  if (known) return known === "AMERICAN EXPRESS" ? "AMEX" : known;
  if (GENERIC_LENDER.test(u)) {
    const cleaned = u
      .replace(/(ACH|DEBIT|CREDIT|WEB|CCD|PPD|ID[:#]?\s*\S+|\d{4,})/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return cleaned.split(" ").slice(0, 3).join(" ");
  }
  return null;
}

export function categorize(t: Transaction): TxnCategory {
  const u = t.description.toUpperCase();
  if (NSF.test(u)) return "nsf_fee";
  if (RETURNED.test(u)) return "returned";
  if (TRANSFER.test(u)) return "transfer";
  if (t.amount > 0) {
    if (lenderName(u)) return "loan_proceeds";
    return "revenue";
  }
  if (PAYROLL.test(u)) return "payroll";
  if (TAX.test(u)) return "tax";
  if (lenderName(u)) return "lender";
  return "expense";
}

export interface DetectedLender {
  name: string;
  count: number;
  total: number;
  typicalAmount: number;
  frequency: string;
  monthlyEstimate: number;
  firstSeen: string;
  lastSeen: string;
  matchedDebtId: string | null;
}

export interface MonthStat {
  month: string; // YYYY-MM
  revenue: number;
  transfersIn: number;
  debits: number;
  lenderPayments: number;
  depositCount: number;
}

export interface BankAnalysis {
  hasData: boolean;
  months: MonthStat[];
  avgMonthlyRevenue: number;
  avgDailyBalance: number | null;
  negativeDays: number;
  nsfCount: number;
  returnedCount: number;
  payrollMonthly: number;
  taxMonthly: number;
  lenders: DetectedLender[];
  undisclosed: DetectedLender[];
  disclosedNotSeen: string[];
  internalTransfers: number;
  unusual: { date: string; description: string; amount: number; reason: string }[];
  consistencyCv: number | null;
  trendPct: number | null;
  totalTransactions: number;
  periodStart: string;
  periodEnd: string;
}

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const tokens = (s: string) =>
  s
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !["LLC", "INC", "THE", "BUSINESS", "FINANCIAL", "GROUP", "CORP"].includes(w));

export function matchesCreditor(lender: string, creditor: string): boolean {
  if (!creditor) return false;
  const a = tokens(lender);
  const b = tokens(creditor);
  return a.some((t) => b.includes(t)) || creditor.toUpperCase().includes(lender) || lender.includes(creditor.toUpperCase());
}

function inferFrequency(dates: string[]): { label: string; perMonth: number } {
  if (dates.length < 2) return { label: "Single", perMonth: 0 };
  const ts = dates.map((d) => new Date(d).getTime()).sort((a, b) => a - b);
  const gaps = ts.slice(1).map((t, i) => (t - ts[i]) / 86400000);
  const g = median(gaps);
  if (g <= 1.6) return { label: "Business daily", perMonth: 21 };
  if (g <= 4) return { label: "Several per week", perMonth: 10 };
  if (g <= 9) return { label: "Weekly", perMonth: 4.33 };
  if (g <= 17) return { label: "Biweekly", perMonth: 2.17 };
  if (g <= 35) return { label: "Monthly", perMonth: 1 };
  return { label: "Irregular", perMonth: 0 };
}

export function analyzeBank(transactions: Transaction[], debts: Debt[]): BankAnalysis {
  const txns = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  const empty: BankAnalysis = {
    hasData: false,
    months: [],
    avgMonthlyRevenue: 0,
    avgDailyBalance: null,
    negativeDays: 0,
    nsfCount: 0,
    returnedCount: 0,
    payrollMonthly: 0,
    taxMonthly: 0,
    lenders: [],
    undisclosed: [],
    disclosedNotSeen: [],
    internalTransfers: 0,
    unusual: [],
    consistencyCv: null,
    trendPct: null,
    totalTransactions: 0,
    periodStart: "",
    periodEnd: "",
  };
  if (!txns.length) return empty;

  const monthMap = new Map<string, MonthStat>();
  const lenderTx = new Map<string, Transaction[]>();
  let nsf = 0,
    returned = 0,
    payroll = 0,
    tax = 0,
    transfers = 0;
  const revenueAmounts: number[] = [];

  for (const t of txns) {
    const m = t.date.slice(0, 7);
    if (!monthMap.has(m)) monthMap.set(m, { month: m, revenue: 0, transfersIn: 0, debits: 0, lenderPayments: 0, depositCount: 0 });
    const ms = monthMap.get(m)!;
    const cat = categorize(t);
    if (t.amount < 0) ms.debits += -t.amount;
    switch (cat) {
      case "revenue":
        ms.revenue += t.amount;
        ms.depositCount++;
        revenueAmounts.push(t.amount);
        break;
      case "transfer":
        transfers++;
        if (t.amount > 0) ms.transfersIn += t.amount;
        break;
      case "lender": {
        const name = lenderName(t.description)!;
        ms.lenderPayments += -t.amount;
        if (!lenderTx.has(name)) lenderTx.set(name, []);
        lenderTx.get(name)!.push(t);
        break;
      }
      case "payroll":
        payroll += -t.amount;
        break;
      case "tax":
        tax += -t.amount;
        break;
      case "nsf_fee":
        nsf++;
        break;
      case "returned":
        returned++;
        break;
    }
  }

  const months = [...monthMap.values()].sort((a, b) => a.month.localeCompare(b.month));
  const monthCount = Math.max(1, months.length);

  // Daily balances (fill forward)
  let avgDailyBalance: number | null = null;
  let negativeDays = 0;
  const withBal = txns.filter((t) => typeof t.balance === "number");
  if (withBal.length) {
    const endOfDay = new Map<string, number>();
    withBal.forEach((t) => endOfDay.set(t.date, t.balance!));
    const start = new Date(txns[0].date);
    const end = new Date(txns[txns.length - 1].date);
    let last = withBal[0].balance!;
    let sum = 0,
      days = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const k = d.toISOString().slice(0, 10);
      if (endOfDay.has(k)) last = endOfDay.get(k)!;
      sum += last;
      days++;
      if (last < 0) negativeDays++;
    }
    avgDailyBalance = days ? sum / days : null;
  }

  const lenders: DetectedLender[] = [...lenderTx.entries()]
    .map(([name, list]) => {
      const amounts = list.map((t) => -t.amount);
      const total = amounts.reduce((a, b) => a + b, 0);
      const freq = inferFrequency(list.map((t) => t.date));
      const match = debts.find((d) => matchesCreditor(name, d.creditor));
      return {
        name,
        count: list.length,
        total,
        typicalAmount: median(amounts),
        frequency: freq.label,
        monthlyEstimate: total / monthCount,
        firstSeen: list[0].date,
        lastSeen: list[list.length - 1].date,
        matchedDebtId: match ? match.id : null,
      };
    })
    .sort((a, b) => b.monthlyEstimate - a.monthlyEstimate);

  const undisclosed = lenders.filter((l) => !l.matchedDebtId && l.count >= 2);
  const recurringTypes = new Set(["mca", "term_loan", "sba", "loc", "equipment", "vehicle", "mortgage", "rbf", "hard_money", "private"]);
  const disclosedNotSeen = debts
    .filter((d) => recurringTypes.has(d.type) && d.creditor && !lenders.some((l) => l.matchedDebtId === d.id))
    .map((d) => d.creditor);

  const medDeposit = median(revenueAmounts);
  const unusual = txns
    .filter((t) => {
      const cat = categorize(t);
      return (cat === "revenue" && medDeposit > 0 && t.amount > medDeposit * 6) || (t.amount < 0 && /CASH WITHDRAWAL|ATM/i.test(t.description) && -t.amount >= 2500) || cat === "loan_proceeds";
    })
    .slice(0, 12)
    .map((t) => ({
      date: t.date,
      description: t.description,
      amount: t.amount,
      reason: categorize(t) === "loan_proceeds" ? "Possible new financing proceeds" : t.amount > 0 ? "Deposit far above typical size" : "Large cash withdrawal",
    }));

  const revs = months.map((m) => m.revenue);
  const mean = revs.reduce((a, b) => a + b, 0) / monthCount;
  const sd = Math.sqrt(revs.reduce((a, b) => a + (b - mean) ** 2, 0) / monthCount);
  const half = Math.floor(revs.length / 2);
  const firstHalf = revs.slice(0, half);
  const secondHalf = revs.slice(revs.length - half);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

  return {
    hasData: true,
    months,
    avgMonthlyRevenue: mean,
    avgDailyBalance,
    negativeDays,
    nsfCount: nsf,
    returnedCount: returned,
    payrollMonthly: payroll / monthCount,
    taxMonthly: tax / monthCount,
    lenders,
    undisclosed,
    disclosedNotSeen,
    internalTransfers: transfers,
    unusual,
    consistencyCv: mean > 0 ? sd / mean : null,
    trendPct: half > 0 && avg(firstHalf) > 0 ? (avg(secondHalf) / avg(firstHalf) - 1) * 100 : null,
    totalTransactions: txns.length,
    periodStart: txns[0].date,
    periodEnd: txns[txns.length - 1].date,
  };
}

// ---------- CSV import ----------

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else q = !q;
    } else if (c === "," && !q) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

const toIsoDate = (s: string): string | null => {
  const t = s.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  }
  const d = new Date(t);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};
const money = (s?: string) => {
  if (!s) return 0;
  const neg = /^\(.*\)$/.test(s.trim()) || s.trim().startsWith("-");
  const v = parseFloat(s.replace(/[^0-9.]/g, ""));
  return isFinite(v) ? (neg ? -v : v) : 0;
};

/** Parse common bank CSV exports (Date, Description, Amount | Debit/Credit, Balance). */
export function parseBankCsv(text: string): { transactions: Transaction[]; error?: string } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { transactions: [], error: "The file looks empty." };
  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const idx = (...names: string[]) => header.findIndex((h) => names.some((nm) => h.includes(nm)));
  const iDate = idx("date", "posted");
  const iDesc = idx("description", "memo", "payee", "details", "name");
  const iAmt = idx("amount");
  const iDebit = idx("debit", "withdrawal");
  const iCredit = idx("credit", "deposit");
  const iBal = idx("balance");
  if (iDate < 0 || iDesc < 0 || (iAmt < 0 && iDebit < 0 && iCredit < 0)) {
    return { transactions: [], error: "Couldn't find Date, Description and Amount (or Debit/Credit) columns." };
  }
  const transactions: Transaction[] = [];
  for (const line of lines.slice(1)) {
    const c = splitCsvLine(line);
    const date = toIsoDate(c[iDate] ?? "");
    if (!date) continue;
    let amount = 0;
    if (iAmt >= 0) amount = money(c[iAmt]);
    else amount = money(c[iCredit]) - Math.abs(money(c[iDebit]));
    const t: Transaction = { date, description: c[iDesc] ?? "", amount };
    if (iBal >= 0 && c[iBal]) t.balance = money(c[iBal]);
    transactions.push(t);
  }
  return { transactions };
}

// ---------- Deterministic sample statement generator ----------

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/**
 * Builds 6 months of realistic transactions from the disclosed debts,
 * plus one undisclosed funder so the cross-check has something to find.
 */
export function generateSampleStatement(debts: Debt[], monthlyRevenue: number, seed = 7): Transaction[] {
  const r = rng(seed);
  const out: Transaction[] = [];
  const end = new Date();
  end.setDate(end.getDate() - 1);
  const start = new Date(end);
  start.setMonth(start.getMonth() - 6);
  const rev = monthlyRevenue || 80000;
  let dayIndex = 0;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const wd = d.getDay();
    const iso = d.toISOString().slice(0, 10);
    const dom = d.getDate();
    dayIndex++;
    if (wd !== 0 && wd !== 6) {
      const seasonal = 1 + 0.12 * Math.sin(dayIndex / 30);
      out.push({ date: iso, description: r() > 0.5 ? "SQUARE INC DEPOSIT 220934" : "STRIPE TRANSFER ST-8823", amount: Math.round(((rev / 21.7) * 0.7 * seasonal * (0.75 + r() * 0.5)) / 1) });
      if (r() > 0.7) out.push({ date: iso, description: "CLIENT ACH PMT INV " + Math.floor(1000 + r() * 8999), amount: Math.round(rev * 0.06 * (0.6 + r() * 0.8)) });
      for (const debt of debts) {
        const pay = debt.type === "mca" ? Number(debt.fields.actualAch || debt.fields.payment || 0) : Number(debt.fields.payment || 0);
        if (!pay || !debt.creditor) continue;
        const name = debt.creditor.toUpperCase();
        const desc = `${name} ACH DEBIT CCD`;
        if (debt.frequency === "business_daily" || debt.frequency === "daily") out.push({ date: iso, description: desc, amount: -pay });
        if (debt.frequency === "weekly" && wd === 3) out.push({ date: iso, description: desc, amount: -pay });
        if (debt.frequency === "biweekly" && wd === 5 && Math.floor(dayIndex / 7) % 2 === 0) out.push({ date: iso, description: desc, amount: -pay });
      }
      // Undisclosed weekly funder
      if (wd === 2) out.push({ date: iso, description: "VOX FUNDING LLC ACH DEBIT", amount: -1850 });
      if (wd === 5 && Math.floor(dayIndex / 7) % 2 === 1) out.push({ date: iso, description: "GUSTO PAYROLL NET PAY", amount: -Math.round(rev * 0.12) });
      if (r() > 0.55) out.push({ date: iso, description: "VENDOR PMT " + ["HOME DEPOT PRO", "FERGUSON SUPPLY", "SHELL FLEET", "GRAINGER"][Math.floor(r() * 4)], amount: -Math.round(rev * 0.015 * (0.5 + r())) });
    }
    if (dom === 1) {
      for (const debt of debts) {
        const pay = Number(debt.fields.payment || 0);
        if (debt.frequency === "monthly" && pay && debt.creditor) out.push({ date: iso, description: `${debt.creditor.toUpperCase()} LOAN PMT`, amount: -pay });
      }
      out.push({ date: iso, description: "RENT - MAPLE INDUSTRIAL PARK", amount: -Math.round(rev * 0.06) });
    }
    if (dom === 15) {
      out.push({ date: iso, description: "IRS USATAXPYMT EFTPS", amount: -Math.round(rev * 0.045) });
      out.push({ date: iso, description: "ONLINE BANKING TRANSFER FROM SAV 4421", amount: 15000 });
    }
    if (dom === 16) out.push({ date: iso, description: "ONLINE BANKING TRANSFER TO SAV 4421", amount: -15000 });
  }
  // A few stress events
  const stressDays = [40, 41, 97, 140];
  stressDays.forEach((i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    out.push({ date: d.toISOString().slice(0, 10), description: "NSF RETURNED ITEM FEE", amount: -36 });
  });
  const ret = new Date(start);
  ret.setDate(ret.getDate() + 98);
  out.push({ date: ret.toISOString().slice(0, 10), description: "RETURNED ACH R01 LIBERTAS", amount: 2500 });

  out.sort((a, b) => a.date.localeCompare(b.date));
  // Running balance tuned so a handful of days dip negative.
  let bal = rev * 0.05;
  for (const t of out) {
    bal += t.amount;
    t.balance = Math.round(bal * 100) / 100;
  }
  return out;
}
