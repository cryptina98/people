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
  formatAnnualDate,
  formatMoney,
  formatTenure,
  hasKnownBirthYear,
  nextAnniversaryNumber,
  performanceNoteKindLabels,
} from "@/lib/people";
import {
  canManagePeople,
  canViewCompensation,
  canViewPerformanceNotes,
  PermissionError,
} from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getPerson } from "@/server/people";

import { ordinal, PersonLink, teamLabel, VacationList } from "../components";
import {
  CompensationForm,
  EditableNoteBody,
  PerformanceNoteForm,
  ProfileForm,
  VacationRequestForm,
} from "../forms";

export const dynamic = "force-dynamic";

const noteTone: Record<string, string> = {
  CHECK_IN: "border-sky-200 bg-sky-50 text-sky-700",
  REVIEW: "border-indigo-200 bg-indigo-50 text-indigo-700",
  FOCUS: "border-violet-200 bg-violet-50 text-violet-700",
  KUDOS: "border-emerald-200 bg-emerald-50 text-emerald-700",
  CONCERN: "border-amber-200 bg-amber-50 text-amber-700",
};

export default async function PersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const viewer = await requireUser();
  const { id } = await params;

  let detail;
  try {
    detail = await getPerson(viewer, id);
  } catch (error) {
    if (error instanceof PermissionError) notFound();
    throw error;
  }
  if (!detail) notFound();

  const { person, notes, compensation, reports, balance } = detail;
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

  return (
    <div className="space-y-8">
      <PageHeader
        title={isSelf ? "Me" : person.name}
        subtitle={
          admin ? (
            <Link href="/people" className="underline-offset-4 hover:underline">
              ← People
            </Link>
          ) : undefined
        }
        actions={
          admin ? (
            <ProfileForm
              userId={person.id}
              managers={managers}
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
          ) : undefined
        }
      />

      {/* Profile card */}
      <Card className="space-y-5 p-5">
        <div className="flex items-start gap-4">
          <InitialsAvatar name={person.name} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold text-neutral-900">
              {person.name}
              {profile?.pronouns ? (
                <span className="ml-2 text-sm font-normal text-neutral-400">
                  {profile.pronouns}
                </span>
              ) : null}
              {!person.active ? (
                <span className="ml-2 text-xs font-normal text-neutral-400">
                  alumni
                </span>
              ) : null}
            </p>
            <p className="text-sm text-neutral-600">
              {[person.title, teamLabel(person)].filter(Boolean).join(" · ")}
            </p>
            <p className="text-xs text-neutral-400">{person.email}</p>
          </div>
        </div>

        {profile?.bio ? (
          <p className="text-sm text-neutral-700">{profile.bio}</p>
        ) : null}

        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {profile?.team ? <Field label="Team">{profile.team}</Field> : null}
          <Field label="Based in">
            {profile?.location ?? "—"}
            <span className="block text-xs text-neutral-400">
              {person.timezone}
            </span>
          </Field>
          <Field label="With us">
            {formatTenure(profile?.startDate)}
            <span className="block text-xs text-neutral-400">
              {profile?.startDate
                ? `since ${formatDate(profile.startDate)} ${profile.startDate.getUTCFullYear()}`
                : "no start date"}
            </span>
          </Field>
          <Field label="Reports to">
            {profile?.manager ? (
              <PersonLink id={profile.manager.id} name={profile.manager.name} />
            ) : (
              "—"
            )}
          </Field>
          <Field label="Employment">
            {employmentTypeLabels[profile?.employmentType ?? "FULL_TIME"]}
            <span className="block text-xs text-neutral-400">
              {roleLabels[person.role]}
            </span>
          </Field>
          {profile?.startDate && person.active ? (
            <Field label="Next anniversary">
              {ordinal(nextAnniversaryNumber(profile.startDate))}
              <span className="block text-xs text-neutral-400">
                in {daysUntilAnnual(profile.startDate)} days
              </span>
            </Field>
          ) : null}
          {profile?.birthday ? (
            <Field label="Birthday">
              {hasKnownBirthYear(profile.birthday)
                ? formatDate(profile.birthday)
                : formatAnnualDate(profile.birthday)}
              <span className="block text-xs text-neutral-400">
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
            <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
              Working on
            </p>
            <p className="text-sm text-neutral-800">{profile.currentFocus}</p>
          </div>
        ) : null}

        {profile?.achievements.length ? (
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
              Achievements
            </p>
            <ul className="mt-1 space-y-1 text-sm text-neutral-800">
              {profile.achievements.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-neutral-400">★</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {reports.length > 0 ? (
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
              Direct reports
            </p>
            <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm">
              {reports.map((report) => (
                <PersonLink key={report.id} id={report.id} name={report.name} />
              ))}
            </p>
          </div>
        ) : null}
      </Card>

      {/* Time off */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Section
          title="Time off"
          description={`${balance.taken} of ${balance.allowance} vacation days used this year · ${balance.remaining} left${balance.pending ? ` · ${balance.pending} pending` : ""}`}
        >
          <div className="glass-field h-2 overflow-hidden rounded-full">
            <div
              className="h-full rounded-full bg-sky-400/80"
              style={{
                width: `${Math.min(100, (balance.taken / Math.max(1, balance.allowance)) * 100)}%`,
              }}
            />
          </div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
            Upcoming
          </p>
          <VacationList
            requests={upcoming}
            canDecide={admin || profile?.managerId === viewer.id}
            canCancel={isSelf || admin}
            emptyLabel="No upcoming time off"
          />
          {past.length > 0 ? (
            <>
              <p className="pt-2 text-[11px] font-medium uppercase tracking-wide text-neutral-400">
                History
              </p>
              <VacationList requests={past} />
            </>
          ) : null}
        </Section>

        <aside className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            {isSelf ? "Request time off" : "Log time off"}
          </h2>
          <Card className="p-4">
            <VacationRequestForm
              userId={isSelf ? undefined : person.id}
              remaining={balance.afterPending}
            />
          </Card>
        </aside>
      </div>

      {/* Performance notes */}
      {showNotes ? (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Section
            title="Performance & focus"
            count={notes.length}
            description="Timestamped notes from team leads. Newest first."
          >
            {notes.length === 0 ? (
              <Card className="px-4 py-6 text-center text-sm text-neutral-500">
                No notes yet
              </Card>
            ) : (
              <Card className="divide-y divide-neutral-100">
                {notes.map((note) => (
                  <div key={note.id} className="space-y-2 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${noteTone[note.kind]}`}
                      >
                        {performanceNoteKindLabels[note.kind]}
                      </span>
                      <span>{note.author?.name ?? "Unknown"}</span>
                      <span>·</span>
                      <time dateTime={note.createdAt.toISOString()}>
                        {formatDate(note.createdAt)}{" "}
                        {note.createdAt.getUTCFullYear()}
                      </time>
                      {note.updatedAt.getTime() - note.createdAt.getTime() >
                      60_000 ? (
                        <span className="text-neutral-400">
                          · edited {formatRelative(note.updatedAt)}
                        </span>
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
          <aside className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Add a note
            </h2>
            <Card className="p-4">
              <PerformanceNoteForm userId={person.id} />
            </Card>
          </aside>
        </div>
      ) : null}

      {/* Compensation */}
      {showComp ? (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
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
              <Card className="px-4 py-6 text-center text-sm text-neutral-500">
                Nothing recorded
              </Card>
            ) : (
              <Card className="divide-y divide-neutral-100">
                {compensation.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-neutral-900">
                        {compensationKindLabels[event.kind]}
                        <span className="ml-2 font-normal text-neutral-500">
                          {formatDate(event.effectiveDate)}{" "}
                          {event.effectiveDate.getUTCFullYear()}
                        </span>
                      </p>
                      <p className="text-xs text-neutral-500">
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
                    <p className="text-sm font-semibold tabular-nums text-neutral-900">
                      {formatMoney(event.amount, event.currency)}
                    </p>
                  </div>
                ))}
              </Card>
            )}
          </Section>
          <aside className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Record salary / bonus
            </h2>
            <Card className="p-4">
              <CompensationForm
                userId={person.id}
                defaultCurrency={defaultCurrency}
              />
            </Card>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
