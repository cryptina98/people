import { redirect } from "next/navigation";

import { EmptyState, PageHeader, Section } from "@/components/chrome/page";
import { requireUser } from "@/lib/auth/current-user";
import { formatTenure } from "@/lib/people";
import { canManagePeople } from "@/lib/permissions";
import { buildTeamPalette, teamColor } from "@/lib/team-color";
import { buildOrgTree, listPeople, type OrgNode } from "@/server/people";

import { OrgChart, type ChartNode } from "./org-chart";

export const dynamic = "force-dynamic";

function toChart(node: OrgNode): ChartNode {
  const start = node.person.profile?.startDate;
  return {
    id: node.person.id,
    name: node.person.name,
    title: node.person.title,
    team: node.person.profile?.team ?? null,
    tenure: start ? formatTenure(start) : "—",
    reports: node.reports.map(toChart),
  };
}

export default async function OrgChartPage() {
  const user = await requireUser();
  if (!canManagePeople(user)) redirect("/people/me");

  const people = (await listPeople()).filter((p) => p.active);
  const tree = buildOrgTree(people);
  const unassigned = people.filter((p) => !p.profile?.managerId);
  const palette = buildTeamPalette(people.map((p) => p.profile?.team));
  const teams = Object.keys(palette).sort();
  const teamNames = new Map<string, string>();
  for (const p of people) {
    const t = p.profile?.team;
    if (t) teamNames.set(t.trim().toLowerCase(), t);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Org chart"
        subtitle="Tap a name to open the profile, tap the number next to a manager to see their team. Set “Reports to” on a profile to move people."
      />
      {tree.length === 0 ? (
        <EmptyState title="No one on the team yet" />
      ) : (
        <Section
          title="Reporting lines"
          description={
            unassigned.length > 1
              ? `${unassigned.length} people have no manager set and appear at the top level.`
              : undefined
          }
        >
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[12px] font-medium text-meta">
            {teams.map((key) => {
              const color = teamColor(key, palette);
              return (
                <span key={key} className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="size-2 rounded-full"
                    style={{ backgroundColor: color.dot }}
                  />
                  {teamNames.get(key) ?? key}
                </span>
              );
            })}
          </div>
          <OrgChart roots={tree.map(toChart)} palette={palette} />
        </Section>
      )}
    </div>
  );
}
