import { useMemo } from "react";
import { useSearch, useNavigate, useRouterState } from "@tanstack/react-router";
import { PRESETS, defaultRange, rangeFromPreset, type DateRange } from "@/lib/range";

export function useDateRange(): DateRange {
  const search = (useSearch({ strict: false }) ?? {}) as { from?: string; to?: string };
  return useMemo(() => {
    if (search.from && search.to) return { from: search.from, to: search.to };
    return defaultRange();
  }, [search.from, search.to]);
}

export function DateRangePicker() {
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const current = useDateRange();

  // pick the matching preset if any
  const activeDays = useMemo(() => {
    const t = new Date(current.to);
    const f = new Date(current.from);
    const days = Math.round((t.getTime() - f.getTime()) / 86400000) + 1;
    return PRESETS.find((p) => p.days === days)?.days ?? null;
  }, [current]);

  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-full bg-surface-container-high">
      {PRESETS.map((p) => {
        const active = activeDays === p.days;
        return (
          <button
            key={p.days}
            onClick={() => {
              const r = rangeFromPreset(p.days);
              navigate({ to: path, search: r, replace: true });
            }}
            className={[
              "h-8 px-3 rounded-full text-xs font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-on-surface-variant hover:bg-surface-container",
            ].join(" ")}
          >
            {p.label.replace("Last ", "")}
          </button>
        );
      })}
    </div>
  );
}
