import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useStore, KEYS, type Report } from "@/lib/store";
import { useDateRange } from "@/components/date-range-picker";
import { useMetrics, pickSeries, latest, byDimension } from "@/hooks/use-metrics";
import { PageHeader, Surface, OutlinedButton } from "@/components/app-shell";
import { formatMetric, FUNNEL_STAGES, METRIC_LABELS } from "@/lib/metrics-catalog";
import { Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_app/reports/$id")({ component: ReportView });

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function ReportView() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [reports] = useStore<Report[]>(KEYS.reports, []);
  const r = reports.find((x) => x.id === id);
  const range = useDateRange();
  const { data } = useMetrics(range);
  const rows = data.rows;
  const widgets = r?.widgets ?? [];

  return (
    <>
      <PageHeader
        title={r?.name ?? "Report"}
        subtitle={r?.description ?? undefined}
        actions={<OutlinedButton onClick={() => navigate({ to: "/reports" })}><ArrowLeft className="size-4" /> Back</OutlinedButton>}
      />
      {!r ? (
        <Surface className="p-8 text-center text-on-surface-variant">Report not found.</Surface>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {widgets.map((w) => (
            <Surface key={w.id} tone="lowest" className="p-5">
              <div className="text-xs font-medium text-on-surface-variant">{w.title}</div>
              <div className="mt-3">
                {w.kind === "kpi" ? (
                  <div className="text-3xl font-semibold">{formatMetric(w.metric_key, latest(rows, w.metric_key))}</div>
                ) : w.kind === "area" || w.kind === "bar" ? (
                  <div className="h-40">
                    <ResponsiveContainer>
                      {w.kind === "area" ? (
                        <AreaChart data={pickSeries(rows, w.metric_key)}>
                          <CartesianGrid stroke="var(--outline-variant)" strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="date" hide /><YAxis hide />
                          <Tooltip formatter={(v: number) => formatMetric(w.metric_key, v)} contentStyle={{ background: "var(--surface-container-high)", border: "1px solid var(--outline-variant)", borderRadius: 12 }} />
                          <Area dataKey="value" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.2} />
                        </AreaChart>
                      ) : (
                        <BarChart data={pickSeries(rows, w.metric_key)}>
                          <XAxis dataKey="date" hide /><YAxis hide />
                          <Tooltip />
                          <Bar dataKey="value" fill="var(--primary)" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                ) : w.kind === "pie" ? (
                  <div className="h-40">
                    <ResponsiveContainer>
                      <PieChart>
                        <Tooltip />
                        <Pie data={byDimension(rows, w.metric_key)} dataKey="value" nameKey="name" outerRadius={60} innerRadius={32}>
                          {byDimension(rows, w.metric_key).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-40">
                    <ResponsiveContainer>
                      <BarChart data={FUNNEL_STAGES.map((s) => ({ stage: s, value: byDimension(rows, "funnel").find((r) => r.name === s)?.value ?? 0 }))} layout="vertical">
                        <XAxis type="number" hide />
                        <YAxis dataKey="stage" type="category" width={70} tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                          {FUNNEL_STAGES.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
              <div className="mt-2 text-[10px] uppercase tracking-wider text-on-surface-variant">{METRIC_LABELS[w.metric_key] ?? w.metric_key}</div>
            </Surface>
          ))}
          {widgets.length === 0 ? <Surface className="p-8 text-center text-on-surface-variant">This report has no widgets.</Surface> : null}
        </div>
      )}
    </>
  );
}
