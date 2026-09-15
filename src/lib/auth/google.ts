import { decodeJwt } from "jose";

import { env } from "@/lib/env";

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

export function googleRedirectUri(): string {
  return `${env.appUrl.replace(/\/$/, "")}/api/auth/google/callback`;
}

export function googleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.google.clientId,
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });
  // Only a UI hint: the domain is still verified on the server.
  if (env.allowedGoogleDomains.length === 1) {
    params.set("hd", env.allowedGoogleDomains[0]);
  }
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

export type GoogleProfile = {
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
  hostedDomain: string | null;
};

export async function exchangeGoogleCode(code: string): Promise<GoogleProfile> {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.google.clientId,
      client_secret: env.google.clientSecret,
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    throw new Error(`Google token exchange failed (${response.status})`);
  }

  const body = (await response.json()) as { id_token?: string };
  if (!body.id_token) throw new Error("Google response had no id_token");

  const claims = decodeJwt(body.id_token) as {
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
    hd?: string;
    aud?: string;
  };

  if (claims.aud && claims.aud !== env.google.clientId) {
    throw new Error("Google id_token audience mismatch");
  }

  return {
    email: claims.email ?? null,
    emailVerified: Boolean(claims.email_verified),
    name: claims.name ?? null,
    picture: claims.picture ?? null,
    hostedDomain: claims.hd ?? null,
  };
}
