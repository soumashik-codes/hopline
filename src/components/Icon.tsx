// Stroke icons from the prototype. Always decorative: pair them with visible text or an aria-label.

const PATHS = {
  walk: '<path d="M13 4a1.5 1.5 0 1 0 0 .01M10 21l2-6 2 2v4M9 11l2-3 3 1 2 3M11 8l-2 6"/>',
  bus: '<rect x="4" y="3" width="16" height="15" rx="3"/><path d="M4 11h16M8 18v3M16 18v3M8 14.5h.01M16 14.5h.01"/>',
  tube: '<rect x="5" y="3" width="14" height="14" rx="4"/><path d="M5 10h14M8 21l2-4M16 21l-2-4"/>',
  bike: '<circle cx="6" cy="17" r="3.5"/><circle cx="18" cy="17" r="3.5"/><path d="M6 17l4-8h5l3 8M10 9l2 8h6M14 6h3"/>',
  cab: '<path d="M5 16l1.5-6h11L19 16M3 16h18v3H3zM9 10l1-3h4l1 3"/>',
  rail: '<rect x="6" y="2" width="12" height="15" rx="3"/><path d="M6 9h12M9 21l1.5-4M15 21l-1.5-4"/>',
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  work: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V4h6v3M3 13h18"/>',
  pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  swap: '<path d="M7 4v16M3 8l4-4 4 4M17 20V4M21 16l-4 4-4-4"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
  locate: '<circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
  step: '<circle cx="12" cy="12" r="9"/><path d="M8 12h8M12 8v8"/>',
  plan: '<path d="M3 11l18-8-8 18-2-8z"/>',
  saved: '<path d="M6 3h12v18l-6-4-6 4z"/>',
  status: '<path d="M3 12h4l3 8 4-16 3 8h4"/>',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, small = false }: { name: IconName; small?: boolean }) {
  return (
    <svg
      className={small ? "i sm" : "i"}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: PATHS[name] }}
    />
  );
}
