import { redirect } from "next/navigation";

import { getSessionPayload } from "@/lib/auth/session";
import { loadSessionUser, type SessionUser } from "@/lib/auth/user";

export async function getCurrentUser(): Promise<SessionUser | null> {
  const payload = await getSessionPayload();
  if (!payload) return null;
  return loadSessionUser(payload.userId);
}

/** For pages: bounces to /login when unauthenticated. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** For server actions and API routes: throws instead of redirecting. */
export async function requireApiUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    const error = new Error("Not authenticated") as Error & { status: number };
    error.status = 401;
    throw error;
  }
  return user;
}
