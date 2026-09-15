"use client";

import { useState, type InputHTMLAttributes } from "react";
import type {
  CompensationKind,
  EmploymentType,
  PerformanceNoteKind,
  PerformanceStatus,
  VacationStatus,
  VacationType,
} from "@prisma/client";
import { MessageSquarePlus, Tag } from "lucide-react";

import {
  ActionButton,
  InlineForm,
  PersistentForm,
} from "@/components/chrome/org-forms";
import { Sheet } from "@/components/chrome/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  compensationKindLabels,
  employmentTypeLabels,
  flaggedStatuses,
  performanceNoteKindLabels,
  performanceStatusLabels,
  performanceStatusOrder,
  toDateInputValue,
  vacationTypeLabels,
  workingDaysBetween,
} from "@/lib/people";
import {
  addCompensationAction,
  addPerformanceNoteAction,
  cancelVacationAction,
  decideVacationAction,
  setStatusAction,
  submitVacationAction,
  updatePerformanceNoteAction,
  upsertProfileAction,
} from "@/server/actions/people";

const selectClass =
  "min-h-11 w-full rounded-[10px] border border-neutral-200 bg-white px-3 text-base text-ink outline-none focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20 md:text-sm";

const statusDot: Record<PerformanceStatus, string> = {
  ON_TRACK: "bg-status-green",
  NEEDS_ATTENTION: "bg-status-amber",
  LEAD_FLAGGED: "bg-status-orange",
  AT_RISK: "bg-status-red",
  NEW_JOINER: "bg-status-slate",
};

const statusHint: Record<PerformanceStatus, string> = {
  ON_TRACK: "Doing well, nothing needed",
  NEEDS_ATTENTION: "Worth a follow-up this week",
  LEAD_FLAGGED: "Their lead asked for support",
  AT_RISK: "Serious concern, act now",
  NEW_JOINER: "In their first 90 days",
};

function Select({
  id,
  name,
  defaultValue,
  options,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  options: Record<string, string>;
}) {
  return (
    <select
      id={id}
      name={name}
      defaultValue={defaultValue}
      className={selectClass}
    >
      {Object.entries(options).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}

// --- Vacation --------------------------------------------------------------

/** Team-facing widget. Admins can also pass a `userId` to log on behalf. */
export function VacationRequestForm({
  userId,
  remaining,
}: {
  userId?: string;
  remaining?: number;
}) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const reversed = Boolean(start && end && end < start);
  const days =
    start && end && !reversed
      ? workingDaysBetween(new Date(start), new Date(end))
      : 0;

  return (
    <InlineForm
      action={submitVacationAction}
      success="Request sent"
      submitLabel="Request time off"
      className="space-y-3"
    >
      {userId ? <input type="hidden" name="userId" value={userId} /> : null}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="startDate">From</Label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            required
            value={start}
            onChange={(event) => setStart(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="endDate">To</Label>
          <Input
            id="endDate"
            name="endDate"
            type="date"
            required
            min={start || undefined}
            value={end}
            aria-invalid={reversed || undefined}
            onChange={(event) => setEnd(event.target.value)}
          />
        </div>
      </div>
      {reversed ? (
        <p className="text-[13px] font-medium text-status-red">
          “To” must be on or after “From”.
        </p>
      ) : days > 0 ? (
        <p className="tabular text-[13px] text-meta">
          {days} working day{days === 1 ? "" : "s"}
          {typeof remaining === "number"
            ? ` · ${remaining - days} left after this`
            : ""}
        </p>
      ) : null}
      <div className="space-y-1.5">
        <Label htmlFor="type">Type</Label>
        <Select
          id="type"
          name="type"
          defaultValue="VACATION"
          options={vacationTypeLabels as Record<VacationType, string>}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="note">Note (optional)</Label>
        <Input
          id="note"
          name="note"
          placeholder="Where to, or anything to know"
        />
      </div>
    </InlineForm>
  );
}

export function VacationDecision({
  requestId,
  status,
  canDecide,
  canCancel,
  isPast,
}: {
  requestId: string;
  status: VacationStatus;
  canDecide: boolean;
  canCancel: boolean;
  isPast: boolean;
}) {
  if (status === "PENDING" && canDecide) {
    return (
      <div className="flex gap-2">
        <ActionButton
          variant="default"
          action={() => decideVacationAction(requestId, "APPROVED")}
          success="Approved"
        >
          Approve
        </ActionButton>
        <ActionButton
          variant="outline"
          action={() => decideVacationAction(requestId, "DECLINED")}
          success="Declined"
          confirm="Decline this request?"
        >
          Decline
        </ActionButton>
      </div>
    );
  }
  if (canCancel && !isPast && (status === "PENDING" || status === "APPROVED")) {
    return (
      <ActionButton
        action={() => cancelVacationAction(requestId)}
        success="Cancelled"
        confirm="Cancel this time off?"
      >
        Cancel
      </ActionButton>
    );
  }
  return null;
}

// --- Performance notes -----------------------------------------------------

export function PerformanceNoteForm({
  userId,
  defaultKind = "CHECK_IN",
  onSuccess,
}: {
  userId: string;
  defaultKind?: PerformanceNoteKind;
  onSuccess?: () => void;
}) {
  const id = `note-${userId}`;
  return (
    <InlineForm
      action={addPerformanceNoteAction.bind(null, userId)}
      success="Note added"
      submitLabel="Add note"
      className="space-y-3"
      onSuccess={onSuccess}
    >
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-kind`}>Kind</Label>
        <Select
          id={`${id}-kind`}
          name="kind"
          defaultValue={defaultKind}
          options={
            performanceNoteKindLabels as Record<PerformanceNoteKind, string>
          }
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-body`}>
          What are they working on, how is it going?
        </Label>
        <Textarea id={`${id}-body`} name="body" rows={4} required autoFocus />
      </div>
    </InlineForm>
  );
}

// --- Performance status ----------------------------------------------------

export function StatusPickerForm({
  userId,
  current,
  currentReason,
  onSuccess,
}: {
  userId: string;
  current: PerformanceStatus;
  currentReason?: string | null;
  onSuccess?: () => void;
}) {
  const [picked, setPicked] = useState<PerformanceStatus>(current);
  const wantsReason = flaggedStatuses.has(picked);
  return (
    <InlineForm
      action={setStatusAction.bind(null, userId)}
      success="Status updated"
      submitLabel="Save status"
      className="space-y-3"
      onSuccess={onSuccess}
    >
      <div role="radiogroup" className="space-y-1.5">
        {performanceStatusOrder.map((status) => {
          const selected = picked === status;
          return (
            <label
              key={status}
              className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2 transition-colors ${
                selected
                  ? "bg-brand/8 ring-2 ring-brand"
                  : "hover:bg-neutral-50"
              }`}
            >
              <input
                type="radio"
                name="status"
                value={status}
                checked={selected}
                onChange={() => setPicked(status)}
                className="sr-only"
              />
              <span
                className={`size-2.5 shrink-0 rounded-full ${statusDot[status]}`}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-ink">
                  {performanceStatusLabels[status]}
                  {status === "LEAD_FLAGGED" ? " — needs support" : ""}
                </span>
                <span className="block text-[12px] text-meta">
                  {statusHint[status]}
                </span>
              </span>
            </label>
          );
        })}
      </div>
      {wantsReason ? (
        <div className="space-y-1.5">
          <Label htmlFor={`reason-${userId}`}>Reason (optional)</Label>
          <Input
            id={`reason-${userId}`}
            name="reason"
            maxLength={200}
            defaultValue={currentReason ?? ""}
            placeholder="One line on what’s going on"
          />
        </div>
      ) : null}
    </InlineForm>
  );
}

/** The two one-tap actions on a person card. Each opens a bottom sheet. */
export function PersonCardActions({
  userId,
  name,
  status,
  statusReason,
}: {
  userId: string;
  name: string;
  status: PerformanceStatus;
  statusReason?: string | null;
}) {
  const [sheet, setSheet] = useState<"note" | "status" | null>(null);
  const close = () => setSheet(null);
  return (
    <div className="relative z-10 -mr-2 flex shrink-0 gap-0.5">
      <button
        type="button"
        onClick={() => setSheet("note")}
        aria-label={`Log check-in for ${name}`}
        title="Log check-in"
        className="flex size-11 items-center justify-center rounded-[10px] text-meta hover:bg-neutral-100 hover:text-brand"
      >
        <MessageSquarePlus className="size-5" />
      </button>
      <button
        type="button"
        onClick={() => setSheet("status")}
        aria-label={`Set status for ${name}`}
        title="Set status"
        className="flex size-11 items-center justify-center rounded-[10px] text-meta hover:bg-neutral-100 hover:text-brand"
      >
        <Tag className="size-5" />
      </button>
      <Sheet
        open={sheet === "note"}
        onClose={close}
        title="Log check-in"
        description={name}
      >
        <PerformanceNoteForm userId={userId} onSuccess={close} />
      </Sheet>
      <Sheet
        open={sheet === "status"}
        onClose={close}
        title="Set status"
        description={name}
      >
        <StatusPickerForm
          userId={userId}
          current={status}
          currentReason={statusReason}
          onSuccess={close}
        />
      </Sheet>
    </div>
  );
}

/** Profile-page variant: labelled buttons, same sheets. */
export function ProfileActions({
  userId,
  name,
  status,
  statusReason,
}: {
  userId: string;
  name: string;
  status: PerformanceStatus;
  statusReason?: string | null;
}) {
  const [sheet, setSheet] = useState<"note" | "status" | null>(null);
  const close = () => setSheet(null);
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <Button variant="outline" onClick={() => setSheet("note")}>
        <MessageSquarePlus /> Log check-in
      </Button>
      <Button variant="outline" onClick={() => setSheet("status")}>
        <Tag /> Set status
      </Button>
      <Sheet
        open={sheet === "note"}
        onClose={close}
        title="Add note"
        description={name}
      >
        <PerformanceNoteForm userId={userId} onSuccess={close} />
      </Sheet>
      <Sheet
        open={sheet === "status"}
        onClose={close}
        title="Set status"
        description={name}
      >
        <StatusPickerForm
          userId={userId}
          current={status}
          currentReason={statusReason}
          onSuccess={close}
        />
      </Sheet>
    </div>
  );
}

export function EditableNoteBody({
  noteId,
  body,
  editable,
}: {
  noteId: string;
  body: string;
  editable: boolean;
}) {
  const [editing, setEditing] = useState(false);
  if (!editing) {
    return (
      <div className="space-y-1">
        <p className="whitespace-pre-wrap text-sm text-ink">{body}</p>
        {editable ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="-mx-3 min-h-11 min-w-11 px-3 text-[13px] font-medium text-brand hover:underline"
          >
            Edit
          </button>
        ) : null}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <PersistentForm
        action={async (formData) => {
          const result = await updatePerformanceNoteAction(noteId, formData);
          if (result.ok) setEditing(false);
          return result;
        }}
        success="Note updated"
        submitLabel="Save"
        className="space-y-2"
      >
        <Textarea name="body" rows={4} defaultValue={body} required />
      </PersistentForm>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="w-full"
        onClick={() => setEditing(false)}
      >
        Cancel
      </Button>
    </div>
  );
}

// --- Compensation ----------------------------------------------------------

export function CompensationForm({
  userId,
  defaultCurrency,
}: {
  userId: string;
  defaultCurrency: string;
}) {
  return (
    <InlineForm
      action={addCompensationAction.bind(null, userId)}
      success="Recorded"
      submitLabel="Record"
      className="space-y-3"
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="compKind">Kind</Label>
          <Select
            id="compKind"
            name="kind"
            defaultValue="SALARY"
            options={compensationKindLabels as Record<CompensationKind, string>}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="effectiveDate">Effective</Label>
          <Input
            id="effectiveDate"
            name="effectiveDate"
            type="date"
            required
            defaultValue={toDateInputValue(new Date())}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="currency">Currency</Label>
          <Input
            id="currency"
            name="currency"
            maxLength={3}
            defaultValue={defaultCurrency}
            className="uppercase"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="compNote">Note (optional)</Label>
        <Input id="compNote" name="note" placeholder="e.g. Annual adjustment" />
      </div>
    </InlineForm>
  );
}

// --- Profile ---------------------------------------------------------------

export type ProfileFormValues = {
  title: string | null;
  managerId: string | null;
  startDate: Date | null;
  endDate: Date | null;
  birthday: Date | null;
  team: string | null;
  location: string | null;
  country: string | null;
  employmentType: EmploymentType;
  pronouns: string | null;
  phone: string | null;
  personalEmail: string | null;
  emergencyContact: string | null;
  bio: string | null;
  currentFocus: string | null;
  achievements: string[];
  vacationAllowance: number;
};

export function ProfileForm({
  userId,
  values,
  managers,
  startOpen = false,
}: {
  userId: string;
  values: ProfileFormValues;
  managers: { id: string; name: string }[];
  startOpen?: boolean;
}) {
  const [open, setOpen] = useState(startOpen);
  if (!open) {
    return (
      <Button
        variant="outline"
        className="w-full"
        onClick={() => setOpen(true)}
      >
        Edit profile
      </Button>
    );
  }
  return (
    <PersistentForm
      action={async (formData) => {
        const result = await upsertProfileAction(userId, formData);
        if (result.ok) setOpen(false);
        return result;
      }}
      success="Profile saved"
      submitLabel="Save profile"
      className="space-y-3"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Title" id="title">
          <Input id="title" name="title" defaultValue={values.title ?? ""} />
        </Field>
        <Field label="Reports to" id="managerId">
          <select
            id="managerId"
            name="managerId"
            defaultValue={values.managerId ?? ""}
            className={selectClass}
          >
            <option value="">— Nobody (top of the tree)</option>
            {managers
              .filter((manager) => manager.id !== userId)
              .map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.name}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Team" id="team">
          <Input
            id="team"
            name="team"
            defaultValue={values.team ?? ""}
            placeholder="e.g. Mensa, GTM, Product Team"
          />
        </Field>
        <Field label="Start date" id="startDate">
          <Input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={toDateInputValue(values.startDate)}
          />
        </Field>
        <Field label="End date (if left)" id="endDate">
          <Input
            id="endDate"
            name="endDate"
            type="date"
            defaultValue={toDateInputValue(values.endDate)}
          />
        </Field>
        <Field label="Birthday" id="birthday">
          <Input
            id="birthday"
            name="birthday"
            type="date"
            defaultValue={toDateInputValue(values.birthday)}
          />
        </Field>
        <Field label="Employment" id="employmentType">
          <Select
            id="employmentType"
            name="employmentType"
            defaultValue={values.employmentType}
            options={employmentTypeLabels as Record<EmploymentType, string>}
          />
        </Field>
        <Field label="Location" id="location">
          <Input
            id="location"
            name="location"
            placeholder="City, Country"
            defaultValue={values.location ?? ""}
          />
        </Field>
        <Field label="Country code" id="country">
          <Input
            id="country"
            name="country"
            maxLength={2}
            placeholder="CH"
            defaultValue={values.country ?? ""}
          />
        </Field>
        <Field label="Pronouns" id="pronouns">
          <Input
            id="pronouns"
            name="pronouns"
            defaultValue={values.pronouns ?? ""}
          />
        </Field>
        <Field label="Vacation allowance (days / year)" id="vacationAllowance">
          <Input
            id="vacationAllowance"
            name="vacationAllowance"
            type="number"
            min={0}
            defaultValue={values.vacationAllowance}
          />
        </Field>
        <Field label="Phone" id="phone">
          <Input id="phone" name="phone" defaultValue={values.phone ?? ""} />
        </Field>
        <Field label="Personal email" id="personalEmail">
          <Input
            id="personalEmail"
            name="personalEmail"
            type="email"
            defaultValue={values.personalEmail ?? ""}
          />
        </Field>
      </div>
      <Field label="Emergency contact" id="emergencyContact">
        <Input
          id="emergencyContact"
          name="emergencyContact"
          placeholder="Name · relationship · phone"
          defaultValue={values.emergencyContact ?? ""}
        />
      </Field>
      <Field label="Bio" id="bio">
        <Textarea
          id="bio"
          name="bio"
          rows={2}
          defaultValue={values.bio ?? ""}
        />
      </Field>
      <Field label="Current focus" id="currentFocus">
        <Input
          id="currentFocus"
          name="currentFocus"
          defaultValue={values.currentFocus ?? ""}
        />
      </Field>
      <Field label="Achievements (one per line)" id="achievements">
        <Textarea
          id="achievements"
          name="achievements"
          rows={3}
          defaultValue={values.achievements.join("\n")}
        />
      </Field>
      <Button
        type="button"
        variant="ghost"
        className="w-full"
        onClick={() => setOpen(false)}
      >
        Cancel
      </Button>
    </PersistentForm>
  );
}

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

/** Checkbox that submits its enclosing GET form as soon as it is toggled. */
export function AutoSubmitCheckbox(
  props: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange">,
) {
  return (
    <input
      type="checkbox"
      {...props}
      onChange={(event) => event.currentTarget.form?.requestSubmit()}
    />
  );
}
