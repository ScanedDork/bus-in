// Local-first store. Data is held in a pluggable backend (memory,
// localStorage, or remote KV server) and exposed reactively to components.

import { useSyncExternalStore } from "react";
import {
  createBackend,
  readBackendConfig,
  writeBackendConfig,
  type BackendConfig,
  type BackendKind,
  type StorageBackend,
} from "@/lib/storage/backends";

type Listener = () => void;
const listeners = new Map<string, Set<Listener>>();
const snapshotCache = new Map<string, unknown>();
const cacheHas = new Map<string, true>();

let backend: StorageBackend = createBackend(
  typeof window === "undefined" ? { kind: "memory" } : readBackendConfig(),
);
let externalUnsub: (() => void) | null = null;
let hydrated = false;

function emit(key: string) {
  cacheHas.delete(key);
  snapshotCache.delete(key);
  listeners.get(key)?.forEach((l) => l());
}

function subscribe(key: string, l: Listener) {
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(l);
  return () => {
    set!.delete(l);
  };
}

function bindExternal() {
  externalUnsub?.();
  externalUnsub = backend.onExternalChange((key) => emit(key));
}
bindExternal();

function readRaw<T>(key: string, fallback: T): T {
  try {
    const raw = backend.get(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function getSnapshot<T>(key: string, fallback: T): T {
  if (cacheHas.has(key)) return snapshotCache.get(key) as T;
  const v = readRaw<T>(key, fallback);
  snapshotCache.set(key, v);
  cacheHas.set(key, true);
  return v;
}

function writeRaw<T>(key: string, value: T) {
  backend.set(key, JSON.stringify(value));
  emit(key);
}

export function useStore<T>(key: string, fallback: T): [T, (v: T | ((p: T) => T)) => void] {
  const value = useSyncExternalStore(
    (l) => subscribe(key, l),
    () => getSnapshot<T>(key, fallback),
    () => fallback,
  );
  const setValue = (next: T | ((p: T) => T)) => {
    const v = typeof next === "function" ? (next as (p: T) => T)(readRaw(key, fallback)) : next;
    writeRaw(key, v);
  };
  return [value, setValue];
}

export const store = {
  get: <T,>(key: string, fallback: T): T => readRaw(key, fallback),
  set: <T,>(key: string, v: T) => writeRaw(key, v),
  update: <T,>(key: string, fallback: T, fn: (p: T) => T) => writeRaw(key, fn(readRaw(key, fallback))),
  remove: (key: string) => {
    backend.remove(key);
    emit(key);
  },
};

// ---- Storage backend management -----------------------------------------

export function getStorageBackend(): BackendKind {
  return backend.kind;
}

export function getStorageConfig(): BackendConfig {
  return typeof window === "undefined" ? { kind: "memory" } : readBackendConfig();
}

export async function setStorageBackend(cfg: BackendConfig): Promise<void> {
  writeBackendConfig(cfg);
  backend = createBackend(cfg);
  hydrated = false;
  bindExternal();
  await ensureHydrated();
  for (const key of Array.from(cacheHas.keys())) emit(key);
}

export async function ensureHydrated(): Promise<void> {
  if (hydrated) return;
  await backend.hydrate();
  hydrated = true;
}

// ---- Domain types ---------------------------------------------------------

export type DataSource = {
  id: string;
  kind: string;
  name: string;
  category: string;
  status: "connected" | "syncing" | "available" | "action_needed" | "error";
  row_count: number;
  last_synced_at: string | null;
};

export type MetricRow = {
  metric_key: string;
  dimension: string | null;
  date: string;
  value: number;
};

export type Widget = {
  id: string;
  kind: "kpi" | "area" | "bar" | "pie" | "funnel";
  title: string;
  metric_key: string;
};

export type Report = {
  id: string;
  name: string;
  description: string;
  widgets: Widget[];
  created_at: string;
  updated_at: string;
};

export type AlertOp = "lt" | "lte" | "gt" | "gte" | "eq";
export type Alert = {
  id: string;
  name: string;
  metric_key: string;
  operator: AlertOp;
  threshold: number;
  enabled: boolean;
  last_triggered_at: string | null;
  created_at: string;
};

export type Notification = {
  id: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export const KEYS = {
  sources: "sources",
  metrics: "metrics",
  reports: "reports",
  alerts: "alerts",
  notifications: "notifications",
  workspace: "workspace",
  seeded: "seeded:v1",
} as const;

// ---- Seed -----------------------------------------------------------------

export function ensureSeed() {
  if (typeof window === "undefined") return;
  if (store.get<boolean>(KEYS.seeded, false)) return;

  const today = new Date();
  store.set(KEYS.sources, [] as DataSource[]);


  const rows: MetricRow[] = [];
  const push = (k: string, v: number, date: string, dim: string | null = null) =>
    rows.push({ metric_key: k, dimension: dim, date, value: v });

  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const day = d.toISOString().slice(0, 10);
    const t = (364 - i) / 364;
    const mrr = Math.round(42000 * Math.pow(1.085, (364 - i) / 30) + Math.sin(i / 7) * 1200);
    const revenue = mrr;
    const burn = Math.round(180000 - t * 40000 + Math.cos(i / 11) * 6000);
    const grossMargin = 72 + t * 7 + Math.sin(i / 30) * 0.6;
    const ndr = 104 + t * 8 + Math.sin(i / 21) * 1.5;
    const cacPayback = 12 - t * 3 + Math.cos(i / 17) * 0.4;
    const runway = 14 + t * 9;
    const magic = 0.6 + t * 0.5;
    const burnMul = 1.4 - t * 0.7;
    const arr = mrr * 12;
    const netNewArr = i < 364 ? (mrr - 42000 * Math.pow(1.085, (363 - i) / 30)) * 12 : 0;

    push("mrr", mrr, day);
    push("arr", arr, day);
    push("net_new_arr", Math.max(0, netNewArr), day);
    push("revenue", revenue, day);
    push("burn", burn, day);
    push("gross_margin", grossMargin, day);
    push("ndr", ndr, day);
    push("cac_payback", cacPayback, day);
    push("runway_months", runway, day);
    push("magic_number", magic, day);
    push("burn_multiple", burnMul, day);

    if (i === 0) {
      push("funnel", 48210, day, "Visitors");
      push("funnel", 6840, day, "Signups");
      push("funnel", 3120, day, "Activated");
      push("funnel", 842, day, "Paying");
      push("funnel", 712, day, "Retained 30d");
      push("channel_signups", 38, day, "Organic");
      push("channel_signups", 24, day, "Paid");
      push("channel_signups", 18, day, "Referral");
      push("channel_signups", 12, day, "Outbound");
      push("channel_signups", 8, day, "Community");
    }
  }
  for (let c = 0; c < 8; c++) {
    const cohort = `2026-${String(c + 1).padStart(2, "0")}`;
    const weeks = [0, 1, 2, 3, 4, 8, 12];
    const values = [100, 78 - c * 1.4, 64 - c * 1.2, 55 - c, 49 - c * 0.9, 38 - c * 0.8, 31 - c * 0.7];
    weeks.forEach((w, idx) => {
      push("cohort_retention", values[idx], today.toISOString().slice(0, 10), `${cohort}|w${w}`);
    });
  }

  store.set(KEYS.metrics, rows);
  store.set(KEYS.workspace, { name: "My Startup" });
  store.set(KEYS.reports, [] as Report[]);
  store.set(KEYS.alerts, [] as Alert[]);
  store.set(KEYS.notifications, [] as Notification[]);
  store.set(KEYS.seeded, true);
}

// ---- Queries on metrics ---------------------------------------------------

export function queryMetrics(from: string, to: string, keys?: string[]): MetricRow[] {
  const all = store.get<MetricRow[]>(KEYS.metrics, []);
  return all.filter((r) => {
    if (r.date < from || r.date > to) return false;
    if (keys && keys.length && !keys.includes(r.metric_key)) return false;
    return true;
  });
}

// ---- Notifications --------------------------------------------------------

export function pushNotification(n: Omit<Notification, "id" | "read_at" | "created_at">) {
  store.update<Notification[]>(KEYS.notifications, [], (prev) => [
    { id: crypto.randomUUID(), read_at: null, created_at: new Date().toISOString(), ...n },
    ...prev,
  ].slice(0, 100));
}

// ---- Simulated source sync -----------------------------------------------

export async function syncSourceLocal(id: string) {
  store.update<DataSource[]>(KEYS.sources, [], (prev) =>
    prev.map((s) => (s.id === id ? { ...s, status: "syncing" } : s)),
  );
  await new Promise((r) => setTimeout(r, 600));
  store.update<DataSource[]>(KEYS.sources, [], (prev) =>
    prev.map((s) =>
      s.id === id
        ? {
            ...s,
            status: "connected",
            row_count: s.row_count + Math.floor(Math.random() * 5000 + 200),
            last_synced_at: new Date().toISOString(),
          }
        : s,
    ),
  );
}

// ---- Real ingestion -------------------------------------------------------

export type IngestRow = { metric_key?: string; date?: string; value?: number | string; dimension?: string | null };

function coerceRows(raw: unknown): MetricRow[] {
  const arr = Array.isArray(raw) ? raw : Array.isArray((raw as any)?.rows) ? (raw as any).rows : [];
  const out: MetricRow[] = [];
  for (const r of arr as IngestRow[]) {
    if (!r || !r.metric_key || !r.date) continue;
    const v = typeof r.value === "string" ? Number(r.value) : r.value;
    if (v === undefined || v === null || Number.isNaN(v)) continue;
    out.push({
      metric_key: String(r.metric_key),
      date: String(r.date).slice(0, 10),
      value: Number(v),
      dimension: r.dimension == null || r.dimension === "" ? null : String(r.dimension),
    });
  }
  return out;
}

export function parseCSV(text: string): MetricRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const split = (s: string) => s.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
  const headers = split(lines[0]).map((h) => h.toLowerCase());
  const idx = (n: string) => headers.indexOf(n);
  const mi = idx("metric_key"); const di = idx("date"); const vi = idx("value"); const dimi = idx("dimension");
  if (mi < 0 || di < 0 || vi < 0) throw new Error("CSV must include headers: metric_key, date, value (dimension optional)");
  const rows: IngestRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = split(lines[i]);
    rows.push({ metric_key: cells[mi], date: cells[di], value: cells[vi] ?? "", dimension: dimi >= 0 ? (cells[dimi] ?? null) : null });
  }
  return coerceRows(rows);
}

export function ingestMetrics(rows: MetricRow[], mode: "merge" | "replace" = "merge"): number {
  if (rows.length === 0) return 0;
  store.update<MetricRow[]>(KEYS.metrics, [], (prev) => {
    if (mode === "replace") return rows;
    const key = (r: MetricRow) => `${r.metric_key}|${r.date}|${r.dimension ?? ""}`;
    const map = new Map(prev.map((r) => [key(r), r]));
    rows.forEach((r) => map.set(key(r), r));
    return Array.from(map.values());
  });
  return rows.length;
}

export function clearMetrics() {
  store.set(KEYS.metrics, [] as MetricRow[]);
}

export async function ingestFromUrl(url: string): Promise<number> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const ct = res.headers.get("content-type") ?? "";
  let rows: MetricRow[];
  if (ct.includes("application/json") || url.endsWith(".json")) {
    rows = coerceRows(await res.json());
  } else {
    rows = parseCSV(await res.text());
  }
  return ingestMetrics(rows, "merge");
}


// ---- Alerts evaluation ---------------------------------------------------

export function evaluateAlertsLocal(): number {
  const alerts = store.get<Alert[]>(KEYS.alerts, []);
  const metrics = store.get<MetricRow[]>(KEYS.metrics, []);
  let triggered = 0;
  const updated = alerts.map((a) => {
    if (!a.enabled) return a;
    const series = metrics
      .filter((r) => r.metric_key === a.metric_key && r.dimension === null)
      .sort((x, y) => (x.date < y.date ? 1 : -1));
    const latest = series[0];
    if (!latest) return a;
    const v = latest.value;
    const t = a.threshold;
    const breached =
      (a.operator === "lt" && v < t) ||
      (a.operator === "lte" && v <= t) ||
      (a.operator === "gt" && v > t) ||
      (a.operator === "gte" && v >= t) ||
      (a.operator === "eq" && v === t);
    if (breached) {
      triggered++;
      pushNotification({
        title: `Alert: ${a.name}`,
        body: `${a.metric_key} is ${v.toFixed(2)} (${a.operator} ${t})`,
      });
      return { ...a, last_triggered_at: new Date().toISOString() };
    }
    return a;
  });
  store.set(KEYS.alerts, updated);
  return triggered;
}
