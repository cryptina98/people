import { execFileSync } from "node:child_process";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://dev:dev@127.0.0.1:5432/people_test?schema=public";

/** Bring the dedicated test database in line with the schema, once per run. */
export default function setup() {
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  execFileSync(
    "npx",
    ["prisma", "db", "push", "--skip-generate", "--accept-data-loss"],
    {
      env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
      stdio: "inherit",
    },
  );
}
