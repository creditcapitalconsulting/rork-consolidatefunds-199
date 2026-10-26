import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-8 w-8", className)} aria-hidden>
      <path d="M5 7c6 0 9 3 11 9" stroke="hsl(var(--primary))" strokeWidth="3.2" strokeLinecap="round" fill="none" />
      <path d="M5 25c6 0 9-3 11-9" stroke="hsl(var(--primary))" strokeWidth="3.2" strokeLinecap="round" fill="none" />
      <path d="M4 16h12" stroke="hsl(var(--primary))" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M16 16h10" stroke="hsl(var(--primary))" strokeWidth="5" strokeLinecap="round" />
      <circle cx="27" cy="16" r="3.4" fill="hsl(var(--primary))" />
    </svg>
  );
}

export function Logo({ to = "/", className }: { to?: string; className?: string }) {
  return (
    <Link to={to} className={cn("flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}>
      <LogoMark />
      <span className="text-[19px] font-semibold tracking-tight">
        ConsolidateFunds<span className="font-normal text-muted-foreground">.com</span>
      </span>
    </Link>
  );
}
