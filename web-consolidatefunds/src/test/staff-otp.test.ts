/**
 * Local test for /api/staff-otp verification logic (no email is sent for these cases).
 * Run from web-consolidatefunds/:  bun api/staff-otp.test.ts
 */
import { createHash, createHmac } from "node:crypto";
import handler from "../../api/staff-otp";

process.env.OTP_SECRET = "test-secret-abc";
process.env.STAFF_EMAILS = "m.reyes@consolidatefunds.com, admin@consolidatefunds.com";
process.env.STAFF_ADMIN_EMAILS = "admin@consolidatefunds.com";
process.env.GMAIL_USER = "test@example.com";
process.env.GMAIL_APP_PASSWORD = "unused-here";

const sign = (payload: object) => {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${createHmac("sha256", process.env.OTP_SECRET!).update(body).digest("base64url")}`;
};
const codeHash = (code: string) => createHash("sha256").update(`${code}:${process.env.OTP_SECRET}`).digest("hex");

function call(body: unknown) {
  return new Promise<{ status: number; json: any }>((resolve) => {
    const res = {
      status(c: number) { (res as any)._s = c; return res; },
      json(b: unknown) { resolve({ status: (res as any)._s, json: b }); },
      _s: 0,
    };
    handler({ method: "POST", body: body as never }, res as never);
  });
}

let failures = 0;
const check = (name: string, cond: boolean, extra?: unknown) => {
  console.log(`${cond ? "PASS" : "FAIL"} ${name}`, cond ? "" : JSON.stringify(extra ?? ""));
  if (!cond) failures++;
};

// 1. unauthorized email is blocked before anything else
let r = await call({ action: "send", email: "stranger@gmail.com" });
check("unauthorized email -> 403 not authorized", r.status === 403 && r.json.error === "This email is not authorized.", r);

// 2. bad email format
r = await call({ action: "send", email: "not-an-email" });
check("bad email -> 400", r.status === 400, r);

// 3. tampered token -> 401 expired/restart
r = await call({ action: "verify", email: "m.reyes@consolidatefunds.com", token: "abc.def", code: "123456" });
check("tampered token -> 401", r.status === 401, r);

// 4. expired token -> 401
const expired = sign({ email: "m.reyes@consolidatefunds.com", h: codeHash("123456"), exp: Date.now() - 1, n: 0 });
r = await call({ action: "verify", email: "m.reyes@consolidatefunds.com", token: expired, code: "123456" });
check("expired token -> 401", r.status === 401, r);

// 5. wrong code -> 401 + fresh token with attempt counter
const mkToken = (n: number) => sign({ email: "m.reyes@consolidatefunds.com", h: codeHash("654321"), exp: Date.now() + 600000, n });
let tok = mkToken(0);
for (let i = 0; i < 5; i++) {
  r = await call({ action: "verify", email: "m.reyes@consolidatefunds.com", token: tok, code: "111111" });
  check(`wrong attempt ${i + 1} -> 401 with new token`, r.status === 401 && typeof r.json.token === "string", r);
  tok = r.json.token;
}
r = await call({ action: "verify", email: "m.reyes@consolidatefunds.com", token: tok, code: "654321" });
check("6th attempt locked even with right code -> 429", r.status === 429, r);

// 6. correct code, underwriter role
r = await call({ action: "verify", email: "m.reyes@consolidatefunds.com", token: mkToken(0), code: "654321" });
check("correct code -> underwriter", r.status === 200 && r.json.ok && r.json.staff.role === "Underwriter" && r.json.staff.name === "M Reyes", r);
check("no code or token leaks in success body", !JSON.stringify(r.json).includes("654321") && r.json.token === undefined, r.json);

// 7. admin list gets Admin role
r = await call({ action: "verify", email: "admin@consolidatefunds.com", token: sign({ email: "admin@consolidatefunds.com", h: codeHash("654321"), exp: Date.now() + 600000, n: 0 }), code: "654321" });
check("admin list -> Admin role", r.status === 200 && r.json.staff.role === "Admin", r);

// 8. token bound to another email cannot be replayed
r = await call({ action: "verify", email: "admin@consolidatefunds.com", token: mkToken(0), code: "654321" });
check("token email mismatch -> 401", r.status === 401, r);

console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
