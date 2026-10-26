export const usd = (v: number, opts: { compact?: boolean; cents?: boolean; sign?: boolean } = {}) => {
  if (!isFinite(v)) return "—";
  const sign = opts.sign && v > 0 ? "+" : "";
  if (opts.compact && Math.abs(v) >= 1000) {
    const abs = Math.abs(v);
    const s = abs >= 1_000_000 ? `${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M` : `${(abs / 1000).toFixed(abs >= 100_000 ? 0 : 1)}K`;
    return `${v < 0 ? "-" : sign}$${s.replace(".0", "")}`;
  }
  return (
    (v < 0 ? "-" : sign) +
    "$" +
    Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: opts.cents ? 2 : 0, maximumFractionDigits: opts.cents ? 2 : 0 })
  );
};

export const pct = (v: number | null | undefined, digits = 0) => (v === null || v === undefined || !isFinite(v) ? "—" : `${v.toFixed(digits)}%`);

export const ratio = (v: number | null | undefined) => (v === null || v === undefined || !isFinite(v) ? "—" : v.toFixed(2));

export function timeAgo(iso?: string) {
  if (!iso) return "—";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hour${Math.floor(s / 3600) === 1 ? "" : "s"} ago`;
  const d = Math.floor(s / 86400);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

export const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—");
export const fmtDateTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

export const months = (m: number | null) => (m === null || !isFinite(m) ? "—" : m < 1 ? "< 1 mo" : `${Math.round(m)} mo`);

export function downloadFile(name: string, content: string, type = "text/csv") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const csvRow = (cells: (string | number)[]) => cells.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",");
