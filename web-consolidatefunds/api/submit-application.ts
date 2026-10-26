import nodemailer from "nodemailer";
import type { Application } from "../src/lib/types";

interface Req {
  method?: string;
  body?: { application?: unknown };
}
interface Res {
  status(code: number): Res;
  json(body: unknown): void;
}

const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const money = (v: unknown) => {
  const n = parseFloat(String(v ?? "").replace(/[^0-9.-]/g, ""));
  return isFinite(n) && String(v ?? "") !== "" ? `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}` : "";
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

const addr = (o: { homeStreet?: string; homeCity?: string; homeState?: string; homeZip?: string }) =>
  [o.homeStreet, [o.homeCity, o.homeState].filter(Boolean).join(", "), o.homeZip].filter(Boolean).join(", ");

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

  let app: Application;
  try {
    app = (req.body?.application ?? {}) as Application;
  } catch {
    res.status(400).json({ ok: false, error: "Invalid request body" });
    return;
  }

  const b = app.business ?? { legalName: "Unknown business" } as Application["business"];
  const f = app.financials ?? ({} as Application["financials"]);
  const debtRows = (app.debts ?? [])
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
  const assetRows = (app.assets ?? [])
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
      <div style="font-family:Arial,sans-serif;font-size:20px;font-weight:bold;color:#111;">New Application — ${esc(b.legalName)}</div>
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

    ${wrap("Owners & guarantors", (app.business?.owners ?? []).length ? `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${(app.business?.owners ?? [])
      .map(
        (o) => `<tr><td style="padding:12px 12px;border:1px solid #e4e4e0;font-family:Arial,sans-serif;font-size:13px;vertical-align:top;">
          <strong>${esc(o.name)}</strong> — ${esc(o.title || "Owner")}${o.ownership ? `, ${esc(o.ownership)}% ownership` : ""}
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

    ${wrap(`Debts (${(app.debts ?? []).length})`, (app.debts ?? []).length ? `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${debtRows}</table>` : `<p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#8A8F98;">None listed</p>`)}

    ${wrap(`Assets & collateral (${(app.assets ?? []).length})`, (app.assets ?? []).length ? `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${assetRows}</table>` : `<p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#8A8F98;">None listed</p>`)}

    ${wrap("Banking", table([
      ["Source", esc(app.bank?.source)],
      ["Institution", esc(app.bank?.institution)],
      ["Files", esc((app.bank?.fileNames ?? []).join(", "))],
      ["Transactions", String(app.bank?.transactions?.length ?? 0)],
    ]))}

    ${wrap("Documents", (app.documents ?? []).length ? `<ul style="margin:0;padding-left:18px;font-family:Arial,sans-serif;font-size:13px;">${(app.documents ?? [])
      .map((d) => `<li style="margin-bottom:4px;">${esc(d.name)} — ${esc(d.category)} · ${esc(d.status)} · ${esc(d.uploadedBy)}</li>`)
      .join("")}</ul>` : `<p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#8A8F98;">None uploaded</p>`)}

    <tr><td style="padding:16px 24px 24px 24px;border-top:1px solid #e4e4e0;">
      <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:#8A8F98;">Submitted via ConsolidateFunds.com — a broker, not a lender. Owner SSN/DOB are for identity verification by licensed partners only.</p>
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
      subject: `New Application - ${b.legalName}`,
      html,
    });
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : "Failed to send email" });
  }
}
