import { createFileRoute } from "@tanstack/react-router";
import { rangeSearchSchema } from "@/lib/range";
import { useDateRange } from "@/components/date-range-picker";
import { useMetrics } from "@/hooks/use-metrics";
import { PageHeader, Surface } from "@/components/app-shell";

export const Route = createFileRoute("/_app/cohorts")({
  validateSearch: rangeSearchSchema,
  component: Cohorts,
});

const WEEKS = [0, 1, 2, 3, 4, 8, 12];

function Cohorts() {
  const range = useDateRange();
  const { data } = useMetrics(range, ["cohort_retention"]);
  const rows = data.rows;
  const cohorts: Record<string, Record<number, number>> = {};
  for (const r of rows) {
    if (r.metric_key !== "cohort_retention" || !r.dimension) continue;
    const [c, wRaw] = r.dimension.split("|");
    const w = Number(wRaw.replace("w", ""));
    cohorts[c] = cohorts[c] || {};
    cohorts[c][w] = Number(r.value);
  }
  const cohortList = Object.keys(cohorts).sort();
  const heat = (v: number) => `color-mix(in oklab, var(--primary) ${Math.round(Math.max(0, Math.min(100, v)))}%, var(--surface-container-low))`;

  return (
    <>
      <PageHeader title="Cohort retention" subtitle="How well each signup cohort sticks over time." />
      <Surface className="p-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-on-surface-variant">
              <th className="py-2 pr-4 font-medium">Cohort</th>
              {WEEKS.map((w) => <th key={w} className="py-2 px-3 font-medium text-center">W{w}</th>)}
            </tr>
          </thead>
          <tbody>
            {cohortList.length === 0 ? (
              <tr><td colSpan={WEEKS.length + 1} className="text-center py-6 text-on-surface-variant">No cohort data yet.</td></tr>
            ) : cohortList.map((c) => (
              <tr key={c} className="border-t border-outline-variant">
                <td className="py-2 pr-4 font-medium">{c}</td>
                {WEEKS.map((w) => {
                  const v = cohorts[c][w] ?? 0;
                  return (
                    <td key={w} className="py-1 px-1 text-center">
                      <div className="rounded-lg h-9 grid place-items-center font-semibold text-xs" style={{ background: heat(v), color: v > 55 ? "var(--primary-foreground)" : "var(--foreground)" }}>
                        {v ? `${v.toFixed(0)}%` : "—"}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Surface>
    </>
  );
}
