import { createFileRoute } from "@tanstack/react-router";
import { rangeSearchSchema } from "@/lib/range";
import { useDateRange } from "@/components/date-range-picker";
import { useMetrics, pickSeries } from "@/hooks/use-metrics";
import { PageHeader, Surface } from "@/components/app-shell";
import { METRIC_LABELS, formatMetric } from "@/lib/metrics-catalog";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/_app/metrics")({
  validateSearch: rangeSearchSchema,
  component: Metrics,
});

const KEYS = ["mrr", "arr", "burn", "ndr", "cac_payback", "runway_months", "magic_number", "burn_multiple", "gross_margin"];

function Metrics() {
  const range = useDateRange();
  const { data } = useMetrics(range, KEYS);
  const rows = data.rows;
  return (
    <>
      <PageHeader title="Metrics" subtitle="Every operating KPI, side by side." />
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {KEYS.map((k) => {
          const s = pickSeries(rows, k);
          const last = s[s.length - 1]?.value ?? 0;
          return (
            <Surface key={k} className="p-5">
              <div className="text-xs font-medium text-on-surface-variant">{METRIC_LABELS[k] ?? k}</div>
              <div className="text-2xl font-semibold mt-1">{formatMetric(k, last)}</div>
              <div className="h-24 mt-2">
                <ResponsiveContainer>
                  <AreaChart data={s}>
                    <defs>
                      <linearGradient id={`g-${k}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--outline-variant)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" hide /><YAxis hide />
                    <Tooltip contentStyle={{ background: "var(--surface-container-high)", border: "1px solid var(--outline-variant)", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => formatMetric(k, v)} />
                    <Area type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2} fill={`url(#g-${k})`} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Surface>
          );
        })}
      </div>
    </>
  );
}
