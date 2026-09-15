import { env } from "@/lib/env";

export class AuthDomainError extends Error {}

export function emailDomain(email: string): string {
  return email.trim().toLowerCase().split("@")[1] ?? "";
}

/**
 * Server-side gate for Google sign-in. The `hd` hint sent to Google is only a
 * hint, so the decision is made here from the verified id_token claims.
 */
export function assertGoogleSignInAllowed(profile: {
  email?: string | null;
  emailVerified?: boolean | null;
  hostedDomain?: string | null;
}): string {
  const email = profile.email?.trim().toLowerCase();
  if (!email) throw new AuthDomainError("Google did not return an email");
  if (!profile.emailVerified) {
    throw new AuthDomainError("Google email is not verified");
  }
  const allowed = env.allowedGoogleDomains;
  if (allowed.length === 0) {
    throw new AuthDomainError("No sign-in domains are configured");
  }
  const domain = emailDomain(email);
  if (!allowed.includes(domain)) {
    throw new AuthDomainError(`${domain} is not an approved workspace domain`);
  }
  if (profile.hostedDomain && profile.hostedDomain.toLowerCase() !== domain) {
    throw new AuthDomainError("Google hosted domain does not match the email");
  }
  return email;
}

export function isAdminEmail(email: string): boolean {
  return env.adminEmails.includes(email.trim().toLowerCase());
}
