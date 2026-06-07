import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Surface } from "./app-shell";

export function KpiCard({
  label,
  value,
  delta,
  sub,
}: {
  label: string;
  value: string;
  delta: number;
  sub?: string;
}) {
  const positive = delta >= 0;
  return (
    <Surface tone="lowest" className="p-5">
      <div className="text-sm text-on-surface-variant font-medium">{label}</div>
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <div className="text-3xl font-semibold tracking-tight">{value}</div>
        <div
          className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-full ${
            positive
              ? "bg-secondary-container text-on-secondary-container"
              : "bg-error-container text-on-error-container"
          }`}
        >
          {positive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
          {Math.abs(delta)}%
        </div>
      </div>
      {sub ? <div className="text-xs text-on-surface-variant mt-1">{sub}</div> : null}
    </Surface>
  );
}
