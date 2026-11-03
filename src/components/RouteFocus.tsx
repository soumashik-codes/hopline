"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * After client-side navigation, move focus to the new screen's <h1> so keyboard and
 * screen reader users start at the top of the new content. Skipped on first load and
 * when the page has already focused something itself (e.g. the search input).
 */
export function RouteFocus() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const main = document.getElementById("main");
    if (!main) return;
    main.scrollTop = 0;
    if (main.contains(document.activeElement) && document.activeElement !== main) return;
    main.querySelector<HTMLElement>("h1")?.focus();
  }, [pathname]);

  return null;
}
