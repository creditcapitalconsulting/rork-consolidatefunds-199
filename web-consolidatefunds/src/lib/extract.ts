/** Lightweight term extraction for text-based financing contracts. Results always require human confirmation. */
const money = (s: string) => s.replace(/[$,\s]/g, "");

const PATTERNS: { key: string; label: string; re: RegExp; clean?: (s: string) => string }[] = [
  { key: "purchasePrice", label: "Purchase price", re: /purchase\s+price[^$\d]{0,30}\$?\s*([\d,]+(?:\.\d{2})?)/i, clean: money },
  { key: "purchasedAmount", label: "Purchased amount", re: /purchased\s+(?:amount|receivables)[^$\d]{0,30}\$?\s*([\d,]+(?:\.\d{2})?)/i, clean: money },
  { key: "factorRate", label: "Factor rate", re: /factor\s+rate[^\d]{0,15}(\d\.\d{1,3})/i },
  { key: "specifiedPercentage", label: "Specified percentage", re: /specified\s+percentage[^\d]{0,20}(\d{1,2}(?:\.\d+)?)\s*%/i },
  { key: "payment", label: "Payment amount", re: /(?:daily|weekly|specified|periodic|monthly)\s+(?:payment|amount|remittance)[^$\d]{0,30}\$?\s*([\d,]+(?:\.\d{2})?)/i, clean: money },
  { key: "originalAmount", label: "Principal / funded amount", re: /(?:principal|loan)\s+amount[^$\d]{0,30}\$?\s*([\d,]+(?:\.\d{2})?)/i, clean: money },
  { key: "rate", label: "Interest rate", re: /(?:interest\s+rate|APR)[^\d]{0,20}(\d{1,2}(?:\.\d+)?)\s*%/i },
  { key: "maturityDate", label: "Maturity date", re: /maturity\s+date[^\d]{0,20}(\d{4}-\d{2}-\d{2})/i },
];

export function extractTerms(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of PATTERNS) {
    const m = text.match(p.re);
    if (m?.[1]) out[p.key] = p.clean ? p.clean(m[1]) : m[1];
  }
  const freq = text.match(/\b(business\s+day|daily|weekly|bi-?weekly|monthly)\b/i)?.[1]?.toLowerCase();
  if (freq) out.frequency = freq.startsWith("business") || freq === "daily" ? "business_daily" : freq.startsWith("bi") ? "biweekly" : freq;
  return out;
}

export const EXTRACT_LABELS: Record<string, string> = Object.fromEntries([...PATTERNS.map((p) => [p.key, p.label]), ["frequency", "Payment frequency"]]);
