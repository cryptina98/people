import type { SessionUser } from "@/lib/auth/user";
import { canManagePeople } from "@/lib/permissions";

export type PeopleTab = { href: string; label: string };

export function peopleTabs(user: SessionUser): PeopleTab[] {
  return canManagePeople(user)
    ? [
        { href: "/people", label: "Dashboard" },
        { href: "/people/org", label: "Org chart" },
        { href: "/people/directory", label: "Directory" },
        { href: "/people/me", label: "Me" },
      ]
    : [{ href: "/people/me", label: "Me" }];
}
