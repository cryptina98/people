import type { Prisma, VacationStatus, VacationType } from "@prisma/client";

import type { SessionUser } from "@/lib/auth/user";
import { AppError } from "@/lib/errors";
import {
  ageOnNextBirthday,
  daysUntilAnnual,
  isOutOn,
  nextAnniversaryNumber,
  utcMidnight,
  vacationBalance,
  workingDaysBetween,
} from "@/lib/people";
import {
  canManagePeople,
  canViewPerformanceNotes,
  canViewPerson,
  PermissionError,
} from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const personInclude = {
  profile: {
    include: { manager: { select: { id: true, name: true, title: true } } },
  },
} satisfies Prisma.UserInclude;

export type PersonRow = Prisma.UserGetPayload<{
  include: typeof personInclude;
}>;

/** Everyone who has ever been on the team, active first. */
export async function listPeople(options: { includeInactive?: boolean } = {}) {
  return prisma.user.findMany({
    where: options.includeInactive ? {} : { active: true },
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: personInclude,
  });
}

export type OrgNode = {
  person: PersonRow;
  reports: OrgNode[];
};

/**
 * Builds the reporting tree from `profile.managerId`. People without a manager
 * (or whose manager is missing) become roots. Cycles are broken by tracking
 * visited ids so a bad edit can never hang the page.
 */
export function buildOrgTree(people: PersonRow[]): OrgNode[] {
  const byId = new Map(people.map((person) => [person.id, person]));
  const children = new Map<string | null, PersonRow[]>();
  for (const person of people) {
    const managerId = person.profile?.managerId ?? null;
    const key = managerId && byId.has(managerId) ? managerId : null;
    children.set(key, [...(children.get(key) ?? []), person]);
  }
  const visited = new Set<string>();
  const build = (managerId: string | null): OrgNode[] =>
    (children.get(managerId) ?? [])
      .filter((person) => !visited.has(person.id))
      .map((person) => {
        visited.add(person.id);
        return { person, reports: build(person.id) };
      });
  return build(null);
}

export type UpcomingEvent = {
  person: PersonRow;
  kind: "birthday" | "anniversary";
  daysUntil: number;
  date: Date;
  /** Age or years, whichever the event celebrates; null when unknown. */
  count: number | null;
};

export function upcomingEvents(
  people: PersonRow[],
  { withinDays = 60, today = new Date() } = {},
): UpcomingEvent[] {
  const events: UpcomingEvent[] = [];
  for (const person of people) {
    if (!person.active) continue;
    const profile = person.profile;
    if (!profile) continue;
    if (profile.birthday) {
      const daysUntil = daysUntilAnnual(profile.birthday, today);
      if (daysUntil <= withinDays) {
        events.push({
          person,
          kind: "birthday",
          daysUntil,
          date: addDays(today, daysUntil),
          count: ageOnNextBirthday(profile.birthday, today),
        });
      }
    }
    if (profile.startDate && profile.startDate <= today) {
      const daysUntil = daysUntilAnnual(profile.startDate, today);
      const count = nextAnniversaryNumber(profile.startDate, today);
      if (daysUntil <= withinDays && count > 0) {
        events.push({
          person,
          kind: "anniversary",
          daysUntil,
          date: addDays(today, daysUntil),
          count,
        });
      }
    }
  }
  return events.sort((a, b) => a.daysUntil - b.daysUntil);
}

function addDays(date: Date, days: number) {
  const next = utcMidnight(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

const vacationInclude = {
  user: { select: { id: true, name: true, title: true } },
  decidedBy: { select: { id: true, name: true } },
} satisfies Prisma.VacationRequestInclude;

export type VacationRow = Prisma.VacationRequestGetPayload<{
  include: typeof vacationInclude;
}>;

/** Pending requests plus everything approved from today onwards. */
export async function vacationOverview(today = new Date()) {
  const start = utcMidnight(today);
  const horizon = addDays(start, 90);
  const [pending, upcoming] = await Promise.all([
    prisma.vacationRequest.findMany({
      where: { status: "PENDING", user: { active: true } },
      orderBy: { startDate: "asc" },
      include: vacationInclude,
    }),
    prisma.vacationRequest.findMany({
      where: {
        status: "APPROVED",
        endDate: { gte: start },
        startDate: { lte: horizon },
        user: { active: true },
      },
      orderBy: { startDate: "asc" },
      include: vacationInclude,
    }),
  ]);
  const outToday = upcoming.filter((request) => isOutOn(request, start));
  return { pending, upcoming, outToday };
}

export async function getPerson(viewer: SessionUser, userId: string) {
  const person = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      ...personInclude,
      vacations: {
        orderBy: { startDate: "desc" },
        include: vacationInclude,
      },
    },
  });
  if (!person) return null;
  const target = {
    id: person.id,
    managerId: person.profile?.managerId ?? null,
  };
  if (!canViewPerson(viewer, target)) throw new PermissionError();

  const [notes, compensation, reports] = await Promise.all([
    canViewPerformanceNotes(viewer, target)
      ? prisma.performanceNote.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          include: { author: { select: { id: true, name: true } } },
        })
      : Promise.resolve([]),
    canManagePeople(viewer)
      ? prisma.compensationEvent.findMany({
          where: { userId },
          orderBy: { effectiveDate: "desc" },
          include: { grantedBy: { select: { id: true, name: true } } },
        })
      : Promise.resolve([]),
    prisma.user.findMany({
      where: { active: true, profile: { managerId: userId } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, title: true },
    }),
  ]);

  const balance = vacationBalance(
    person.profile?.vacationAllowance ?? 25,
    person.vacations,
  );
  return { person, notes, compensation, reports, balance };
}

export type PersonDetail = NonNullable<Awaited<ReturnType<typeof getPerson>>>;

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function submitVacation(
  requester: SessionUser,
  input: {
    userId?: string;
    type: VacationType;
    startDate: Date;
    endDate: Date;
    note?: string | null;
  },
) {
  const userId = input.userId ?? requester.id;
  if (userId !== requester.id && !canManagePeople(requester)) {
    throw new PermissionError("You can only request time off for yourself");
  }
  const start = utcMidnight(input.startDate);
  const end = utcMidnight(input.endDate);
  if (end < start) throw new AppError("End date must be on or after the start");
  const workingDays = workingDaysBetween(start, end);
  if (workingDays === 0) {
    throw new AppError("That range has no working days");
  }
  const overlap = await prisma.vacationRequest.findFirst({
    where: {
      userId,
      status: { in: ["PENDING", "APPROVED"] },
      startDate: { lte: end },
      endDate: { gte: start },
    },
  });
  if (overlap) throw new AppError("That overlaps an existing request");

  return prisma.vacationRequest.create({
    data: {
      userId,
      type: input.type,
      startDate: start,
      endDate: end,
      workingDays,
      note: input.note ?? null,
    },
  });
}

export async function decideVacation(
  decider: SessionUser,
  requestId: string,
  status: Extract<VacationStatus, "APPROVED" | "DECLINED">,
  decisionNote?: string | null,
) {
  const request = await prisma.vacationRequest.findUnique({
    where: { id: requestId },
    include: { user: { include: { profile: true } } },
  });
  if (!request) throw new AppError("Request not found", 404);
  const isManager = request.user.profile?.managerId === decider.id;
  if (!canManagePeople(decider) && !isManager) {
    throw new PermissionError("Only admins or the manager can decide this");
  }
  if (request.status !== "PENDING") {
    throw new AppError("That request has already been decided");
  }
  return prisma.vacationRequest.update({
    where: { id: requestId },
    data: {
      status,
      decidedById: decider.id,
      decidedAt: new Date(),
      decisionNote: decisionNote ?? null,
    },
  });
}

export async function cancelVacation(user: SessionUser, requestId: string) {
  const request = await prisma.vacationRequest.findUnique({
    where: { id: requestId },
  });
  if (!request) throw new AppError("Request not found", 404);
  if (request.userId !== user.id && !canManagePeople(user)) {
    throw new PermissionError();
  }
  if (request.status === "CANCELLED" || request.status === "DECLINED") {
    throw new AppError("That request is already closed");
  }
  if (utcMidnight(request.endDate) < utcMidnight(new Date())) {
    throw new AppError("Past time off cannot be cancelled");
  }
  return prisma.vacationRequest.update({
    where: { id: requestId },
    data: { status: "CANCELLED" },
  });
}

export async function addPerformanceNote(
  author: SessionUser,
  input: {
    userId: string;
    kind: Prisma.PerformanceNoteCreateInput["kind"];
    body: string;
  },
) {
  const profile = await prisma.employeeProfile.findUnique({
    where: { userId: input.userId },
    select: { managerId: true },
  });
  const target = { id: input.userId, managerId: profile?.managerId ?? null };
  if (!canViewPerformanceNotes(author, target)) {
    throw new PermissionError("Only admins or the manager can add notes");
  }
  const body = input.body.trim();
  if (body.length < 3) throw new AppError("Write a little more");
  return prisma.performanceNote.create({
    data: { userId: input.userId, authorId: author.id, kind: input.kind, body },
  });
}

export async function updatePerformanceNote(
  editor: SessionUser,
  noteId: string,
  body: string,
) {
  const note = await prisma.performanceNote.findUnique({
    where: { id: noteId },
    include: {
      user: { include: { profile: { select: { managerId: true } } } },
    },
  });
  if (!note) throw new AppError("Note not found", 404);
  const target = {
    id: note.userId,
    managerId: note.user.profile?.managerId ?? null,
  };
  if (!canViewPerformanceNotes(editor, target)) throw new PermissionError();
  const text = body.trim();
  if (text.length < 3) throw new AppError("Write a little more");
  return prisma.performanceNote.update({
    where: { id: noteId },
    data: { body: text },
  });
}
