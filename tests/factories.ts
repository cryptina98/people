import type { Role } from "@prisma/client";

import { loadSessionUser, type SessionUser } from "@/lib/auth/user";
import { prisma } from "@/lib/prisma";

let counter = 0;
function unique(prefix: string) {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
}

export async function createUser(
  role: Role,
  options: { name?: string; email?: string } = {},
): Promise<SessionUser> {
  const user = await prisma.user.create({
    data: {
      email: options.email ?? `${unique("person")}@elliot.ai`,
      name: options.name ?? `Test ${role}`,
      role,
    },
  });
  const session = await loadSessionUser(user.id);
  if (!session) throw new Error("failed to load session user");
  return session;
}
