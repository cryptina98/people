import { redirect } from "next/navigation";

import { EmptyState, PageHeader, Section } from "@/components/chrome/page";
import { requireUser } from "@/lib/auth/current-user";
import { canManagePeople } from "@/lib/permissions";
import { buildOrgTree, listPeople } from "@/server/people";

import { OrgTree } from "../components";

export const dynamic = "force-dynamic";

export default async function OrgChartPage() {
  const user = await requireUser();
  if (!canManagePeople(user)) redirect("/people/me");

  const people = await listPeople();
  const tree = buildOrgTree(people);
  const unassigned = people.filter((p) => !p.profile?.managerId);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Org chart"
        subtitle="Who reports to whom, and how long everyone has been here. Set “Reports to” on a profile to move people around."
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
          <OrgTree nodes={tree} />
        </Section>
      )}
    </div>
  );
}
