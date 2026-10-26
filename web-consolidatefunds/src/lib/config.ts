import type {
  AppStatus,
  AssetCategory,
  DebtType,
  DocCategory,
  FactorKey,
  Frequency,
  PaymentStatus,
  PaymentStructure,
  UnderwritingSettings,
} from "./types";

export type FieldKind = "money" | "number" | "percent" | "factor" | "text" | "date" | "select" | "textarea";

export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  options?: { value: string; label: string }[];
  hint?: string;
  placeholder?: string;
  wide?: boolean;
}

const opts = (...values: string[]) => values.map((v) => ({ value: v, label: v }));

export const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: "daily", label: "Daily (calendar days)" },
  { value: "business_daily", label: "Every business day" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "semimonthly", label: "Semimonthly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annually", label: "Annually" },
  { value: "variable", label: "Variable" },
  { value: "custom", label: "Custom schedule" },
];

export const FREQ_SHORT: Record<Frequency, string> = {
  daily: "Daily",
  business_daily: "Business Daily",
  weekly: "Weekly",
  biweekly: "Biweekly",
  semimonthly: "Semimonthly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  annually: "Annually",
  variable: "Variable",
  custom: "Custom",
};

export const STRUCTURES: { value: PaymentStructure; label: string }[] = [
  { value: "fixed", label: "Fixed payments" },
  { value: "variable", label: "Variable payments" },
  { value: "revolving", label: "Revolving balance" },
  { value: "balloon", label: "Balloon payment" },
];

export const PAYMENT_STATUSES: { value: PaymentStatus; label: string }[] = [
  { value: "current", label: "Current" },
  { value: "late_30", label: "30 days late" },
  { value: "late_60", label: "60 days late" },
  { value: "late_90", label: "90+ days late" },
  { value: "default", label: "In default" },
  { value: "modified", label: "Modified / restructured" },
  { value: "negotiating", label: "Settlement in negotiation" },
];

/** Common fields every debt can use. Debt types can relabel or hide them. */
export const COMMON_DEBT_FIELDS: FieldDef[] = [
  { key: "originalAmount", label: "Original funding amount", kind: "money" },
  { key: "fundingDate", label: "Funding date", kind: "date" },
  { key: "originalRepayment", label: "Original repayment amount", kind: "money", hint: "Total of all scheduled payments" },
  { key: "rate", label: "Interest rate (APR)", kind: "percent" },
  { key: "balance", label: "Current outstanding balance", kind: "money" },
  { key: "payoff", label: "Current payoff amount", kind: "money", hint: "From a payoff letter if available" },
  { key: "payment", label: "Payment amount", kind: "money" },
  { key: "paymentsMade", label: "Payments made", kind: "number" },
  { key: "paymentsRemaining", label: "Payments remaining", kind: "number" },
  { key: "maturityDate", label: "Contractual maturity date", kind: "date" },
  { key: "earlyPayoffDiscount", label: "Early payoff discount", kind: "money" },
  { key: "prepaymentPenalty", label: "Prepayment penalty", kind: "money" },
  { key: "collateral", label: "Collateral securing the obligation", kind: "text", placeholder: "e.g. Blanket lien, equipment, real estate" },
  { key: "liens", label: "Existing liens / UCC filings", kind: "text", placeholder: "e.g. UCC-1 filed 03/2025, CA SOS" },
  { key: "firstDebit", label: "First debit date", kind: "date", hint: "When debits started" },
  { key: "lastDebit", label: "Most recent debit date", kind: "date", hint: "As it appears on the bank statement" },
];

export type DebtFamily = "mca" | "installment" | "revolving" | "real_estate" | "factoring" | "obligation";

export interface DebtTypeConfig {
  label: string;
  badge: string;
  tone: string; // tailwind classes for badge
  family: DebtFamily;
  defaultFrequency: Frequency;
  defaultStructure: PaymentStructure;
  hide?: string[];
  relabel?: Record<string, string>;
  extra: FieldDef[];
  intro: string;
}

const UCC_POSITIONS = opts("1st position", "2nd position", "3rd position", "4th+ position", "No UCC filed", "Unknown");

export const DEBT_TYPES: Record<DebtType, DebtTypeConfig> = {
  mca: {
    label: "Merchant Cash Advance",
    badge: "MCA",
    tone: "bg-[#5C4A0A] text-[#F5D46B]",
    family: "mca",
    defaultFrequency: "business_daily",
    defaultStructure: "fixed",
    hide: ["originalAmount", "originalRepayment", "rate", "balance"],
    relabel: {
      payment: "Estimated payment (specified amount)",
      payoff: "Current payoff / settlement amount",
      paymentsRemaining: "Estimated payments remaining",
    },
    intro: "An MCA is a purchase of future receivables, not a loan. We track purchased receivables separately from principal and interest.",
    extra: [
      { key: "purchasePrice", label: "Purchase price (funded amount)", kind: "money" },
      { key: "purchasedAmount", label: "Purchased receivables amount", kind: "money" },
      { key: "factorRate", label: "Factor rate (not APR)", kind: "factor", hint: "Auto-calculated from purchased ÷ purchase price when blank" },
      { key: "specifiedPercentage", label: "Specified % of receivables", kind: "percent" },
      { key: "actualAch", label: "Actual ACH withdrawal amount", kind: "money", hint: "What actually leaves your account" },
      { key: "collectionsToDate", label: "Total collections to date", kind: "money" },
      { key: "remainingReceivables", label: "Remaining purchased receivables", kind: "money" },
      {
        key: "reconciliation",
        label: "Reconciliation provision",
        kind: "select",
        options: opts("Included — not yet requested", "Included — requested", "Not included", "Unknown"),
      },
      {
        key: "defaultStatus",
        label: "Default status",
        kind: "select",
        options: opts("Performing", "Missed payments", "Declared default", "Confession of judgment filed", "In collections"),
      },
      { key: "uccPosition", label: "UCC position", kind: "select", options: UCC_POSITIONS },
    ],
  },
  term_loan: {
    label: "Traditional Business Loan",
    badge: "LOAN",
    tone: "bg-[#14335C] text-[#8DB8F5]",
    family: "installment",
    defaultFrequency: "monthly",
    defaultStructure: "fixed",
    intro: "Interest-bearing term debt with scheduled principal and interest.",
    extra: [{ key: "lender_type", label: "Lender type", kind: "select", options: opts("Bank", "Credit union", "Online lender", "Other") }],
  },
  sba: {
    label: "SBA Loan",
    badge: "SBA",
    tone: "bg-[#14335C] text-[#8DB8F5]",
    family: "installment",
    defaultFrequency: "monthly",
    defaultStructure: "fixed",
    intro: "Government-guaranteed financing. SBA loans are usually the cheapest debt and rarely worth refinancing.",
    extra: [
      { key: "sbaProgram", label: "SBA program", kind: "select", options: opts("7(a)", "504", "EIDL", "Express", "Microloan") },
      { key: "guaranteePct", label: "SBA guarantee %", kind: "percent" },
    ],
  },
  loc: {
    label: "Business Line of Credit",
    badge: "LOC",
    tone: "bg-[#1E3B36] text-[#7FD8C6]",
    family: "revolving",
    defaultFrequency: "monthly",
    defaultStructure: "revolving",
    relabel: { balance: "Current drawn balance", payment: "Current monthly payment", originalAmount: "Original credit limit" },
    hide: ["originalRepayment", "paymentsMade", "paymentsRemaining"],
    intro: "Revolving credit. We use the drawn balance and current payment.",
    extra: [
      { key: "creditLimit", label: "Current credit limit", kind: "money" },
      { key: "renewalDate", label: "Renewal / draw period end", kind: "date" },
    ],
  },
  credit_card: {
    label: "Business Credit Card",
    badge: "CARD",
    tone: "bg-[#2E2A4A] text-[#B7AEF5]",
    family: "revolving",
    defaultFrequency: "monthly",
    defaultStructure: "revolving",
    relabel: { payment: "Minimum monthly payment", creditor: "Card issuer" },
    hide: ["originalAmount", "originalRepayment", "fundingDate", "paymentsMade", "paymentsRemaining", "maturityDate", "earlyPayoffDiscount", "prepaymentPenalty"],
    intro: "Revolving card balances, including promotional rates.",
    extra: [
      { key: "creditLimit", label: "Credit limit", kind: "money" },
      { key: "promoRate", label: "Promotional rate (if any)", kind: "percent" },
      { key: "promoEnds", label: "Promotion ends", kind: "date" },
    ],
  },
  equipment: {
    label: "Equipment Financing",
    badge: "EQUIP",
    tone: "bg-[#3A2B1A] text-[#F0B57A]",
    family: "installment",
    defaultFrequency: "monthly",
    defaultStructure: "fixed",
    intro: "Equipment loans and leases, including end-of-term buyouts.",
    extra: [
      { key: "equipmentDescription", label: "Equipment financed", kind: "text", wide: true },
      { key: "leaseType", label: "Agreement type", kind: "select", options: opts("Equipment loan", "$1 buyout lease", "FMV lease", "10% PUT lease", "TRAC lease") },
      { key: "buyoutAmount", label: "End-of-term buyout", kind: "money" },
    ],
  },
  vehicle: {
    label: "Vehicle Financing",
    badge: "AUTO",
    tone: "bg-[#3A2B1A] text-[#F0B57A]",
    family: "installment",
    defaultFrequency: "monthly",
    defaultStructure: "fixed",
    intro: "Commercial vehicle loans and leases.",
    extra: [
      { key: "vehicle", label: "Vehicle (year, make, model)", kind: "text" },
      { key: "vin", label: "VIN", kind: "text" },
    ],
  },
  mortgage: {
    label: "Commercial Mortgage",
    badge: "MORT",
    tone: "bg-[#1A3A24] text-[#7FDFA0]",
    family: "real_estate",
    defaultFrequency: "monthly",
    defaultStructure: "fixed",
    intro: "Real estate secured debt. Property value and liens determine available equity.",
    extra: [
      { key: "propertyAddress", label: "Property address", kind: "text", wide: true },
      { key: "propertyType", label: "Property type", kind: "select", options: opts("Office", "Retail", "Industrial / warehouse", "Multifamily", "Mixed use", "Owner-occupied special purpose", "Land") },
      { key: "propertyValue", label: "Estimated property value", kind: "money" },
      { key: "lienPosition", label: "Lien position", kind: "select", options: opts("1st lien", "2nd lien", "3rd lien") },
      { key: "otherLiens", label: "Other liens on property", kind: "money" },
      { key: "rateType", label: "Rate type", kind: "select", options: opts("Fixed", "Adjustable", "Interest-only") },
    ],
  },
  hard_money: {
    label: "Hard Money Loan",
    badge: "HARD",
    tone: "bg-[#4A1F1F] text-[#F5A39C]",
    family: "real_estate",
    defaultFrequency: "monthly",
    defaultStructure: "balloon",
    intro: "Short-term asset-based debt, usually interest-only with a balloon.",
    extra: [
      { key: "propertyAddress", label: "Collateral property", kind: "text", wide: true },
      { key: "propertyValue", label: "Estimated property value", kind: "money" },
      { key: "points", label: "Points paid", kind: "percent" },
    ],
  },
  factoring: {
    label: "Invoice Factoring",
    badge: "FACT",
    tone: "bg-[#1E3B36] text-[#7FD8C6]",
    family: "factoring",
    defaultFrequency: "variable",
    defaultStructure: "variable",
    hide: ["originalRepayment", "rate", "paymentsMade", "paymentsRemaining", "maturityDate"],
    relabel: { balance: "Outstanding advanced amount", payment: "Typical fee per payment" },
    intro: "Receivables sold to a factor. The cost is the discount fee on each invoice.",
    extra: [
      { key: "advanceRate", label: "Advance rate", kind: "percent" },
      { key: "factoringFee", label: "Factoring fee (per 30 days)", kind: "percent" },
      { key: "monthlyVolume", label: "Monthly invoices factored", kind: "money" },
      { key: "recourse", label: "Recourse", kind: "select", options: opts("Recourse", "Non-recourse") },
    ],
  },
  rbf: {
    label: "Revenue-Based Financing",
    badge: "RBF",
    tone: "bg-[#5C4A0A] text-[#F5D46B]",
    family: "mca",
    defaultFrequency: "variable",
    defaultStructure: "variable",
    hide: ["rate"],
    relabel: { originalAmount: "Advance amount", originalRepayment: "Total repayment amount" },
    intro: "Repaid as a share of revenue. Cost is a fixed multiple, not an APR.",
    extra: [
      { key: "factorRate", label: "Repayment multiple (not APR)", kind: "factor" },
      { key: "specifiedPercentage", label: "Revenue share %", kind: "percent" },
      { key: "collectionsToDate", label: "Total repaid to date", kind: "money" },
      { key: "remainingReceivables", label: "Remaining repayment amount", kind: "money" },
    ],
  },
  tax: {
    label: "Tax Debt",
    badge: "TAX",
    tone: "bg-[#4A1F1F] text-[#F5A39C]",
    family: "obligation",
    defaultFrequency: "monthly",
    defaultStructure: "fixed",
    hide: ["originalRepayment", "fundingDate", "earlyPayoffDiscount", "prepaymentPenalty", "collateral"],
    relabel: { creditor: "Taxing agency", originalAmount: "Original assessed amount", payment: "Installment payment" },
    intro: "Federal, state or payroll tax liabilities and installment agreements.",
    extra: [
      { key: "taxType", label: "Tax type", kind: "select", options: opts("Payroll (941)", "Income", "Sales / use", "Property", "Other") },
      { key: "taxPeriods", label: "Tax periods", kind: "text", placeholder: "e.g. Q2–Q4 2025" },
      { key: "installmentAgreement", label: "Installment agreement", kind: "select", options: opts("Active agreement", "Pending", "None") },
      { key: "taxLien", label: "Tax lien", kind: "select", options: opts("Lien filed", "No lien filed", "Unknown") },
    ],
  },
  vendor: {
    label: "Vendor Debt",
    badge: "VEND",
    tone: "bg-[#2A2D33] text-[#C9CCD1]",
    family: "obligation",
    defaultFrequency: "monthly",
    defaultStructure: "fixed",
    hide: ["rate", "originalRepayment"],
    relabel: { creditor: "Vendor name" },
    intro: "Past-due trade payables or vendor payment plans.",
    extra: [
      { key: "vendorTerms", label: "Normal terms", kind: "select", options: opts("Net 15", "Net 30", "Net 60", "Net 90", "COD") },
      { key: "pastDue", label: "Past-due amount", kind: "money" },
    ],
  },
  private: {
    label: "Private Loan",
    badge: "PRIV",
    tone: "bg-[#2A2D33] text-[#C9CCD1]",
    family: "installment",
    defaultFrequency: "monthly",
    defaultStructure: "fixed",
    intro: "Loans from individuals, family, investors or shareholders.",
    extra: [{ key: "relationship", label: "Relationship to lender", kind: "select", options: opts("Shareholder", "Family / friend", "Private investor", "Former owner (seller note)") }],
  },
  judgment: {
    label: "Judgment or Settlement",
    badge: "JDGT",
    tone: "bg-[#4A1F1F] text-[#F5A39C]",
    family: "obligation",
    defaultFrequency: "monthly",
    defaultStructure: "fixed",
    hide: ["rate", "fundingDate", "originalRepayment", "earlyPayoffDiscount", "prepaymentPenalty"],
    relabel: { creditor: "Plaintiff / creditor", originalAmount: "Judgment / settlement amount", payment: "Settlement payment" },
    intro: "Court judgments, confessions of judgment and negotiated settlements.",
    extra: [
      { key: "caseNumber", label: "Case number", kind: "text" },
      { key: "court", label: "Court / jurisdiction", kind: "text" },
      { key: "levyRisk", label: "Levy or garnishment", kind: "select", options: opts("None", "Threatened", "Active levy", "Bank account frozen") },
    ],
  },
  other: {
    label: "Other Financial Obligation",
    badge: "OTHER",
    tone: "bg-[#2A2D33] text-[#C9CCD1]",
    family: "obligation",
    defaultFrequency: "monthly",
    defaultStructure: "fixed",
    intro: "Any other obligation affecting cash flow.",
    extra: [{ key: "description", label: "Describe the obligation", kind: "text", wide: true }],
  },
};

export const DEBT_TYPE_ORDER: DebtType[] = [
  "mca",
  "term_loan",
  "sba",
  "loc",
  "credit_card",
  "equipment",
  "vehicle",
  "mortgage",
  "hard_money",
  "factoring",
  "rbf",
  "tax",
  "vendor",
  "private",
  "judgment",
  "other",
];

export interface AssetConfig {
  label: string;
  description: string;
  fields: FieldDef[];
  valueKeys: string[]; // first non-zero wins
  lienKeys: string[]; // summed
}

export const ASSET_TYPES: Record<AssetCategory, AssetConfig> = {
  real_estate: {
    label: "Real Estate",
    description: "Owned commercial or investment property",
    valueKeys: ["marketValue"],
    lienKeys: ["mortgageBalance", "otherLiens"],
    fields: [
      { key: "address", label: "Property address", kind: "text", wide: true },
      { key: "propertyType", label: "Property type", kind: "select", options: opts("Office", "Retail", "Industrial / warehouse", "Multifamily", "Mixed use", "Residential (owner)", "Land") },
      { key: "marketValue", label: "Estimated market value", kind: "money" },
      { key: "mortgageBalance", label: "Mortgage balance(s)", kind: "money" },
      { key: "otherLiens", label: "Other liens", kind: "money" },
      { key: "rentalIncome", label: "Monthly rental income", kind: "money" },
      { key: "ownership", label: "Owned by", kind: "select", options: opts("The business", "Owner personally", "Affiliated entity") },
      { key: "ownershipPct", label: "Ownership %", kind: "percent" },
    ],
  },
  receivables: {
    label: "Accounts Receivable",
    description: "Invoices owed by your customers",
    valueKeys: ["eligible", "totalAR"],
    lienKeys: ["existingAdvance"],
    fields: [
      { key: "totalAR", label: "Total outstanding receivables", kind: "money" },
      { key: "aging0", label: "Current – 30 days", kind: "money" },
      { key: "aging31", label: "31 – 60 days", kind: "money" },
      { key: "aging61", label: "61 – 90 days", kind: "money" },
      { key: "aging90", label: "Over 90 days", kind: "money" },
      { key: "topCustomerPct", label: "Largest customer % of AR", kind: "percent" },
      { key: "collectibility", label: "Collectibility", kind: "select", options: opts("Strong — rarely disputed", "Average", "Frequent disputes / slow pay") },
      { key: "factored", label: "Existing factoring arrangement", kind: "select", options: opts("None", "Some invoices factored", "All invoices factored") },
      { key: "existingAdvance", label: "Amount currently advanced / assigned", kind: "money" },
    ],
  },
  equipment: {
    label: "Equipment",
    description: "Machinery, tools and business equipment",
    valueKeys: ["estimatedValue"],
    lienKeys: ["existingFinancing"],
    fields: [
      { key: "description", label: "Equipment description", kind: "text", wide: true },
      { key: "make", label: "Make", kind: "text" },
      { key: "model", label: "Model", kind: "text" },
      { key: "year", label: "Year", kind: "number" },
      { key: "estimatedValue", label: "Estimated value", kind: "money" },
      { key: "existingFinancing", label: "Existing financing balance", kind: "money" },
      { key: "ownership", label: "Ownership status", kind: "select", options: opts("Owned free and clear", "Financed", "Leased") },
    ],
  },
  vehicle: {
    label: "Vehicles",
    description: "Trucks, vans, trailers and fleet",
    valueKeys: ["estimatedValue"],
    lienKeys: ["lienBalance"],
    fields: [
      { key: "vin", label: "VIN", kind: "text" },
      { key: "make", label: "Make", kind: "text" },
      { key: "model", label: "Model", kind: "text" },
      { key: "year", label: "Year", kind: "number" },
      { key: "mileage", label: "Mileage", kind: "number" },
      { key: "estimatedValue", label: "Estimated value", kind: "money" },
      { key: "lienBalance", label: "Existing lien balance", kind: "money" },
    ],
  },
  inventory: {
    label: "Inventory",
    description: "Raw materials, work in progress and finished goods",
    valueKeys: ["liquidationValue"],
    lienKeys: [],
    fields: [
      { key: "inventoryType", label: "Inventory type", kind: "select", options: opts("Finished goods", "Raw materials", "Work in progress", "Mixed") },
      { key: "costBasis", label: "Cost basis", kind: "money" },
      { key: "liquidationValue", label: "Estimated liquidation value", kind: "money" },
      { key: "turnover", label: "Inventory turnover (times / year)", kind: "number" },
    ],
  },
  purchase_orders: {
    label: "Purchase Orders",
    description: "Confirmed orders not yet fulfilled",
    valueKeys: ["poValue"],
    lienKeys: [],
    fields: [
      { key: "customer", label: "Customer", kind: "text" },
      { key: "poValue", label: "Purchase order value", kind: "money" },
      { key: "deliveryDate", label: "Expected delivery", kind: "date" },
    ],
  },
  contracts: {
    label: "Business Contracts",
    description: "Recurring or long-term customer contracts",
    valueKeys: ["remainingValue"],
    lienKeys: [],
    fields: [
      { key: "counterparty", label: "Counterparty", kind: "text" },
      { key: "remainingValue", label: "Remaining contract value", kind: "money" },
      { key: "endDate", label: "Contract end date", kind: "date" },
    ],
  },
  cash: {
    label: "Cash Deposits",
    description: "Cash, CDs and money market balances",
    valueKeys: ["amount"],
    lienKeys: ["pledged"],
    fields: [
      { key: "institution", label: "Institution", kind: "text" },
      { key: "amount", label: "Balance", kind: "money" },
      { key: "pledged", label: "Amount already pledged", kind: "money" },
    ],
  },
  securities: {
    label: "Marketable Securities",
    description: "Stocks, bonds and brokerage accounts",
    valueKeys: ["marketValue"],
    lienKeys: ["pledged"],
    fields: [
      { key: "description", label: "Account / holdings", kind: "text", wide: true },
      { key: "marketValue", label: "Market value", kind: "money" },
      { key: "pledged", label: "Amount already pledged", kind: "money" },
    ],
  },
  ip: {
    label: "Intellectual Property",
    description: "Patents, trademarks, software and licenses",
    valueKeys: ["estimatedValue"],
    lienKeys: [],
    fields: [
      { key: "description", label: "Description", kind: "text", wide: true },
      { key: "estimatedValue", label: "Estimated value", kind: "money" },
      { key: "annualRoyalties", label: "Annual licensing / royalty income", kind: "money" },
    ],
  },
  other: {
    label: "Other Assets",
    description: "Anything else that could support financing",
    valueKeys: ["estimatedValue"],
    lienKeys: ["liens"],
    fields: [
      { key: "description", label: "Description", kind: "text", wide: true },
      { key: "estimatedValue", label: "Estimated value", kind: "money" },
      { key: "liens", label: "Existing liens", kind: "money" },
    ],
  },
};

export const ASSET_ORDER: AssetCategory[] = [
  "real_estate",
  "receivables",
  "equipment",
  "vehicle",
  "inventory",
  "purchase_orders",
  "contracts",
  "cash",
  "securities",
  "ip",
  "other",
];

export const DOC_CATEGORIES: { value: DocCategory; label: string }[] = [
  { value: "bank_statements", label: "Business bank statements" },
  { value: "financing_contract", label: "Existing financing contract" },
  { value: "payoff_letter", label: "Payoff letter" },
  { value: "tax_return", label: "Business tax return" },
  { value: "pnl", label: "Profit & loss statement" },
  { value: "balance_sheet", label: "Balance sheet" },
  { value: "ar_aging", label: "A/R aging report" },
  { value: "ap_report", label: "A/P report" },
  { value: "property", label: "Property documents" },
  { value: "equipment_schedule", label: "Equipment schedule" },
  { value: "identification", label: "ID & ownership documents" },
  { value: "other", label: "Other underwriting document" },
];

export const REQUIRED_DOCS: DocCategory[] = ["bank_statements", "financing_contract", "tax_return", "identification"];

export const STATUS_META: Record<AppStatus, { label: string; tone: string }> = {
  draft: { label: "Draft", tone: "text-muted-foreground border-border" },
  needs_review: { label: "Needs Review", tone: "text-primary border-primary/40" },
  in_analysis: { label: "In Analysis", tone: "text-[#8DB8F5] border-[#8DB8F5]/40" },
  conditional: { label: "Conditional", tone: "text-warning border-warning/40" },
  approved: { label: "Approved", tone: "text-success border-success/40" },
  declined: { label: "Declined", tone: "text-danger border-danger/40" },
  funded: { label: "Funded", tone: "text-success border-success/40" },
};

export const UNDERWRITERS = ["M. Reyes", "S. Patel", "L. Chen", "C. Alvarez", "D. Kim", "J. Wilson", "Unassigned"];

export const ENTITY_TYPES = ["LLC", "S-Corp", "C-Corp", "Partnership", "Sole Proprietorship", "Non-profit"];

export const INDUSTRIES = [
  "Construction",
  "Restaurants & Food Service",
  "Retail",
  "Healthcare",
  "Transportation & Logistics",
  "Manufacturing",
  "Professional Services",
  "IT Services",
  "Automotive",
  "Real Estate",
  "Hospitality",
  "Wholesale & Distribution",
  "Agriculture",
  "Other",
];

export const US_STATES = "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(" ");

export const FACTOR_LABELS: Record<FactorKey, string> = {
  revenue: "Revenue & cash-flow stability",
  burden: "Existing debt burden",
  dscr: "Repayment capacity (DSCR)",
  banking: "Banking performance",
  collateral: "Available collateral",
  history: "Credit & payment history",
  operating: "Operating history",
  legal: "Liens & legal exposure",
};

export const DEFAULT_SETTINGS: UnderwritingSettings = {
  advanceRates: {
    real_estate: 0.75,
    receivables: 0.8,
    equipment: 0.5,
    vehicle: 0.6,
    inventory: 0.5,
    purchase_orders: 0.3,
    contracts: 0.2,
    cash: 1,
    securities: 0.7,
    ip: 0.1,
    other: 0.25,
  },
  thresholds: { green: 70, yellow: 50 },
  targetDscr: 1.25,
  excludeHolidays: true,
  originationFeePct: 3,
  terms: {
    full: { rate: 14, months: 48 },
    mca: { rate: 18, months: 36 },
    asset: { rate: 11, months: 60 },
    partial: { rate: 15, months: 48 },
    hybridRemainder: { rate: 17, months: 36 },
  },
  weights: {
    revenue: 15,
    burden: 15,
    dscr: 20,
    banking: 15,
    collateral: 10,
    history: 10,
    operating: 5,
    legal: 10,
  },
};
