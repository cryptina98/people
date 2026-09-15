import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/current-user";

export default async function MePage() {
  const user = await requireUser();
  redirect(`/people/${user.id}`);
}
