/**
 * Auth0 Token Verification Utility
 * Validates Auth0 JWTs using JWKS (RS256) and maps custom namespace claims
 * to the internal JwtUserPayload format.
 *
 * Required environment variables (when use_auth0=TRUE):
 *   AUTH0_DOMAIN     - Your Auth0 tenant domain, e.g. "myapp.auth0.com"
 *   AUTH0_AUDIENCE   - Your Auth0 API identifier, e.g. "https://api.myapp.com"
 *   AUTH0_NAMESPACE  - Custom claim namespace prefix, e.g. "https://myapp.com/"
 *
 * Auth0 Action required — add to your tenant (Post-Login):
 *
 *   exports.onExecutePostLogin = async (event, api) => {
 *     const ns = 'https://myapp.com/';  // must match AUTH0_NAMESPACE
 *     api.accessToken.setCustomClaim(`${ns}user_id`,    event.user.app_metadata.db_user_id);
 *     api.accessToken.setCustomClaim(`${ns}user_type`,  event.user.app_metadata.user_type);
 *     api.accessToken.setCustomClaim(`${ns}permissions`, event.user.app_metadata.permissions ?? []);
 *   };
 *
 * app_metadata fields must be set on each Auth0 user matching your DB records:
 *   db_user_id  → number  (your Postgres user ID)
 *   user_type   → number  (1=SUPERADMIN, 2=ADMIN, 3=EMPLOYEE)
 *   permissions → array   (same shape as JwtUserPayload.permissions)
 */

import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import { JwtUserPayload } from "./jwt.utils";
import { logger } from "./logger";

// Lazy-initialized JWKS client — created on first token verification, then reused.
// Caches signing keys for 10 minutes to avoid excessive JWKS endpoint requests.
let client: ReturnType<typeof jwksClient> | null = null;

const getJwksClient = (): ReturnType<typeof jwksClient> => {
  if (!client) {
    const domain = process.env.AUTH0_DOMAIN;
    if (!domain) throw new Error("AUTH0_DOMAIN is not configured");

    client = jwksClient({
      jwksUri: `https://${domain}/.well-known/jwks.json`,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 10 * 60 * 1000, // 10 minutes
    });
  }
  return client;
};

const getSigningKey = (kid: string | undefined): Promise<string> =>
  new Promise((resolve, reject) => {
    getJwksClient().getSigningKey(kid, (err, key) => {
      if (err) return reject(err);
      if (!key) return reject(new Error("Signing key not found in JWKS"));
      resolve(key.getPublicKey());
    });
  });

/**
 * Verify an Auth0 access token (RS256) and map its claims to JwtUserPayload.
 * Throws on invalid signature, expired token, wrong audience/issuer, or missing custom claims.
 */
export const verifyAuth0Token = async (token: string): Promise<JwtUserPayload> => {
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || typeof decoded === "string") {
    throw new Error("Invalid token structure");
  }

  const signingKey = await getSigningKey(decoded.header.kid);

  const domain = process.env.AUTH0_DOMAIN;
  const audience = process.env.AUTH0_AUDIENCE;

  const payload = jwt.verify(token, signingKey, {
    audience,
    issuer: `https://${domain}/`,
    algorithms: ["RS256"],
  }) as Record<string, any>;

  const ns = process.env.AUTH0_NAMESPACE || "";
  const userId = payload[`${ns}user_id`];
  const userType = payload[`${ns}user_type`];
  const permissions = payload[`${ns}permissions`];

  if (userId == null || userType == null) {
    logger.warn("Auth0 token is missing required custom claims", {
      namespace: ns,
      sub: payload.sub,
      hint: "Add a Post-Login Auth0 Action that attaches the namespace claims to the access token",
    });
    throw new Error("Auth0 token missing required custom claims");
  }

  return {
    id: Number(userId),
    email: payload.email ?? "",
    user_type: Number(userType),
    name: payload.name ?? payload.nickname ?? "",
    permissions: Array.isArray(permissions) ? permissions : [],
  };
};
