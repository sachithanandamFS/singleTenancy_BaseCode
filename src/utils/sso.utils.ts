/**
 * Generic OIDC/SSO Token Verification Utility
 * Validates tokens from any OIDC-compliant identity provider using JWKS (RS256).
 * Works with Okta, Azure AD, Google Workspace, Keycloak, OneLogin, ADFS, etc.
 *
 * Required environment variables when use_sso=TRUE:
 *   SSO_JWKS_URI  - JWKS endpoint of your identity provider
 *   SSO_ISSUER    - Expected token issuer (must match exactly)
 *   SSO_AUDIENCE  - Expected token audience
 *   SSO_NAMESPACE - Custom claim prefix for app-specific claims
 *
 * Provider JWKS URI examples:
 *   Okta:      https://mycompany.okta.com/oauth2/default/v1/keys
 *   Azure AD:  https://login.microsoftonline.com/{tenant-id}/discovery/v2.0/keys
 *   Google:    https://www.googleapis.com/oauth2/v3/certs
 *   Keycloak:  https://keycloak.mycompany.com/realms/{realm}/protocol/openid-connect/certs
 *
 * Provider issuer examples:
 *   Okta:      https://mycompany.okta.com/oauth2/default
 *   Azure AD:  https://login.microsoftonline.com/{tenant-id}/v2.0
 *   Google:    https://accounts.google.com
 *   Keycloak:  https://keycloak.mycompany.com/realms/{realm}
 *
 * Custom claims setup — each provider needs a claim mapping rule:
 *
 *   Okta (Expression Language in custom claim):
 *     Name: <SSO_NAMESPACE>user_id     Value: user.getInternalProperty("id") or appuser.externalId
 *     Name: <SSO_NAMESPACE>user_type   Value: user.userType
 *     Name: <SSO_NAMESPACE>permissions Value: user.permissions (JSON array)
 *
 *   Azure AD (optional claims / app roles mapped in manifest):
 *     Add custom attributes to the token via "optionalClaims" in app registration
 *
 *   Google Workspace:
 *     Use Admin SDK Directory API to set custom schema attributes on users
 *
 * All custom claims must resolve to:
 *   <SSO_NAMESPACE>user_id    → number  (your Postgres users.id)
 *   <SSO_NAMESPACE>user_type  → number  (1=SUPERADMIN, 2=ADMIN, 3=EMPLOYEE)
 *   <SSO_NAMESPACE>permissions → array  (same shape as JwtUserPayload.permissions)
 */

import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import { JwtUserPayload } from "./jwt.utils";
import { logger } from "./logger";

// Lazy-initialized JWKS client — created on first token verification, then reused.
// Caches signing keys for 10 minutes to avoid hammering the IdP's JWKS endpoint.
let client: ReturnType<typeof jwksClient> | null = null;

const getJwksClient = (): ReturnType<typeof jwksClient> => {
  if (!client) {
    const jwksUri = process.env.SSO_JWKS_URI;
    if (!jwksUri) throw new Error("SSO_JWKS_URI is not configured");

    client = jwksClient({
      jwksUri,
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
      if (!key) return reject(new Error("Signing key not found in SSO JWKS"));
      resolve(key.getPublicKey());
    });
  });

/**
 * Verify an SSO access token (RS256) and map its claims to JwtUserPayload.
 * Throws on invalid signature, expired token, wrong audience/issuer, or missing custom claims.
 */
export const verifySsoToken = async (token: string): Promise<JwtUserPayload> => {
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || typeof decoded === "string") {
    throw new Error("Invalid token structure");
  }

  const signingKey = await getSigningKey(decoded.header.kid);

  const payload = jwt.verify(token, signingKey, {
    audience: process.env.SSO_AUDIENCE,
    issuer: process.env.SSO_ISSUER,
    algorithms: ["RS256"],
  }) as Record<string, any>;

  const ns = process.env.SSO_NAMESPACE || "";
  const userId = payload[`${ns}user_id`];
  const userType = payload[`${ns}user_type`];
  const permissions = payload[`${ns}permissions`];

  if (userId == null || userType == null) {
    logger.warn("SSO token is missing required custom claims", {
      namespace: ns,
      sub: payload.sub,
      hint: "Configure your identity provider to include the namespace claims in the access token",
    });
    throw new Error("SSO token missing required custom claims");
  }

  return {
    id: Number(userId),
    email: payload.email ?? "",
    user_type: Number(userType),
    name: payload.name ?? payload.given_name ?? "",
    permissions: Array.isArray(permissions) ? permissions : [],
  };
};
