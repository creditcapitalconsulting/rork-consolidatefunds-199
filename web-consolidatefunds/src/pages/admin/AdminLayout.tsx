import { BarChart3, FileText, Home, Layers, LifeBuoy, LogOut, Menu, Search, Settings, ShieldCheck, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import StaffLogin from "./StaffLogin";

const NAV = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/apply", label: "Application", icon: FileText },
  { to: "/scenarios", label: "Scenarios", icon: Layers },
  { to: "/underwriting", label: "Underwriting", icon: ShieldCheck, end: false },
  { to: "/underwriting/reports", label: "Reports", icon: BarChart3 },
  { to: "/underwriting/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout() {
  const { staff, signOut } = useStore();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [menu, setMenu] = useState(false);
  const nav = useNavigate();
  const { pathname } = useLocation();
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!staff) return <StaffLogin />;
  const initials = staff.name.replace(/[^A-Za-z ]/g, " ").split(/\s+/).filter(Boolean).map((p) => p[0]).join("").slice(0, 2).toUpperCase();

  const sidebar = (
    <nav aria-label="Workspace" className="flex h-full flex-col gap-1 p-3">
      {NAV.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.to === "/underwriting" ? false : l.end}
          onClick={() => setMenu(false)}
          className={({ isActive }) => {
            const active = l.to === "/underwriting" ? isActive && !/\/(reports|settings)$/.test(pathname) : isActive;
            return cn("flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-[15px] transition-colors", active ? "bg-secondary font-semibold text-foreground shadow-[inset_3px_0_0_hsl(var(--primary))]" : "text-foreground/70 hover:bg-secondary/50 hover:text-foreground");
          }}
        >
          <l.icon className="h-[18px] w-[18px]" />
          {l.label}
        </NavLink>
      ))}
      <div className="mt-auto rounded-xl border border-border p-4">
        <div className="text-sm font-medium">Need help?</div>
        <div className="text-xs text-muted-foreground">Underwriting ops is here.</div>
        <a href="mailto:ops@consolidatefunds.com" className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
          <LifeBuoy className="h-4 w-4" /> Contact support
        </a>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="no-print sticky top-0 z-40 flex h-[68px] items-center gap-4 border-b border-border bg-background/90 px-4 backdrop-blur-md lg:px-6">
        <button className="rounded-md p-2 lg:hidden" onClick={() => setMenu((m) => !m)} aria-label="Toggle navigation" aria-expanded={menu}>
          {menu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <div className="w-[208px] shrink-0">
          <Logo to="/underwriting" />
        </div>
        <form
          role="search"
          className="relative hidden max-w-[600px] flex-1 md:block"
          onSubmit={(e) => {
            e.preventDefault();
            nav(`/underwriting?q=${encodeURIComponent(q)}`);
          }}
        >
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search applications, businesses, or reference #…" aria-label="Search applications" className="h-10 w-full rounded-lg border border-border bg-card pl-10 pr-10 text-sm placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none" />
          <kbd className="mono absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-border px-1.5 text-xs text-muted-foreground">/</kbd>
        </form>
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden text-right leading-tight sm:block">
            <div className="text-xs text-muted-foreground">{staff.role}</div>
            <div className="text-sm font-medium">{staff.name}</div>
          </div>
          <span className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-sm font-semibold">{initials}</span>
          <button onClick={signOut} className="rounded-md p-2 text-muted-foreground hover:text-foreground" aria-label="Sign out" title="Sign out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>
      <div className="flex">
        <aside className="no-print sticky top-[68px] hidden h-[calc(100vh-68px)] w-[232px] shrink-0 border-r border-border lg:block">{sidebar}</aside>
        {menu && (
          <div className="fixed inset-0 top-[68px] z-30 bg-background lg:hidden">{sidebar}</div>
        )}
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
