import { ChevronDown, Info } from "lucide-react";
import { useId, type ReactNode } from "react";
import type { FieldDef } from "@/lib/config";
import { cn } from "@/lib/utils";

const base =
  "h-11 w-full rounded-lg border border-border bg-background/60 px-3 text-[15px] text-foreground placeholder:text-muted-foreground/60 transition-colors hover:border-muted-foreground/40 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25";

export function FieldShell({ label, hint, htmlFor, children, className }: { label: string; hint?: string; htmlFor: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-[13px] text-muted-foreground">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11.5px] leading-snug text-muted-foreground/70">{hint}</p>}
    </div>
  );
}

interface InputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  kind?: FieldDef["kind"];
  hint?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  className?: string;
  required?: boolean;
  type?: string;
}

export function Field({ label, value, onChange, kind = "text", hint, placeholder, options, className, required, type }: InputProps) {
  const id = useId();
  const numeric = kind === "money" || kind === "number" || kind === "percent" || kind === "factor";
  let control: ReactNode;
  if (kind === "select") {
    control = (
      <div className="relative">
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={cn(base, "appearance-none pr-9", !value && "text-muted-foreground/60")}>
          <option value="">Select…</option>
          {options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    );
  } else if (kind === "textarea") {
    control = <textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3} className={cn(base, "h-auto py-2.5 leading-relaxed")} />;
  } else {
    control = (
      <div className="relative">
        {kind === "money" && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>}
        <input
          id={id}
          type={kind === "date" ? "date" : type ?? "text"}
          inputMode={numeric ? "decimal" : undefined}
          value={value}
          required={required}
          placeholder={placeholder ?? (kind === "factor" ? "1.35" : undefined)}
          onChange={(e) => {
            const v = e.target.value;
            if (numeric && v !== "" && !/^-?[\d,]*\.?\d*$/.test(v)) return;
            onChange(numeric ? v.replace(/,/g, "") : v);
          }}
          className={cn(base, "num", kind === "money" && "pl-7", (kind === "percent" || kind === "factor") && "pr-9", kind === "date" && "[color-scheme:dark]")}
        />
        {kind === "percent" && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>}
        {kind === "factor" && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">×</span>}
      </div>
    );
  }
  return (
    <FieldShell label={label + (required ? " *" : "")} hint={hint} htmlFor={id} className={className}>
      {control}
    </FieldShell>
  );
}

export function DefField({ def, values, onChange, labelOverride }: { def: FieldDef; values: Record<string, string>; onChange: (key: string, v: string) => void; labelOverride?: string }) {
  return (
    <Field
      label={labelOverride ?? def.label}
      kind={def.kind}
      value={values[def.key] ?? ""}
      onChange={(v) => onChange(def.key, v)}
      hint={def.hint}
      placeholder={def.placeholder}
      options={def.options}
      className={def.wide || def.kind === "textarea" ? "sm:col-span-2" : undefined}
    />
  );
}

export function Callout({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warn" }) {
  return (
    <div className={cn("flex gap-3 rounded-lg px-4 py-3 text-[13.5px] leading-relaxed", tone === "info" ? "bg-secondary text-foreground/85" : "border border-warning/30 bg-warning/10 text-warning")}>
      <Info className="mt-0.5 h-4 w-4 shrink-0 opacity-80" />
      <div>{children}</div>
    </div>
  );
}

export function Toggle({ label, checked, onChange, description }: { label: string; checked: boolean; onChange: (v: boolean) => void; description?: string }) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-background/40 px-3.5 py-3 hover:border-muted-foreground/40">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]" />
      <span>
        <span className="block text-sm">{label}</span>
        {description && <span className="block text-xs text-muted-foreground">{description}</span>}
      </span>
    </label>
  );
}
