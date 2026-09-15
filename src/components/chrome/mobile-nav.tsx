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
  "/people": "Home",
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
    <nav className="glass-panel fixed inset-x-0 bottom-0 z-40 border-t border-white/70 pb-[env(safe-area-inset-bottom)] lg:hidden">
      <ul className="flex items-stretch overflow-x-auto [scrollbar-width:none]">
        {items.map((item) => {
          const Icon = icons[item.href] ?? UserRound;
          const active = isActive(item.href);
          return (
            <li key={item.href} className="min-w-[4.25rem] flex-1">
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-1 py-2 text-[10px] font-medium text-neutral-500",
                  active && "text-neutral-900",
                )}
              >
                <span
                  className={cn(
                    "rounded-full px-3 py-0.5",
                    active && "bg-white/80 ring-1 ring-white",
                  )}
                >
                  <Icon
                    className="h-4 w-4"
                    strokeWidth={active ? 2.25 : 1.75}
                  />
                </span>
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
