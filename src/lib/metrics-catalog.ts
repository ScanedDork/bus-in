// Catalog of metric keys used across dorkBI. The seed populates these,
// charts read them, alerts threshold against them.

export const METRIC_KEYS = {
  // Revenue
  mrr: "mrr",
  arr: "arr",
  net_new_arr: "net_new_arr",
  gross_margin: "gross_margin",
  // Efficiency
  burn: "burn",
  revenue: "revenue",
  runway_months: "runway_months",
  cac_payback: "cac_payback",
  ndr: "ndr",
  magic_number: "magic_number",
  burn_multiple: "burn_multiple",
  // Acquisition funnel (dimension = stage)
  funnel: "funnel",
  // Acquisition channels (dimension = channel name)
  channel_signups: "channel_signups",
  // Cohort retention (dimension = "cohort|week")
  cohort_retention: "cohort_retention",
} as const;

export type MetricKey = keyof typeof METRIC_KEYS;

export const METRIC_LABELS: Record<string, string> = {
  mrr: "MRR",
  arr: "ARR",
  net_new_arr: "Net new ARR",
  gross_margin: "Gross margin %",
  burn: "Burn",
  revenue: "Revenue",
  runway_months: "Runway (months)",
  cac_payback: "CAC payback (months)",
  ndr: "Net dollar retention %",
  magic_number: "Magic number",
  burn_multiple: "Burn multiple",
};

export const FUNNEL_STAGES = ["Visitors", "Signups", "Activated", "Paying", "Retained 30d"];
export const CHANNELS = ["Organic", "Paid", "Referral", "Outbound", "Community"];

export function formatMetric(key: string, value: number): string {
  switch (key) {
    case "mrr":
    case "net_new_arr":
    case "revenue":
    case "burn":
      return value >= 1_000_000
        ? `$${(value / 1_000_000).toFixed(1)}M`
        : `$${Math.round(value / 1000)}K`;
    case "arr":
      return `$${(value / 1_000_000).toFixed(2)}M`;
    case "gross_margin":
    case "ndr":
      return `${value.toFixed(1)}%`;
    case "runway_months":
    case "cac_payback":
      return `${value.toFixed(1)} mo`;
    case "magic_number":
    case "burn_multiple":
      return value.toFixed(2);
    default:
      return value.toLocaleString();
  }
}
