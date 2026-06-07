import { z } from "zod";

// Default range: last 90 days
export function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 89);
  return { from: toIso(from), to: toIso(to) };
}

export function toIso(d: Date) {
  return d.toISOString().slice(0, 10);
}

export const rangeSearchSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

export type DateRange = { from: string; to: string };

export function resolveRange(search: { from?: string; to?: string }): DateRange {
  if (search.from && search.to) return { from: search.from, to: search.to };
  return defaultRange();
}

export const PRESETS: { label: string; days: number }[] = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "Last 180 days", days: 180 },
  { label: "Last 365 days", days: 365 },
];

export function rangeFromPreset(days: number): DateRange {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - (days - 1));
  return { from: toIso(from), to: toIso(to) };
}
