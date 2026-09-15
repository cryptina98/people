import type { Role } from "@prisma/client";

export const roleLabels: Record<Role, string> = {
  ADMIN: "People Ops admin",
  MEMBER: "Team member",
};
