import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { rangeSearchSchema } from "@/lib/range";
import { useDateRange } from "@/components/date-range-picker";
import { useMetrics, pickSeries, latest } from "@/hooks/use-metrics";
import { PageHeader, Surface, FilledButton } from "@/components/app-shell";
import { METRIC_LABELS, formatMetric } from "@/lib/metrics-catalog";
import { chat, getActiveConfig, safeParseJSON } from "@/lib/ai/client";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/forecast")({
  validateSearch: rangeSearchSchema,
  component: Forecast,
});

const METRICS = ["mrr", "arr", "revenue", "burn", "runway_months"];

function Forecast() {
  const range = useDateRange();
  const { data } = useMetrics(range, METRICS);
  const rows = data.rows;
  const [metric, setMetric] = useState("mrr");
  const [growth, setGrowth] = useState(8);
  const [churn, setChurn] = useState(2);
  const [months, setMonths] = useState(12);
  const [aiNote, setAiNote] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const series = pickSeries(rows, metric);
  const lastValue = latest(rows, metric);

  const forecast = useMemo(() => {
    const out: { date: string; actual?: number; forecast?: number; low?: number; high?: number }[] = [];
    series.forEach((p) => out.push({ date: p.date, actual: p.value }));
    let v = lastValue || 1;
    const startDate = series.length ? new Date(series[series.length - 1].date) : new Date();
    for (let i = 1; i <= months; i++) {
      const net = (growth - churn) / 100;
      v = v * (1 + net);
      const d = new Date(startDate);
      d.setMonth(startDate.getMonth() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const band = v * 0.08 * (1 + i * 0.05);
      out.push({ date: dateStr, forecast: v, low: v - band, high: v + band });
    }
    return out;
  }, [series, growth, churn, months, lastValue, metric]);

  const aiAnalyze = async () => {
    if (!getActiveConfig()) { toast.error("Configure AI in Settings → AI"); return; }
    setBusy(true);
    try {
      const text = await chat({
        messages: [
          { role: "system", content: "You are a startup CFO. Analyze the forecast scenario and give 2-3 short bullets (under 25 words each) about risks, opportunities, and recommended assumptions to validate. Plain text, '- ' bullets. No preamble." },
          { role: "user", content: `Metric: ${metric}\nCurrent value: ${lastValue.toFixed(2)}\nMonthly growth: ${growth}%\nMonthly churn: ${churn}%\nHorizon: ${months} months\nProjected end: ${forecast[forecast.length - 1].forecast?.toFixed(2)}` },
        ],
        temperature: 0.3,
      });
      setAiNote(text);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Forecast & what-if" subtitle="Project metrics forward with assumptions. AI analyzes the scenario." />
      <div className="grid lg:grid-cols-[300px_1fr] gap-4">
        <Surface className="p-5 h-fit space-y-4">
          <div>
            <label className="text-xs text-on-surface-variant">Metric</label>
            <select className="w-full mt-1 h-10 px-3 rounded-xl bg-surface-container border border-outline-variant" value={metric} onChange={(e) => setMetric(e.target.value)}>
              {METRICS.map((m) => <option key={m} value={m}>{METRIC_LABELS[m] ?? m}</option>)}
            </select>
          </div>
          <Slider label="Monthly growth %" value={growth} setValue={setGrowth} min={-10} max={30} />
          <Slider label="Monthly churn %" value={churn} setValue={setChurn} min={0} max={20} />
          <Slider label="Horizon (months)" value={months} setValue={setMonths} min={3} max={36} />
          <FilledButton onClick={aiAnalyze} disabled={busy} className="w-full justify-center">
            <Sparkles className="size-4" /> {busy ? "Analyzing…" : "AI analysis"}
          </FilledButton>
          {aiNote ? (
            <div className="text-sm whitespace-pre-wrap bg-surface-container rounded-2xl p-3 border border-outline-variant">{aiNote}</div>
          ) : null}
        </Surface>
        <Surface className="p-5">
          <div className="flex items-baseline justify-between mb-2">
            <div>
              <div className="text-sm font-semibold">{METRIC_LABELS[metric] ?? metric}</div>
              <div className="text-xs text-on-surface-variant">Actual + projected with confidence band</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-on-surface-variant">In {months} months</div>
              <div className="text-2xl font-semibold">{formatMetric(metric, forecast[forecast.length - 1].forecast ?? 0)}</div>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer>
              <AreaChart data={forecast}>
                <defs>
                  <linearGradient id="fc-actual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="fc-band" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-3)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--chart-3)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--outline-variant)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--outline)" />
                <YAxis tick={{ fontSize: 10 }} stroke="var(--outline)" tickFormatter={(v) => formatMetric(metric, v)} />
                <Tooltip contentStyle={{ background: "var(--surface-container-high)", border: "1px solid var(--outline-variant)", borderRadius: 12 }} formatter={(v: number) => formatMetric(metric, v)} />
                <Area dataKey="high" stroke="none" fill="url(#fc-band)" />
                <Area dataKey="low" stroke="none" fill="var(--background)" />
                <Area dataKey="actual" stroke="var(--primary)" strokeWidth={2} fill="url(#fc-actual)" />
                <Area dataKey="forecast" stroke="var(--chart-3)" strokeWidth={2} strokeDasharray="5 5" fill="none" />
                {series.length ? <ReferenceLine x={series[series.length - 1].date} stroke="var(--outline)" strokeDasharray="2 2" /> : null}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Surface>
      </div>
    </>
  );
}

function Slider({ label, value, setValue, min, max }: { label: string; value: number; setValue: (n: number) => void; min: number; max: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className="text-on-surface-variant">{label}</span>
        <span className="font-semibold">{value}</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => setValue(Number(e.target.value))} className="w-full mt-1" />
    </div>
  );
}
