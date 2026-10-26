export type DebtType =
  | "mca"
  | "term_loan"
  | "sba"
  | "loc"
  | "credit_card"
  | "equipment"
  | "vehicle"
  | "mortgage"
  | "hard_money"
  | "factoring"
  | "rbf"
  | "tax"
  | "vendor"
  | "private"
  | "judgment"
  | "other";

export type Frequency =
  | "daily"
  | "business_daily"
  | "weekly"
  | "biweekly"
  | "semimonthly"
  | "monthly"
  | "quarterly"
  | "annually"
  | "variable"
  | "custom";

export type PaymentStructure = "fixed" | "variable" | "revolving" | "balloon";

export type PaymentStatus = "current" | "late_30" | "late_60" | "late_90" | "default" | "modified" | "negotiating";

export interface Debt {
  id: string;
  type: DebtType;
  creditor: string;
  frequency: Frequency;
  structure: PaymentStructure;
  status: PaymentStatus;
  personalGuarantee: boolean;
  /** All numeric / text inputs, stored as strings exactly as typed. */
  fields: Record<string, string>;
}

export type AssetCategory =
  | "real_estate"
  | "receivables"
  | "equipment"
  | "vehicle"
  | "inventory"
  | "purchase_orders"
  | "contracts"
  | "cash"
  | "securities"
  | "ip"
  | "other";

export interface Asset {
  id: string;
  category: AssetCategory;
  fields: Record<string, string>;
}

export interface Owner {
  id: string;
  name: string;
  title: string;
  ownership: string;
  email: string;
  phone: string;
  creditRange: string;
  homeStreet: string;
  homeCity: string;
  homeState: string;
  homeZip: string;
  ssn: string;
  dob: string;
}

export interface BusinessInfo {
  legalName: string;
  dba: string;
  ein: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  industry: string;
  description: string;
  established: string;
  stateOfIncorporation: string;
  entity: string;
  employees: string;
  website: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  affiliates: string;
  owners: Owner[];
}

export interface Financials {
  monthlyRevenue: string;
  annualRevenue: string;
  priorYearRevenue: string;
  twoYearsAgoRevenue: string;
  avgMonthlyDeposits: string;
  grossProfit: string;
  operatingExpenses: string;
  ebitda: string;
  cash: string;
  accountsReceivable: string;
  accountsPayable: string;
  reportedMonthlyDebt: string;
  seasonality: string;
  topCustomerPct: string;
  projectedRevenue: string;
}

export interface Transaction {
  date: string; // YYYY-MM-DD
  description: string;
  amount: number; // + credit, - debit
  balance?: number;
}

export interface BankData {
  source: "none" | "demo_connection" | "upload";
  institution: string;
  fileNames: string[];
  transactions: Transaction[];
}

export type DocCategory =
  | "bank_statements"
  | "financing_contract"
  | "payoff_letter"
  | "tax_return"
  | "pnl"
  | "balance_sheet"
  | "ar_aging"
  | "ap_report"
  | "property"
  | "equipment_schedule"
  | "identification"
  | "other";

export interface DocumentFile {
  id: string;
  name: string;
  size: number;
  category: DocCategory;
  uploadedAt: string;
  status: "uploaded" | "extracted" | "verified";
  extracted?: Record<string, string>;
  linkedDebtId?: string;
  uploadedBy: "applicant" | "staff";
}

export type AppStatus = "draft" | "needs_review" | "in_analysis" | "conditional" | "approved" | "declined" | "funded";

export interface Note {
  id: string;
  author: string;
  text: string;
  at: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  detail?: string;
}

export interface DocRequest {
  id: string;
  items: string[];
  message: string;
  at: string;
  by: string;
  fulfilled: boolean;
}

export interface Decision {
  scenarioKey: string;
  outcome: "approved" | "declined";
  by: string;
  at: string;
  reason?: string;
}

export interface Application {
  id: string;
  ref: string;
  createdAt: string;
  /** True while the draft holds the "Load sample business" demo data. */
  sample?: boolean;
  updatedAt: string;
  submittedAt?: string;
  status: AppStatus;
  assignedTo: string;
  business: BusinessInfo;
  financials: Financials;
  debts: Debt[];
  assets: Asset[];
  bank: BankData;
  documents: DocumentFile[];
  notes: Note[];
  audit: AuditEntry[];
  docRequests: DocRequest[];
  decision?: Decision;
}

export type RiskLevel = "green" | "yellow" | "red";

export interface ScenarioTerms {
  rate: number; // annual % for the new facility
  months: number;
}

export interface UnderwritingSettings {
  advanceRates: Record<AssetCategory, number>;
  thresholds: { green: number; yellow: number };
  targetDscr: number;
  excludeHolidays: boolean;
  originationFeePct: number;
  terms: {
    full: ScenarioTerms;
    mca: ScenarioTerms;
    asset: ScenarioTerms;
    partial: ScenarioTerms;
    hybridRemainder: ScenarioTerms;
  };
  weights: Record<FactorKey, number>;
}

export type FactorKey =
  | "revenue"
  | "burden"
  | "dscr"
  | "banking"
  | "collateral"
  | "history"
  | "operating"
  | "legal";
