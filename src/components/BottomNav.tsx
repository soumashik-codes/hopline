"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./Icon";

const TABS: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Plan", icon: "plan" },
  { href: "/saved", label: "Saved", icon: "saved" },
  { href: "/status", label: "Line status", icon: "status" },
];

function activeTab(pathname: string) {
  if (pathname.startsWith("/saved")) return "/saved";
  if (pathname.startsWith("/status")) return "/status";
  return "/";
}

export function BottomNav() {
  const pathname = usePathname();
  // Hidden while following a journey step by step, as in the prototype.
  if (/^\/routes\/[^/]+\/go/.test(pathname)) return null;
  const current = activeTab(pathname);
  return (
    <nav className="nav" aria-label="Main">
      {TABS.map((tab) => (
        <Link key={tab.href} href={tab.href} aria-current={tab.href === current ? "page" : undefined}>
          <Icon name={tab.icon} />
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
