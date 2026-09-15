import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

import { googleAuthUrl } from "@/lib/auth/google";
import { env, googleOauthConfigured } from "@/lib/env";

export async function GET() {
  if (!googleOauthConfigured) {
    return NextResponse.redirect(
      `${env.appUrl}/login?error=google_not_configured`,
    );
  }
  const state = randomBytes(16).toString("hex");
  const response = NextResponse.redirect(googleAuthUrl(state));
  response.cookies.set("ats_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.appUrl.startsWith("https://"),
    path: "/",
    maxAge: 600,
  });
  return response;
}
