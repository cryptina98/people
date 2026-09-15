import type { SessionUser } from "@/lib/auth/user";

export class PermissionError extends Error {
  readonly status = 403;
  constructor(message = "You do not have permission to do that") {
    super(message);
    this.name = "PermissionError";
  }
}

export function isAdmin(user: SessionUser) {
  return user.role === "ADMIN";
}

/** People dashboard, profiles of everyone, comp and vacation approvals. */
export function canManagePeople(user: SessionUser) {
  return isAdmin(user);
}

/** Admins and someone's manager can read and write their performance notes. */
export function canViewPerformanceNotes(
  user: SessionUser,
  target: { id: string; managerId: string | null },
) {
  return isAdmin(user) || target.managerId === user.id;
}

export function canViewCompensation(user: SessionUser) {
  return isAdmin(user);
}

/** Own profile, direct reports, or everything for admins. */
export function canViewPerson(
  user: SessionUser,
  target: { id: string; managerId: string | null },
) {
  return isAdmin(user) || target.id === user.id || target.managerId === user.id;
}
