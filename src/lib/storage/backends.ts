// Pluggable storage backends for Bus In.
// All backends expose the same synchronous read API, backed by an in-memory
// cache. Persistence happens asynchronously where applicable.

export type BackendKind = "memory" | "local" | "remote";

export type RemoteConfig = {
  baseUrl: string; // e.g. http://localhost:8787
  token?: string; // optional bearer token
};

export type BackendConfig = {
  kind: BackendKind;
  remote?: RemoteConfig;
};

const PREFIX = "busin:";
const CONFIG_KEY = "__busin_storage_config__"; // stored in localStorage regardless

export interface StorageBackend {
  kind: BackendKind;
  /** Synchronous read from in-memory cache (after hydrate). */
  get(key: string): string | null;
  /** Persist a value. May be async; cache updates synchronously. */
  set(key: string, value: string): void;
  /** Remove a key. */
  remove(key: string): void;
  /** Hydrate the in-memory cache (e.g. pull from remote). */
  hydrate(): Promise<void>;
  /** Subscribe to external changes (cross-tab / remote push). */
  onExternalChange(cb: (key: string) => void): () => void;
}

// ---- Memory backend (ephemeral) -----------------------------------------

class MemoryBackend implements StorageBackend {
  kind: BackendKind = "memory";
  private map = new Map<string, string>();
  get(k: string) {
    return this.map.has(k) ? this.map.get(k)! : null;
  }
  set(k: string, v: string) {
    this.map.set(k, v);
  }
  remove(k: string) {
    this.map.delete(k);
  }
  async hydrate() {}
  onExternalChange() {
    return () => {};
  }
}

// ---- localStorage backend -----------------------------------------------

class LocalBackend implements StorageBackend {
  kind: BackendKind = "local";
  get(k: string) {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(PREFIX + k);
  }
  set(k: string, v: string) {
    if (typeof window === "undefined") return;
    localStorage.setItem(PREFIX + k, v);
  }
  remove(k: string) {
    if (typeof window === "undefined") return;
    localStorage.removeItem(PREFIX + k);
  }
  async hydrate() {}
  onExternalChange(cb: (key: string) => void) {
    if (typeof window === "undefined") return () => {};
    const handler = (e: StorageEvent) => {
      if (!e.key || !e.key.startsWith(PREFIX)) return;
      cb(e.key.slice(PREFIX.length));
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }
}

// ---- Remote backend ------------------------------------------------------

class RemoteBackend implements StorageBackend {
  kind: BackendKind = "remote";
  private cache = new Map<string, string>();
  private pending = new Map<string, string | null>();
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<(key: string) => void>();
  constructor(private cfg: RemoteConfig) {}

  private headers() {
    return {
      "Content-Type": "application/json",
      ...(this.cfg.token ? { Authorization: `Bearer ${this.cfg.token}` } : {}),
    };
  }

  get(k: string) {
    return this.cache.has(k) ? this.cache.get(k)! : null;
  }

  set(k: string, v: string) {
    this.cache.set(k, v);
    this.pending.set(k, v);
    this.scheduleFlush();
  }

  remove(k: string) {
    this.cache.delete(k);
    this.pending.set(k, null);
    this.scheduleFlush();
  }

  private scheduleFlush() {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => this.flush(), 250);
  }

  private async flush() {
    this.flushTimer = null;
    if (this.pending.size === 0) return;
    const batch = Array.from(this.pending.entries()).map(([key, value]) => ({ key, value }));
    this.pending.clear();
    try {
      await fetch(`${this.cfg.baseUrl.replace(/\/$/, "")}/kv`, {
        method: "PUT",
        headers: this.headers(),
        body: JSON.stringify({ items: batch }),
      });
    } catch (e) {
      console.error("[remote storage] flush failed", e);
    }
  }

  async hydrate() {
    try {
      const res = await fetch(`${this.cfg.baseUrl.replace(/\/$/, "")}/kv`, { headers: this.headers() });
      if (!res.ok) throw new Error(`Remote storage ${res.status}`);
      const data = (await res.json()) as Record<string, string>;
      this.cache.clear();
      for (const [k, v] of Object.entries(data)) this.cache.set(k, v);
      for (const k of Object.keys(data)) this.listeners.forEach((cb) => cb(k));
    } catch (e) {
      console.error("[remote storage] hydrate failed", e);
    }
  }

  onExternalChange(cb: (key: string) => void) {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }
}

// ---- Config persistence + factory ---------------------------------------

export function readBackendConfig(): BackendConfig {
  if (typeof window === "undefined") return { kind: "memory" };
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return { kind: "local" };
    return JSON.parse(raw) as BackendConfig;
  } catch {
    return { kind: "local" };
  }
}

export function writeBackendConfig(cfg: BackendConfig) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
}

export function createBackend(cfg: BackendConfig): StorageBackend {
  switch (cfg.kind) {
    case "memory":
      return new MemoryBackend();
    case "remote":
      if (!cfg.remote?.baseUrl) return new LocalBackend();
      return new RemoteBackend(cfg.remote);
    case "local":
    default:
      return new LocalBackend();
  }
}
