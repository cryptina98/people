import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/current-user";
import { HOME } from "@/lib/env";

export default async function RootPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  redirect(HOME);
}
