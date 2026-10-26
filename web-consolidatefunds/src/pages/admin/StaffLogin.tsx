import { ArrowLeft, KeyRound, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Field } from "@/components/fields";
import { Logo } from "@/components/Logo";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useStore } from "@/lib/store";

const DEMO_CODE = "246810";

export default function StaffLogin() {
  const { signIn } = useStore();
  const [email, setEmail] = useState("m.reyes@consolidatefunds.com");
  const [password, setPassword] = useState("demo-password");
  const [stage, setStage] = useState<"creds" | "mfa">("creds");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const verify = (c: string) => {
    if (c === DEMO_CODE) {
      const local = email.split("@")[0] ?? "staff";
      const name = local.includes(".") ? local.split(".").map((p, i) => (i === 0 ? p[0].toUpperCase() + "." : p[0].toUpperCase() + p.slice(1))).join(" ") : local;
      signIn({ name, email, role: email.startsWith("admin") ? "Admin" : "Underwriter" });
    } else {
      setError("That code didn't match. Try again.");
      setCode("");
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
          <p className="mt-1 text-sm text-muted-foreground">{stage === "creds" ? "Underwriting workspace; authorized staff only." : `Enter the 6-digit code from your authenticator app for ${email}.`}</p>

          {stage === "creds" ? (
            <form
              className="mt-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 4) return setError("Enter a valid email and password.");
                setError("");
                setStage("mfa");
              }}
            >
              <Field label="Work email" type="email" value={email} onChange={setEmail} />
              <Field label="Password" type="password" value={password} onChange={setPassword} />
              {error && <p className="text-sm text-danger">{error}</p>}
              <button className="w-full rounded-lg bg-primary py-3 font-semibold text-primary-foreground">Continue</button>
            </form>
          ) : (
            <div className="mt-6">
              <InputOTP
                maxLength={6}
                value={code}
                autoFocus
                onChange={(v) => {
                  setCode(v);
                  setError("");
                  if (v.length === 6) verify(v);
                }}
              >
                <InputOTPGroup className="w-full justify-between">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <InputOTPSlot key={i} index={i} className="num h-12 w-12 rounded-lg border border-border text-lg first:rounded-l-lg last:rounded-r-lg" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              {error && <p className="mt-3 text-sm text-danger">{error}</p>}
              <p className="mt-4 rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground">
                Demo environment: use code <span className="mono text-foreground">{DEMO_CODE}</span>. Use an email starting with “admin” for the Admin role.
              </p>
              <button onClick={() => setStage("creds")} className="mt-4 text-sm text-muted-foreground hover:text-foreground">
                Use a different account
              </button>
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
