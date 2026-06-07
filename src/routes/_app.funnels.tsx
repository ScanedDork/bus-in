import { createFileRoute } from "@tanstack/react-router";
import { rangeSearchSchema } from "@/lib/range";
import { useDateRange } from "@/components/date-range-picker";
import { useMetrics, byDimension } from "@/hooks/use-metrics";
import { PageHeader, Surface, Chip } from "@/components/app-shell";
import { FUNNEL_STAGES } from "@/lib/metrics-catalog";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, PieChart, Pie } from "recharts";

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

export const Route = createFileRoute("/_app/funnels")({
  validateSearch: rangeSearchSchema,
  component: Funnels,
});

function Funnels() {
  const range = useDateRange();
  const { data } = useMetrics(range, ["funnel", "channel_signups"]);
  const rows = data.rows;
  const funnel = FUNNEL_STAGES.map((s) => ({ stage: s, value: byDimension(rows, "funnel").find((r) => r.name === s)?.value ?? 0 }));
  const channels = byDimension(rows, "channel_signups");
  const top = funnel[0]?.value || 1;

  return (
    <>
      <PageHeader title="Funnels" subtitle="Where prospects come in, and where they drop." />
      <div className="grid lg:grid-cols-3 gap-4">
        <Surface className="p-5 lg:col-span-2">
          <div className="text-sm font-semibold">Acquisition funnel</div>
          <div className="text-xs text-on-surface-variant mb-4">Visitor → Paying customer</div>
          <div className="space-y-2">
            {funnel.map((f, i) => {
              const pct = (f.value / top) * 100;
              const prev = i > 0 ? funnel[i - 1].value : f.value;
              const conv = i === 0 ? 100 : prev ? (f.value / prev) * 100 : 0;
              return (
                <div key={f.stage} className="rounded-2xl bg-surface-container-high overflow-hidden">
                  <div className="h-14 flex items-center justify-between px-4 transition-all" style={{ width: `${Math.max(pct, 18)}%`, background: `color-mix(in oklab, ${COLORS[i] ?? "var(--primary)"} 18%, var(--surface-container-high))` }}>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-sm font-medium">{f.stage}</span>
                      <Chip tone="neutral">{conv.toFixed(1)}%</Chip>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">{f.value.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Surface>
        <Surface className="p-5">
          <div className="text-sm font-semibold">Signups by channel</div>
          <div className="text-xs text-on-surface-variant mb-3">Latest day</div>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Tooltip contentStyle={{ background: "var(--surface-container-high)", border: "1px solid var(--outline-variant)", borderRadius: 12 }} />
                <Pie data={channels} dataKey="value" nameKey="name" outerRadius={90} innerRadius={50}>
                  {channels.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Surface>
      </div>
      <Surface className="p-5 mt-4">
        <div className="text-sm font-semibold mb-3">Stage drop-off</div>
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={funnel}>
              <CartesianGrid stroke="var(--outline-variant)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="stage" tick={{ fontSize: 11 }} stroke="var(--outline)" />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--outline)" />
              <Tooltip contentStyle={{ background: "var(--surface-container-high)", border: "1px solid var(--outline-variant)", borderRadius: 12 }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {funnel.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Surface>
    </>
  );
}
