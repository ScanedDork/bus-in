// Mock startup BI data for dorkBI
export type KpiPoint = { month: string; value: number };

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const mrrSeries: KpiPoint[] = months.map((m, i) => ({
  month: m,
  value: Math.round(42000 * Math.pow(1.085, i) + (i % 2 ? 1800 : -900)),
}));

export const arrSeries: KpiPoint[] = mrrSeries.map((p) => ({ month: p.month, value: p.value * 12 }));

export const burnRunway = months.map((m, i) => ({
  month: m,
  burn: Math.round(180000 - i * 4200 + (i % 3 ? 5000 : -3000)),
  revenue: mrrSeries[i].value,
}));

export const acquisitionFunnel = [
  { stage: "Visitors", value: 48210, fill: "var(--color-chart-1)" },
  { stage: "Signups", value: 6840, fill: "var(--color-chart-2)" },
  { stage: "Activated", value: 3120, fill: "var(--color-chart-3)" },
  { stage: "Paying", value: 842, fill: "var(--color-chart-4)" },
  { stage: "Retained 30d", value: 712, fill: "var(--color-chart-5)" },
];

export const channelSplit = [
  { name: "Organic", value: 38, fill: "var(--color-chart-1)" },
  { name: "Paid", value: 24, fill: "var(--color-chart-2)" },
  { name: "Referral", value: 18, fill: "var(--color-chart-3)" },
  { name: "Outbound", value: 12, fill: "var(--color-chart-4)" },
  { name: "Community", value: 8, fill: "var(--color-chart-5)" },
];

export const cohortRetention = Array.from({ length: 8 }).map((_, i) => ({
  cohort: `2026-${String(i + 1).padStart(2, "0")}`,
  w0: 100,
  w1: 78 - i * 1.4,
  w2: 64 - i * 1.2,
  w3: 55 - i * 1.0,
  w4: 49 - i * 0.9,
  w8: 38 - i * 0.8,
  w12: 31 - i * 0.7,
}));

export const dataSources = [
  { id: "stripe", name: "Stripe", category: "Revenue", status: "Connected", rows: "1.2M", synced: "2 min ago" },
  { id: "hubspot", name: "HubSpot", category: "CRM", status: "Connected", rows: "84K", synced: "12 min ago" },
  { id: "ga4", name: "Google Analytics 4", category: "Product", status: "Connected", rows: "9.4M", synced: "1 hr ago" },
  { id: "postgres", name: "Production Postgres", category: "Warehouse", status: "Connected", rows: "42M", synced: "Live" },
  { id: "mixpanel", name: "Mixpanel", category: "Product", status: "Syncing", rows: "—", synced: "Now" },
  { id: "salesforce", name: "Salesforce", category: "CRM", status: "Action needed", rows: "—", synced: "Token expired" },
  { id: "intercom", name: "Intercom", category: "Support", status: "Available", rows: "—", synced: "—" },
  { id: "snowflake", name: "Snowflake", category: "Warehouse", status: "Available", rows: "—", synced: "—" },
];

export const recentReports = [
  { id: "1", name: "Weekly board update", owner: "Priya S.", updated: "2h ago", views: 84 },
  { id: "2", name: "Q4 GTM efficiency", owner: "Marcus L.", updated: "Yesterday", views: 212 },
  { id: "3", name: "Activation funnel deep-dive", owner: "Jules K.", updated: "2d ago", views: 41 },
  { id: "4", name: "Pricing experiment v3", owner: "Ada R.", updated: "4d ago", views: 167 },
];

export const kpiCards = [
  { label: "MRR", value: "$118.4K", delta: 8.2, sub: "vs last month" },
  { label: "Net new ARR", value: "$94.6K", delta: 12.4, sub: "this month" },
  { label: "Gross margin", value: "78.1%", delta: 1.1, sub: "trailing 90d" },
  { label: "CAC payback", value: "9.2 mo", delta: -0.6, sub: "improving" },
  { label: "Net retention", value: "112%", delta: 3.0, sub: "NDR" },
  { label: "Runway", value: "21 mo", delta: 1.5, sub: "at current burn" },
];
