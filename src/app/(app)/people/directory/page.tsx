import { redirect } from "next/navigation";

import {
  Card,
  EmptyState,
  PageHeader,
  Section,
} from "@/components/chrome/page";
import { Input } from "@/components/ui/input";
import { requireUser } from "@/lib/auth/current-user";
import { canManagePeople } from "@/lib/permissions";
import { buildTeamPalette } from "@/lib/team-color";
import { listPeople } from "@/server/people";

import { PersonRowItem } from "../components";
import { AutoSubmitCheckbox } from "../forms";

export const dynamic = "force-dynamic";

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; alumni?: string }>;
}) {
  const user = await requireUser();
  if (!canManagePeople(user)) redirect("/people/me");
  const { q, alumni } = await searchParams;

  const all = await listPeople({ includeInactive: alumni === "1" });
  const palette = buildTeamPalette(all.map((p) => p.profile?.team));
  const needle = q?.trim().toLowerCase();
  const people = needle
    ? all.filter((person) =>
        [
          person.name,
          person.title,
          person.profile?.team,
          person.profile?.location,
        ]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(needle)),
      )
    : all;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Directory"
        subtitle="Everyone on the team, where they are and how long they have been here."
      />

      <form className="flex flex-wrap items-center gap-3">
        <Input
          name="q"
          type="search"
          placeholder="Search name, title, location, team"
          defaultValue={q ?? ""}
          className="w-full sm:w-80"
        />
        <label className="flex min-h-11 items-center gap-2 text-sm text-neutral-600">
          <AutoSubmitCheckbox
            name="alumni"
            value="1"
            defaultChecked={alumni === "1"}
            className="size-5 accent-brand"
          />
          Include alumni
        </label>
        <button type="submit" className="sr-only">
          Search
        </button>
      </form>

      <Section title="People" count={people.length}>
        {people.length === 0 ? (
          <EmptyState title="Nobody matches that search" />
        ) : (
          <Card className="divide-y divide-neutral-100">
            {people.map((person) => (
              <PersonRowItem
                key={person.id}
                person={person}
                palette={palette}
              />
            ))}
          </Card>
        )}
      </Section>
    </div>
  );
}
