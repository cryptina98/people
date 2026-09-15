import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentUser } from "@/lib/auth/current-user";
import { env, googleOauthConfigured, HOME } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { roleLabels } from "@/lib/labels";
import { devSignIn } from "@/server/actions/auth";

const errors: Record<string, string> = {
  dev_auth_disabled: "Development sign-in is disabled on this deployment.",
  missing_email: "Enter a work email address.",
  domain_not_allowed:
    "That email domain is not an approved Google Workspace domain.",
  unknown_account: "No active account exists for that email.",
  google_not_configured: "Google OAuth is not configured on this deployment.",
  invalid_state: "The sign-in request expired. Please try again.",
  oauth_failed: "Google sign-in failed. Please try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect(HOME);

  const { error } = await searchParams;
  const message = error ? (errors[error] ?? "Sign-in failed.") : null;

  const devAccounts = env.devAuthEnabled
    ? await prisma.user.findMany({
        where: { active: true },
        orderBy: [{ role: "asc" }, { name: "asc" }],
        select: { email: true, name: true, role: true },
      })
    : [];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-6 py-16">
      <div className="grid w-full gap-12 md:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-8">
          <div className="space-y-2">
            <p className="text-[13px] font-semibold text-brand">People</p>
            <h1 className="text-[28px] leading-tight font-bold text-ink">
              Sign in to the team directory
            </h1>
            <p className="max-w-md text-sm text-neutral-500">
              Profiles, time off, anniversaries and reviews in one place. Access
              is limited to{" "}
              <span className="font-medium text-neutral-700">
                {env.allowedGoogleDomains.join(" and ")}
              </span>{" "}
              Google Workspace accounts.
            </p>
          </div>

          {message ? (
            <p className="rounded-[10px] bg-status-red-bg px-3 py-2 text-sm text-status-red">
              {message}
            </p>
          ) : null}

          <div className="space-y-3">
            <Button asChild size="lg" disabled={!googleOauthConfigured}>
              <Link href="/api/auth/google/start">Continue with Google</Link>
            </Button>
            {!googleOauthConfigured ? (
              <p className="text-xs text-neutral-500">
                Google OAuth credentials are not set in this environment. Use
                development sign-in below, or set GOOGLE_CLIENT_ID and
                GOOGLE_CLIENT_SECRET.
              </p>
            ) : null}
          </div>

          {env.devAuthEnabled ? (
            <form action={devSignIn} className="max-w-sm space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="email">Development sign-in</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@elliot.ai"
                  autoComplete="off"
                  required
                />
              </div>
              <Button type="submit" variant="outline">
                Sign in as seeded account
              </Button>
              <p className="text-xs text-neutral-500">
                The domain allowlist is still enforced on the server for
                development sign-in.
              </p>
            </form>
          ) : null}
        </div>

        {devAccounts.length > 0 ? (
          <aside className="surface p-4">
            <p className="text-[15px] font-semibold text-ink">
              Seeded accounts
            </p>
            <ul className="mt-3 space-y-2">
              {devAccounts.map((account) => (
                <li key={account.email} className="text-sm">
                  <form action={devSignIn}>
                    <input type="hidden" name="email" value={account.email} />
                    <button
                      type="submit"
                      className="min-h-11 w-full rounded-[10px] px-2 py-1.5 text-left hover:bg-neutral-50"
                    >
                      <span className="block font-medium text-ink">
                        {account.name}
                      </span>
                      <span className="block text-xs text-meta">
                        {roleLabels[account.role]} · {account.email}
                      </span>
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </aside>
        ) : null}
      </div>
    </main>
  );
}
