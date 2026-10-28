/**
 * Vercel serverless function — POST /api/staff-otp
 * Fully self-contained: no imports from ../src or any relative file.
 * Stateful-less (stateless) staff two-factor sign-in:
 *   action "send"   { email }                         -> emails a random 6-digit code, returns an HMAC-signed token holding only a HASH of the code
 *   action "verify" { email, token, code }            -> checks signature, expiry, attempt count and code hash; returns the staff profile
 * Env vars required (set in Vercel project settings):
 *   STAFF_EMAILS  - comma-separated allow-list of staff emails; nobody else can sign in
 *   OTP_SECRET    - secret used to HMAC-sign tokens and hash codes (fail closed if missing)
 *   GMAIL_USER, GMAIL_APP_PASSWORD - Gmail SMTP account that sends the code
 * Optional:
 *   STAFF_ADMIN_EMAILS - comma-separated emails that receive the Admin role (everyone else is an Underwriter)
 */
import { createHash, createHmac, randomInt, timingSafeEqual } from "node:crypto";
import nodemailer from "nodemailer";

interface Req {
  method?: string;
  body?: { action?: unknown; email?: unknown; token?: unknown; code?: unknown };
}
interface Res {
  status(code: number): Res;
  json(body: unknown): void;
}

const OTP_TTL_MS = 10 * 60 * 1000; // code valid for 10 minutes
const MAX_ATTEMPTS = 5;

const CODE_SUBJECT = "Your ConsolidateFunds staff sign-in code";

const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const normEmail = (v: unknown) => (typeof v === "string" ? v.trim().toLowerCase().slice(0, 254) : "");
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 254;

const splitList = (raw: string | undefined) =>
  (raw ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => isEmail(s));

const displayName = (email: string) => {
  const local = email.split("@")[0] ?? "staff";
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(" ");
};

const hmac = (payload: string) => createHmac("sha256", process.env.OTP_SECRET ?? "").update(payload).digest("base64url");

function signToken(payload: { email: string; h: string; exp: number; n: number }) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${hmac(body)}`;
}

function verifyToken(token: unknown): { email: string; h: string; exp: number; n: number } | null {
  if (typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = hmac(body);
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString()) as { email?: unknown; h?: unknown; exp?: unknown; n?: unknown };
    if (typeof p.email !== "string" || typeof p.h !== "string" || typeof p.exp !== "number" || typeof p.n !== "number") return null;
    if (p.exp < Date.now()) return null;
    return { email: p.email, h: p.h, exp: p.exp, n: p.n };
  } catch {
    return null;
  }
}

function badConfig(res: Res) {
  res.status(500).json({ ok: false, error: "Sign-in is not configured: STAFF_EMAILS, OTP_SECRET, GMAIL_USER or GMAIL_APP_PASSWORD is missing." });
}

export default async function handler(req: Req, res: Res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }
  const OTP_SECRET = process.env.OTP_SECRET;
  const STAFF_EMAILS = splitList(process.env.STAFF_EMAILS);
  const GMAIL_USER = process.env.GMAIL_USER;
  const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
  const action = req.body?.action;

  if (!OTP_SECRET || !STAFF_EMAILS.length || !GMAIL_USER || !GMAIL_APP_PASSWORD) {
    badConfig(res);
    return;
  }

  const email = normEmail(req.body?.email);

  /* ---- step 1: request a code ---- */
  if (action === "send") {
    if (!isEmail(email)) {
      res.status(400).json({ ok: false, error: "Enter a valid email address." });
      return;
    }
    if (!STAFF_EMAILS.includes(email)) {
      res.status(403).json({ ok: false, error: "This email is not authorized." });
      return;
    }
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const token = signToken({
      email,
      h: createHash("sha256").update(`${code}:${OTP_SECRET}`).digest("hex"),
      exp: Date.now() + OTP_TTL_MS,
      n: 0,
    });
    try {
      const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD } });
      await transporter.sendMail({
        from: `"ConsolidateFunds Security" <${GMAIL_USER}>`,
        to: email,
        subject: CODE_SUBJECT,
        html: `<!doctype html><html><body style="margin:0;background:#f0f0ee;padding:24px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e4e4e0;border-radius:8px;">
            <tr><td style="padding:24px 28px;border-bottom:3px solid #C6F432;">
              <div style="font-family:Arial,sans-serif;font-size:18px;font-weight:bold;color:#111;">Staff sign-in verification</div>
            </td></tr>
            <tr><td style="padding:24px 28px;font-family:Arial,sans-serif;font-size:14px;color:#333;">
              <p style="margin:0 0 12px 0;">Use this code to finish signing in to the ConsolidateFunds underwriting workspace:</p>
              <p style="margin:0 0 12px 0;font-size:30px;font-weight:bold;letter-spacing:8px;color:#111;">${esc(code)}</p>
              <p style="margin:0;color:#777;">This code expires in 10 minutes and can be used once. If you didn't request it, you can safely ignore this email.</p>
            </td></tr>
          </table></body></html>`,
      });
      // The token carries only a salted HASH of the code, never the code itself.
      res.status(200).json({ ok: true, token });
    } catch (err) {
      res.status(502).json({ ok: false, error: err instanceof Error ? `Could not send the code email: ${err.message}` : "Could not send the code email." });
    }
    return;
  }

  /* ---- step 2: verify a code ---- */
  if (action === "verify") {
    const payload = verifyToken(req.body?.token);
    if (!payload || payload.email !== email) {
      res.status(401).json({ ok: false, error: "That code request expired. Start again." });
      return;
    }
    if (payload.n >= MAX_ATTEMPTS) {
      res.status(429).json({ ok: false, error: "Too many attempts. Start again to receive a new code." });
      return;
    }
    const code = typeof req.body?.code === "string" ? req.body.code.replace(/\D/g, "").slice(0, 6) : "";
    const h = createHash("sha256").update(`${code}:${OTP_SECRET}`).digest("hex");
    if (code.length !== 6 || h !== payload.h) {
      res.status(401).json({
        ok: false,
        error: "That code didn't match. Try again.",
        token: signToken({ ...payload, n: payload.n + 1 }),
      });
      return;
    }
    const admins = splitList(process.env.STAFF_ADMIN_EMAILS);
    res.status(200).json({
      ok: true,
      staff: { name: displayName(email), email, role: admins.includes(email) ? "Admin" : "Underwriter" },
    });
    return;
  }

  res.status(400).json({ ok: false, error: "Unknown action" });
}
