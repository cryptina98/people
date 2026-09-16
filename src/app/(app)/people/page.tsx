import { redirect } from "next/navigation";

import { EmptyState, PageHeader, Section } from "@/components/chrome/page";
import { requireUser } from "@/lib/auth/current-user";
import { env } from "@/lib/env";
import { canManagePeople } from "@/lib/permissions";
import { buildTeamPalette } from "@/lib/team-color";
import {
  lastCheckIns,
  listPeople,
  triagePeople,
  upcomingEvents,
  vacationOverview,
  type TriagedPerson,
  type UpcomingEvent,
} from "@/server/people";

import {
  PersonCard,
  StatTile,
  UpcomingChips,
  VacationList,
} from "./components";
import { Collapsible } from "./collapsible";

export const dynamic = "force-dynamic";

function greeting(now: Date) {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function PeoplePage() {
  const user = await requireUser();
  if (!canManagePeople(user)) redirect("/people/me");

  const [people, vacations, checkIns] = await Promise.all([
    listPeople(),
    vacationOverview(),
    lastCheckIns(),
  ]);
  const now = new Date();
  const triage = triagePeople(people, checkIns, { today: now });
  const palette = buildTeamPalette(people.map((p) => p.profile?.team));
  const events = upcomingEvents(people, { withinDays: 30, today: now });
  const nextEvent = new Map<string, UpcomingEvent>();
  for (const event of events) {
    if (!nextEvent.has(event.person.id)) nextEvent.set(event.person.id, event);
  }

  const cards = (entries: TriagedPerson[], overdue: boolean) => (
    <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
      {entries.map((entry) => (
        <PersonCard
          key={entry.person.id}
          entry={entry}
          upcoming={nextEvent.get(entry.person.id)}
          overdue={overdue}
          canAct
          palette={palette}
        />
      ))}
    </div>
  );

  const firstName = user.name.split(" ")[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting(now)}, ${firstName}`}
        subtitle={`${people.length} people · ${now.toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}`}
      />

      <div className="grid grid-cols-4 gap-2">
        <StatTile
          label="Needs attention"
          value={triage.attention.length}
          href="#attention"
          tone="red"
        />
        <StatTile
          label="Overdue"
          value={triage.overdue.length}
          href="#overdue"
          tone="amber"
        />
        <StatTile
          label="Out today"
          value={vacations.outToday.length}
          href="#out"
        />
        <StatTile
          label="Pending requests"
          value={vacations.pending.length}
          href="#pending"
          tone="amber"
        />
      </div>

      <Section
        id="attention"
        title="Needs attention"
        count={triage.attention.length}
      >
        {triage.attention.length === 0 ? (
          <EmptyState title="Nobody is flagged right now" />
        ) : (
          cards(triage.attention, false)
        )}
      </Section>

      <Section
        id="overdue"
        title="Overdue check-ins"
        count={triage.overdue.length}
        description={`No check-in note in the last ${env.checkInThresholdDays} days.`}
      >
        {triage.overdue.length === 0 ? (
          <EmptyState
            title={
              triage.unstarted.length > 0
                ? "Nobody's check-in has gone stale"
                : "Everyone has had a recent check-in"
            }
          />
        ) : (
          cards(triage.overdue, true)
        )}
        {triage.unstarted.length > 0 ? (
          <div className="mt-3 space-y-2.5">
            <p className="text-[13px] text-meta">
              {triage.unstarted.length} people haven&apos;t had a first check-in
              logged yet — they&apos;ll show up here once their last one is
              older than {env.checkInThresholdDays} days.
            </p>
            <Collapsible
              count={triage.unstarted.length}
              label="Show people without a check-in"
            >
              {cards(triage.unstarted, false)}
            </Collapsible>
          </div>
        ) : null}
      </Section>

      <Section id="coming-up" title="Coming up" count={events.length}>
        {events.length === 0 ? (
          <EmptyState title="No birthdays or anniversaries in the next 30 days" />
        ) : (
          <UpcomingChips events={events} />
        )}
      </Section>

      {vacations.pending.length > 0 ? (
        <Section
          id="pending"
          title="Pending requests"
          count={vacations.pending.length}
        >
          <VacationList requests={vacations.pending} showPerson canDecide />
        </Section>
      ) : (
        <div id="pending" className="scroll-mt-16" />
      )}

      <Section
        id="out"
        title="Who's out"
        count={vacations.upcoming.length}
        description={
          vacations.outToday.length > 0
            ? `Out today: ${vacations.outToday
                .map((r) => r.user.name.split(" ")[0])
                .join(", ")}`
            : undefined
        }
      >
        <VacationList
          requests={vacations.upcoming}
          showPerson
          emptyLabel="Nobody has time off booked"
        />
      </Section>

      <Section id="good" title="All good" count={triage.good.length}>
        {triage.good.length === 0 ? (
          <EmptyState title="Nobody here yet" />
        ) : (
          <Collapsible count={triage.good.length}>
            {cards(triage.good, false)}
          </Collapsible>
        )}
      </Section>
    </div>
  );
}
