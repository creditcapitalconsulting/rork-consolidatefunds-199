import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Logo } from "./Logo";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const PUBLIC_LINKS = [
  { href: "/#how", label: "How It Works" },
  { href: "/#solutions", label: "Debt Solutions" },
  { href: "/#assets", label: "Asset-Based" },
  { href: "/#faq", label: "FAQ" },
];

const APP_LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/apply", label: "Application" },
  { to: "/scenarios", label: "Scenarios" },
  { to: "/underwriting", label: "Underwriting" },
];

export function SiteHeader({ variant = "app" }: { variant?: "public" | "app" }) {
  const { draft } = useStore();
  const [open, setOpen] = useState(false);
  const name = draft.business.contactName || "";
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="no-print sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-[68px] max-w-[1400px] items-center gap-8 px-5 lg:px-10">
        <Logo />
        <nav className="hidden flex-1 items-center gap-1 md:flex" aria-label="Main">
          {variant === "public"
            ? PUBLIC_LINKS.map((l) => (
                <a key={l.href} href={l.href} className="rounded-md px-3 py-2 text-[15px] text-foreground/80 transition-colors hover:text-foreground">
                  {l.label}
                </a>
              ))
            : APP_LINKS.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.end}
                  className={({ isActive }) =>
                    cn(
                      "relative rounded-md px-3 py-2 text-[15px] transition-colors hover:text-foreground",
                      isActive ? "text-primary after:absolute after:inset-x-3 after:-bottom-[15px] after:h-0.5 after:bg-primary" : "text-foreground/70",
                    )
                  }
                >
                  {l.label}
                </NavLink>
              ))}
        </nav>
        <div className="ml-auto hidden items-center gap-3 md:flex">
          {variant === "public" ? (
            <>
              <Link to="/underwriting" className="px-3 py-2 text-[15px] text-foreground/80 hover:text-foreground">
                Staff log in
              </Link>
              <Link to="/apply" className="rounded-lg bg-primary px-5 py-2.5 text-[15px] font-semibold text-primary-foreground transition-transform hover:-translate-y-px active:translate-y-0">
                Start your application
              </Link>
            </>
          ) : name ? (
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-sm font-semibold">{initials}</span>
              <div className="leading-tight">
                <div className="text-sm">{name}</div>
                <div className="text-xs text-muted-foreground">{draft.business.legalName}</div>
              </div>
            </div>
          ) : (
            <Link to="/apply" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              Start application
            </Link>
          )}
        </div>
        <button className="ml-auto rounded-md p-2 md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu" aria-expanded={open}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <nav className="border-t border-border px-5 pb-4 md:hidden" aria-label="Mobile">
          {(variant === "public" ? PUBLIC_LINKS.map((l) => ({ to: l.href, label: l.label })) : APP_LINKS).map((l) => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="block border-b border-border/50 py-3 text-[15px]">
              {l.label}
            </Link>
          ))}
          <Link to="/apply" onClick={() => setOpen(false)} className="mt-4 block rounded-lg bg-primary py-3 text-center font-semibold text-primary-foreground">
            Start your application
          </Link>
        </nav>
      )}
    </header>
  );
}
