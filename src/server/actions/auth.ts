"use server";

import { redirect } from "next/navigation";

import { emailDomain } from "@/lib/auth/domains";
import { clearSessionCookie, setSessionCookie } from "@/lib/auth/session";
import { env, HOME } from "@/lib/env";
import { prisma } from "@/lib/prisma";

/**
 * Development sign-in for seeded accounts. Disabled unless DEV_AUTH_ENABLED is
 * set, and still subject to the workspace domain allowlist.
 */
export async function devSignIn(formData: FormData) {
  if (!env.devAuthEnabled) {
    redirect("/login?error=dev_auth_disabled");
  }
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email) redirect("/login?error=missing_email");

  if (!env.allowedGoogleDomains.includes(emailDomain(email))) {
    redirect("/login?error=domain_not_allowed");
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active) redirect("/login?error=unknown_account");

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  await setSessionCookie({ userId: user.id, email: user.email });
  redirect(HOME);
}

export async function signOut() {
  await clearSessionCookie();
  redirect("/login");
}
