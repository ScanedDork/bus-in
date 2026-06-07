import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useStore, KEYS, type Report, type Widget } from "@/lib/store";
import { PageHeader, Surface, FilledButton, OutlinedButton, Chip } from "@/components/app-shell";
import { useDateRange } from "@/components/date-range-picker";
import { useMetrics, pickSeries, latest, byDimension } from "@/hooks/use-metrics";
import { METRIC_LABELS, formatMetric, FUNNEL_STAGES } from "@/lib/metrics-catalog";
import { chat, getActiveConfig, safeParseJSON } from "@/lib/ai/client";
import { Plus, Save, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_app/reports/new")({ component: NewReport });

const KPI_OPTIONS = ["mrr", "arr", "burn", "runway_months", "ndr", "cac_payback", "gross_margin", "magic_number", "net_new_arr"];
const CHART_OPTIONS = ["mrr", "arr", "burn", "revenue", "ndr", "runway_months", "gross_margin"];

function NewReport() {
  const navigate = useNavigate();
  const range = useDateRange();
  const { data } = useMetrics(range);
  const rows = data.rows;
  const [reports, setReports] = useStore<Report[]>(KEYS.reports, []);

  const [name, setName] = useState("Untitled report");
  const [description, setDescription] = useState("");
  const [widgets, setWidgets] = useState<Widget[]>([
    { id: crypto.randomUUID(), kind: "kpi", title: "MRR", metric_key: "mrr" },
    { id: crypto.randomUUID(), kind: "area", title: "Recurring revenue", metric_key: "mrr" },
  ]);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiBusy, setAiBusy] = useState(false);

  const save = () => {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    setReports([{ id, name, description, widgets, created_at: now, updated_at: now }, ...reports]);
    toast.success("Report saved");
    navigate({ to: "/reports" });
  };

  const add = (kind: Widget["kind"], metric_key: string, title: string) =>
    setWidgets((w) => [...w, { id: crypto.randomUUID(), kind, metric_key, title }]);
  const remove = (id: string) => setWidgets((w) => w.filter((x) => x.id !== id));

  const aiGenerate = async () => {
    if (!getActiveConfig()) { toast.error("Configure AI in Settings → AI first"); return; }
    if (!aiPrompt.trim()) return;
    setAiBusy(true);
    try {
      const allMetrics = [...KPI_OPTIONS, ...CHART_OPTIONS, "funnel", "channel_signups"];
      const text = await chat({
        messages: [
          { role: "system", content: `You are a dashboard composer. Output ONLY JSON matching: {"name":string,"description":string,"widgets":[{"kind":"kpi"|"area"|"bar"|"pie"|"funnel","title":string,"metric_key":string}]}. Valid metric_keys: ${allMetrics.join(", ")}. Use "funnel" with kind:"funnel". Use "channel_signups" with kind:"pie". Max 8 widgets.` },
          { role: "user", content: aiPrompt },
        ],
        json: true,
        temperature: 0.2,
      });
      const parsed = safeParseJSON<{ name: string; description: string; widgets: Omit<Widget, "id">[] }>(text);
      if (!parsed || !Array.isArray(parsed.widgets)) throw new Error("AI returned invalid format");
      if (parsed.name) setName(parsed.name);
      if (parsed.description) setDescription(parsed.description);
      setWidgets(parsed.widgets.slice(0, 24).map((w) => ({ ...w, id: crypto.randomUUID() })));
      toast.success("AI composed the report");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="New report"
        subtitle="Build manually or describe it to AI."
        actions={
          <>
            <OutlinedButton onClick={() => navigate({ to: "/reports" })}>Cancel</OutlinedButton>
            <FilledButton onClick={save}><Save className="size-4" /> Save report</FilledButton>
          </>
        }
      />

      <Surface tone="lowest" className="p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="size-4 text-primary" />
          <div className="font-semibold text-sm">Describe your report to AI</div>
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 h-10 px-3 rounded-xl bg-surface-container border border-outline-variant text-sm"
            placeholder='e.g. "Show me a CFO dashboard with MRR, runway, burn, and NDR trends"'
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && aiGenerate()}
          />
          <FilledButton onClick={aiGenerate} disabled={aiBusy}><Sparkles className="size-4" /> {aiBusy ? "Composing…" : "Generate"}</FilledButton>
        </div>
      </Surface>

      <div className="grid lg:grid-cols-[280px_1fr] gap-4">
        <Surface className="p-4 h-fit">
          <div className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">Settings</div>
          <label className="block text-xs font-medium text-on-surface-variant mt-2">Name</label>
          <input className="w-full mt-1 h-10 px-3 rounded-xl bg-surface-container border border-outline-variant" value={name} onChange={(e) => setName(e.target.value)} />
          <label className="block text-xs font-medium text-on-surface-variant mt-3">Description</label>
          <textarea className="w-full mt-1 px-3 py-2 rounded-xl bg-surface-container border border-outline-variant" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />

          <div className="mt-5 text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">Add KPI</div>
          <div className="grid grid-cols-2 gap-1.5">
            {KPI_OPTIONS.map((k) => (
              <button key={k} onClick={() => add("kpi", k, METRIC_LABELS[k] ?? k)} className="text-xs h-8 px-2 rounded-full bg-surface-container hover:bg-surface-container-high">
                + {METRIC_LABELS[k] ?? k}
              </button>
            ))}
          </div>

          <div className="mt-5 text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">Add chart</div>
          <div className="space-y-1.5">
            {CHART_OPTIONS.map((k) => (
              <div key={k} className="flex gap-1">
                <button onClick={() => add("area", k, METRIC_LABELS[k] ?? k)} className="flex-1 text-xs h-8 rounded-full bg-surface-container hover:bg-surface-container-high">Area · {METRIC_LABELS[k] ?? k}</button>
                <button onClick={() => add("bar", k, METRIC_LABELS[k] ?? k)} className="text-xs h-8 px-3 rounded-full bg-surface-container hover:bg-surface-container-high">Bar</button>
              </div>
            ))}
            <button onClick={() => add("funnel", "funnel", "Acquisition funnel")} className="w-full text-xs h-8 rounded-full bg-surface-container hover:bg-surface-container-high">+ Funnel</button>
            <button onClick={() => add("pie", "channel_signups", "Signups by channel")} className="w-full text-xs h-8 rounded-full bg-surface-container hover:bg-surface-container-high">+ Channels (pie)</button>
          </div>
        </Surface>

        <div>
          {widgets.length === 0 ? (
            <Surface className="p-12 text-center">
              <Plus className="size-8 mx-auto text-on-surface-variant" />
              <p className="text-sm text-on-surface-variant mt-2">Add widgets from the left panel.</p>
            </Surface>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {widgets.map((w) => (
                <WidgetView key={w.id} widget={w} rows={rows} onRemove={() => remove(w.id)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function WidgetView({ widget, rows, onRemove }: { widget: Widget; rows: any[]; onRemove: () => void }) {
  const wrap = (body: React.ReactNode) => (
    <Surface tone="lowest" className="p-5 relative group">
      <button onClick={onRemove} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition size-7 grid place-items-center rounded-full hover:bg-surface-container-high">
        <Trash2 className="size-4" />
      </button>
      <div className="text-xs font-medium text-on-surface-variant">{widget.title}</div>
      <Chip tone="neutral">{widget.kind}</Chip>
      <div className="mt-3">{body}</div>
    </Surface>
  );
  if (widget.kind === "kpi") return wrap(<div className="text-3xl font-semibold">{formatMetric(widget.metric_key, latest(rows, widget.metric_key))}</div>);
  if (widget.kind === "area" || widget.kind === "bar") {
    const s = pickSeries(rows, widget.metric_key);
    return wrap(
      <div className="h-40">
        <ResponsiveContainer>
          {widget.kind === "area" ? (
            <AreaChart data={s}>
              <CartesianGrid stroke="var(--outline-variant)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" hide /><YAxis hide />
              <Tooltip formatter={(v: number) => formatMetric(widget.metric_key, v)} contentStyle={{ background: "var(--surface-container-high)", border: "1px solid var(--outline-variant)", borderRadius: 12 }} />
              <Area dataKey="value" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.2} />
            </AreaChart>
          ) : (
            <BarChart data={s}>
              <CartesianGrid stroke="var(--outline-variant)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" hide /><YAxis hide />
              <Tooltip contentStyle={{ background: "var(--surface-container-high)", border: "1px solid var(--outline-variant)", borderRadius: 12 }} />
              <Bar dataKey="value" fill="var(--primary)" radius={[3, 3, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>,
    );
  }
  if (widget.kind === "pie") {
    const d = byDimension(rows, widget.metric_key);
    return wrap(
      <div className="h-40">
        <ResponsiveContainer>
          <PieChart>
            <Tooltip />
            <Pie data={d} dataKey="value" nameKey="name" outerRadius={60} innerRadius={32}>
              {d.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>,
    );
  }
  const f = FUNNEL_STAGES.map((s) => ({ stage: s, value: byDimension(rows, "funnel").find((r) => r.name === s)?.value ?? 0 }));
  return wrap(
    <div className="h-40">
      <ResponsiveContainer>
        <BarChart data={f} layout="vertical">
          <XAxis type="number" hide />
          <YAxis dataKey="stage" type="category" tick={{ fontSize: 10 }} width={70} stroke="var(--outline)" />
          <Tooltip />
          <Bar dataKey="value" radius={[0, 6, 6, 0]}>
            {f.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>,
  );
}
