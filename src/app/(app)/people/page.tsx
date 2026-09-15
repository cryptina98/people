import Link from "next/link";
import { redirect } from "next/navigation";

import { EmptyState, PageHeader, Section } from "@/components/chrome/page";
import { requireUser } from "@/lib/auth/current-user";
import { canManagePeople } from "@/lib/permissions";
import { formatTenure, tenureSince } from "@/lib/people";
import {
  buildOrgTree,
  listPeople,
  upcomingEvents,
  vacationOverview,
} from "@/server/people";

import {
  OrgTree,
  StatTile,
  UpcomingEventList,
  VacationList,
} from "./components";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  const user = await requireUser();
  if (!canManagePeople(user)) redirect("/people/me");

  const [people, vacations] = await Promise.all([
    listPeople(),
    vacationOverview(),
  ]);
  const events = upcomingEvents(people, { withinDays: 45 });
  const tree = buildOrgTree(people);

  const withStart = people.filter((p) => p.profile?.startDate);
  const avgMonths =
    withStart.length > 0
      ? withStart.reduce((sum, p) => {
          const t = tenureSince(p.profile!.startDate!);
          return sum + t.years * 12 + t.months;
        }, 0) / withStart.length
      : 0;
  const newest = [...withStart].sort(
    (a, b) => b.profile!.startDate!.getTime() - a.profile!.startDate!.getTime(),
  )[0];
  const locations = new Set(
    people.map((p) => p.profile?.location).filter(Boolean),
  ).size;

  return (
    <div className="space-y-8">
      <PageHeader
        title="People"
        subtitle="One source of truth about the team."
        actions={
          <Link
            href="/people/directory"
            className="text-sm text-neutral-600 underline-offset-4 hover:underline"
          >
            Directory
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Team"
          value={people.length}
          hint={`${locations} locations`}
        />
        <StatTile
          label="Avg tenure"
          value={`${(avgMonths / 12).toFixed(1)}y`}
          hint={
            newest
              ? `Newest: ${newest.name.split(" ")[0]} (${formatTenure(newest.profile!.startDate)})`
              : undefined
          }
        />
        <StatTile
          label="Out today"
          value={vacations.outToday.length}
          hint={
            vacations.outToday
              .map((r) => r.user.name.split(" ")[0])
              .join(", ") || "Everyone's in"
          }
        />
        <StatTile
          label="Pending requests"
          value={vacations.pending.length}
          hint={
            vacations.pending.length > 0 ? "Needs a decision" : "All caught up"
          }
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Section
          title="Coming up"
          count={events.length}
          description="Birthdays and work anniversaries in the next 45 days."
        >
          {events.length === 0 ? (
            <EmptyState title="Nothing in the next 45 days" />
          ) : (
            <UpcomingEventList events={events} />
          )}
        </Section>

        <Section title="Time off to approve" count={vacations.pending.length}>
          <VacationList
            requests={vacations.pending}
            showPerson
            canDecide
            emptyLabel="No pending requests"
          />
        </Section>
      </div>

      <Section
        title="Who's out"
        count={vacations.upcoming.length}
        description="Approved time off in the next 90 days."
      >
        <VacationList
          requests={vacations.upcoming}
          showPerson
          emptyLabel="Nobody has time off booked"
        />
      </Section>

      <Section
        title="Team"
        count={people.length}
        description="Reporting lines and time with the company."
        actions={
          <Link
            href="/people/org"
            className="text-xs text-neutral-500 underline-offset-4 hover:underline"
          >
            Full org chart
          </Link>
        }
      >
        {tree.length === 0 ? (
          <EmptyState
            title="No profiles yet"
            description="Open a person and add a start date and manager."
          />
        ) : (
          <OrgTree nodes={tree} />
        )}
      </Section>
    </div>
  );
}
