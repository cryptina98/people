import Link from "next/link";
import type { PerformanceStatus } from "@prisma/client";

import { Card, InitialsAvatar } from "@/components/chrome/page";
import { formatDate } from "@/lib/format";
import {
  formatAgo,
  formatTenure,
  performanceStatusLabels,
  vacationStatusLabels,
  vacationTypeLabels,
} from "@/lib/people";
import { teamColor, type TeamPalette } from "@/lib/team-color";
import { cn } from "@/lib/utils";
import type {
  PersonRow,
  TriagedPerson,
  UpcomingEvent,
  VacationRow,
} from "@/server/people";

import { PersonCardActions, VacationDecision } from "./forms";

export function PersonLink({
  id,
  name,
  className,
}: {
  id: string;
  name: string;
  className?: string;
}) {
  return (
    <Link
      href={`/people/${id}`}
      className={cn(
        "-my-3 inline-flex min-h-11 items-center font-medium text-ink underline-offset-4 hover:underline",
        className,
      )}
    >
      {name}
    </Link>
  );
}

export function teamLabel(person: PersonRow) {
  return person.profile?.team ?? "No team";
}

export function roleTeamLine(person: PersonRow) {
  return [person.title, person.profile?.team].filter(Boolean).join(" · ");
}

/** Team name with its color, inline in a meta line. */
export function TeamTag({
  team,
  palette,
  className,
}: {
  team: string | null | undefined;
  palette: TeamPalette;
  className?: string;
}) {
  const color = teamColor(team, palette);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[6px] px-1.5 py-px text-[12px] leading-[18px] font-semibold",
        className,
      )}
      style={{ color: color.fg, backgroundColor: color.bg }}
    >
      <span
        aria-hidden
        className="size-1.5 rounded-full"
        style={{ backgroundColor: color.dot }}
      />
      {team ?? "No team"}
    </span>
  );
}

// --- Status ----------------------------------------------------------------

export const statusTone: Record<
  PerformanceStatus,
  { text: string; bg: string; dot: string }
> = {
  ON_TRACK: {
    text: "text-status-green",
    bg: "bg-status-green-bg",
    dot: "bg-status-green",
  },
  NEEDS_ATTENTION: {
    text: "text-status-amber",
    bg: "bg-status-amber-bg",
    dot: "bg-status-amber",
  },
  LEAD_FLAGGED: {
    text: "text-status-orange",
    bg: "bg-status-orange-bg",
    dot: "bg-status-orange",
  },
  AT_RISK: {
    text: "text-status-red",
    bg: "bg-status-red-bg",
    dot: "bg-status-red",
  },
  NEW_JOINER: {
    text: "text-status-slate",
    bg: "bg-status-slate-bg",
    dot: "bg-status-slate",
  },
};

export function StatusPill({
  status,
  className,
}: {
  status: PerformanceStatus;
  className?: string;
}) {
  const tone = statusTone[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-[6px] px-2 py-0.5 text-[12px] font-semibold whitespace-nowrap",
        tone.text,
        tone.bg,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", tone.dot)} />
      {performanceStatusLabels[status]}
    </span>
  );
}

// --- Person cards ----------------------------------------------------------

/** Compact row used in the directory and other plain lists. */
export function PersonRowItem({
  person,
  palette,
  trailing,
}: {
  person: PersonRow;
  palette: TeamPalette;
  trailing?: React.ReactNode;
}) {
  return (
    <Link
      href={`/people/${person.id}`}
      className="flex min-h-[64px] items-center gap-3 px-4 py-2.5 hover:bg-neutral-50"
    >
      <InitialsAvatar name={person.name} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-ink">
          {person.name}
          {!person.active ? (
            <span className="ml-2 text-xs font-normal text-meta">alumni</span>
          ) : null}
        </p>
        <p className="flex min-w-0 items-center gap-1.5 text-[13px] text-meta">
          <TeamTag team={person.profile?.team} palette={palette} />
          <span className="truncate">
            {[person.title, person.profile?.location]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </p>
      </div>
      <div className="tabular shrink-0 text-right text-[13px] text-meta">
        {trailing ?? <Tenure start={person.profile?.startDate} />}
      </div>
    </Link>
  );
}

export function Tenure({
  start,
  admin = false,
  personId,
}: {
  start: Date | null | undefined;
  admin?: boolean;
  personId?: string;
}) {
  if (start) return <>{formatTenure(start)}</>;
  if (admin && personId) {
    return (
      <Link
        href={`/people/${personId}#edit`}
        className="relative z-10 -my-3.5 inline-flex min-h-11 items-center font-medium text-brand hover:underline"
      >
        Add start date
      </Link>
    );
  }
  return <span>No start date</span>;
}

/**
 * The triage card: one row of identity, one row of facts, two actions.
 * Kept to ~80px on a phone so 4–5 fit on screen.
 */
export function PersonCard({
  entry,
  upcoming,
  overdue,
  canAct,
  palette,
}: {
  entry: TriagedPerson;
  upcoming?: UpcomingEvent;
  overdue: boolean;
  canAct: boolean;
  palette: TeamPalette;
}) {
  const { person, status, lastCheckIn } = entry;
  const line = [person.title, person.profile?.location]
    .filter(Boolean)
    .join(" · ");
  return (
    <article className="surface-interactive relative flex min-w-0 items-center gap-3 px-4 py-2.5">
      <Link
        href={`/people/${person.id}`}
        className="absolute inset-0 rounded-[14px]"
        aria-label={`Open ${person.name}`}
      />
      <InitialsAvatar name={person.name} />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <p className="min-w-0 truncate text-[16px] leading-tight font-semibold text-ink">
            {person.name}
          </p>
          <StatusPill status={status} />
        </div>
        <p className="flex min-w-0 items-center gap-1.5 text-[13px] text-meta">
          <TeamTag team={person.profile?.team} palette={palette} />
          <span className="truncate">
            {line || "No role set"}
            {person.profile?.statusReason ? (
              <span className="text-neutral-600">
                {" · “"}
                {person.profile.statusReason}
                {"”"}
              </span>
            ) : null}
          </span>
        </p>
        <p className="tabular flex min-w-0 items-center text-[13px] whitespace-nowrap text-meta">
          <span
            className={cn(
              "shrink-0",
              overdue && "font-semibold text-status-amber",
            )}
          >
            {lastCheckIn
              ? `Last check-in: ${formatAgo(lastCheckIn)}`
              : "No check-in yet"}
          </span>
          <span className="mx-1.5 shrink-0 text-neutral-300">·</span>
          <span className="shrink-0">
            <Tenure
              start={person.profile?.startDate}
              admin={canAct}
              personId={person.id}
            />
          </span>
          {upcoming ? (
            <>
              <span className="mx-1.5 shrink-0 text-neutral-300">·</span>
              <span className="min-w-0 truncate">
                {eventShortLabel(upcoming)}
              </span>
            </>
          ) : null}
        </p>
      </div>
      {canAct ? (
        <PersonCardActions
          userId={person.id}
          name={person.name}
          status={status}
          statusReason={person.profile?.statusReason}
        />
      ) : null}
    </article>
  );
}

export function eventShortLabel(event: UpcomingEvent) {
  const when =
    event.daysUntil === 0
      ? "today"
      : event.daysUntil === 1
        ? "tomorrow"
        : `in ${event.daysUntil}d`;
  if (event.kind === "birthday") return `Birthday ${when}`;
  return `${ordinal(event.count ?? 0)} anniversary ${when}`;
}

// --- Stats -----------------------------------------------------------------

export function StatTile({
  label,
  value,
  href,
  tone,
}: {
  label: string;
  value: number;
  href: string;
  tone?: "amber" | "red";
}) {
  return (
    <Link
      href={href}
      className="surface-low flex min-h-[64px] flex-col justify-center px-3 py-2.5 transition-shadow hover:shadow-[var(--shadow-card)]"
    >
      <span
        className={cn(
          "tabular text-[20px] leading-none font-bold text-ink",
          value > 0 && tone === "amber" && "text-status-amber",
          value > 0 && tone === "red" && "text-status-red",
        )}
      >
        {value}
      </span>
      <span className="mt-1.5 truncate text-[11px] font-medium text-meta">
        {label}
      </span>
    </Link>
  );
}

// --- Upcoming --------------------------------------------------------------

export function UpcomingChips({ events }: { events: UpcomingEvent[] }) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {events.map((event) => (
        <Link
          key={`${event.person.id}-${event.kind}`}
          href={`/people/${event.person.id}`}
          className="surface-low flex min-h-11 shrink-0 items-center gap-2 px-3 py-1.5"
        >
          <span aria-hidden className="text-sm">
            {event.kind === "birthday" ? "🎂" : "🎉"}
          </span>
          <span className="min-w-0">
            <span className="block max-w-[140px] truncate text-[13px] font-semibold text-ink">
              {event.person.name.split(" ")[0]}
            </span>
            <span className="tabular block text-[11px] text-meta">
              {event.kind === "birthday"
                ? "Birthday"
                : `${ordinal(event.count ?? 0)} anniversary`}
              {" · "}
              {event.daysUntil === 0
                ? "today"
                : event.daysUntil === 1
                  ? "tomorrow"
                  : formatDate(event.date)}
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}

export function ordinal(n: number) {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  const suffix = { 1: "st", 2: "nd", 3: "rd" }[n % 10] ?? "th";
  return `${n}${suffix}`;
}

// --- Vacations -------------------------------------------------------------

const vacationTone: Record<VacationRow["status"], string> = {
  PENDING: "bg-status-amber-bg text-status-amber",
  APPROVED: "bg-status-green-bg text-status-green",
  DECLINED: "bg-status-red-bg text-status-red",
  CANCELLED: "bg-neutral-100 text-meta",
};

export function VacationStatusBadge({
  status,
}: {
  status: VacationRow["status"];
}) {
  return (
    <span
      className={cn(
        "rounded-[6px] px-2 py-0.5 text-[12px] font-semibold whitespace-nowrap",
        vacationTone[status],
      )}
    >
      {vacationStatusLabels[status]}
    </span>
  );
}

export function formatRange(start: Date, end: Date) {
  const a = formatDate(start);
  const b = formatDate(end);
  return a === b ? a : `${a} – ${b}`;
}

export function VacationList({
  requests,
  showPerson = false,
  canDecide = false,
  canCancel = false,
  emptyLabel = "Nothing here",
}: {
  requests: VacationRow[];
  showPerson?: boolean;
  canDecide?: boolean;
  canCancel?: boolean;
  emptyLabel?: string;
}) {
  if (requests.length === 0) {
    return <p className="px-0.5 text-[13px] text-meta">{emptyLabel}</p>;
  }
  return (
    <Card className="divide-y divide-neutral-100">
      {requests.map((request) => (
        <div
          key={request.id}
          className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3"
        >
          {showPerson ? (
            <InitialsAvatar name={request.user.name} size="sm" />
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="text-sm">
              {showPerson ? (
                <>
                  <PersonLink
                    id={request.user.id}
                    name={request.user.name}
                  />{" "}
                </>
              ) : null}
              <span
                className={cn(
                  "tabular",
                  showPerson ? "text-neutral-600" : "font-medium",
                )}
              >
                {formatRange(request.startDate, request.endDate)}
              </span>
            </p>
            <p className="text-[13px] text-meta">
              {vacationTypeLabels[request.type]} · {request.workingDays} working
              day{request.workingDays === 1 ? "" : "s"}
              {request.note ? ` · ${request.note}` : ""}
              {request.decidedBy
                ? ` · ${vacationStatusLabels[request.status].toLowerCase()} by ${request.decidedBy.name}`
                : ""}
            </p>
          </div>
          <VacationStatusBadge status={request.status} />
          <VacationDecision
            requestId={request.id}
            status={request.status}
            canDecide={canDecide}
            canCancel={canCancel}
            isPast={request.endDate < new Date()}
          />
        </div>
      ))}
    </Card>
  );
}

// --- Org -------------------------------------------------------------------

/** Nested reporting tree. Indents on wide screens, stacks on mobile. */
