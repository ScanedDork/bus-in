import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { rangeSearchSchema } from "@/lib/range";
import { useDateRange } from "@/components/date-range-picker";
import { useMetrics, pickSeries, latest, deltaPct } from "@/hooks/use-metrics";
import { PageHeader, Surface, FilledButton, OutlinedButton } from "@/components/app-shell";
import { KpiCard } from "@/components/kpi-card";
import { formatMetric } from "@/lib/metrics-catalog";
import { chat, getActiveConfig } from "@/lib/ai/client";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowRight, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/overview")({
  validateSearch: rangeSearchSchema,
  component: Overview,
});

function Overview() {
  const range = useDateRange();
  const { data } = useMetrics(range, [
    "mrr", "arr", "burn", "revenue", "runway_months", "ndr",
    "cac_payback", "gross_margin", "magic_number", "net_new_arr",
  ]);
  const rows = data.rows;

  const mrr = pickSeries(rows, "mrr");
  const burnRev = pickSeries(rows, "burn").map((b, i) => ({
    date: b.date,
    burn: b.value,
    revenue: pickSeries(rows, "revenue")[i]?.value ?? 0,
  }));

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle="The pulse of your business — revenue, growth, efficiency, and runway."
        actions={
          <Link to="/reports">
            <FilledButton>
              Open reports <ArrowRight className="size-4" />
            </FilledButton>
          </Link>
        }
      />

      <AIInsights rows={rows} />

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="MRR" value={formatMetric("mrr", latest(rows, "mrr"))} delta={deltaPct(rows, "mrr")} sub="Recurring revenue" />
        <KpiCard label="ARR" value={formatMetric("arr", latest(rows, "arr"))} delta={deltaPct(rows, "arr")} sub="Annual run-rate" />
        <KpiCard label="Net new ARR" value={formatMetric("net_new_arr", latest(rows, "net_new_arr"))} delta={deltaPct(rows, "net_new_arr")} sub="New growth" />
        <KpiCard label="NDR" value={formatMetric("ndr", latest(rows, "ndr"))} delta={deltaPct(rows, "ndr")} sub="Net dollar retention" />
        <KpiCard label="Burn" value={formatMetric("burn", latest(rows, "burn"))} delta={deltaPct(rows, "burn")} sub="Monthly cash out" />
        <KpiCard label="Runway" value={formatMetric("runway_months", latest(rows, "runway_months"))} delta={deltaPct(rows, "runway_months")} sub="Months remaining" />
        <KpiCard label="CAC payback" value={formatMetric("cac_payback", latest(rows, "cac_payback"))} delta={-deltaPct(rows, "cac_payback")} sub="Months to recover CAC" />
        <KpiCard label="Magic #" value={formatMetric("magic_number", latest(rows, "magic_number"))} delta={deltaPct(rows, "magic_number")} sub="Sales efficiency" />
      </section>

      <section className="grid lg:grid-cols-3 gap-4 mt-6">
        <Surface className="p-5 lg:col-span-2">
          <div className="text-sm font-semibold">Recurring revenue</div>
          <div className="text-xs text-on-surface-variant">MRR over selected range</div>
          <div className="h-64 mt-3">
            <ResponsiveContainer>
              <AreaChart data={mrr}>
                <defs>
                  <linearGradient id="mrrG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--outline-variant)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--outline)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--outline)" tickFormatter={(v) => `$${Math.round(v / 1000)}K`} />
                <Tooltip contentStyle={{ background: "var(--surface-container-high)", border: "1px solid var(--outline-variant)", borderRadius: 12 }} formatter={(v: number) => formatMetric("mrr", v)} />
                <Area type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2} fill="url(#mrrG)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Surface>

        <Surface className="p-5">
          <div className="text-sm font-semibold">Burn vs revenue</div>
          <div className="text-xs text-on-surface-variant mb-3">Daily cash dynamics</div>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={burnRev}>
                <CartesianGrid stroke="var(--outline-variant)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--outline)" />
                <YAxis hide />
                <Tooltip contentStyle={{ background: "var(--surface-container-high)", border: "1px solid var(--outline-variant)", borderRadius: 12 }} />
                <Bar dataKey="revenue" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="burn" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Surface>
      </section>
    </>
  );
}

function AIInsights({ rows }: { rows: any[] }) {
  const [insights, setInsights] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!getActiveConfig()) {
      toast.error("Configure an AI provider in Settings → AI first");
      return;
    }
    setLoading(true);
    try {
      const summary = ["mrr", "arr", "burn", "runway_months", "ndr", "cac_payback", "gross_margin"].map((k) => {
        const v = latest(rows, k);
        const d = deltaPct(rows, k);
        return `${k}: ${v.toFixed(2)} (${d >= 0 ? "+" : ""}${d}% over range)`;
      }).join("\n");
      const text = await chat({
        messages: [
          { role: "system", content: "You are a startup CFO analyst. Reply with 3-5 short bullet insights about the metrics. Each bullet under 20 words. Plain text, one per line starting with '- '. No preamble." },
          { role: "user", content: `Date range: ${rows[0]?.date}..${rows[rows.length - 1]?.date}\n\n${summary}` },
        ],
        temperature: 0.3,
      });
      setInsights(text.split("\n").map((l) => l.replace(/^[-*•]\s*/, "").trim()).filter(Boolean));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Surface tone="lowest" className="p-5 mb-4 border-primary/20">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-xl bg-primary-container text-on-primary-container grid place-items-center">
            <Sparkles className="size-4" />
          </div>
          <div>
            <div className="font-semibold text-sm">AI insights</div>
            <div className="text-xs text-on-surface-variant">Auto-analysis of your current range</div>
          </div>
        </div>
        <OutlinedButton onClick={generate} disabled={loading}>
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          {insights ? "Refresh" : "Generate"}
        </OutlinedButton>
      </div>
      {insights ? (
        <ul className="mt-3 space-y-1.5 text-sm">
          {insights.map((i, idx) => (
            <li key={idx} className="flex gap-2"><span className="text-primary">•</span>{i}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-on-surface-variant">Click Generate to get AI-powered observations about your metrics.</p>
      )}
    </Surface>
  );
}
