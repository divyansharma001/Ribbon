/** The Ribbon logo: a bookmark ribbon. */
export function RibbonMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 32" aria-hidden="true" className={className}>
      <path
        d="M3 1.5h18a1.5 1.5 0 0 1 1.5 1.5v27.2a.8.8 0 0 1-1.3.6L12 23.6l-9.2 7.2a.8.8 0 0 1-1.3-.6V3A1.5 1.5 0 0 1 3 1.5Z"
        fill="currentColor"
      />
    </svg>
  );
}
