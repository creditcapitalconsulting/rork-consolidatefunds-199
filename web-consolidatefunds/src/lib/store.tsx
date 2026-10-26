import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_SETTINGS } from "./config";
import {
  blankOwner,
  emptyApplication,
  emptyBusiness,
  emptyFinancials,
  hydrateBank,
  sampleDraft,
  seedApplications,
  uid,
} from "./sample";
import type { Application, AuditEntry, UnderwritingSettings } from "./types";

const K = {
  draft: "cf.draft.v2",
  apps: "cf.apps.v2",
  settings: "cf.settings.v2",
  staff: "cf.staff.v2",
};

const strip = (a: Application): Application =>
  a.bank.source === "demo_connection"
    ? { ...a, bank: { ...a.bank, transactions: [] } }
    : a;

/** Bring anything loaded from storage up to the current schema — older builds may be missing fields. */
function normalizeApp(raw: unknown): Application {
  const a = (typeof raw === "object" && raw ? raw : {}) as Record<
    string,
    unknown
  >;
  const base = emptyApplication();
  const b = (
    typeof a.business === "object" && a.business ? a.business : {}
  ) as Record<string, unknown>;
  const owners = (
    (Array.isArray(b.owners) ? b.owners : base.business.owners) as unknown[]
  ).map((o) => ({ ...blankOwner(), ...(typeof o === "object" && o ? o : {}) }));
  return {
    ...base,
    ...a,
    business: { ...base.business, ...b, owners } as Application["business"],
    financials: {
      ...emptyFinancials(),
      ...(typeof a.financials === "object" && a.financials ? a.financials : {}),
    },
    bank: {
      ...base.bank,
      ...(typeof a.bank === "object" && a.bank ? a.bank : {}),
    },
    debts: Array.isArray(a.debts) ? (a.debts as Application["debts"]) : [],
    assets: Array.isArray(a.assets) ? (a.assets as Application["assets"]) : [],
    documents: Array.isArray(a.documents)
      ? (a.documents as Application["documents"])
      : [],
    notes: Array.isArray(a.notes) ? (a.notes as Application["notes"]) : [],
    audit: Array.isArray(a.audit) ? (a.audit as Application["audit"]) : [],
    docRequests: Array.isArray(a.docRequests)
      ? (a.docRequests as Application["docRequests"])
      : [],
  };
}

/** Deep-merge stored settings over defaults so new rule keys always exist. */
function normalizeSettings(raw: unknown): UnderwritingSettings {
  const s = (
    typeof raw === "object" && raw ? raw : {}
  ) as Partial<UnderwritingSettings>;
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    thresholds: { ...DEFAULT_SETTINGS.thresholds, ...(s.thresholds ?? {}) },
    advanceRates: {
      ...DEFAULT_SETTINGS.advanceRates,
      ...(s.advanceRates ?? {}),
    },
    weights: { ...DEFAULT_SETTINGS.weights, ...(s.weights ?? {}) },
    terms: {
      full: { ...DEFAULT_SETTINGS.terms.full, ...(s.terms?.full ?? {}) },
      mca: { ...DEFAULT_SETTINGS.terms.mca, ...(s.terms?.mca ?? {}) },
      asset: { ...DEFAULT_SETTINGS.terms.asset, ...(s.terms?.asset ?? {}) },
      partial: {
        ...DEFAULT_SETTINGS.terms.partial,
        ...(s.terms?.partial ?? {}),
      },
      hybridRemainder: {
        ...DEFAULT_SETTINGS.terms.hybridRemainder,
        ...(s.terms?.hybridRemainder ?? {}),
      },
    },
  };
}

function load<T>(
  key: string,
  fallback: () => T,
  storage: Storage = localStorage,
): T {
  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback();
  } catch {
    return fallback();
  }
}
function save(key: string, value: unknown, storage: Storage = localStorage) {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full — ignore, app keeps working in memory */
  }
}

export interface Staff {
  name: string;
  email: string;
  role: "Underwriter" | "Admin";
}

interface Store {
  draft: Application;
  updateDraft: (fn: (d: Application) => Application) => void;
  resetDraft: () => void;
  loadSampleDraft: () => void;
  lastSaved: number | null;
  submitDraft: () => string;
  apps: Application[];
  getApp: (id: string) => Application | undefined;
  updateApp: (
    id: string,
    fn: (a: Application) => Application,
    audit?: { action: string; detail?: string },
  ) => void;
  settings: UnderwritingSettings;
  setSettings: (s: UnderwritingSettings) => void;
  staff: Staff | null;
  signIn: (s: Staff) => void;
  signOut: () => void;
  resetDemo: () => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<Application>(() =>
    hydrateBank(normalizeApp(load<unknown>(K.draft, () => ({}) as unknown))),
  );
  const [apps, setApps] = useState<Application[]>(() => {
    const stored = load<unknown>(K.apps, () => []);
    const list = Array.isArray(stored) ? stored : [];
    return (list.length ? list.map(normalizeApp) : seedApplications()).map(
      hydrateBank,
    );
  });
  const [settings, setSettingsState] = useState<UnderwritingSettings>(() =>
    normalizeSettings(load<unknown>(K.settings, () => ({}) as unknown)),
  );
  const [staff, setStaff] = useState<Staff | null>(() =>
    load<Staff | null>(K.staff, () => null, sessionStorage),
  );
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const firstDraft = useRef(true);

  useEffect(() => {
    if (firstDraft.current) {
      firstDraft.current = false;
      return;
    }
    const t = setTimeout(() => {
      save(K.draft, strip(draft));
      setLastSaved(Date.now());
    }, 500);
    return () => clearTimeout(t);
  }, [draft]);

  useEffect(() => save(K.apps, apps.map(strip)), [apps]);
  useEffect(() => save(K.settings, settings), [settings]);

  const updateDraft = useCallback(
    (fn: (d: Application) => Application) =>
      setDraft((d) => ({ ...fn(d), updatedAt: new Date().toISOString() })),
    [],
  );
  const resetDraft = useCallback(() => setDraft(emptyApplication()), []);
  const loadSampleDraft = useCallback(() => setDraft(sampleDraft()), []);

  const submitDraft = useCallback(() => {
    const now = new Date().toISOString();
    const submitted: Application = {
      ...draft,
      id: draft.id,
      status: "needs_review",
      submittedAt: now,
      updatedAt: now,
      audit: [
        {
          id: uid(),
          at: now,
          actor:
            draft.business.contactName ||
            draft.business.legalName ||
            "Applicant",
          action: "Application submitted",
          detail: `${draft.debts.length} debts, ${draft.assets.length} assets, ${draft.documents.length} documents`,
        },
        ...draft.audit,
      ],
    };
    setApps((list) => [
      submitted,
      ...list.filter((a) => a.id !== submitted.id),
    ]);
    setDraft({ ...submitted });
    return submitted.id;
  }, [draft]);

  const getApp = useCallback(
    (id: string) => apps.find((a) => a.id === id),
    [apps],
  );

  const updateApp = useCallback(
    (
      id: string,
      fn: (a: Application) => Application,
      audit?: { action: string; detail?: string },
    ) => {
      setApps((list) =>
        list.map((a) => {
          if (a.id !== id) return a;
          const next = normalizeApp(fn(a));
          const entry: AuditEntry | null = audit
            ? {
                id: uid(),
                at: new Date().toISOString(),
                actor: staff?.name ?? "System",
                action: audit.action,
                detail: audit.detail,
              }
            : null;
          return {
            ...next,
            updatedAt: new Date().toISOString(),
            audit: entry ? [entry, ...next.audit] : next.audit,
          };
        }),
      );
    },
    [staff],
  );

  const signIn = useCallback((s: Staff) => {
    setStaff(s);
    save(K.staff, s, sessionStorage);
  }, []);
  const signOut = useCallback(() => {
    setStaff(null);
    sessionStorage.removeItem(K.staff);
  }, []);

  const resetDemo = useCallback(() => {
    setApps(seedApplications());
    setSettingsState(DEFAULT_SETTINGS);
  }, []);

  const value = useMemo<Store>(
    () => ({
      draft,
      updateDraft,
      resetDraft,
      loadSampleDraft,
      lastSaved,
      submitDraft,
      apps,
      getApp,
      updateApp,
      settings,
      setSettings: setSettingsState,
      staff,
      signIn,
      signOut,
      resetDemo,
    }),
    [
      draft,
      updateDraft,
      resetDraft,
      loadSampleDraft,
      lastSaved,
      submitDraft,
      apps,
      getApp,
      updateApp,
      settings,
      staff,
      signIn,
      signOut,
      resetDemo,
    ],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore outside provider");
  return v;
}
