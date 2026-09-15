function list(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export const env = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  authSecret: process.env.AUTH_SECRET ?? "",
  appUrl: process.env.APP_URL ?? "http://localhost:3000",
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  },
  allowedGoogleDomains: list(process.env.ALLOWED_GOOGLE_DOMAINS),
  adminEmails: list(process.env.ADMIN_EMAILS),
  devAuthEnabled: process.env.DEV_AUTH_ENABLED === "true",
};

export const googleOauthConfigured = Boolean(
  env.google.clientId && env.google.clientSecret,
);

export const HOME = "/people";
