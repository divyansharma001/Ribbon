/* Small line icons for diagram boxes. 24px grid, drawn with currentColor. */

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const PersonIcon = () => (
  <svg {...base} aria-hidden="true">
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" />
  </svg>
);

export const AppIcon = () => (
  <svg {...base} aria-hidden="true">
    <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
    <path d="M3.5 9h17M7 6.8h.01M9.5 6.8h.01" />
  </svg>
);

export const DatabaseIcon = () => (
  <svg {...base} aria-hidden="true">
    <ellipse cx="12" cy="6" rx="7" ry="2.8" />
    <path d="M5 6v12c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8V6M5 12c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8" />
  </svg>
);

export const CacheIcon = () => (
  <svg {...base} aria-hidden="true">
    <path d="M13 3 5.5 13.5H11L10 21l8-11h-5.5L13 3Z" />
  </svg>
);

export const SearchIcon = () => (
  <svg {...base} aria-hidden="true">
    <circle cx="10.5" cy="10.5" r="6" />
    <path d="m15 15 5 5" />
  </svg>
);

export const StreamIcon = () => (
  <svg {...base} aria-hidden="true">
    <path d="M3 7h12M3 12h16M3 17h10" />
    <path d="m16 4 3 3-3 3M18 14l3 3-3 3" />
  </svg>
);

export const BatchIcon = () => (
  <svg {...base} aria-hidden="true">
    <circle cx="12" cy="12" r="8" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);
