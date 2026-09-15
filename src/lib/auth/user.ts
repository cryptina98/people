import type { Role } from "@prisma/client";

import { isAdminEmail } from "@/lib/auth/domains";
import { prisma } from "@/lib/prisma";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  image: string | null;
  active: boolean;
};

export async function loadSessionUser(
  userId: string,
): Promise<SessionUser | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.active) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    image: user.image,
    active: user.active,
  };
}

/**
 * Creates or updates the user record after a verified Google sign-in.
 * Existing roles are preserved unless the email is listed in ADMIN_EMAILS.
 */
export async function upsertGoogleUser(profile: {
  email: string;
  name: string | null;
  image: string | null;
}) {
  const email = profile.email.toLowerCase();
  const admin = isAdminEmail(email);
  const fallbackName = profile.name?.trim() || email.split("@")[0];

  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    return prisma.user.create({
      data: {
        email,
        name: fallbackName,
        image: profile.image,
        role: admin ? "ADMIN" : "MEMBER",
        lastLoginAt: new Date(),
      },
    });
  }

  return prisma.user.update({
    where: { id: existing.id },
    data: {
      name: profile.name?.trim() || existing.name,
      image: profile.image ?? existing.image,
      role: admin ? "ADMIN" : existing.role,
      lastLoginAt: new Date(),
    },
  });
}
