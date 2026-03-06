/**
 * Auth Provider Service
 * Single entry point for token verification regardless of the active auth provider.
 * Provider is selected at runtime via environment variables — no code changes needed to switch.
 *
 * Priority (first match wins):
 *   use_auth0=TRUE → Auth0 JWKS (RS256)
 *   use_sso=TRUE   → Generic OIDC SSO JWKS (RS256) — Okta, Azure AD, Google, Keycloak, etc.
 *   default        → Local JWT (HS256) with Redis blacklist
 */

import { JwtPayload } from "jsonwebtoken";
import { verifyToken, JwtUserPayload } from "./jwt.utils.js";
import { verifyAuth0Token } from "./auth0.utils.js";
import { verifySsoToken } from "./sso.utils.js";

/**
 * Verify a Bearer token using whichever provider is active.
 *
 * @param token - Raw JWT string (without "Bearer " prefix)
 * @returns Decoded and verified user payload
 * @throws On invalid/expired/blacklisted/revoked token
 */
export const verifyWithProvider = async (token: string): Promise<JwtUserPayload & JwtPayload> => {
  if (process.env.use_auth0 === "TRUE") {
    return (await verifyAuth0Token(token)) as JwtUserPayload & JwtPayload;
  }
  if (process.env.use_sso === "TRUE") {
    return (await verifySsoToken(token)) as JwtUserPayload & JwtPayload;
  }
  return verifyToken(token);
};
