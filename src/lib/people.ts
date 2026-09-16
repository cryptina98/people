import type {
  CompensationKind,
  EmploymentType,
  PerformanceNoteKind,
  PerformanceStatus,
  VacationStatus,
  VacationType,
} from "@prisma/client";

const DAY = 24 * 60 * 60 * 1000;

export const performanceStatusLabels: Record<PerformanceStatus, string> = {
  ON_TRACK: "On track",
  NEEDS_ATTENTION: "Needs attention",
  LEAD_FLAGGED: "Lead flagged",
  AT_RISK: "At risk",
  NEW_JOINER: "New joiner",
};

/** Order used by status pickers and when sorting the attention list. */
export const performanceStatusOrder: PerformanceStatus[] = [
  "ON_TRACK",
  "NEEDS_ATTENTION",
  "LEAD_FLAGGED",
  "AT_RISK",
  "NEW_JOINER",
];

export const flaggedStatuses = new Set<PerformanceStatus>([
  "NEEDS_ATTENTION",
  "LEAD_FLAGGED",
  "AT_RISK",
]);

export const NEW_JOINER_DAYS = 90;
export const DEFAULT_CHECK_IN_DAYS = 30;

/**
 * The status shown for a person. An explicit status always wins; otherwise
 * people in their first 90 days are new joiners and everyone else is on track.
 */
export function effectiveStatus(
  profile: {
    status: PerformanceStatus | null;
    startDate: Date | null;
  } | null,
  today = new Date(),
): PerformanceStatus {
  if (profile?.status) return profile.status;
  if (
    profile?.startDate &&
    daysBetween(profile.startDate, today) < NEW_JOINER_DAYS
  ) {
    return "NEW_JOINER";
  }
  return "ON_TRACK";
}

export function daysBetween(from: Date, to: Date): number {
  return Math.floor(
    (utcMidnight(to).getTime() - utcMidnight(from).getTime()) / DAY,
  );
}

/** "today", "12d ago", "6w ago", "4mo ago" — coarse, for scanning. */
export function formatAgo(date: Date, today = new Date()): string {
  const days = daysBetween(date, today);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days}d ago`;
  if (days < 60) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export type TriageBucket = "attention" | "overdue" | "unstarted" | "good";

export type TriageInput = {
  status: PerformanceStatus;
  lastCheckIn: Date | null;
};

/**
 * Flagged statuses need attention; a stale check-in is overdue; people who
 * have never had a check-in are "unstarted" (kept out of the overdue wall so
 * a fresh roster doesn't start with everyone flagged); the rest are fine.
 * Buckets are exclusive so a person appears once.
 */
export function triageBucket(
  input: TriageInput,
  { thresholdDays = DEFAULT_CHECK_IN_DAYS, today = new Date() } = {},
): TriageBucket {
  if (flaggedStatuses.has(input.status)) return "attention";
  if (!input.lastCheckIn) return "unstarted";
  if (daysBetween(input.lastCheckIn, today) > thresholdDays) return "overdue";
  return "good";
}

export function isCheckInOverdue(
  lastCheckIn: Date | null,
  { thresholdDays = DEFAULT_CHECK_IN_DAYS, today = new Date() } = {},
) {
  return !!lastCheckIn && daysBetween(lastCheckIn, today) > thresholdDays;
}

export const employmentTypeLabels: Record<EmploymentType, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACTOR: "Contractor",
  INTERN: "Intern",
};

export const vacationTypeLabels: Record<VacationType, string> = {
  VACATION: "Vacation",
  SICK: "Sick leave",
  PARENTAL: "Parental leave",
  UNPAID: "Unpaid leave",
  OTHER: "Other",
};

export const vacationStatusLabels: Record<VacationStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  DECLINED: "Declined",
  CANCELLED: "Cancelled",
};

export const performanceNoteKindLabels: Record<PerformanceNoteKind, string> = {
  CHECK_IN: "Check-in",
  REVIEW: "Review",
  FOCUS: "Focus",
  KUDOS: "Kudos",
  CONCERN: "Concern",
};

export const compensationKindLabels: Record<CompensationKind, string> = {
  SALARY: "Salary",
  BONUS: "Bonus",
  EQUITY: "Equity",
  ADJUSTMENT: "Adjustment",
};

export function utcMidnight(value: Date): Date {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );
}

/** Mon–Fri days in the inclusive range. */
export function workingDaysBetween(start: Date, end: Date): number {
  const from = utcMidnight(start);
  const to = utcMidnight(end);
  if (to < from) return 0;
  let count = 0;
  for (
    let cursor = from;
    cursor <= to;
    cursor = new Date(cursor.getTime() + DAY)
  ) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
}

export type Tenure = { years: number; months: number; days: number };

export function tenureSince(start: Date, today = new Date()): Tenure {
  const from = utcMidnight(start);
  const to = utcMidnight(today);
  let years = to.getUTCFullYear() - from.getUTCFullYear();
  let months = to.getUTCMonth() - from.getUTCMonth();
  let days = to.getUTCDate() - from.getUTCDate();
  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(
      Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 0),
    );
    days += prevMonth.getUTCDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years: Math.max(0, years), months, days };
}

export function formatTenure(
  start: Date | null | undefined,
  today = new Date(),
) {
  if (!start) return "No start date";
  const { years, months } = tenureSince(start, today);
  if (years === 0 && months === 0) return "just joined";
  const parts: string[] = [];
  if (years > 0) parts.push(`${years}y`);
  if (months > 0) parts.push(`${months}m`);
  return parts.join(" ");
}

/**
 * Days until the next occurrence of a yearly date (birthday, work
 * anniversary). Returns 0 when it is today.
 */
export function daysUntilAnnual(date: Date, today = new Date()): number {
  const now = utcMidnight(today);
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  let next = new Date(Date.UTC(now.getUTCFullYear(), month, day));
  if (next < now)
    next = new Date(Date.UTC(now.getUTCFullYear() + 1, month, day));
  return Math.round((next.getTime() - now.getTime()) / DAY);
}

/** Which anniversary comes up next (1 for the first). */
export function nextAnniversaryNumber(start: Date, today = new Date()): number {
  const years = tenureSince(start, today).years;
  const days = daysUntilAnnual(start, today);
  return days === 0 ? years : years + 1;
}

/**
 * Birthdays imported without a year are stored in this sentinel year so the
 * month/day still drives reminders while age stays unknown.
 */
export const UNKNOWN_BIRTH_YEAR = 1900;

export function hasKnownBirthYear(birthday: Date): boolean {
  return birthday.getUTCFullYear() > UNKNOWN_BIRTH_YEAR;
}

/** Month + day only, e.g. "May 2". */
export function formatAnnualDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function ageOnNextBirthday(
  birthday: Date,
  today = new Date(),
): number | null {
  if (!hasKnownBirthYear(birthday)) return null;
  const turning = tenureSince(birthday, today).years;
  return daysUntilAnnual(birthday, today) === 0 ? turning : turning + 1;
}

export type VacationLike = {
  status: VacationStatus;
  type: VacationType;
  startDate: Date;
  endDate: Date;
  workingDays: number;
};

/**
 * Vacation-type days that count against the allowance for a calendar year.
 * Approved requests count; pending are shown separately as "requested".
 */
export function vacationBalance(
  allowance: number,
  requests: VacationLike[],
  year = new Date().getUTCFullYear(),
) {
  const inYear = requests.filter(
    (request) =>
      request.type === "VACATION" &&
      request.startDate.getUTCFullYear() === year,
  );
  const taken = inYear
    .filter((request) => request.status === "APPROVED")
    .reduce((sum, request) => sum + request.workingDays, 0);
  const pending = inYear
    .filter((request) => request.status === "PENDING")
    .reduce((sum, request) => sum + request.workingDays, 0);
  return {
    allowance,
    taken,
    pending,
    remaining: allowance - taken,
    afterPending: allowance - taken - pending,
  };
}

export function isOutOn(request: VacationLike, day: Date) {
  const point = utcMidnight(day).getTime();
  return (
    request.status === "APPROVED" &&
    utcMidnight(request.startDate).getTime() <= point &&
    utcMidnight(request.endDate).getTime() >= point
  );
}

export function formatMoney(
  amount: number | string | { toString(): string },
  currency: string,
) {
  const value = Number(amount.toString());
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString("en-GB")}`;
  }
}

export function toDateInputValue(value: Date | null | undefined) {
  if (!value) return "";
  return utcMidnight(value).toISOString().slice(0, 10);
}
