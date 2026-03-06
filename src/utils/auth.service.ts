/**
 * Auth Provider Service
 * Single entry point for token verification regardless of the active auth provider.
 * Delegates to Auth0 or the local JWT implementation based on the use_auth0 env var.
 */

import { JwtPayload } from "jsonwebtoken";
import { verifyToken, JwtUserPayload } from "./jwt.utils.js";
import { verifyAuth0Token } from "./auth0.utils.js";

/**
 * Verify a Bearer token using whichever provider is active.
 *
 * - use_auth0=TRUE  → validates against Auth0 JWKS (RS256), maps custom claims
 * - default         → validates against local JWT_ACCESS_SECRET (HS256), checks Redis blacklist
 *
 * @param token - Raw JWT string (without "Bearer " prefix)
 * @returns Decoded and verified user payload
 * @throws On invalid/expired/blacklisted token
 */
export const verifyWithProvider = async (token: string): Promise<JwtUserPayload & JwtPayload> => {
  if (process.env.use_auth0 === "TRUE") {
    const payload = await verifyAuth0Token(token);
    return payload as JwtUserPayload & JwtPayload;
  }
  return verifyToken(token);
};
