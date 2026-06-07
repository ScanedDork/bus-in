import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useStore, KEYS, store, getStorageConfig, setStorageBackend } from "@/lib/store";
import { PageHeader, Surface, OutlinedButton, FilledButton } from "@/components/app-shell";
import { toast } from "sonner";
import { useState } from "react";
import type { BackendKind } from "@/lib/storage/backends";
import { Cpu, HardDrive, Server } from "lucide-react";

export const Route = createFileRoute("/_app/settings")({ component: SettingsLayout });

function SettingsLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const tabs = [
    { to: "/settings", label: "Workspace", exact: true },
    { to: "/settings/ai", label: "AI providers", exact: false },
  ];
  const isIndex = path === "/settings";
  return (
    <>
      <PageHeader title="Settings" subtitle="Configure your local workspace, storage, and AI providers." />
      <div className="flex gap-1 mb-5 p-1 bg-surface-container-high rounded-full w-fit">
        {tabs.map((t) => {
          const active = t.exact ? path === t.to : path.startsWith(t.to);
          return (
            <Link key={t.to} to={t.to} className={`h-9 px-4 rounded-full text-sm font-medium ${active ? "bg-primary text-primary-foreground" : "text-on-surface-variant hover:bg-surface-container"}`}>
              {t.label}
            </Link>
          );
        })}
      </div>
      {isIndex ? <WorkspaceTab /> : <Outlet />}
    </>
  );
}

function WorkspaceTab() {
  const [ws, setWs] = useStore<{ name: string }>(KEYS.workspace, { name: "My Startup" });

  const resetAll = () => {
    if (!confirm("Reset all local data? This clears metrics, reports, alerts, and notifications.")) return;
    Object.values(KEYS).forEach((k) => store.remove(k));
    window.location.reload();
  };
  const exportAll = () => {
    const dump: Record<string, unknown> = {};
    Object.values(KEYS).forEach((k) => { dump[k] = store.get(k, null); });
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `busin-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    toast.success("Exported");
  };
  const importAll = async (file: File) => {
    const text = await file.text();
    const data = JSON.parse(text);
    Object.entries(data).forEach(([k, v]) => store.set(k, v));
    toast.success("Imported");
    window.location.reload();
  };

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Surface className="p-6">
        <h3 className="font-semibold">Workspace</h3>
        <p className="text-sm text-on-surface-variant mt-1">Just a name — Bus In is fully open source and runs wherever you point it.</p>
        <label className="block text-xs text-on-surface-variant mt-4">Name</label>
        <input className="w-full mt-1 h-10 px-3 rounded-xl bg-surface-container border border-outline-variant" value={ws.name} onChange={(e) => setWs({ name: e.target.value })} />
      </Surface>
      <StorageBackendCard />
      <Surface className="p-6 md:col-span-2">
        <h3 className="font-semibold">Data</h3>
        <p className="text-sm text-on-surface-variant mt-1">Export your workspace as JSON, import from a previous backup, or reset everything.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <OutlinedButton onClick={exportAll}>Export JSON</OutlinedButton>
          <label className="inline-flex items-center gap-2 h-10 px-5 rounded-full border border-outline text-foreground text-sm font-medium hover:bg-surface-container-high cursor-pointer">
            Import JSON
            <input type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importAll(e.target.files[0])} />
          </label>
          <OutlinedButton onClick={resetAll}>Reset all data</OutlinedButton>
        </div>
      </Surface>
    </div>
  );
}

const BACKEND_META: Record<BackendKind, { label: string; desc: string; icon: typeof HardDrive }> = {
  memory: { label: "Browser memory", desc: "Ephemeral — cleared when you reload the tab. Great for demos.", icon: Cpu },
  local: { label: "Browser localStorage", desc: "Persists in this browser. Default. No server required.", icon: HardDrive },
  remote: { label: "Dedicated server", desc: "Sync to a self-hosted KV server. Share data across devices.", icon: Server },
};

function StorageBackendCard() {
  const initial = getStorageConfig();
  const [kind, setKind] = useState<BackendKind>(initial.kind);
  const [baseUrl, setBaseUrl] = useState(initial.remote?.baseUrl ?? "http://localhost:8787");
  const [token, setToken] = useState(initial.remote?.token ?? "");
  const [saving, setSaving] = useState(false);

  const apply = async () => {
    setSaving(true);
    try {
      await setStorageBackend(
        kind === "remote"
          ? { kind, remote: { baseUrl: baseUrl.trim(), token: token.trim() || undefined } }
          : { kind },
      );
      toast.success(`Storage set to ${BACKEND_META[kind].label}`);
      setTimeout(() => window.location.reload(), 300);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Surface className="p-6">
      <h3 className="font-semibold">Storage backend</h3>
      <p className="text-sm text-on-surface-variant mt-1">Choose where your workspace data lives.</p>
      <div className="grid sm:grid-cols-3 gap-2 mt-4">
        {(Object.keys(BACKEND_META) as BackendKind[]).map((k) => {
          const m = BACKEND_META[k];
          const Icon = m.icon;
          const active = kind === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`text-left p-3 rounded-2xl border transition-colors ${active ? "border-primary bg-primary-container/40" : "border-outline-variant hover:bg-surface-container-high"}`}
            >
              <Icon className="size-4 mb-2 text-on-surface-variant" />
              <div className="text-sm font-medium">{m.label}</div>
              <div className="text-xs text-on-surface-variant mt-0.5">{m.desc}</div>
            </button>
          );
        })}
      </div>
      {kind === "remote" ? (
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs text-on-surface-variant">Base URL</label>
            <input className="w-full mt-1 h-10 px-3 rounded-xl bg-surface-container border border-outline-variant" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="http://localhost:8787" />
          </div>
          <div>
            <label className="block text-xs text-on-surface-variant">Bearer token (optional)</label>
            <input type="password" className="w-full mt-1 h-10 px-3 rounded-xl bg-surface-container border border-outline-variant" value={token} onChange={(e) => setToken(e.target.value)} />
          </div>
          <p className="text-xs text-on-surface-variant">Run the reference server in <code className="bg-surface-container px-1.5 py-0.5 rounded">server/</code> or any service exposing <code className="bg-surface-container px-1.5 py-0.5 rounded">GET/PUT /kv</code>.</p>
        </div>
      ) : null}
      <div className="mt-4 flex justify-end">
        <FilledButton onClick={apply} disabled={saving}>{saving ? "Switching…" : "Apply"}</FilledButton>
      </div>
    </Surface>
  );
}
