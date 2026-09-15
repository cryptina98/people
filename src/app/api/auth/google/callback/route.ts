import { NextResponse, type NextRequest } from "next/server";

import { AuthDomainError, assertGoogleSignInAllowed } from "@/lib/auth/domains";
import { exchangeGoogleCode } from "@/lib/auth/google";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import { upsertGoogleUser } from "@/lib/auth/user";
import { env, HOME } from "@/lib/env";

function loginError(code: string) {
  return NextResponse.redirect(`${env.appUrl}/login?error=${code}`);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get("ats_oauth_state")?.value;

  if (!code) return loginError("missing_code");
  if (!state || !expectedState || state !== expectedState) {
    return loginError("bad_state");
  }

  let email: string;
  let profile;
  try {
    profile = await exchangeGoogleCode(code);
    email = assertGoogleSignInAllowed(profile);
  } catch (error) {
    if (error instanceof AuthDomainError)
      return loginError("domain_not_allowed");
    console.error("google sign-in failed", error);
    return loginError("google_failed");
  }

  const user = await upsertGoogleUser({
    email,
    name: profile.name,
    image: profile.picture,
  });

  const token = await createSessionToken({
    userId: user.id,
    email: user.email,
  });
  const response = NextResponse.redirect(`${env.appUrl}${HOME}`);
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.appUrl.startsWith("https://"),
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  response.cookies.delete("ats_oauth_state");
  return response;
}
