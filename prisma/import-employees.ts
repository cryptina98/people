/**
 * Imports the team roster (Notion "Employee Database" CSV export) into
 * User + EmployeeProfile. Idempotent: people are matched by email, so the
 * script can be re-run after the sheet changes.
 *
 *   npx tsx prisma/import-employees.ts path/to/employees.csv [--domain elliot.ai]
 *
 * The export has no email column, so emails are derived as
 * first.last@<domain> unless overridden in EMAIL_OVERRIDES below.
 */
import { readFile } from "node:fs/promises";

import { PrismaClient, type EmploymentType } from "@prisma/client";

const prisma = new PrismaClient();

const UNKNOWN_BIRTH_YEAR = 1900;

const EMAIL_OVERRIDES: Record<string, string> = {
  "Christina Zaidan": "christina.zeidan@elliot.ai",
};

/** People who administer the People app regardless of reporting line. */
const ADMIN_NAMES = new Set([
  "Vlad Novakovski",
  "Christina Zaidan",
  "Alex Mohbat",
  "Maggie Parsons",
]);

/** Manager short-hands used in the "Direct Report" column. */
const MANAGER_ALIASES: Record<string, string> = {
  Vlad: "Vlad Novakovski",
  Murat: "Murat Ekici",
  Maggie: "Maggie Parsons",
  Furkan: "Furkan Dogan",
  "Alex V": "Alex Velea",
  Alex: "Alex Mohbat",
  Ahmet: "Ahmet Avci",
  Emin: "Emin Ayar",
  Manu: "Manu Pfyffer von Altishofen",
  Sebastián: "Sebastián Jaramillo",
  Sebastian: "Sebastián Jaramillo",
};

const TIMEZONES: [RegExp, string][] = [
  [/turkey|istanbul|ankara/i, "Europe/Istanbul"],
  [/romania|cluj|bucharest/i, "Europe/Bucharest"],
  [/poland|pozna/i, "Europe/Warsaw"],
  [/netherlands|hague/i, "Europe/Amsterdam"],
  [/italy/i, "Europe/Rome"],
  [/spain|madrid/i, "Europe/Madrid"],
  [/portugal/i, "Europe/Lisbon"],
  [/geneva|switzerland/i, "Europe/Zurich"],
  [/serbia|belgrade/i, "Europe/Belgrade"],
  [/uk\b|cambridge|london/i, "Europe/London"],
  [/morocco/i, "Africa/Casablanca"],
  [/singapore/i, "Asia/Singapore"],
  [/costa rica/i, "America/Costa_Rica"],
  [/montreal|halifax/i, "America/Toronto"],
  [/las vegas|nv\b/i, "America/Los_Angeles"],
  [/arkansas/i, "America/Chicago"],
  [/.*/, "America/New_York"],
];

type Row = Record<string, string>;

/** Minimal RFC 4180 parser: quoted fields, doubled quotes, embedded newlines. */
function parseCsv(text: string): Row[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((value) => value !== "")) rows.push(row);
  const [header, ...body] = rows;
  return body.map((values) =>
    Object.fromEntries(
      header.map((key, index) => [key.trim(), (values[index] ?? "").trim()]),
    ),
  );
}

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

/** "December 7, 2020" -> UTC date; "May 2" -> May 2 in the sentinel year. */
function parseLooseDate(value: string): Date | null {
  const match = value.match(/^([A-Za-z]+)\s+(\d{1,2})(?:,\s*(\d{4}))?$/);
  if (!match) return null;
  const month = MONTHS.indexOf(match[1].toLowerCase());
  if (month === -1) return null;
  const year = match[3] ? Number(match[3]) : UNKNOWN_BIRTH_YEAR;
  return new Date(Date.UTC(year, month, Number(match[2])));
}

function displayName(raw: string): string {
  return raw
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function emailFor(rawName: string, domain: string): string {
  const name = displayName(rawName);
  if (EMAIL_OVERRIDES[name]) return EMAIL_OVERRIDES[name];
  const parts = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/gi, "l")
    .replace(/ø/gi, "o")
    .replace(/ß/g, "ss")
    .toLowerCase()
    .replace(/[^a-z ]/g, "")
    .split(" ")
    .filter(Boolean);
  const local = [parts[0], parts[parts.length - 1]].join(".");
  return `${local}@${domain}`;
}

function employmentType(row: Row): EmploymentType {
  if (/intern/i.test(row["Position"])) return "INTERN";
  if (/part/i.test(row["Work Status"])) return "PART_TIME";
  return "FULL_TIME";
}

function countryFor(row: Row): string | null {
  if (row["USA"] === "Yes") return "United States";
  const base = row["Home Base"];
  if (!base) return null;
  const tail = base.split(/[,/]/).pop()?.trim();
  return tail || null;
}

async function main() {
  const [file, ...flags] = process.argv.slice(2);
  if (!file) {
    console.error("usage: tsx prisma/import-employees.ts <csv> [--domain x]");
    process.exit(1);
  }
  const domainIndex = flags.indexOf("--domain");
  const domain = domainIndex >= 0 ? flags[domainIndex + 1] : "elliot.ai";

  const rows = parseCsv(await readFile(file, "utf8")).filter(
    (row) => row["Name"],
  );

  const idByName = new Map<string, string>();

  // Pass 1: users + profiles without reporting lines.
  for (const row of rows) {
    const name = displayName(row["Name"]);
    const email = emailFor(row["Name"], domain);
    const active = !/departed|left|alumni/i.test(row["Work Status"]);
    const role = ADMIN_NAMES.has(name) ? "ADMIN" : "MEMBER";
    const timezone =
      TIMEZONES.find(([pattern]) => pattern.test(row["Home Base"]))?.[1] ??
      "UTC";

    const user = await prisma.user.upsert({
      where: { email },
      update: { name, title: row["Position"] || null, active, timezone },
      create: {
        email,
        name,
        title: row["Position"] || null,
        role,
        active,
        timezone,
      },
    });
    if (ADMIN_NAMES.has(name) && user.role !== "ADMIN") {
      await prisma.user.update({ where: { id: user.id }, data: { role } });
    }
    idByName.set(name, user.id);

    const profileData = {
      startDate: parseLooseDate(row["Start Date"]),
      birthday: parseLooseDate(row["Birthday"]),
      team: row["Team"] || null,
      location: row["Home Base"] || null,
      country: countryFor(row),
      employmentType: employmentType(row),
      phone: row["Phone Number"] || null,
      emergencyContact: row["Other Info"] || null,
    };
    await prisma.employeeProfile.upsert({
      where: { userId: user.id },
      update: profileData,
      create: { userId: user.id, ...profileData },
    });
  }

  // Pass 2: reporting lines.
  let unresolved = 0;
  for (const row of rows) {
    const alias = row["Direct Report"];
    if (!alias) continue;
    const managerName = MANAGER_ALIASES[alias] ?? alias;
    const managerId = idByName.get(managerName);
    if (!managerId) {
      unresolved++;
      console.warn(`no manager match for "${row["Name"]}" -> "${alias}"`);
      continue;
    }
    await prisma.employeeProfile.update({
      where: { userId: idByName.get(displayName(row["Name"]))! },
      data: { managerId },
    });
  }

  console.log(
    `imported ${rows.length} people (${unresolved} unresolved manager refs)`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
