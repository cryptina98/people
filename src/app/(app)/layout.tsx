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
      <aside className="glass-panel sticky top-0 hidden h-screen w-60 shrink-0 flex-col justify-between border-r border-white/70 px-4 py-6 lg:flex">
        <div className="space-y-8">
          <Link href={HOME} className="block px-2.5">
            <p className="text-sm font-semibold tracking-tight">People</p>
            <p className="text-[11px] text-neutral-400">
              One source of truth about the team
            </p>
          </Link>
          <SidebarNav items={items} />
        </div>

        <div className="space-y-3 border-t border-white/70 pt-4">
          <div className="flex items-center gap-2 px-1">
            <InitialsAvatar name={user.name} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-[11px] text-neutral-400">
                {roleLabels[user.role]}
              </p>
            </div>
          </div>
          <form action={signOut}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="w-full justify-start text-neutral-500"
            >
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass-panel sticky top-0 z-40 flex items-center gap-4 border-b border-white/70 px-4 py-3 sm:px-6 lg:hidden">
          <Link href={HOME} className="text-sm font-semibold">
            People
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <form action={signOut}>
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="text-neutral-500"
              >
                Sign out
              </Button>
            </form>
            <Link href="/people/me" aria-label="Me">
              <InitialsAvatar name={user.name} size="sm" />
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1180px] flex-1 px-4 py-6 pb-24 sm:px-6 sm:py-8 lg:px-10 lg:py-10 lg:pb-10">
          {children}
        </main>
        <MobileNav items={items} />
      </div>
    </div>
  );
}
