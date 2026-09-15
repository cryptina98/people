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
                "flex min-h-10 items-center rounded-[10px] px-3 text-neutral-600 transition-colors hover:bg-white hover:text-ink",
                isActive(item.href) && "surface-low font-semibold text-brand",
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
