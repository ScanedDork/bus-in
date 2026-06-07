import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore, KEYS, evaluateAlertsLocal, type Alert, type AlertOp } from "@/lib/store";
import { PageHeader, Surface, FilledButton, OutlinedButton, Chip } from "@/components/app-shell";
import { METRIC_LABELS } from "@/lib/metrics-catalog";
import { BellRing, Plus, Trash2, Bell, Play } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/alerts")({ component: Alerts });

const METRICS = ["mrr", "arr", "burn", "runway_months", "ndr", "cac_payback", "gross_margin", "magic_number", "burn_multiple"];
const OPS: { v: AlertOp; l: string }[] = [
  { v: "lt", l: "<" }, { v: "lte", l: "≤" }, { v: "gt", l: ">" }, { v: "gte", l: "≥" }, { v: "eq", l: "=" },
];

function Alerts() {
  const [alerts, setAlerts] = useStore<Alert[]>(KEYS.alerts, []);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({
    name: "Runway under 12 months",
    metric_key: "runway_months",
    operator: "lt" as AlertOp,
    threshold: 12,
    enabled: true,
  });

  const save = () => {
    const now = new Date().toISOString();
    setAlerts([{ id: crypto.randomUUID(), ...draft, last_triggered_at: null, created_at: now }, ...alerts]);
    setOpen(false);
    toast.success("Alert saved");
  };
  const del = (id: string) => setAlerts(alerts.filter((a) => a.id !== id));
  const evalNow = () => {
    const n = evaluateAlertsLocal();
    toast.success(`${n} alert${n === 1 ? "" : "s"} triggered`);
  };

  return (
    <>
      <PageHeader
        title="KPI alerts"
        subtitle="Get notified when any KPI crosses a threshold. In-app notifications."
        actions={
          <>
            <OutlinedButton onClick={evalNow}><Play className="size-4" /> Evaluate now</OutlinedButton>
            <FilledButton onClick={() => setOpen(true)}><Plus className="size-4" /> New alert</FilledButton>
          </>
        }
      />
      {alerts.length === 0 ? (
        <Surface className="p-12 text-center">
          <BellRing className="size-10 mx-auto text-on-surface-variant" />
          <h3 className="mt-3 font-semibold">No alerts yet</h3>
          <p className="text-sm text-on-surface-variant mt-1">Create your first threshold to start monitoring.</p>
        </Surface>
      ) : (
        <div className="space-y-2">
          {alerts.map((a) => (
            <Surface key={a.id} className="p-4 flex items-center gap-4">
              <div className="size-10 rounded-2xl bg-tertiary-container text-on-tertiary-container grid place-items-center">
                <BellRing className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium">{a.name}</div>
                <div className="text-xs text-on-surface-variant">
                  {METRIC_LABELS[a.metric_key] ?? a.metric_key} {OPS.find((o) => o.v === a.operator)?.l} {a.threshold}
                </div>
              </div>
              <Chip tone="neutral"><Bell className="size-3" /> in-app</Chip>
              <Chip tone={a.enabled ? "success" : "neutral"}>{a.enabled ? "Enabled" : "Paused"}</Chip>
              <button onClick={() => confirm("Delete alert?") && del(a.id)} className="size-9 grid place-items-center rounded-full hover:bg-surface-container-high">
                <Trash2 className="size-4" />
              </button>
            </Surface>
          ))}
        </div>
      )}

      {open ? (
        <div className="fixed inset-0 bg-black/40 z-30 grid place-items-center p-4" onClick={() => setOpen(false)}>
          <Surface tone="lowest" className="w-full max-w-md p-6" onClick={(e: any) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">New alert</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-on-surface-variant">Name</label>
                <input className="w-full mt-1 h-10 px-3 rounded-xl bg-surface-container border border-outline-variant" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-xs text-on-surface-variant">Metric</label>
                  <select className="w-full mt-1 h-10 px-3 rounded-xl bg-surface-container border border-outline-variant" value={draft.metric_key} onChange={(e) => setDraft({ ...draft, metric_key: e.target.value })}>
                    {METRICS.map((m) => <option key={m} value={m}>{METRIC_LABELS[m] ?? m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-on-surface-variant">Op</label>
                  <select className="w-full mt-1 h-10 px-3 rounded-xl bg-surface-container border border-outline-variant" value={draft.operator} onChange={(e) => setDraft({ ...draft, operator: e.target.value as AlertOp })}>
                    {OPS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-on-surface-variant">Threshold</label>
                <input type="number" className="w-full mt-1 h-10 px-3 rounded-xl bg-surface-container border border-outline-variant" value={draft.threshold} onChange={(e) => setDraft({ ...draft, threshold: Number(e.target.value) })} />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <OutlinedButton onClick={() => setOpen(false)}>Cancel</OutlinedButton>
              <FilledButton onClick={save}>Save alert</FilledButton>
            </div>
          </Surface>
        </div>
      ) : null}
    </>
  );
}
