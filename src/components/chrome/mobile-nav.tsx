"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Network,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import type { NavItem } from "@/components/chrome/sidebar-nav";
import { cn } from "@/lib/utils";

const icons: Record<string, LucideIcon> = {
  "/people": LayoutDashboard,
  "/people/org": Network,
  "/people/directory": UsersRound,
  "/people/me": UserRound,
};

const shortLabels: Record<string, string> = {
  "/people": "Dashboard",
  "/people/org": "Org",
  "/people/directory": "Directory",
};

/** Bottom tab bar for phones. The sidebar takes over from `lg` up. */
export function MobileNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  // A tab that is a prefix of sibling tabs (e.g. /people next to
  // /people/org) only lights up on an exact match.
  const isActive = (href: string) => {
    if (pathname === href) return true;
    const hasChildren = items.some((other) =>
      other.href.startsWith(`${href}/`),
    );
    return !hasChildren && pathname.startsWith(`${href}/`);
  };

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 bg-white pb-[env(safe-area-inset-bottom)] shadow-[var(--shadow-tabbar)] lg:hidden"
    >
      <ul className="flex items-stretch">
        {items.map((item) => {
          const Icon = icons[item.href] ?? UserRound;
          const active = isActive(item.href);
          return (
            <li key={item.href} className="min-w-0 flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium text-meta",
                  active && "text-brand",
                )}
              >
                <Icon
                  className="size-6"
                  strokeWidth={active ? 2.25 : 1.75}
                  fill={active ? "currentColor" : "none"}
                  fillOpacity={active ? 0.18 : 0}
                />
                <span className="truncate">
                  {shortLabels[item.href] ?? item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
