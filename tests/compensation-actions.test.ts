import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SessionUser } from "@/lib/auth/user";
import { prisma } from "@/lib/prisma";

import { createUser } from "./factories";

const current = vi.hoisted(() => ({ user: null as SessionUser | null }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/current-user", () => ({
  requireApiUser: async () => {
    if (!current.user) throw new Error("Not authenticated");
    return current.user;
  },
  getCurrentUser: async () => current.user,
}));

const { addCompensationAction } = await import("@/server/actions/people");
const { getPerson } = await import("@/server/people");

function salaryForm(amount = "120000") {
  const form = new FormData();
  form.set("kind", "SALARY");
  form.set("amount", amount);
  form.set("currency", "USD");
  form.set("effectiveDate", "2026-01-01");
  return form;
}

describe("compensation is admin-only at the action and read layer", () => {
  beforeEach(() => {
    current.user = null;
  });

  it("rejects writes from members, managers and the person themself", async () => {
    const lead = await createUser("MEMBER");
    const ic = await createUser("MEMBER");
    await prisma.employeeProfile.create({
      data: { userId: ic.id, managerId: lead.id },
    });

    for (const actor of [lead, ic]) {
      current.user = actor;
      const result = await addCompensationAction(ic.id, salaryForm());
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/Only admins/);
    }
    expect(
      await prisma.compensationEvent.count({ where: { userId: ic.id } }),
    ).toBe(0);

    current.user = null;
    const anon = await addCompensationAction(ic.id, salaryForm());
    expect(anon.ok).toBe(false);
  });

  it("lets admins write, and only admins read", async () => {
    const admin = await createUser("ADMIN");
    const lead = await createUser("MEMBER");
    const ic = await createUser("MEMBER");
    await prisma.employeeProfile.create({
      data: { userId: ic.id, managerId: lead.id },
    });

    current.user = admin;
    const result = await addCompensationAction(ic.id, salaryForm());
    expect(result.ok).toBe(true);

    expect((await getPerson(admin, ic.id))?.compensation).toHaveLength(1);
    expect((await getPerson(lead, ic.id))?.compensation).toHaveLength(0);
    expect((await getPerson(ic, ic.id))?.compensation).toHaveLength(0);
  });
});
