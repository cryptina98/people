import Link from "next/link";

import { Card, InitialsAvatar } from "@/components/chrome/page";
import { formatDate } from "@/lib/format";
import {
  formatTenure,
  vacationStatusLabels,
  vacationTypeLabels,
} from "@/lib/people";
import { cn } from "@/lib/utils";
import type {
  OrgNode,
  PersonRow,
  UpcomingEvent,
  VacationRow,
} from "@/server/people";

import { VacationDecision } from "./forms";

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
        "font-medium text-neutral-900 underline-offset-4 hover:underline",
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

/** Compact row used in lists and the directory. */
export function PersonRowItem({
  person,
  trailing,
}: {
  person: PersonRow;
  trailing?: React.ReactNode;
}) {
  return (
    <Link
      href={`/people/${person.id}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-white/60"
    >
      <InitialsAvatar name={person.name} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-neutral-900">
          {person.name}
          {!person.active ? (
            <span className="ml-2 text-xs text-neutral-400">alumni</span>
          ) : null}
        </p>
        <p className="truncate text-xs text-neutral-500">
          {[person.title, person.profile?.team, person.profile?.location]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      <div className="shrink-0 text-right text-xs text-neutral-500">
        {trailing ?? formatTenure(person.profile?.startDate)}
      </div>
    </Link>
  );
}

export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <Card className="px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900">
        {value}
      </p>
      {hint ? <p className="text-xs text-neutral-500">{hint}</p> : null}
    </Card>
  );
}

const eventTone = {
  birthday: "border-pink-200 bg-pink-50 text-pink-700",
  anniversary: "border-indigo-200 bg-indigo-50 text-indigo-700",
};

export function UpcomingEventList({ events }: { events: UpcomingEvent[] }) {
  return (
    <Card className="divide-y divide-neutral-100">
      {events.map((event) => (
        <div
          key={`${event.person.id}-${event.kind}`}
          className="flex items-center gap-3 px-4 py-3"
        >
          <InitialsAvatar name={event.person.name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">
              <PersonLink id={event.person.id} name={event.person.name} />{" "}
              <span className="text-neutral-500">
                {event.kind === "birthday"
                  ? event.count === null
                    ? "birthday"
                    : `turns ${event.count}`
                  : `${ordinal(event.count ?? 0)} anniversary`}
              </span>
            </p>
            <p className="text-xs text-neutral-500">{formatDate(event.date)}</p>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium",
              eventTone[event.kind],
            )}
          >
            {event.daysUntil === 0
              ? "Today"
              : event.daysUntil === 1
                ? "Tomorrow"
                : `in ${event.daysUntil}d`}
          </span>
        </div>
      ))}
    </Card>
  );
}

export function ordinal(n: number) {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  const suffix = { 1: "st", 2: "nd", 3: "rd" }[n % 10] ?? "th";
  return `${n}${suffix}`;
}

const statusTone: Record<VacationRow["status"], string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-700",
  APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  DECLINED: "border-rose-200 bg-rose-50 text-rose-700",
  CANCELLED: "border-neutral-200 bg-neutral-50 text-neutral-500",
};

export function VacationStatusBadge({
  status,
}: {
  status: VacationRow["status"];
}) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        statusTone[status],
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
    return (
      <Card className="px-4 py-6 text-center text-sm text-neutral-500">
        {emptyLabel}
      </Card>
    );
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
              <span className={showPerson ? "text-neutral-600" : "font-medium"}>
                {formatRange(request.startDate, request.endDate)}
              </span>
            </p>
            <p className="text-xs text-neutral-500">
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

/** Nested reporting tree. Indents on wide screens, stacks on mobile. */
export function OrgTree({
  nodes,
  depth = 0,
}: {
  nodes: OrgNode[];
  depth?: number;
}) {
  return (
    <ul
      className={cn(
        "space-y-2",
        depth > 0 && "mt-2 border-l border-neutral-200/80 pl-3 sm:pl-5",
      )}
    >
      {nodes.map((node) => (
        <li key={node.person.id}>
          <OrgCard person={node.person} reports={node.reports.length} />
          {node.reports.length > 0 ? (
            <OrgTree nodes={node.reports} depth={depth + 1} />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function OrgCard({ person, reports }: { person: PersonRow; reports: number }) {
  return (
    <Link
      href={`/people/${person.id}`}
      className="glass flex items-center gap-3 rounded-xl border border-white/70 px-3 py-2.5 transition-colors hover:bg-white/80"
    >
      <InitialsAvatar name={person.name} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-neutral-900">
          {person.name}
        </p>
        <p className="truncate text-xs text-neutral-500">
          {[person.title, teamLabel(person)].filter(Boolean).join(" · ")}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs font-medium text-neutral-700">
          {formatTenure(person.profile?.startDate)}
        </p>
        {reports > 0 ? (
          <p className="text-[11px] text-neutral-400">
            {reports} report{reports === 1 ? "" : "s"}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
