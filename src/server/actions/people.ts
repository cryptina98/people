"use server";

import { revalidatePath } from "next/cache";
import type {
  CompensationKind,
  EmploymentType,
  PerformanceNoteKind,
  PerformanceStatus,
  VacationType,
} from "@prisma/client";

import { requireApiUser } from "@/lib/auth/current-user";
import { AppError } from "@/lib/errors";
import { canManagePeople, PermissionError } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  optionalDate,
  optionalString,
  run,
  type ActionResult,
} from "@/server/actions/helpers";
import {
  addPerformanceNote,
  cancelVacation,
  decideVacation,
  setPerformanceStatus,
  submitVacation,
  updatePerformanceNote,
} from "@/server/people";
import { performanceStatusLabels } from "@/lib/people";

function revalidatePeople() {
  revalidatePath("/people", "layout");
}

async function requirePeopleAdmin() {
  const user = await requireApiUser();
  if (!canManagePeople(user)) {
    throw new PermissionError("Only admins can change people records");
  }
  return user;
}

function requiredDate(value: FormDataEntryValue | null, label: string) {
  const date = optionalDate(value);
  if (!date) throw new AppError(`${label} is required`);
  return date;
}

// --- Vacation --------------------------------------------------------------

export async function submitVacationAction(
  formData: FormData,
): Promise<ActionResult> {
  return run(async () => {
    const user = await requireApiUser();
    await submitVacation(user, {
      userId: optionalString(formData.get("userId")) ?? undefined,
      type: (optionalString(formData.get("type")) ??
        "VACATION") as VacationType,
      startDate: requiredDate(formData.get("startDate"), "Start date"),
      endDate: requiredDate(formData.get("endDate"), "End date"),
      note: optionalString(formData.get("note")),
    });
    revalidatePeople();
    return undefined;
  });
}

export async function decideVacationAction(
  requestId: string,
  status: "APPROVED" | "DECLINED",
  decisionNote?: string,
): Promise<ActionResult> {
  return run(async () => {
    const user = await requireApiUser();
    await decideVacation(user, requestId, status, decisionNote ?? null);
    revalidatePeople();
    return undefined;
  });
}

export async function cancelVacationAction(
  requestId: string,
): Promise<ActionResult> {
  return run(async () => {
    const user = await requireApiUser();
    await cancelVacation(user, requestId);
    revalidatePeople();
    return undefined;
  });
}

// --- Profile ---------------------------------------------------------------

export async function upsertProfileAction(
  userId: string,
  formData: FormData,
): Promise<ActionResult> {
  return run(async () => {
    await requirePeopleAdmin();
    const managerId = optionalString(formData.get("managerId"));
    if (managerId === userId) {
      throw new AppError("Someone cannot report to themselves");
    }
    const achievements = (optionalString(formData.get("achievements")) ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const allowanceText = optionalString(formData.get("vacationAllowance"));
    const vacationAllowance = allowanceText ? Number(allowanceText) : 25;
    if (!Number.isInteger(vacationAllowance) || vacationAllowance < 0) {
      throw new AppError("Vacation allowance must be a whole number of days");
    }
    const data = {
      managerId,
      startDate: optionalDate(formData.get("startDate")),
      endDate: optionalDate(formData.get("endDate")),
      birthday: optionalDate(formData.get("birthday")),
      team: optionalString(formData.get("team")),
      location: optionalString(formData.get("location")),
      country: optionalString(formData.get("country")),
      employmentType: (optionalString(formData.get("employmentType")) ??
        "FULL_TIME") as EmploymentType,
      pronouns: optionalString(formData.get("pronouns")),
      phone: optionalString(formData.get("phone")),
      personalEmail: optionalString(formData.get("personalEmail")),
      emergencyContact: optionalString(formData.get("emergencyContact")),
      bio: optionalString(formData.get("bio")),
      currentFocus: optionalString(formData.get("currentFocus")),
      achievements,
      vacationAllowance,
    };
    const title = optionalString(formData.get("title"));
    await prisma.$transaction([
      prisma.employeeProfile.upsert({
        where: { userId },
        create: { userId, ...data },
        update: data,
      }),
      prisma.user.update({ where: { id: userId }, data: { title } }),
    ]);
    revalidatePeople();
    return undefined;
  });
}

// --- Performance notes -----------------------------------------------------

export async function addPerformanceNoteAction(
  userId: string,
  formData: FormData,
): Promise<ActionResult> {
  return run(async () => {
    const user = await requireApiUser();
    await addPerformanceNote(user, {
      userId,
      kind: (optionalString(formData.get("kind")) ??
        "CHECK_IN") as PerformanceNoteKind,
      body: String(formData.get("body") ?? ""),
    });
    revalidatePeople();
    return undefined;
  });
}

export async function updatePerformanceNoteAction(
  noteId: string,
  formData: FormData,
): Promise<ActionResult> {
  return run(async () => {
    const user = await requireApiUser();
    await updatePerformanceNote(
      user,
      noteId,
      String(formData.get("body") ?? ""),
    );
    revalidatePeople();
    return undefined;
  });
}

// --- Performance status ----------------------------------------------------

export async function setStatusAction(
  userId: string,
  formData: FormData,
): Promise<ActionResult> {
  return run(async () => {
    const user = await requireApiUser();
    const status = optionalString(formData.get("status"));
    if (!status || !(status in performanceStatusLabels)) {
      throw new AppError("Pick a status");
    }
    await setPerformanceStatus(user, {
      userId,
      status: status as PerformanceStatus,
      reason: optionalString(formData.get("reason")),
    });
    revalidatePeople();
    return undefined;
  });
}

// --- Compensation ----------------------------------------------------------

export async function addCompensationAction(
  userId: string,
  formData: FormData,
): Promise<ActionResult> {
  return run(async () => {
    const user = await requirePeopleAdmin();
    const amount = Number(optionalString(formData.get("amount")) ?? "");
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new AppError("Enter an amount greater than zero");
    }
    const currency = (optionalString(formData.get("currency")) ?? "USD")
      .toUpperCase()
      .slice(0, 3);
    await prisma.compensationEvent.create({
      data: {
        userId,
        kind: (optionalString(formData.get("kind")) ??
          "SALARY") as CompensationKind,
        amount,
        currency,
        effectiveDate: requiredDate(
          formData.get("effectiveDate"),
          "Effective date",
        ),
        note: optionalString(formData.get("note")),
        grantedById: user.id,
      },
    });
    revalidatePeople();
    return undefined;
  });
}
