import Link from "next/link";

import { MobileNav } from "@/components/chrome/mobile-nav";
import { SidebarNav } from "@/components/chrome/sidebar-nav";
import { InitialsAvatar } from "@/components/chrome/page";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/current-user";
import { HOME } from "@/lib/env";
import { roleLabels } from "@/lib/labels";
import { peopleTabs } from "@/lib/people-nav";
import { signOut } from "@/server/actions/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const items = peopleTabs(user);

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col justify-between px-4 py-6 lg:flex">
        <div className="space-y-8">
          <Link href={HOME} className="block px-2.5">
            <p className="text-[15px] font-bold text-ink">People</p>
            <p className="text-[11px] text-meta">
              One source of truth about the team
            </p>
          </Link>
          <SidebarNav items={items} />
        </div>

        <div className="space-y-3 pt-4">
          <div className="flex items-center gap-2 px-1">
            <InitialsAvatar name={user.name} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-[11px] text-meta">
                {roleLabels[user.role]}
              </p>
            </div>
          </div>
          <form action={signOut}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="w-full justify-start"
            >
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex min-h-14 items-center gap-4 bg-ground/95 px-4 backdrop-blur-sm sm:px-6 lg:hidden">
          <Link
            href={HOME}
            className="flex min-h-11 items-center text-[15px] font-bold text-ink"
          >
            People
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <form action={signOut}>
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="text-meta"
              >
                Sign out
              </Button>
            </form>
            <Link
              href="/people/me"
              aria-label="Me"
              className="flex size-11 items-center justify-center"
            >
              <InitialsAvatar name={user.name} size="sm" />
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1180px] flex-1 px-4 pt-2 pb-28 sm:px-6 sm:pt-4 lg:px-10 lg:py-10">
          {children}
        </main>
        <MobileNav items={items} />
      </div>
    </div>
  );
}
