import { beforeEach } from "vitest";

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://dev:dev@127.0.0.1:5432/people_test?schema=public";
process.env.AUTH_SECRET =
  process.env.AUTH_SECRET ?? "test-secret-test-secret-test-secret-0123";
process.env.ALLOWED_GOOGLE_DOMAINS = "elliot.ai,lighter.xyz";
process.env.ADMIN_EMAILS = "admin@elliot.ai";
process.env.DEV_AUTH_ENABLED = "true";

const { prisma } = await import("@/lib/prisma");

const TABLES = [
  "CompensationEvent",
  "PerformanceNote",
  "VacationRequest",
  "EmployeeProfile",
  "User",
];

beforeEach(async () => {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${TABLES.map((table) => `"${table}"`).join(", ")} CASCADE`,
  );
});
