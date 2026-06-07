import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  TrendingUp,
  Filter,
  Users,
  Database,
  FileBarChart2,
  BellRing,
  Settings,
  Bell,
  Check,
  MessageSquare,
  LineChart,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Logo, LogoMark } from "@/components/logo";
import { DateRangePicker } from "@/components/date-range-picker";
import { useStore, KEYS, ensureSeed, type Notification } from "@/lib/store";
import { getAISettings, PROVIDER_LABELS } from "@/lib/ai/client";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard };

const nav: NavItem[] = [
  { to: "/overview", label: "Overview", icon: LayoutDashboard },
  { to: "/metrics", label: "Metrics", icon: TrendingUp },
  { to: "/funnels", label: "Funnels", icon: Filter },
  { to: "/cohorts", label: "Cohorts", icon: Users },
  { to: "/ask", label: "Ask AI", icon: MessageSquare },
  { to: "/forecast", label: "Forecast", icon: LineChart },
  { to: "/sources", label: "Data sources", icon: Database },
  { to: "/reports", label: "Reports", icon: FileBarChart2 },
  { to: "/alerts", label: "Alerts", icon: BellRing },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppShell() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    void (async () => {
      const { ensureHydrated } = await import("@/lib/store");
      await ensureHydrated();
      ensureSeed();
    })();
  }, []);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-surface-container border-r border-outline-variant">
        <div className="px-5 pt-5 pb-3">
          <Logo />
        </div>

        <nav className="px-3 py-2 flex-1 overflow-y-auto">
          {nav.map((item) => {
            const active = path === item.to || path.startsWith(item.to + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={[
                  "group flex items-center gap-3 h-12 px-4 rounded-full mb-1 transition-colors",
                  active
                    ? "bg-secondary-container text-on-secondary-container"
                    : "text-on-surface-variant hover:bg-surface-container-high",
                ].join(" ")}
              >
                <Icon className="size-5" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <AIStatusCard />
        <CreditsFooter />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 px-4 md:px-8 py-6 max-w-[1500px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function CreditsFooter() {
  return (
    <div className="px-5 py-3 border-t border-outline-variant text-[11px] text-on-surface-variant leading-relaxed">
      <div>Open source — MIT licensed.</div>
      <div className="mt-0.5">
        Built by{" "}
        <a href="https://ranjeetskanda.com" target="_blank" rel="noreferrer" className="text-primary hover:underline">
          Ramar Ranjeet Skanda
        </a>
      </div>
      <div className="mt-0.5">
        <a href="https://github.com/ScanedDork" target="_blank" rel="noreferrer" className="hover:underline">
          github.com/ScanedDork
        </a>
      </div>
    </div>
  );
}

function AIStatusCard() {
  const s = getAISettings();
  const cfg = s.providers[s.default];
  const ready = !!cfg && (cfg.provider === "ollama" || cfg.provider === "lmstudio" || !!cfg.apiKey);
  return (
    <Link
      to="/settings/ai"
      className="mx-3 mb-4 mt-1 p-3 rounded-2xl bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant block"
    >
      <div className="flex items-center gap-2">
        <div className={`size-8 rounded-xl grid place-items-center ${ready ? "bg-secondary-container text-on-secondary-container" : "bg-tertiary-container text-on-tertiary-container"}`}>
          <Sparkles className="size-4" />
        </div>
        <div className="text-sm min-w-0 flex-1">
          <div className="font-medium truncate">{ready ? PROVIDER_LABELS[s.default] : "Connect AI"}</div>
          <div className="text-xs text-on-surface-variant truncate">{ready ? cfg!.model || "default" : "Choose a provider"}</div>
        </div>
      </div>
    </Link>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-20 h-16 bg-background/80 backdrop-blur border-b border-outline-variant">
      <div className="h-full px-4 md:px-8 flex items-center gap-4">
        <div className="md:hidden flex items-center gap-2">
          <LogoMark className="size-8" />
          <span className="font-semibold">Bus In</span>
        </div>
        <div className="flex-1" />
        <DateRangePicker />
        <NotificationsBell />
      </div>
    </header>
  );
}

function NotificationsBell() {
  const [items, setItems] = useStore<Notification[]>(KEYS.notifications, []);
  const [open, setOpen] = useState(false);
  const unread = items.filter((n) => !n.read_at).length;

  useEffect(() => {
    const onClick = () => setOpen(false);
    if (open) document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [open]);

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative size-11 grid place-items-center rounded-full hover:bg-surface-container-high text-on-surface-variant"
      >
        <Bell className="size-5" />
        {unread > 0 ? (
          <span className="absolute top-2 right-2 min-w-4 h-4 px-1 rounded-full bg-error text-error-foreground text-[10px] font-bold grid place-items-center">
            {unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 mt-2 w-80 rounded-3xl bg-surface-container-high border border-outline-variant shadow-elevation-3 overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between border-b border-outline-variant">
            <div className="font-semibold text-sm">Notifications</div>
            {unread > 0 ? (
              <button
                onClick={() => setItems(items.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })))}
                className="text-xs text-primary inline-flex items-center gap-1"
              >
                <Check className="size-3" /> Mark all read
              </button>
            ) : null}
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-outline-variant">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-sm text-on-surface-variant text-center">
                You're all caught up.
              </div>
            ) : (
              items.map((n) => (
                <div key={n.id} className="px-4 py-3">
                  <div className="text-sm font-medium flex items-center gap-2">
                    {n.read_at ? null : <span className="size-2 rounded-full bg-primary" />}
                    {n.title}
                  </div>
                  <div className="text-xs text-on-surface-variant mt-0.5">{n.body}</div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? <p className="text-on-surface-variant mt-1.5 text-sm md:text-base">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function FilledButton({ children, className = "", ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={
        "inline-flex items-center gap-2 h-10 px-5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:shadow-elevation-2 disabled:opacity-50 transition-shadow " +
        className
      }
    >
      {children}
    </button>
  );
}

export function TonalButton({ children, className = "", ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={
        "inline-flex items-center gap-2 h-10 px-5 rounded-full bg-secondary-container text-on-secondary-container text-sm font-medium hover:shadow-elevation-1 disabled:opacity-50 transition-shadow " +
        className
      }
    >
      {children}
    </button>
  );
}

export function OutlinedButton({ children, className = "", ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={
        "inline-flex items-center gap-2 h-10 px-5 rounded-full border border-outline text-foreground text-sm font-medium hover:bg-surface-container-high disabled:opacity-50 transition-colors " +
        className
      }
    >
      {children}
    </button>
  );
}

export function Surface({
  children,
  className = "",
  tone = "low",
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & {
  tone?: "lowest" | "low" | "default" | "high" | "highest";
}) {
  const toneClass = {
    lowest: "bg-surface-container-lowest",
    low: "bg-surface-container-low",
    default: "bg-surface-container",
    high: "bg-surface-container-high",
    highest: "bg-surface-container-highest",
  }[tone];
  return (
    <div {...rest} className={`rounded-3xl ${toneClass} border border-outline-variant/70 ${className}`}>
      {children}
    </div>
  );
}

export function Chip({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "info" | "danger";
}) {
  const map: Record<string, string> = {
    neutral: "bg-surface-container-high text-on-surface-variant",
    success: "bg-secondary-container text-on-secondary-container",
    warning: "bg-tertiary-container text-on-tertiary-container",
    info: "bg-primary-container text-on-primary-container",
    danger: "bg-error-container text-on-error-container",
  };
  return (
    <span className={`inline-flex items-center gap-1 h-7 px-3 rounded-full text-xs font-medium ${map[tone]}`}>
      {children}
    </span>
  );
}
