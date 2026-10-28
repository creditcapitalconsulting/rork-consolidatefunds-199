import { ArrowLeft, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Field } from "@/components/fields";
import { Logo } from "@/components/Logo";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useStore } from "@/lib/store";

type Stage = "creds" | "mfa";

interface StaffResponse {
  ok?: boolean;
  token?: string;
  error?: string;
  staff?: { name: string; email: string; role: "Underwriter" | "Admin" };
}

export default function StaffLogin() {
  const { signIn } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [stage, setStage] = useState<Stage>("creds");
  const [token, setToken] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const request = async (body: Record<string, unknown>): Promise<{ status: number; data: StaffResponse }> => {
    const r = await fetch("/api/staff-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    let data: StaffResponse = {};
    try {
      data = (await r.json()) as StaffResponse;
    } catch {
      /* non-JSON error */
    }
    return { status: r.status, data };
  };

  const sendCode = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 4) {
      setError("Enter a valid email and password.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const { status, data } = await request({ action: "send", email });
      if (status === 403) {
        setError("This email is not authorized.");
        return;
      }
      if (status === 200 && data.ok && data.token) {
        setToken(data.token);
        setStage("mfa");
        return;
      }
      setError(data.error || "Sign-in service is unavailable. Please try again later.");
    } catch {
      setError("Sign-in service is unavailable. Please try again later.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async (c: string) => {
    setError("");
    setBusy(true);
    try {
      const { status, data } = await request({ action: "verify", email, token, code: c });
      if (status === 200 && data.ok && data.staff) {
        signIn({ name: data.staff.name, email: data.staff.email, role: data.staff.role });
        return;
      }
      if (data.token) setToken(data.token); // keep the attempt counter in sync
      setError(data.error || "That code didn't match. Try again.");
      setCode("");
    } catch {
      setError("Sign-in service is unavailable. Please try again later.");
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid-bg flex min-h-screen flex-col bg-background">
      <div className="px-6 py-5">
        <Logo />
      </div>
      <main className="flex flex-1 items-center justify-center px-5 pb-16">
        <div className="panel w-full max-w-md p-7 sm:p-8">
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-secondary text-primary">{stage === "creds" ? <KeyRound className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}</span>
          <h1 className="mt-5 text-2xl font-bold">{stage === "creds" ? "Staff sign in" : "Two-factor verification"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{stage === "creds" ? "Underwriting workspace; authorized staff only." : `Enter the 6-digit code we emailed to ${email}. It expires in 10 minutes.`}</p>

          {stage === "creds" ? (
            <form
              className="mt-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!busy) void sendCode();
              }}
            >
              <Field label="Work email" type="email" value={email} onChange={setEmail} />
              <Field label="Password" type="password" value={password} onChange={setPassword} />
              {error && <p className="text-sm text-danger">{error}</p>}
              <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-60">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Continue
              </button>
            </form>
          ) : (
            <div className="mt-6">
              <InputOTP
                maxLength={6}
                value={code}
                autoFocus
                disabled={busy}
                onChange={(v) => {
                  setCode(v);
                  setError("");
                  if (v.length === 6 && !busy) void verify(v);
                }}
              >
                <InputOTPGroup className="w-full justify-between">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <InputOTPSlot key={i} index={i} className="num h-12 w-12 rounded-lg border border-border text-lg first:rounded-l-lg last:rounded-r-lg" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              {busy && <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Verifying code…</p>}
              {error && <p className="mt-3 text-sm text-danger">{error}</p>}
              <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                <button onClick={() => { setStage("creds"); setError(""); }} className="hover:text-foreground">
                  Use a different account
                </button>
                {!busy && (
                  <button
                    onClick={() => void sendCode()}
                    className="hover:text-foreground"
                  >
                    Resend code
                  </button>
                )}
              </div>
            </div>
          )}
          <Link to="/" className="mt-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to site
          </Link>
        </div>
      </main>
    </div>
  );
}
