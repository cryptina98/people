"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export type NavItem = {
  href: string;
  label: string;
};

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  // /people is a prefix of its sibling tabs, so it only lights up on an
  // exact match.
  const isActive = (href: string) => {
    if (pathname === href) return true;
    const hasChildren = items.some((other) =>
      other.href.startsWith(`${href}/`),
    );
    return !hasChildren && pathname.startsWith(`${href}/`);
  };

  return (
    <nav className="text-sm">
      <ul className="space-y-0.5">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={cn(
                "flex items-center rounded-md px-2.5 py-1.5 text-neutral-600 transition-colors hover:bg-white/70 hover:text-neutral-900",
                isActive(item.href) &&
                  "bg-white/80 font-medium text-neutral-900 shadow-[0_1px_2px_oklch(0.42_0.09_262/0.12)] ring-1 ring-white",
              )}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
