import { Link } from "@tanstack/react-router";

export function Logo({ className = "", showWordmark = true }: { className?: string; showWordmark?: boolean }) {
  return (
    <Link to="/" className={`flex items-center gap-2.5 ${className}`} aria-label="Bus In home">
      <LogoMark className="size-9" />
      {showWordmark ? (
        <div className="leading-tight">
          <div className="text-lg font-semibold tracking-tight">Bus In</div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-on-surface-variant -mt-0.5">
            Business intelligence
          </div>
        </div>
      ) : null}
    </Link>
  );
}

export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Bus In logo"
    >
      <defs>
        <linearGradient id="busin-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#0ea5e9" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="url(#busin-g)" />
      {/* Ascending bars */}
      <g fill="#fff">
        <rect x="14" y="34" width="8" height="16" rx="2" />
        <rect x="28" y="27" width="8" height="23" rx="2" />
        <rect x="42" y="20" width="8" height="30" rx="2" />
      </g>
      {/* Upward trend line */}
      <path d="M15 28 L29 21 L37 25 L51 13" fill="none" stroke="#fff" strokeWidth="3"
        strokeLinecap="round" strokeLinejoin="round" opacity="0.95" />
      <path d="M44 13 H51 V20" fill="none" stroke="#fff" strokeWidth="3"
        strokeLinecap="round" strokeLinejoin="round" opacity="0.95" />
    </svg>
  );
}
