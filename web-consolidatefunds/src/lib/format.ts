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

// ---------- Owner identity: formatting & validation ----------

/** Progressive SSN mask: 123456789 → 123-45-6789. */
export const fmtSsn = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 9);
  if (d.length <= 3) return d;
  if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
};

export const ssnValid = (v: string) => /^(?!000|666|9\d\d)\d{3}-(?!00)\d{2}-(?!0000)\d{4}$/.test(v.trim());

/** Progressive date mask: 04121985 → 04/12/1985. */
export const fmtDob = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
};

export const dobValid = (v: string) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v.trim());
  if (!m) return false;
  const [mo, dy, yr] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || yr < 1900 || yr > new Date().getFullYear()) return false;
  return dy >= 1 && dy <= new Date(yr, mo, 0).getDate();
};

export const zipValid = (v: string) => /^\d{5}(-\d{4})?$/.test(v.trim());

export const maskSsn = (v?: string) => (v && v.length >= 4 ? `***-**-${v.slice(-4)}` : "—");

/** A named owner must have a complete home address, SSN and DOB. */
export const ownerComplete = (o: { name: string; homeStreet: string; homeCity: string; homeState: string; homeZip: string; ssn: string; dob: string }) =>
  !!(o.name && o.homeStreet && o.homeCity && o.homeState && o.homeZip && ssnValid(o.ssn) && dobValid(o.dob));
