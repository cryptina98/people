import { describe, expect, it } from "vitest";

import {
  daysUntilAnnual,
  nextAnniversaryNumber,
  tenureSince,
  vacationBalance,
  workingDaysBetween,
} from "@/lib/people";
import { PermissionError } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  addPerformanceNote,
  buildOrgTree,
  decideVacation,
  getPerson,
  listPeople,
  submitVacation,
} from "@/server/people";

import { createUser } from "./factories";

const utc = (y: number, m: number, d: number) =>
  new Date(Date.UTC(y, m - 1, d));

describe("people helpers", () => {
  it("counts working days inclusively and skips weekends", () => {
    // Mon 2026-09-14 → Fri 2026-09-18
    expect(workingDaysBetween(utc(2026, 9, 14), utc(2026, 9, 18))).toBe(5);
    // Fri → Mon spans a weekend
    expect(workingDaysBetween(utc(2026, 9, 18), utc(2026, 9, 21))).toBe(2);
    expect(workingDaysBetween(utc(2026, 9, 19), utc(2026, 9, 20))).toBe(0);
    expect(workingDaysBetween(utc(2026, 9, 21), utc(2026, 9, 14))).toBe(0);
  });

  it("computes tenure and the next anniversary", () => {
    const start = utc(2024, 3, 15);
    expect(tenureSince(start, utc(2026, 9, 15))).toEqual({
      years: 2,
      months: 6,
      days: 0,
    });
    expect(daysUntilAnnual(start, utc(2026, 3, 15))).toBe(0);
    expect(daysUntilAnnual(start, utc(2026, 3, 16))).toBe(364);
    expect(nextAnniversaryNumber(start, utc(2026, 3, 15))).toBe(2);
    expect(nextAnniversaryNumber(start, utc(2026, 9, 15))).toBe(3);
  });

  it("only counts approved vacation days against the allowance", () => {
    const balance = vacationBalance(
      25,
      [
        {
          status: "APPROVED",
          type: "VACATION",
          startDate: utc(2026, 2, 2),
          endDate: utc(2026, 2, 6),
          workingDays: 5,
        },
        {
          status: "PENDING",
          type: "VACATION",
          startDate: utc(2026, 10, 5),
          endDate: utc(2026, 10, 6),
          workingDays: 2,
        },
        {
          status: "APPROVED",
          type: "SICK",
          startDate: utc(2026, 4, 1),
          endDate: utc(2026, 4, 1),
          workingDays: 1,
        },
        {
          status: "APPROVED",
          type: "VACATION",
          startDate: utc(2025, 12, 22),
          endDate: utc(2025, 12, 24),
          workingDays: 3,
        },
      ],
      2026,
    );
    expect(balance).toEqual({
      allowance: 25,
      taken: 5,
      pending: 2,
      remaining: 20,
      afterPending: 18,
    });
  });
});

describe("org tree", () => {
  it("nests reports under managers and survives cycles", async () => {
    const ceo = await createUser("ADMIN", { name: "CEO" });
    const lead = await createUser("MEMBER", { name: "Lead" });
    const ic = await createUser("MEMBER", { name: "IC" });
    await prisma.employeeProfile.createMany({
      data: [
        { userId: ceo.id, managerId: lead.id }, // cycle on purpose
        { userId: lead.id, managerId: ceo.id },
        { userId: ic.id, managerId: lead.id },
      ],
    });
    const tree = buildOrgTree(await listPeople());
    const names = (nodes: ReturnType<typeof buildOrgTree>): unknown =>
      nodes.map((n) => [n.person.name, names(n.reports)]);
    // No roots exist in a pure cycle, so nothing hangs and nothing is lost twice.
    expect(JSON.stringify(names(tree))).not.toContain('"CEO",[["Lead",[["CEO"');

    await prisma.employeeProfile.update({
      where: { userId: ceo.id },
      data: { managerId: null },
    });
    const fixed = buildOrgTree(await listPeople());
    expect(names(fixed)).toEqual([["CEO", [["Lead", [["IC", []]]]]]]);
  });
});

describe("vacation requests", () => {
  it("rejects overlapping requests and lets only admins or the manager decide", async () => {
    const admin = await createUser("ADMIN");
    const lead = await createUser("MEMBER");
    const other = await createUser("MEMBER");
    const ic = await createUser("MEMBER");
    await prisma.employeeProfile.create({
      data: { userId: ic.id, managerId: lead.id },
    });

    const request = await submitVacation(ic, {
      type: "VACATION",
      startDate: utc(2027, 6, 7),
      endDate: utc(2027, 6, 11),
    });
    expect(request.workingDays).toBe(5);

    await expect(
      submitVacation(ic, {
        type: "VACATION",
        startDate: utc(2027, 6, 10),
        endDate: utc(2027, 6, 14),
      }),
    ).rejects.toThrow(/overlaps/);

    await expect(
      submitVacation(ic, {
        userId: lead.id,
        type: "VACATION",
        startDate: utc(2027, 7, 1),
        endDate: utc(2027, 7, 2),
      }),
    ).rejects.toBeInstanceOf(PermissionError);

    await expect(
      decideVacation(other, request.id, "APPROVED"),
    ).rejects.toBeInstanceOf(PermissionError);
    await expect(
      decideVacation(ic, request.id, "APPROVED"),
    ).rejects.toBeInstanceOf(PermissionError);

    const approved = await decideVacation(lead, request.id, "APPROVED");
    expect(approved.status).toBe("APPROVED");
    expect(approved.decidedById).toBe(lead.id);

    await expect(decideVacation(admin, request.id, "DECLINED")).rejects.toThrow(
      /already been decided/,
    );
  });
});

describe("performance notes and profile visibility", () => {
  it("hides notes and compensation from the person and unrelated users", async () => {
    const admin = await createUser("ADMIN");
    const lead = await createUser("MEMBER");
    const peer = await createUser("MEMBER");
    const ic = await createUser("MEMBER");
    await prisma.employeeProfile.create({
      data: { userId: ic.id, managerId: lead.id },
    });
    await prisma.compensationEvent.create({
      data: {
        userId: ic.id,
        kind: "SALARY",
        amount: 100000,
        effectiveDate: utc(2026, 1, 1),
      },
    });

    await addPerformanceNote(lead, {
      userId: ic.id,
      kind: "CHECK_IN",
      body: "Shipping well.",
    });
    await expect(
      addPerformanceNote(peer, {
        userId: ic.id,
        kind: "KUDOS",
        body: "Nice one",
      }),
    ).rejects.toBeInstanceOf(PermissionError);
    await expect(
      addPerformanceNote(ic, { userId: ic.id, kind: "KUDOS", body: "I rule" }),
    ).rejects.toBeInstanceOf(PermissionError);

    const asSelf = await getPerson(ic, ic.id);
    expect(asSelf?.notes).toHaveLength(0);
    expect(asSelf?.compensation).toHaveLength(0);

    const asLead = await getPerson(lead, ic.id);
    expect(asLead?.notes).toHaveLength(1);
    expect(asLead?.compensation).toHaveLength(0);

    const asAdmin = await getPerson(admin, ic.id);
    expect(asAdmin?.notes).toHaveLength(1);
    expect(asAdmin?.compensation).toHaveLength(1);

    await expect(getPerson(peer, ic.id)).rejects.toBeInstanceOf(
      PermissionError,
    );
  });
});
