import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  useStore,
  KEYS,
  store,
  parseCSV,
  ingestMetrics,
  ingestFromUrl,
  clearMetrics,
  type DataSource,
  type MetricRow,
} from "@/lib/store";
import { PageHeader, Surface, Chip, FilledButton, OutlinedButton } from "@/components/app-shell";
import { Database, FileUp, Globe, Trash2, Plus, Hash, FileText } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_app/sources")({ component: Sources });

const STATUS_TONE: Record<string, "success" | "info" | "warning" | "danger" | "neutral"> = {
  connected: "success", syncing: "info", available: "neutral", action_needed: "warning", error: "danger",
};

function Sources() {
  const [sources, setSources] = useStore<DataSource[]>(KEYS.sources, []);
  const [metrics] = useStore<MetricRow[]>(KEYS.metrics, []);
  const [showAdd, setShowAdd] = useState<null | "csv" | "url">(null);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");

  const metricCount = metrics.length;
  const distinctMetrics = new Set(metrics.map((m) => m.metric_key)).size;

  const removeSource = (id: string) => {
    if (!confirm("Remove this source? Imported metrics are kept.")) return;
    setSources(sources.filter((s) => s.id !== id));
  };

  const handleCsv = async (file: File) => {
    setBusy(true);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      const n = ingestMetrics(rows, "merge");
      const src: DataSource = {
        id: crypto.randomUUID(),
        kind: "csv",
        name: name || file.name,
        category: "Upload",
        status: "connected",
        row_count: n,
        last_synced_at: new Date().toISOString(),
      };
      store.set(KEYS.sources, [src, ...store.get<DataSource[]>(KEYS.sources, [])]);
      toast.success(`Imported ${n.toLocaleString()} rows`);
      setShowAdd(null); setName("");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setBusy(false); }
  };

  const handleUrl = async () => {
    if (!url) return;
    setBusy(true);
    try {
      const n = await ingestFromUrl(url);
      const src: DataSource = {
        id: crypto.randomUUID(),
        kind: "http",
        name: name || new URL(url).hostname,
        category: "HTTP endpoint",
        status: "connected",
        row_count: n,
        last_synced_at: new Date().toISOString(),
      };
      store.set(KEYS.sources, [{ ...src }, ...store.get<DataSource[]>(KEYS.sources, [])]);
      toast.success(`Imported ${n.toLocaleString()} rows from ${src.name}`);
      setShowAdd(null); setUrl(""); setName("");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setBusy(false); }
  };

  const resetData = () => {
    if (!confirm("Clear all metrics? Demo and imported data will be removed.")) return;
    clearMetrics();
    toast.success("Metrics cleared");
  };

  return (
    <>
      <PageHeader
        title="Data sources"
        subtitle="Bring real metrics in via CSV or HTTP. Data is stored locally in your browser."
        actions={
          <>
            <OutlinedButton onClick={() => setShowAdd("url")}><Globe className="size-4" /> HTTP / JSON</OutlinedButton>
            <FilledButton onClick={() => setShowAdd("csv")}><Plus className="size-4" /> Import CSV</FilledButton>
          </>
        }
      />

      <Surface className="p-5 mb-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat icon={Database} label="Sources" value={sources.length.toString()} />
          <Stat icon={Hash} label="Metric rows" value={metricCount.toLocaleString()} />
          <Stat icon={FileText} label="Distinct metrics" value={distinctMetrics.toString()} />
          <div className="flex items-end justify-end">
            <OutlinedButton onClick={resetData}><Trash2 className="size-4" /> Clear all metrics</OutlinedButton>
          </div>
        </div>
      </Surface>

      {showAdd === "csv" && (
        <Surface className="p-6 mb-5 border-2 border-primary/40">
          <h3 className="font-semibold flex items-center gap-2"><FileUp className="size-4" /> Import CSV</h3>
          <p className="text-sm text-on-surface-variant mt-1">
            File must have headers: <code className="text-xs bg-surface-container px-1.5 py-0.5 rounded">metric_key, date, value</code> and optionally <code className="text-xs bg-surface-container px-1.5 py-0.5 rounded">dimension</code>.
          </p>
          <Field label="Display name" optional>
            <input className="w-full h-11 px-3 rounded-xl bg-surface-container border border-outline-variant" placeholder="e.g. Q1 revenue export" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <div className="mt-4 flex flex-wrap gap-2">
            <label className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 cursor-pointer">
              <FileUp className="size-4" /> Choose CSV file
              <input type="file" accept=".csv,text/csv" className="hidden" disabled={busy} onChange={(e) => e.target.files?.[0] && handleCsv(e.target.files[0])} />
            </label>
            <OutlinedButton onClick={() => { setShowAdd(null); setName(""); }}>Cancel</OutlinedButton>
          </div>
        </Surface>
      )}

      {showAdd === "url" && (
        <Surface className="p-6 mb-5 border-2 border-primary/40">
          <h3 className="font-semibold flex items-center gap-2"><Globe className="size-4" /> HTTP / JSON endpoint</h3>
          <p className="text-sm text-on-surface-variant mt-1">
            Fetches a JSON array or CSV from any URL (your warehouse, API, S3, gist). Expects rows shaped like <code className="text-xs bg-surface-container px-1.5 py-0.5 rounded">{`{ metric_key, date, value, dimension? }`}</code>.
          </p>
          <Field label="Display name" optional>
            <input className="w-full h-11 px-3 rounded-xl bg-surface-container border border-outline-variant" placeholder="e.g. Production warehouse" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="URL">
            <input className="w-full h-11 px-3 rounded-xl bg-surface-container border border-outline-variant" placeholder="https://example.com/metrics.json" value={url} onChange={(e) => setUrl(e.target.value)} />
          </Field>
          <div className="mt-4 flex flex-wrap gap-2">
            <FilledButton onClick={handleUrl} disabled={busy || !url}>{busy ? "Fetching…" : "Fetch & import"}</FilledButton>
            <OutlinedButton onClick={() => { setShowAdd(null); setUrl(""); setName(""); }}>Cancel</OutlinedButton>
          </div>
        </Surface>
      )}

      {sources.length === 0 ? (
        <Surface className="p-10 text-center">
          <Database className="size-10 mx-auto text-on-surface-variant" />
          <h3 className="font-semibold mt-3">No sources connected</h3>
          <p className="text-sm text-on-surface-variant mt-1">Import a CSV or point Bus In at a JSON endpoint to start.</p>
        </Surface>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sources.map((s) => (
            <Surface key={s.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-11 rounded-2xl bg-primary-container text-on-primary-container grid place-items-center shrink-0">
                    {s.kind === "csv" ? <FileUp className="size-5" /> : s.kind === "http" ? <Globe className="size-5" /> : <Database className="size-5" />}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{s.name}</div>
                    <div className="text-xs text-on-surface-variant">{s.category}</div>
                  </div>
                </div>
                <Chip tone={STATUS_TONE[s.status] ?? "neutral"}>{s.status.replace("_", " ")}</Chip>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-on-surface-variant">
                <span>{Number(s.row_count).toLocaleString()} rows</span>
                <span>{s.last_synced_at ? `Imported ${formatDistanceToNow(new Date(s.last_synced_at), { addSuffix: true })}` : "Never"}</span>
              </div>
              <div className="mt-4 flex gap-2">
                <OutlinedButton onClick={() => removeSource(s.id)}><Trash2 className="size-4" /> Remove</OutlinedButton>
              </div>
            </Surface>
          ))}
        </div>
      )}
    </>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="size-10 rounded-2xl bg-surface-container-high grid place-items-center text-on-surface-variant">
        <Icon className="size-5" />
      </div>
      <div>
        <div className="text-xs text-on-surface-variant">{label}</div>
        <div className="text-lg font-semibold">{value}</div>
      </div>
    </div>
  );
}

function Field({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <label className="block mt-4">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium">{label}</span>
        {optional ? <span className="text-xs text-on-surface-variant">optional</span> : null}
      </div>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
