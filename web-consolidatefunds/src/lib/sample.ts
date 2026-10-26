import { generateSampleStatement } from "./bank";
import { DEBT_TYPES } from "./config";
import type { AppStatus, Application, Asset, AssetCategory, BusinessInfo, Debt, DebtType, Financials, Frequency, Owner } from "./types";

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const blankOwner = (): Owner => ({
  id: uid(),
  name: "",
  title: "",
  ownership: "",
  email: "",
  phone: "",
  creditRange: "",
  homeStreet: "",
  homeCity: "",
  homeState: "",
  homeZip: "",
  ssn: "",
  dob: "",
});

export const emptyBusiness = (): BusinessInfo => ({
  legalName: "",
  dba: "",
  ein: "",
  street: "",
  city: "",
  state: "",
  zip: "",
  industry: "",
  description: "",
  established: "",
  stateOfIncorporation: "",
  entity: "",
  employees: "",
  website: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  affiliates: "",
  owners: [blankOwner()],
});

export const emptyFinancials = (): Financials => ({
  monthlyRevenue: "",
  annualRevenue: "",
  priorYearRevenue: "",
  twoYearsAgoRevenue: "",
  avgMonthlyDeposits: "",
  grossProfit: "",
  operatingExpenses: "",
  ebitda: "",
  cash: "",
  accountsReceivable: "",
  accountsPayable: "",
  reportedMonthlyDebt: "",
  seasonality: "",
  topCustomerPct: "",
  projectedRevenue: "",
});

export function newDebt(type: DebtType): Debt {
  const cfg = DEBT_TYPES[type];
  return {
    id: uid(),
    type,
    creditor: "",
    frequency: cfg.defaultFrequency,
    structure: cfg.defaultStructure,
    status: "current",
    personalGuarantee: false,
    fields: {},
  };
}

export const newAsset = (category: AssetCategory): Asset => ({ id: uid(), category, fields: {} });

export function refFor(seed: number) {
  return `CF-2026-${String(3000 + (seed % 7000)).padStart(4, "0")}`;
}

export function emptyApplication(): Application {
  const now = new Date().toISOString();
  return {
    id: uid(),
    ref: refFor(Math.floor(Math.random() * 7000)),
    createdAt: now,
    updatedAt: now,
    status: "draft",
    assignedTo: "Unassigned",
    business: emptyBusiness(),
    financials: emptyFinancials(),
    debts: [],
    assets: [],
    bank: { source: "none", institution: "", fileNames: [], transactions: [] },
    documents: [],
    notes: [],
    audit: [],
    docRequests: [],
  };
}

const D = (type: DebtType, creditor: string, payment: number, frequency: Frequency, payoff: number, fields: Record<string, string | number> = {}, extra: Partial<Debt> = {}): Debt => {
  const base = newDebt(type);
  const f: Record<string, string> = { payment: String(payment), payoff: String(payoff) };
  Object.entries(fields).forEach(([k, v]) => (f[k] = String(v)));
  return { ...base, creditor, frequency, fields: f, ...extra };
};
const A = (category: AssetCategory, fields: Record<string, string | number>): Asset => ({
  id: uid(),
  category,
  fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, String(v)])),
});

export const seedFromId = (id: string) => id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);

/** Regenerates demo bank connections (not persisted to keep storage small). */
export function hydrateBank(app: Application): Application {
  if (app.bank.source === "demo_connection" && app.bank.transactions.length === 0) {
    const rev = Number(app.financials.monthlyRevenue) || Number(app.financials.annualRevenue) / 12;
    return { ...app, bank: { ...app.bank, transactions: generateSampleStatement(app.debts, rev, seedFromId(app.id)) } };
  }
  return app;
}

/** The demo applicant used by "Load sample business" — mirrors the approved design. */
export function sampleDraft(): Application {
  const app = emptyApplication();
  app.business = {
    legalName: "Acme Materials LLC",
    dba: "Acme Building Supply",
    ein: "84-2917735",
    street: "4120 Industrial Blvd",
    city: "Phoenix",
    state: "AZ",
    zip: "85043",
    industry: "Wholesale & Distribution",
    description: "Distributor of lumber, drywall and building materials to residential and commercial contractors across the Phoenix metro.",
    established: "2017-04-12",
    stateOfIncorporation: "AZ",
    entity: "LLC",
    employees: "28",
    website: "acmematerials.com",
    contactName: "Jordan Smith",
    contactEmail: "jordan@acmematerials.com",
    contactPhone: "(602) 555-0148",
    affiliates: "Acme Logistics LLC (100% owned by Jordan Smith), which owns the warehouse property",
    owners: [
      { ...blankOwner(), name: "Jordan Smith", title: "Managing Member", ownership: "80", email: "jordan@acmematerials.com", phone: "(602) 555-0148", creditRange: "700–759", homeStreet: "1827 W Palmaire Ave", homeCity: "Phoenix", homeState: "AZ", homeZip: "85021", ssn: "545-31-7890", dob: "04/12/1985" },
      { ...blankOwner(), name: "Dana Ortiz", title: "Member", ownership: "20", email: "dana@acmematerials.com", phone: "(602) 555-0199", creditRange: "650–699", homeStreet: "77 E Monterey Way Apt 4C", homeCity: "Phoenix", homeState: "AZ", homeZip: "85016", ssn: "602-44-1277", dob: "09/03/1990" },
    ],
  };
  app.financials = {
    monthlyRevenue: "95000",
    annualRevenue: "1140000",
    priorYearRevenue: "980000",
    twoYearsAgoRevenue: "870000",
    avgMonthlyDeposits: "98500",
    grossProfit: "684000",
    operatingExpenses: "264000",
    ebitda: "420000",
    cash: "42000",
    accountsReceivable: "186000",
    accountsPayable: "74000",
    reportedMonthlyDebt: "36000",
    seasonality: "Moderately seasonal",
    topCustomerPct: "18",
    projectedRevenue: "1260000",
  };
  app.debts = [
    D("mca", "Pearl Capital", 1000, "business_daily", 61200, {
      purchasePrice: 100000,
      purchasedAmount: 138000,
      factorRate: 1.38,
      specifiedPercentage: 12,
      actualAch: 1000,
      collectionsToDate: 72000,
      remainingReceivables: 66000,
      fundingDate: "2026-03-02",
      reconciliation: "Included, not yet requested",
      defaultStatus: "Performing",
      uccPosition: "1st position",
      earlyPayoffDiscount: 4800,
      collateral: "Blanket lien on receivables",
      liens: "UCC-1 filed 03/2026, AZ SOS",
      firstDebit: "2026-03-16",
      lastDebit: "2026-10-23",
    }, { personalGuarantee: true }),
    D("mca", "Libertas", 2500, "weekly", 88000, {
      purchasePrice: 75000,
      purchasedAmount: 108750,
      factorRate: 1.45,
      specifiedPercentage: 10,
      actualAch: 2500,
      collectionsToDate: 17500,
      remainingReceivables: 91250,
      fundingDate: "2026-08-04",
      reconciliation: "Included, not yet requested",
      defaultStatus: "Performing",
      uccPosition: "2nd position",
      liens: "UCC-1 filed 08/2026",
      firstDebit: "2026-08-17",
      lastDebit: "2026-10-19",
    }, { personalGuarantee: true }),
    D("term_loan", "OnDeck", 4000, "monthly", 118000, {
      originalAmount: 150000,
      fundingDate: "2025-06-15",
      originalRepayment: 192000,
      rate: 22.5,
      balance: 121500,
      paymentsMade: 16,
      paymentsRemaining: 32,
      maturityDate: "2029-06-15",
      prepaymentPenalty: 2400,
      lender_type: "Online lender",
      collateral: "General business assets",
      firstDebit: "2025-07-15",
      lastDebit: "2026-10-15",
    }, { personalGuarantee: true }),
    D("equipment", "CAT Financial", 1500, "monthly", 48500, {
      originalAmount: 72000,
      fundingDate: "2024-09-01",
      rate: 9.9,
      balance: 49800,
      paymentsMade: 25,
      paymentsRemaining: 35,
      equipmentDescription: "CAT 2.5-ton forklift (x2)",
      leaseType: "Equipment loan",
      collateral: "Financed equipment",
    }),
    D("credit_card", "Amex", 1000, "monthly", 31800, { balance: 31800, rate: 27.9, creditLimit: 40000 }, { structure: "revolving" }),
  ];
  app.assets = [
    A("receivables", { totalAR: 186000, aging0: 118000, aging31: 44000, aging61: 14000, aging90: 10000, topCustomerPct: 18, collectibility: "Strong, rarely disputed", factored: "None" }),
    A("real_estate", { address: "4120 Industrial Blvd, Phoenix AZ", propertyType: "Industrial / warehouse", marketValue: 640000, mortgageBalance: 0, otherLiens: 0, ownership: "Affiliated entity", ownershipPct: 100, rentalIncome: 6500 }),
    A("equipment", { description: "Delivery & yard equipment", make: "CAT", model: "GP25N", year: 2023, estimatedValue: 86000, existingFinancing: 48500, ownership: "Financed" }),
    A("vehicle", { make: "Isuzu", model: "NPR-HD Flatbed", year: 2022, mileage: 61000, estimatedValue: 52000, lienBalance: 0, vin: "54DC4W1B5NS801123" }),
    A("inventory", { inventoryType: "Finished goods", costBasis: 210000, liquidationValue: 105000, turnover: 7 }),
  ];
  return app;
}

interface SeedSpec {
  name: string;
  industry: string;
  city: string;
  state: string;
  established: string;
  monthlyRevenue: number;
  growth: number;
  margin: number; // EBITDA margin
  debts: Debt[];
  assets: Asset[];
  status: AppStatus;
  assignedTo: string;
  hoursAgo: number;
  owner: string;
  credit: string;
  bank: boolean;
}

function fromSpec(spec: SeedSpec, i: number): Application {
  const app = emptyApplication();
  const id = `seed-${i}-${spec.name.toLowerCase().replace(/[^a-z]/g, "").slice(0, 10)}`;
  const submitted = new Date(Date.now() - spec.hoursAgo * 3600000).toISOString();
  app.id = id;
  app.ref = refFor(3187 + i * 37);
  app.createdAt = submitted;
  app.updatedAt = submitted;
  app.submittedAt = submitted;
  app.status = spec.status;
  app.assignedTo = spec.assignedTo;
  const annual = spec.monthlyRevenue * 12;
  app.business = {
    ...emptyBusiness(),
    legalName: spec.name,
    industry: spec.industry,
    city: spec.city,
    state: spec.state,
    established: spec.established,
    entity: "LLC",
    employees: String(Math.round(spec.monthlyRevenue / 9000)),
    contactName: spec.owner,
    contactEmail: `${spec.owner.split(" ")[0].toLowerCase()}@${spec.name.toLowerCase().replace(/[^a-z]/g, "").slice(0, 12)}.com`,
    owners: [{ ...blankOwner(), name: spec.owner, title: "Owner", ownership: "100", creditRange: spec.credit }],
  };
  app.financials = {
    ...emptyFinancials(),
    monthlyRevenue: String(spec.monthlyRevenue),
    annualRevenue: String(annual),
    priorYearRevenue: String(Math.round(annual / (1 + spec.growth / 100))),
    grossProfit: String(Math.round(annual * (spec.margin + 0.18))),
    operatingExpenses: String(Math.round(annual * 0.18)),
    ebitda: String(Math.round(annual * spec.margin)),
    cash: String(Math.round(spec.monthlyRevenue * 0.4)),
    accountsReceivable: String(Math.round(spec.monthlyRevenue * 1.2)),
    accountsPayable: String(Math.round(spec.monthlyRevenue * 0.5)),
    seasonality: spec.industry === "Hospitality" || spec.industry === "Construction" ? "Moderately seasonal" : "Stable year-round",
    topCustomerPct: "15",
  };
  app.debts = spec.debts;
  app.assets = spec.assets;
  if (spec.bank) app.bank = { source: "demo_connection", institution: "Chase Business", fileNames: [], transactions: [] };
  app.documents = [
    { id: uid(), name: "Bank statements (6 mo).pdf", size: 2_400_000, category: "bank_statements", uploadedAt: submitted, status: "uploaded", uploadedBy: "applicant" },
    { id: uid(), name: `${spec.debts[0]?.creditor ?? "Funding"} agreement.pdf`, size: 840_000, category: "financing_contract", uploadedAt: submitted, status: "uploaded", uploadedBy: "applicant" },
  ];
  app.audit = [{ id: uid(), at: submitted, actor: spec.owner, action: "Application submitted", detail: `${spec.debts.length} debts, ${spec.assets.length} assets disclosed` }];
  if (spec.assignedTo !== "Unassigned") app.audit.unshift({ id: uid(), at: new Date(Date.parse(submitted) + 1800000).toISOString(), actor: "System", action: `Assigned to ${spec.assignedTo}` });
  if (i === 0) {
    app.notes = [
      {
        id: uid(),
        author: "M. Reyes",
        at: new Date(Date.now() - 2 * 3600000).toISOString(),
        text: "Business shows strong recurring revenue but has undisclosed MCA activity. Request additional bank statements and updated A/R aging. Consider restructuring with extended term.",
      },
    ];
  }
  return hydrateBank(app);
}

const mca = (creditor: string, pay: number, freq: Frequency, purchasePrice: number, factor: number, collected: number) =>
  D("mca", creditor, pay, freq, Math.round((purchasePrice * factor - collected) * 0.94), {
    purchasePrice,
    purchasedAmount: Math.round(purchasePrice * factor),
    factorRate: factor,
    actualAch: pay,
    collectionsToDate: collected,
    remainingReceivables: Math.round(purchasePrice * factor - collected),
    uccPosition: "1st position",
    defaultStatus: "Performing",
  });
const loan = (type: DebtType, creditor: string, pay: number, payoff: number, rate: number, remaining: number) =>
  D(type, creditor, pay, "monthly", payoff, { balance: payoff, rate, paymentsRemaining: remaining });

export function seedApplications(): Application[] {
  const specs: SeedSpec[] = [
    {
      name: "Apex Roofing LLC", industry: "Construction", city: "Austin", state: "TX", established: "2016-05-01", monthlyRevenue: 100000, growth: 24, margin: 0.16,
      debts: [mca("Pearl Capital", 890, "business_daily", 60000, 1.42, 30000), mca("Kapitus", 1750, "weekly", 50000, 1.38, 22000), loan("credit_card", "Amex", 1400, 38000, 26.9, 0), loan("equipment", "Balboa Capital", 2100, 68000, 11.5, 34)],
      assets: [A("receivables", { totalAR: 140000, aging0: 90000, aging31: 30000, aging61: 12000, aging90: 8000 }), A("vehicle", { make: "Ford", model: "F-550", year: 2021, estimatedValue: 48000, lienBalance: 0 })],
      status: "needs_review", assignedTo: "M. Reyes", hoursAgo: 2, owner: "Marcus Hale", credit: "650–699", bank: true,
    },
    {
      name: "Harbor Freight Co", industry: "Retail", city: "San Diego", state: "CA", established: "2012-02-01", monthlyRevenue: 140000, growth: 8, margin: 0.2,
      debts: [loan("term_loan", "Chase Loan", 3200, 96000, 9.5, 32), loan("loc", "Wells Fargo Loan", 1100, 52000, 12, 0), mca("Fundbox", 450, "business_daily", 25000, 1.25, 12000)],
      assets: [A("inventory", { inventoryType: "Finished goods", costBasis: 320000, liquidationValue: 160000 }), A("receivables", { totalAR: 60000, aging0: 52000, aging31: 8000 })],
      status: "needs_review", assignedTo: "S. Patel", hoursAgo: 5, owner: "Elena Brooks", credit: "760+", bank: true,
    },
    {
      name: "Delta Diner Group", industry: "Restaurants & Food Service", city: "Atlanta", state: "GA", established: "2021-09-01", monthlyRevenue: 120000, growth: -6, margin: 0.06,
      debts: [mca("Yellowstone", 1500, "business_daily", 90000, 1.49, 40000), mca("Libertas", 900, "business_daily", 50000, 1.45, 15000), mca("Vox Funding", 2200, "weekly", 45000, 1.5, 10000), D("tax", "IRS", 1800, "monthly", 64000, { taxLien: "Lien filed", taxType: "Payroll (941)" }, { status: "late_30" }), D("judgment", "Sysco Atlanta", 0, "monthly", 22000, { caseNumber: "25-CV-1182" })],
      assets: [A("equipment", { description: "Kitchen equipment (3 locations)", estimatedValue: 140000, existingFinancing: 0 })],
      status: "in_analysis", assignedTo: "M. Reyes", hoursAgo: 26, owner: "Andre Wallace", credit: "600–649", bank: true,
    },
    {
      name: "Maple Tech Solutions", industry: "IT Services", city: "Columbus", state: "OH", established: "2018-03-01", monthlyRevenue: 85000, growth: 12, margin: 0.14,
      debts: [mca("Forward Financing", 1200, "business_daily", 80000, 1.35, 45000), loan("sba", "SBA EIDL", 731, 148000, 3.75, 300), loan("credit_card", "Chase Ink", 900, 26000, 24.9, 0)],
      assets: [A("contracts", { counterparty: "Ohio Health Systems MSA", remainingValue: 420000 }), A("receivables", { totalAR: 110000, aging0: 80000, aging31: 22000, aging61: 8000 })],
      status: "conditional", assignedTo: "L. Chen", hoursAgo: 30, owner: "Priya Natarajan", credit: "700–759", bank: false,
    },
    {
      name: "Riverside Auto Care", industry: "Automotive", city: "Tampa", state: "FL", established: "2010-07-01", monthlyRevenue: 65000, growth: 5, margin: 0.18,
      debts: [loan("term_loan", "OnDeck", 2400, 58000, 19.9, 28), loan("equipment", "De Lage Landen", 900, 24000, 10.5, 30)],
      assets: [A("real_estate", { address: "88 Causeway Blvd, Tampa FL", propertyType: "Retail", marketValue: 820000, mortgageBalance: 310000 }), A("equipment", { description: "Lifts and diagnostic equipment", estimatedValue: 75000, existingFinancing: 24000 })],
      status: "approved", assignedTo: "C. Alvarez", hoursAgo: 50, owner: "Tom Ferreira", credit: "700–759", bank: true,
    },
    {
      name: "Summit Medical Group", industry: "Healthcare", city: "Denver", state: "CO", established: "2015-01-01", monthlyRevenue: 260000, growth: 3, margin: 0.12,
      debts: [mca("Credibly", 2800, "business_daily", 180000, 1.33, 90000), loan("term_loan", "Biz2Credit", 6400, 190000, 21, 36), D("factoring", "Medical Receivables Partners", 0, "variable", 120000, { variableMonthlyAvg: 6200, advanceRate: 80, factoringFee: 2.5 }), loan("loc", "US Bank", 2100, 98000, 11.5, 0)],
      assets: [A("receivables", { totalAR: 410000, aging0: 220000, aging31: 110000, aging61: 50000, aging90: 30000, factored: "Some invoices factored", existingAdvance: 120000 }), A("equipment", { description: "Imaging equipment", estimatedValue: 260000, existingFinancing: 0 })],
      status: "in_analysis", assignedTo: "D. Kim", hoursAgo: 54, owner: "Dr. Rachel Moss", credit: "760+", bank: false,
    },
    {
      name: "Cedar Lane Properties", industry: "Real Estate", city: "Nashville", state: "TN", established: "2014-06-01", monthlyRevenue: 72000, growth: 9, margin: 0.42,
      debts: [loan("mortgage", "Pinnacle Bank", 9800, 1240000, 6.9, 240), D("hard_money", "Patch Lending", 4600, "monthly", 375000, { balance: 375000, rate: 12.5, balloonAmount: 375000, propertyValue: 610000 }, { structure: "balloon" })],
      assets: [A("real_estate", { address: "1200 Cedar Ln, Nashville TN", propertyType: "Multifamily", marketValue: 2100000, mortgageBalance: 1240000 }), A("real_estate", { address: "44 Belmont Ave", propertyType: "Mixed use", marketValue: 610000, mortgageBalance: 375000 })],
      status: "needs_review", assignedTo: "M. Reyes", hoursAgo: 74, owner: "Grace Holloway", credit: "700–759", bank: false,
    },
    {
      name: "Brightside Manufacturing", industry: "Manufacturing", city: "Detroit", state: "MI", established: "2019-10-01", monthlyRevenue: 210000, growth: -14, margin: 0.03,
      debts: [mca("CAN Capital", 3100, "business_daily", 200000, 1.4, 80000), mca("Mulligan Funding", 2600, "weekly", 90000, 1.45, 20000), mca("LG Funding", 1900, "business_daily", 60000, 1.49, 10000), loan("equipment", "CAT Financial", 5400, 220000, 10.9, 44), D("tax", "Michigan Dept of Treasury", 2500, "monthly", 88000, { taxLien: "Lien filed" }, { status: "late_60" })],
      assets: [A("equipment", { description: "CNC machining centers", estimatedValue: 540000, existingFinancing: 220000 }), A("inventory", { inventoryType: "Raw materials", costBasis: 180000, liquidationValue: 72000 })],
      status: "declined", assignedTo: "J. Wilson", hoursAgo: 78, owner: "Victor Kowalski", credit: "600–649", bank: true,
    },
    {
      name: "Lakeside Hospitality", industry: "Hospitality", city: "Lake Geneva", state: "WI", established: "2017-05-01", monthlyRevenue: 118000, growth: 11, margin: 0.15,
      debts: [mca("Rapid Finance", 1300, "business_daily", 70000, 1.36, 30000), loan("sba", "Huntington SBA 7(a)", 4100, 410000, 8.25, 168), loan("credit_card", "Amex", 1600, 44000, 25.9, 0)],
      assets: [A("real_estate", { address: "N2140 Lakeshore Dr", propertyType: "Mixed use", marketValue: 1350000, mortgageBalance: 410000, ownership: "The business" })],
      status: "needs_review", assignedTo: "S. Patel", hoursAgo: 98, owner: "Nora Lindqvist", credit: "700–759", bank: true,
    },
    {
      name: "Orion Logistics", industry: "Transportation & Logistics", city: "Memphis", state: "TN", established: "2013-08-01", monthlyRevenue: 330000, growth: 18, margin: 0.11,
      debts: [loan("vehicle", "Ford Credit", 8900, 310000, 8.9, 40), mca("National Funding", 2400, "weekly", 120000, 1.3, 50000), D("factoring", "Triumph Business Capital", 0, "variable", 160000, { variableMonthlyAvg: 9800, advanceRate: 90, factoringFee: 2 })],
      assets: [A("vehicle", { make: "Freightliner", model: "Cascadia (x12)", year: 2022, estimatedValue: 1150000, lienBalance: 310000 }), A("receivables", { totalAR: 520000, aging0: 380000, aging31: 110000, aging61: 20000, aging90: 10000, factored: "Some invoices factored", existingAdvance: 160000 })],
      status: "funded", assignedTo: "L. Chen", hoursAgo: 102, owner: "Darnell Price", credit: "700–759", bank: false,
    },
    {
      name: "Golden Crust Bakery", industry: "Restaurants & Food Service", city: "Portland", state: "OR", established: "2022-03-01", monthlyRevenue: 48000, growth: 31, margin: 0.09,
      debts: [mca("Square Capital", 0, "variable", 30000, 1.16, 12000), mca("Shopify Capital", 0, "variable", 20000, 1.13, 4000)],
      assets: [A("equipment", { description: "Deck ovens & mixers", estimatedValue: 64000 })],
      status: "needs_review", assignedTo: "Unassigned", hoursAgo: 120, owner: "Sofia Marchetti", credit: "650–699", bank: true,
    },
    {
      name: "Northline Electric", industry: "Construction", city: "Minneapolis", state: "MN", established: "2009-11-01", monthlyRevenue: 175000, growth: 6, margin: 0.13,
      debts: [loan("term_loan", "Bluevine", 5200, 140000, 17.5, 30), mca("Everest Business", 1650, "business_daily", 90000, 1.39, 50000), loan("loc", "Bremer Bank", 1800, 88000, 10.25, 0)],
      assets: [A("receivables", { totalAR: 290000, aging0: 170000, aging31: 80000, aging61: 25000, aging90: 15000 }), A("vehicle", { make: "Ram", model: "ProMaster fleet (x6)", year: 2021, estimatedValue: 150000, lienBalance: 0 })],
      status: "in_analysis", assignedTo: "C. Alvarez", hoursAgo: 140, owner: "Erik Johansson", credit: "700–759", bank: true,
    },
  ];
  // Square/Shopify capital are variable remittance — give them monthly averages.
  specs[10].debts.forEach((d, i) => (d.fields.variableMonthlyAvg = i === 0 ? "3800" : "2100"));
  return specs.map(fromSpec);
}
