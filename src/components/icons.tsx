/** The site's few drawn icons: one 16px grid, 1.5px strokes, inherit `currentColor`. */

export function ListIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <path d="M3 4h10M3 8h10M3 12h6" />
    </svg>
  );
}

export function GraphIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="4" cy="4" r="2" />
      <circle cx="12" cy="5" r="1.6" />
      <circle cx="7.5" cy="12" r="2.2" />
      <path d="M5.6 4.3 10.4 4.8M5 5.7l1.6 4.3M11.2 6.4 8.9 10.2" />
    </svg>
  );
}

/** Opens somewhere else (a PDF, a repository, a credential page). */
export function ExternalIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 3.5H3.5v9h9V10M9 3.5h3.5V7M12.5 3.5 7 9" />
    </svg>
  );
}

export function MenuIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <path d="m4 4 8 8M12 4l-8 8" />
    </svg>
  );
}
