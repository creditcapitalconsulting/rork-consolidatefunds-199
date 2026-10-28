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
import { ASSET_TYPES, DEBT_TYPES, DEFAULT_SETTINGS } from "./config";
import {
  blankOwner,
  emptyApplication,
  emptyBusiness,
  emptyFinancials,
  hydrateBank,
  newAsset,
  newDebt,
  sampleDraft,
  seedApplications,
  uid,
} from "./sample";
import type { Application, AuditEntry, UnderwritingSettings } from "./types";

const K = {
  apps: "cf.apps.v2",
  settings: "cf.settings.v2",
  staff: "cf.staff.v2",
};

const strip = (a: Application): Application =>
  a.bank.source === "demo_connection"
    ? { ...a, bank: { ...a.bank, transactions: [] } }
    : a;

/** Bring anything loaded from storage up to the current schema — older builds may be missing fields. */
const isObj = (x: unknown): x is Record<string, unknown> =>
  typeof x === "object" && x !== null && !Array.isArray(x);

function normalizeApp(raw: unknown): Application {
  try {
    return normalizeAppInner(raw);
  } catch {
    // Any unexpected storage shape falls back to a clean application instead of crashing the wizard.
    return emptyApplication();
  }
}

function normalizeAppInner(raw: unknown): Application {
  const a = isObj(raw) ? raw : {};
  const base = emptyApplication();
  const b = isObj(a.business) ? a.business : {};
  const owners = (
    Array.isArray(b.owners) ? b.owners.filter(isObj) : base.business.owners
  ).map((o) => ({ ...blankOwner(), ...o }) as Application["business"]["owners"][number]);
  return {
    ...base,
    ...a,
    business: { ...base.business, ...b, owners },
    financials: {
      ...emptyFinancials(),
      ...(isObj(a.financials) ? a.financials : {}),
    },
    bank: {
      ...base.bank,
      ...(isObj(a.bank) ? a.bank : {}),
    },
    debts: (Array.isArray(a.debts) ? a.debts : [])
      .filter(isObj)
      .filter((d) => (d.type as string) in DEBT_TYPES)
      .map((d) => ({
        ...newDebt(d.type as Parameters<typeof newDebt>[0]),
        ...d,
        fields: isObj(d.fields)
          ? Object.fromEntries(
              Object.entries(d.fields)
                .filter(([, v]) => typeof v === "string" || typeof v === "number")
                .map(([k, v]) => [k, String(v)]),
            )
          : {},
      })) as Application["debts"],
    assets: (Array.isArray(a.assets) ? a.assets : [])
      .filter(isObj)
      .filter((s) => (s.category as string) in ASSET_TYPES)
      .map((s) => ({
        ...newAsset(s.category as Parameters<typeof newAsset>[0]),
        ...s,
        fields: isObj(s.fields)
          ? Object.fromEntries(
              Object.entries(s.fields)
                .filter(([, v]) => typeof v === "string" || typeof v === "number")
                .map(([k, v]) => [k, String(v)]),
            )
          : {},
      })) as Application["assets"],
    documents: (Array.isArray(a.documents) ? a.documents : []).filter(isObj).map((d) => ({ ...d })) as unknown as Application["documents"],
    notes: (Array.isArray(a.notes) ? a.notes : []).filter(isObj).map((d) => ({ ...d })) as unknown as Application["notes"],
    audit: (Array.isArray(a.audit) ? a.audit : []).filter(isObj).map((d) => ({ ...d })) as unknown as Application["audit"],
    docRequests: (Array.isArray(a.docRequests) ? a.docRequests : []).filter(isObj).map((d) => ({ ...d })) as unknown as Application["docRequests"],
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
  /** Session expiry (ms epoch). Staff sessions last 12 hours. */
  exp?: number;
}

export const STAFF_SESSION_MS = 12 * 60 * 60 * 1000;

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
  // The draft intentionally lives in memory only: every page load starts a fresh,
  // empty application. Submitted applications are still stored (staff queue).
  const [draft, setDraft] = useState<Application>(() => {
    // Purge any draft an older version may have persisted; drafts never restore.
    try {
      localStorage.removeItem("cf.draft.v2");
    } catch {
      /* ignore */
    }
    return hydrateBank(emptyApplication());
  });
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
  const [staff, setStaff] = useState<Staff | null>(() => {
    const s = load<Staff | null>(K.staff, () => null, sessionStorage);
    if (!s || typeof s !== "object") return null;
    if (s.exp && s.exp < Date.now()) {
      try {
        sessionStorage.removeItem(K.staff);
      } catch {
        /* ignore */
      }
      return null;
    }
    return s;
  });
  const [lastSaved, setLastSaved] = useState<number | null>(null);

  useEffect(() => {
    save(K.apps, apps.map(strip));
  }, [apps]);
  useEffect(() => {
    save(K.settings, settings);
  }, [settings]);

  const updateDraft = useCallback(
    (fn: (d: Application) => Application) =>
      setDraft((d) => ({ ...fn(d), updatedAt: new Date().toISOString() })),
    [],
  );
  const resetDraft = useCallback(() => setDraft(emptyApplication()), []);
  const loadSampleDraft = useCallback(() => setDraft({ ...sampleDraft(), sample: true }), []);

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
    const session: Staff = { ...s, exp: Date.now() + STAFF_SESSION_MS };
    setStaff(session);
    save(K.staff, session, sessionStorage);
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
