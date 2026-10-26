/**
 * Vercel serverless function — POST /api/submit-application
 * Fully self-contained: no imports from ../src or any relative file.
 * Env vars required (set in Vercel project settings):
 *   GMAIL_USER, GMAIL_APP_PASSWORD, LEAD_TO_EMAIL
 */
import nodemailer from "nodemailer";

interface IncomingAttachment {
  filename?: unknown;
  contentType?: unknown;
  base64?: unknown;
}
interface IncomingSkipped {
  name?: unknown;
  reason?: unknown;
}
interface Req {
  method?: string;
  body?: { application?: unknown; attachments?: unknown; skipped?: unknown };
}
interface Res {
  status(code: number): Res;
  json(body: unknown): void;
}

/* ---------- local type shapes (mirror of the client types, tolerant of missing fields) ---------- */
interface Owner {
  name?: string;
  title?: string;
  ownership?: string;
  email?: string;
  phone?: string;
  creditRange?: string;
  homeStreet?: string;
  homeCity?: string;
  homeState?: string;
  homeZip?: string;
  ssn?: string;
  dob?: string;
  [k: string]: unknown;
}
interface Business {
  legalName?: string;
  dba?: string;
  ein?: string;
  entity?: string;
  stateOfIncorporation?: string;
  industry?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  established?: string;
  employees?: string;
  website?: string;
  description?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  affiliates?: string;
  owners?: Owner[];
  [k: string]: unknown;
}
interface Financials {
  monthlyRevenue?: string;
  annualRevenue?: string;
  priorYearRevenue?: string;
  twoYearsAgoRevenue?: string;
  avgMonthlyDeposits?: string;
  grossProfit?: string;
  operatingExpenses?: string;
  ebitda?: string;
  cash?: string;
  accountsReceivable?: string;
  accountsPayable?: string;
  reportedMonthlyDebt?: string;
  seasonality?: string;
  topCustomerPct?: string;
  projectedRevenue?: string;
  [k: string]: unknown;
}
interface Debt {
  creditor?: string;
  type?: string;
  frequency?: string;
  structure?: string;
  status?: string;
  personalGuarantee?: boolean;
  fields?: Record<string, unknown>;
  [k: string]: unknown;
}
interface Asset {
  category?: string;
  fields?: Record<string, unknown>;
  [k: string]: unknown;
}
interface AppBody {
  ref?: string;
  business?: Business;
  financials?: Financials;
  debts?: Debt[];
  assets?: Asset[];
  bank?: { source?: string; institution?: string; fileNames?: string[]; transactions?: unknown[] };
  documents?: { name?: string; category?: string; status?: string; uploadedBy?: string }[];
  [k: string]: unknown;
}

/* ---------- attachment handling ---------- */
const MAX_ATTACHMENT_CHARS = 3_900_000; // per-file base64 cap
const MAX_TOTAL_CHARS = 4_000_000; // total base64 cap, keeps the request under Vercel's body limit
const str = (v: unknown, max = 260) => (typeof v === "string" ? v.slice(0, max) : "");
const allowedType = (t: string) => /^(application\/pdf|image\/|text\/)/.test(t);
const safeName = (n: string) => n.replace(/[\r\n\\/]/g, "_").trim() || "document";

export function collectAttachments(raw: unknown) {
  const out: { filename: string; contentType: string; content: Buffer }[] = [];
  const dropped: string[] = [];
  let total = 0;
  const list = Array.isArray(raw) ? raw : [];
  for (const item of list.slice(0, 25)) {
    const a = (typeof item === "object" && item ? item : {}) as IncomingAttachment;
    const filename = safeName(str(a.filename));
    const contentType = str(a.contentType, 100);
    const base64 = str(a.base64, MAX_ATTACHMENT_CHARS + 16).replace(/\s/g, "");
    if (!filename || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || !allowedType(contentType)) {
      dropped.push(filename || "unnamed file");
      continue;
    }
    if (base64.length > MAX_ATTACHMENT_CHARS) {
      dropped.push(filename);
      continue;
    }
    if (total + base64.length > MAX_TOTAL_CHARS) {
      dropped.push(filename);
      continue;
    }
    total += base64.length;
    out.push({ filename, contentType, content: Buffer.from(base64, "base64") });
  }
  return { out, dropped };
}

/* ---------- helpers ---------- */
const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const money = (v: unknown) => {
  const raw = String(v ?? "").trim();
  if (!raw) return "";
  const n = parseFloat(raw.replace(/[^0-9.-]/g, ""));
  return isFinite(n) ? `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}` : raw;
};

const wrap = (title: string, body: string) => `
  <tr><td style="padding:18px 24px 6px 24px;">
    <h2 style="margin:0;font-size:15px;letter-spacing:.08em;text-transform:uppercase;color:#8A8F98;font-family:Arial,sans-serif;">${esc(title)}</h2>
  </td></tr>
  <tr><td style="padding:0 24px 10px 24px;">${body}</td></tr>`;

const table = (rows: [string, string][], width = "100%") => {
  const visible = rows.filter(([, v]) => v && v.trim());
  if (!visible.length) return `<p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#8A8F98;">Not provided</p>`;
  return `<table width="${width}" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${visible
    .map(
      ([k, v], i) => `<tr style="${i % 2 ? "background:#f6f6f4;" : ""}">
        <td style="padding:7px 12px;font-family:Arial,sans-serif;font-size:13px;color:#555;vertical-align:top;width:38%;border:1px solid #e4e4e0;">${esc(k)}</td>
        <td style="padding:7px 12px;font-family:Arial,sans-serif;font-size:13px;color:#111;border:1px solid #e4e4e0;"><strong>${esc(v)}</strong></td>
      </tr>`,
    )
    .join("")}</table>`;
};

const addr = (o: Owner) =>
  [o.homeStreet, [o.homeCity, o.homeState].filter(Boolean).join(", "), o.homeZip].filter(Boolean).join(", ");

/* ---------- handler ---------- */
export default async function handler(req: Req, res: Res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  const GMAIL_USER = process.env.GMAIL_USER;
  const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
  const LEAD_TO_EMAIL = process.env.LEAD_TO_EMAIL;

  if (!GMAIL_USER || !GMAIL_APP_PASSWORD || !LEAD_TO_EMAIL) {
    res.status(500).json({ ok: false, error: "Email is not configured: GMAIL_USER, GMAIL_APP_PASSWORD or LEAD_TO_EMAIL is missing." });
    return;
  }

  let app: AppBody;
  try {
    app = (req.body?.application ?? {}) as AppBody;
  } catch {
    res.status(400).json({ ok: false, error: "Invalid request body" });
    return;
  }
  const { out: attachments, dropped } = collectAttachments(req.body?.attachments);
  const clientSkipped = (Array.isArray(req.body?.skipped) ? req.body?.skipped : [])
    .map((s) => safeName(str((typeof s === "object" && s ? (s as IncomingSkipped).name : "") || "a file")));
  const skippedNames = Array.from(new Set([...clientSkipped, ...dropped]));
  const attachedNames = new Set(attachments.map((a) => a.filename));

  const b = app.business ?? {};
  const f = app.financials ?? {};
  const owners = b.owners ?? [];
  const debts = app.debts ?? [];
  const assets = app.assets ?? [];

  const debtRows = debts
    .map(
      (d, i) => `<tr>
        <td style="padding:12px 12px;border:1px solid #e4e4e0;font-family:Arial,sans-serif;font-size:13px;vertical-align:top;">
          <strong>#${i + 1} ${esc(d.creditor || d.type)}</strong><br/>
          <span style="color:#777;">Type:</span> ${esc(d.type)} · <span style="color:#777;">Frequency:</span> ${esc(d.frequency)} ·
          <span style="color:#777;">Structure:</span> ${esc(d.structure)} · <span style="color:#777;">Status:</span> ${esc(d.status)} ·
          <span style="color:#777;">Personal guarantee:</span> ${d.personalGuarantee ? "Yes" : "No"}
          ${table(Object.entries(d.fields ?? {}).map(([k, v]) => [k, String(v)]))}
        </td></tr>`,
    )
    .join("");
  const assetRows = assets
    .map(
      (a) => `<tr><td style="padding:12px 12px;border:1px solid #e4e4e0;font-family:Arial,sans-serif;font-size:13px;vertical-align:top;">
        <strong>${esc(a.category)}</strong>
        ${table(Object.entries(a.fields ?? {}).map(([k, v]) => [k, String(v)]))}
      </td></tr>`,
    )
    .join("");

  const html = `<!doctype html><html><body style="margin:0;background:#f0f0ee;padding:16px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:760px;margin:0 auto;background:#ffffff;border:1px solid #e4e4e0;border-radius:8px;">
    <tr><td style="padding:22px 24px;border-bottom:3px solid #C6F432;">
      <div style="font-family:Arial,sans-serif;font-size:20px;font-weight:bold;color:#111;">New Application: ${esc(b.legalName || "Unknown business")}</div>
      <div style="font-family:Arial,sans-serif;font-size:13px;color:#8A8F98;margin-top:4px;">Reference ${esc(app.ref)} · received ${esc(new Date().toLocaleString("en-US"))}</div>
    </td></tr>

    ${wrap("Business", table([
      ["Legal name", esc(b.legalName)],
      ["DBA", esc(b.dba)],
      ["EIN", esc(b.ein)],
      ["Entity / state", [b.entity, b.stateOfIncorporation].filter(Boolean).join(" · ")],
      ["Industry", esc(b.industry)],
      ["Business address", [[b.street, b.city, b.state].filter(Boolean).join(", "), b.zip].filter(Boolean).join(" ")],
      ["Established", esc(b.established)],
      ["Employees", esc(b.employees)],
      ["Website", esc(b.website)],
      ["Description", esc(b.description)],
      ["Contact", [b.contactName, b.contactEmail, b.contactPhone].filter(Boolean).join(" · ")],
      ["Affiliates", esc(b.affiliates)],
    ]))}

    ${wrap("Owners & Guarantors", owners.length ? `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${owners
      .map(
        (o) => `<tr><td style="padding:12px 12px;border:1px solid #e4e4e0;font-family:Arial,sans-serif;font-size:13px;vertical-align:top;">
          <strong>${esc(o.name)}</strong> · ${esc(o.title || "Owner")}${o.ownership ? `, ${esc(o.ownership)}% ownership` : ""}
          ${table([
            ["Home address", esc(addr(o))],
            ["SSN", esc(o.ssn)],
            ["Date of birth", esc(o.dob)],
            ["Email / phone", [o.email, o.phone].filter(Boolean).join(" · ")],
            ["Estimated personal credit", esc(o.creditRange)],
          ])}
        </td></tr>`,
      )
      .join("")}</table>` : `<p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#8A8F98;">No owners listed</p>`)}

    ${wrap("Financials", table([
      ["Monthly revenue", money(f.monthlyRevenue)],
      ["Annual revenue", money(f.annualRevenue)],
      ["Prior year revenue", money(f.priorYearRevenue)],
      ["Two years ago", money(f.twoYearsAgoRevenue)],
      ["Avg monthly deposits", money(f.avgMonthlyDeposits)],
      ["Gross profit", money(f.grossProfit)],
      ["Operating expenses", money(f.operatingExpenses)],
      ["EBITDA", money(f.ebitda)],
      ["Cash", money(f.cash)],
      ["Accounts receivable", money(f.accountsReceivable)],
      ["Accounts payable", money(f.accountsPayable)],
      ["Stated monthly debt", money(f.reportedMonthlyDebt)],
      ["Seasonality", esc(f.seasonality)],
      ["Top customer concentration", f.topCustomerPct ? `${esc(f.topCustomerPct)}%` : ""],
      ["Projected revenue", money(f.projectedRevenue)],
    ]))}

    ${wrap(`Debts (${debts.length})`, debts.length ? `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${debtRows}</table>` : `<p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#8A8F98;">None listed</p>`)}

    ${wrap(`Assets & collateral (${assets.length})`, assets.length ? `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${assetRows}</table>` : `<p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#8A8F98;">None listed</p>`)}

    ${wrap("Banking", table([
      ["Source", esc(app.bank?.source)],
      ["Institution", esc(app.bank?.institution)],
      ["Files", esc((app.bank?.fileNames ?? []).join(", "))],
      ["Transactions", String(app.bank?.transactions?.length ?? 0)],
    ]))}

    ${wrap("Documents", (app.documents ?? []).length ? `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${(app.documents ?? [])
      .map((d) => {
        const name = safeName(d.name || "document");
        return `<tr><td style="padding:12px 12px;border:1px solid #e4e4e0;font-family:Arial,sans-serif;font-size:13px;vertical-align:top;">
          <strong>${esc(name)}</strong> · ${esc(d.category)} · ${esc(d.status)} · ${esc(d.uploadedBy)}<br/>
          <span style="color:${attachedNames.has(name) ? "#1a7f37" : "#b45309"};">${attachedNames.has(name) ? "Attached to this email" : "Listed only, file not attached"}</span>
        </td></tr>`;
      })
      .join("")}</table>` : `<p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#8A8F98;">None uploaded</p>`)}

    ${skippedNames.length ? wrap("Files not attached", `<div style="border:1px solid #e4b84e;background:#fdf6e3;border-radius:6px;padding:10px 14px;font-family:Arial,sans-serif;font-size:13px;color:#7a5b0f;">
      The following uploaded file${skippedNames.length > 1 ? "s were" : " was"} <strong>not attached</strong> to this email (size limit or file unavailable). Request ${skippedNames.length > 1 ? "them" : "it"} from the applicant: <strong>${esc(skippedNames.join(", "))}</strong>.
    </div>`) : ""}

    <tr><td style="padding:16px 24px 24px 24px;border-top:1px solid #e4e4e0;">
      <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:#8A8F98;">Submitted via ConsolidateFunds.com, a broker, not a lender. Owner SSN/DOB are for identity verification by licensed partners only.</p>
    </td></tr>
  </table></body></html>`;

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    });
    await transporter.sendMail({
      from: `"ConsolidateFunds Applications" <${GMAIL_USER}>`,
      to: LEAD_TO_EMAIL,
      replyTo: b.contactEmail || undefined,
      subject: `New Application - ${b.legalName || "Unknown business"}`,
      html,
      attachments: attachments.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    });
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : "Failed to send email" });
  }
}
