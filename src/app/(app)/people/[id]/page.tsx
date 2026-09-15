import Link from "next/link";
import { notFound } from "next/navigation";

import {
  Card,
  Field,
  InitialsAvatar,
  PageHeader,
  Section,
} from "@/components/chrome/page";
import { requireUser } from "@/lib/auth/current-user";
import { formatDate, formatRelative } from "@/lib/format";
import { roleLabels } from "@/lib/labels";
import {
  compensationKindLabels,
  daysUntilAnnual,
  employmentTypeLabels,
  formatAgo,
  formatAnnualDate,
  formatMoney,
  hasKnownBirthYear,
  isCheckInOverdue,
  nextAnniversaryNumber,
  performanceNoteKindLabels,
} from "@/lib/people";
import { env } from "@/lib/env";
import {
  canManagePeople,
  canViewCompensation,
  canViewPerformanceNotes,
  PermissionError,
} from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getPerson } from "@/server/people";

import {
  ordinal,
  PersonLink,
  StatusPill,
  teamLabel,
  Tenure,
  VacationList,
} from "../components";
import {
  CompensationForm,
  EditableNoteBody,
  ProfileActions,
  ProfileForm,
  VacationRequestForm,
} from "../forms";

export const dynamic = "force-dynamic";

const noteTone: Record<string, string> = {
  CHECK_IN: "bg-neutral-100 text-neutral-700",
  REVIEW: "bg-neutral-100 text-neutral-700",
  FOCUS: "bg-neutral-100 text-neutral-700",
  KUDOS: "bg-status-green-bg text-status-green",
  CONCERN: "bg-status-amber-bg text-status-amber",
};

function SubHeading({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] font-semibold text-ink">{children}</p>;
}

export default async function PersonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const viewer = await requireUser();
  const [{ id }, query] = await Promise.all([params, searchParams]);

  let detail;
  try {
    detail = await getPerson(viewer, id);
  } catch (error) {
    if (error instanceof PermissionError) notFound();
    throw error;
  }
  if (!detail) notFound();

  const {
    person,
    notes,
    statusHistory,
    compensation,
    reports,
    balance,
    status,
    lastCheckIn,
  } = detail;
  const profile = person.profile;
  const isSelf = person.id === viewer.id;
  const admin = canManagePeople(viewer);
  const target = { id: person.id, managerId: profile?.managerId ?? null };
  const showNotes = canViewPerformanceNotes(viewer, target);
  const showComp = canViewCompensation(viewer);

  const managers = admin
    ? await prisma.user.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      })
    : [];

  const today = new Date();
  const upcoming = person.vacations.filter(
    (v) =>
      (v.status === "APPROVED" || v.status === "PENDING") && v.endDate >= today,
  );
  const past = person.vacations.filter(
    (v) => !upcoming.some((u) => u.id === v.id),
  );
  const currentSalary = compensation.find((c) => c.kind === "SALARY");
  const defaultCurrency = currentSalary?.currency ?? "USD";
  const overdue =
    person.active &&
    isCheckInOverdue(lastCheckIn, { thresholdDays: env.checkInThresholdDays });
  const latestChange = statusHistory[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title={isSelf ? "Me" : person.name}
        subtitle={
          admin ? (
            <Link
              href="/people"
              className="-my-3 inline-flex min-h-11 items-center text-brand hover:underline"
            >
              ← Dashboard
            </Link>
          ) : undefined
        }
      />

      {/* Profile card */}
      <Card className="space-y-5 p-4 sm:p-5">
        <div className="flex items-start gap-4">
          <InitialsAvatar name={person.name} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[18px] leading-tight font-semibold text-ink">
                {person.name}
              </p>
              {showNotes ? <StatusPill status={status} /> : null}
              {!person.active ? (
                <span className="text-xs text-meta">alumni</span>
              ) : null}
            </div>
            <p className="text-[13px] text-meta">
              {[person.title, teamLabel(person), profile?.pronouns]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <p className="text-[13px] text-meta">{person.email}</p>
          </div>
        </div>

        {showNotes ? (
          <div className="space-y-2.5">
            <p className="text-[13px] text-meta">
              {profile?.status && profile.statusSetAt ? (
                <>
                  Set by{" "}
                  <span className="font-medium text-ink">
                    {latestChange?.setBy?.name?.split(" ")[0] ?? "someone"}
                  </span>
                  , {formatAgo(profile.statusSetAt)}
                  {profile.statusReason ? ` — “${profile.statusReason}”` : ""}
                </>
              ) : status === "NEW_JOINER" ? (
                "Automatic for the first 90 days"
              ) : (
                "Default status — nobody has set one yet"
              )}
              <span className="mx-1.5 text-neutral-300">·</span>
              <span
                className={overdue ? "font-semibold text-status-amber" : ""}
              >
                {lastCheckIn
                  ? `Last check-in ${formatAgo(lastCheckIn)}`
                  : "No check-in yet"}
              </span>
            </p>
            <ProfileActions
              userId={person.id}
              name={person.name}
              status={status}
              statusReason={profile?.statusReason}
            />
          </div>
        ) : null}

        {profile?.bio ? (
          <p className="text-sm text-neutral-700">{profile.bio}</p>
        ) : null}

        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <Field label="Based in">
            {profile?.location ?? <span className="text-meta">Not set</span>}
            <span className="block text-xs text-meta">{person.timezone}</span>
          </Field>
          <Field label="With us">
            <Tenure
              start={profile?.startDate}
              admin={admin}
              personId={person.id}
            />
            <span className="block text-xs text-meta">
              {profile?.startDate
                ? `since ${formatDate(profile.startDate)} ${profile.startDate.getUTCFullYear()}`
                : admin
                  ? "needed for tenure & anniversaries"
                  : "ask People Ops to add it"}
            </span>
          </Field>
          <Field label="Reports to">
            {profile?.manager ? (
              <PersonLink id={profile.manager.id} name={profile.manager.name} />
            ) : (
              <span className="text-meta">Nobody</span>
            )}
          </Field>
          <Field label="Employment">
            {employmentTypeLabels[profile?.employmentType ?? "FULL_TIME"]}
            <span className="block text-xs text-meta">
              {roleLabels[person.role]}
            </span>
          </Field>
          {profile?.startDate && person.active ? (
            <Field label="Next anniversary">
              {ordinal(nextAnniversaryNumber(profile.startDate))}
              <span className="tabular block text-xs text-meta">
                in {daysUntilAnnual(profile.startDate)} days
              </span>
            </Field>
          ) : null}
          {profile?.birthday ? (
            <Field label="Birthday">
              {hasKnownBirthYear(profile.birthday)
                ? formatDate(profile.birthday)
                : formatAnnualDate(profile.birthday)}
              <span className="tabular block text-xs text-meta">
                in {daysUntilAnnual(profile.birthday)} days
              </span>
            </Field>
          ) : null}
          {(admin || isSelf) && profile?.phone ? (
            <Field label="Phone">{profile.phone}</Field>
          ) : null}
          {(admin || isSelf) && profile?.personalEmail ? (
            <Field label="Personal email">{profile.personalEmail}</Field>
          ) : null}
          {admin && profile?.emergencyContact ? (
            <Field label="Emergency contact">{profile.emergencyContact}</Field>
          ) : null}
        </dl>

        {profile?.currentFocus ? (
          <div>
            <SubHeading>Working on</SubHeading>
            <p className="text-sm text-neutral-700">{profile.currentFocus}</p>
          </div>
        ) : null}

        {profile?.achievements.length ? (
          <div>
            <SubHeading>Achievements</SubHeading>
            <ul className="mt-1 space-y-1 text-sm text-neutral-700">
              {profile.achievements.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-meta">★</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {reports.length > 0 ? (
          <div>
            <SubHeading>Direct reports</SubHeading>
            <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm">
              {reports.map((report) => (
                <PersonLink key={report.id} id={report.id} name={report.name} />
              ))}
            </p>
          </div>
        ) : null}
      </Card>

      {admin ? (
        <Section id="edit" title="Profile details">
          <Card className="p-4">
            <ProfileForm
              userId={person.id}
              managers={managers}
              startOpen={query.edit === "1" || !profile?.startDate}
              values={{
                title: person.title,
                managerId: profile?.managerId ?? null,
                startDate: profile?.startDate ?? null,
                endDate: profile?.endDate ?? null,
                birthday: profile?.birthday ?? null,
                team: profile?.team ?? null,
                location: profile?.location ?? null,
                country: profile?.country ?? null,
                employmentType: profile?.employmentType ?? "FULL_TIME",
                pronouns: profile?.pronouns ?? null,
                phone: profile?.phone ?? null,
                personalEmail: profile?.personalEmail ?? null,
                emergencyContact: profile?.emergencyContact ?? null,
                bio: profile?.bio ?? null,
                currentFocus: profile?.currentFocus ?? null,
                achievements: profile?.achievements ?? [],
                vacationAllowance: profile?.vacationAllowance ?? 25,
              }}
            />
          </Card>
        </Section>
      ) : null}

      {/* Time off */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Section
          title="Time off"
          description={`${balance.taken} of ${balance.allowance} vacation days used this year · ${balance.remaining} left${balance.pending ? ` · ${balance.pending} pending` : ""}`}
        >
          <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200">
            <div
              className="h-full rounded-full bg-brand"
              style={{
                width: `${Math.min(100, (balance.taken / Math.max(1, balance.allowance)) * 100)}%`,
              }}
            />
          </div>
          <SubHeading>Upcoming</SubHeading>
          <VacationList
            requests={upcoming}
            canDecide={admin || profile?.managerId === viewer.id}
            canCancel={isSelf || admin}
            emptyLabel="No upcoming time off"
          />
          {past.length > 0 ? (
            <>
              <div className="pt-2">
                <SubHeading>History</SubHeading>
              </div>
              <VacationList requests={past} />
            </>
          ) : null}
        </Section>

        <Section title={isSelf ? "Request time off" : "Log time off"}>
          <Card className="p-4">
            <VacationRequestForm
              userId={isSelf ? undefined : person.id}
              remaining={balance.afterPending}
            />
          </Card>
        </Section>
      </div>

      {/* Performance notes */}
      {showNotes ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Section
            title="Performance & focus"
            count={notes.length}
            description="Timestamped notes from team leads. Newest first."
          >
            {notes.length === 0 ? (
              <p className="px-0.5 text-[13px] text-meta">
                No notes yet — use “Log check-in” above.
              </p>
            ) : (
              <Card className="divide-y divide-neutral-100">
                {notes.map((note) => (
                  <div key={note.id} className="space-y-2 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2 text-[13px] text-meta">
                      <span
                        className={`rounded-[6px] px-2 py-0.5 text-[12px] font-semibold ${noteTone[note.kind]}`}
                      >
                        {performanceNoteKindLabels[note.kind]}
                      </span>
                      <span>{note.author?.name ?? "Unknown"}</span>
                      <span>·</span>
                      <time
                        className="tabular"
                        dateTime={note.createdAt.toISOString()}
                        title={note.createdAt.toISOString()}
                      >
                        {formatDate(note.createdAt)}{" "}
                        {note.createdAt.getUTCFullYear()} ·{" "}
                        {formatRelative(note.createdAt)}
                      </time>
                      {note.updatedAt.getTime() - note.createdAt.getTime() >
                      60_000 ? (
                        <span>· edited {formatRelative(note.updatedAt)}</span>
                      ) : null}
                    </div>
                    <EditableNoteBody
                      noteId={note.id}
                      body={note.body}
                      editable={admin || note.authorId === viewer.id}
                    />
                  </div>
                ))}
              </Card>
            )}
          </Section>

          <Section title="Status history" count={statusHistory.length}>
            {statusHistory.length === 0 ? (
              <p className="px-0.5 text-[13px] text-meta">No status set yet.</p>
            ) : (
              <Card className="divide-y divide-neutral-100">
                {statusHistory.map((change) => (
                  <div key={change.id} className="space-y-1 px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <StatusPill status={change.status} />
                      <time
                        className="tabular text-[12px] text-meta"
                        dateTime={change.createdAt.toISOString()}
                      >
                        {formatAgo(change.createdAt)}
                      </time>
                    </div>
                    <p className="text-[13px] text-meta">
                      Set by {change.setBy?.name ?? "someone"}
                      {change.reason ? ` — “${change.reason}”` : ""}
                    </p>
                  </div>
                ))}
              </Card>
            )}
          </Section>
        </div>
      ) : null}

      {/* Compensation: admin-only, enforced again server-side in getPerson */}
      {showComp ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Section
            title="Compensation"
            count={compensation.length}
            description={
              currentSalary
                ? `Current salary ${formatMoney(currentSalary.amount, currentSalary.currency)} since ${formatDate(currentSalary.effectiveDate)} ${currentSalary.effectiveDate.getUTCFullYear()}`
                : "No salary on record"
            }
          >
            {compensation.length === 0 ? (
              <p className="px-0.5 text-[13px] text-meta">Nothing recorded</p>
            ) : (
              <Card className="divide-y divide-neutral-100">
                {compensation.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink">
                        {compensationKindLabels[event.kind]}
                        <span className="tabular ml-2 font-normal text-meta">
                          {formatDate(event.effectiveDate)}{" "}
                          {event.effectiveDate.getUTCFullYear()}
                        </span>
                      </p>
                      <p className="text-[13px] text-meta">
                        {[
                          event.note,
                          event.grantedBy
                            ? `granted by ${event.grantedBy.name}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <p className="tabular text-sm font-semibold text-ink">
                      {formatMoney(event.amount, event.currency)}
                    </p>
                  </div>
                ))}
              </Card>
            )}
          </Section>
          <Section title="Record salary / bonus">
            <Card className="p-4">
              <CompensationForm
                userId={person.id}
                defaultCurrency={defaultCurrency}
              />
            </Card>
          </Section>
        </div>
      ) : null}
    </div>
  );
}
