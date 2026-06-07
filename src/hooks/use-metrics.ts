import { useMemo } from "react";
import { useStore, KEYS, type MetricRow } from "@/lib/store";
import type { DateRange } from "@/lib/range";

export type { MetricRow };

export function useMetrics(range: DateRange, keys?: string[]) {
  const [all] = useStore<MetricRow[]>(KEYS.metrics, []);
  const rows = useMemo(
    () =>
      all.filter((r) => {
        if (r.date < range.from || r.date > range.to) return false;
        if (keys && keys.length && !keys.includes(r.metric_key)) return false;
        return true;
      }),
    [all, range.from, range.to, keys?.join(",")],
  );
  return { data: { rows }, isLoading: false };
}

export function pickSeries(rows: MetricRow[], key: string): { date: string; value: number }[] {
  return rows
    .filter((r) => r.metric_key === key && r.dimension === null)
    .map((r) => ({ date: r.date, value: Number(r.value) }));
}

export function latest(rows: MetricRow[], key: string): number {
  const s = pickSeries(rows, key);
  return s.length ? s[s.length - 1].value : 0;
}

export function deltaPct(rows: MetricRow[], key: string): number {
  const s = pickSeries(rows, key);
  if (s.length < 2) return 0;
  const first = s[0].value || 1;
  const last = s[s.length - 1].value;
  return Math.round(((last - first) / Math.abs(first)) * 1000) / 10;
}

export function byDimension(rows: MetricRow[], key: string): { name: string; value: number }[] {
  return rows
    .filter((r) => r.metric_key === key && r.dimension !== null)
    .map((r) => ({ name: r.dimension as string, value: Number(r.value) }));
}
