# ServuERP — Single-Tenancy Backend Base Code

A production-ready Node.js/Express/TypeScript backend boilerplate built for single-tenancy applications. Designed to be cloned and adapted per application with built-in security hardening, flexible authentication, role-based access control, and a domain-driven architecture.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Authentication Modes](#authentication-modes)
- [Security Features](#security-features)
- [API Reference](#api-reference)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Scripts](#scripts)
- [Reusing as a Template](#reusing-as-a-template)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (ESM) |
| Language | TypeScript |
| Framework | Express 4 |
| Database | PostgreSQL via Sequelize ORM |
| Cache / Session | Redis (ioredis) |
| Auth (local) | JWT (HS256) + bcrypt |
| Auth (external) | Auth0 (RS256/JWKS) or Generic OIDC SSO |
| File Storage | AWS S3 |
| Validation | Yup |
| Logging | Winston |
| i18n | node-i18n |
| Security headers | Helmet |

---

## Architecture

The codebase follows **Domain-Driven Design (DDD)** layered architecture:

```
HTTP Request
    │
    ├── Middleware (auth, rate limit, security validation, idempotency)
    │
    ├── Routes (express Router)
    │
    ├── Handlers (application layer — orchestrates use cases)
    │
    ├── Domain Services + Entities (business logic, value objects)
    │
    ├── Repositories (data access abstraction)
    │
    └── Models (Sequelize ORM models)
```

**Key patterns:**
- All handlers extend `BaseHandler` which provides a `wrapHandler()` utility for consistent error handling and logging
- Domain entities enforce invariants via value objects (e.g. `Email`, `EmployeeName`, `RoleName`)
- Domain events are dispatched via `DomainEventDispatcher` and registered in `EventListenerRegistry`
- Repository interfaces (`IEmployeeRepository`, `IRoleRepository`) decouple domain from persistence

---

## Project Structure

```
src/
├── index.ts                               # App bootstrap, middleware registration, server startup
├── routes/
│   ├── index.ts                           # Route registration
│   ├── employee.routes.ts                 # Employee + auth endpoints
│   └── role.routes.ts                     # Role management endpoints
├── application/
│   ├── handlers/
│   │   ├── employee/EmployeeHandlers.ts
│   │   ├── role/RolesHandler.ts
│   │   ├── aws-file/AwsFileHandlers.ts
│   │   └── shared/BaseHandler.ts
│   └── dtos/                              # Request/response data transfer objects
├── domain/
│   ├── employee/                          # Employee entity, domain service, value objects
│   ├── role/                              # Role entity, domain service, value objects
│   ├── aws-file/                          # AWS file entity
│   └── events/                            # Domain event system
├── repositories/                          # Interfaces + Sequelize implementations
├── models/                                # Sequelize models + associations
├── middleware/
│   ├── auth.ts                            # JWT/Auth0/SSO token verification
│   ├── authorize.ts                       # RBAC authorization (module + action)
│   ├── rateLimiter.middleware.ts          # Global rate limiting
│   ├── idempotency.middleware.ts          # Idempotency key deduplication
│   ├── security-validation.middleware.ts  # Injection detection
│   ├── requestContext.middleware.ts       # Request ID + IP tracing
│   ├── errorHandler.middleware.ts         # Centralized error handling
│   └── languageMiddleware.ts             # i18n language detection
├── utils/
│   ├── auth.service.ts                    # Provider abstraction (Auth0 / SSO / JWT)
│   ├── jwt.utils.ts                       # JWT sign, verify, blacklist
│   ├── auth0.utils.ts                     # Auth0 JWKS token verification
│   ├── sso.utils.ts                       # Generic OIDC SSO token verification
│   ├── securityAudit.ts                   # Redis-backed security counters + injection detection
│   ├── appError.ts                        # Typed application error class
│   ├── logger.ts                          # Winston logger
│   └── utilityMethods.ts                  # Shared helpers
├── config/
│   ├── redis.client.ts                    # Redis connection lifecycle
│   └── redis.config.ts                    # Redis configuration
├── db/config.ts                           # Sequelize config per environment
├── constants/
│   ├── constants.ts                       # App-wide constants
│   └── Responsibilities.ts               # Module + action IDs for RBAC
├── validators/validator.ts               # Yup schemas
├── types/                                 # Express + i18n type augmentation
└── interfaces/                            # Shared TypeScript interfaces
locales/
└── en.json                                # i18n translations
```

---

## Authentication Modes

The auth provider is controlled by a single `.env` flag. Only one mode is active at a time.

### 1. Local JWT (default)

Enabled when neither `use_auth0` nor `use_sso` is `TRUE`.

- Passwords hashed with bcrypt (10 rounds)
- Access tokens signed HS256 using `JWT_ACCESS_SECRET`
- Token expiry configured via `JWT_ACCESS_EXPIRES_IN`
- Logout blacklists the token in Redis for its remaining TTL
- Timing attack prevention: dummy bcrypt compare runs even when the email is not found

### 2. Auth0

```env
use_auth0=TRUE
```

- Tokens verified using Auth0's JWKS endpoint (RS256)
- JWKS signing keys cached for 10 minutes
- Custom claims namespace configured via `AUTH0_TOKEN_NAMESPACE`
- Local `/v1/login` endpoint is disabled — Auth0 manages all sessions

### 3. Generic OIDC SSO

```env
use_sso=TRUE
```

Compatible with Okta, Azure AD, Google Workspace, Keycloak, or any standards-compliant OIDC provider.

- Tokens verified using the provider's JWKS URI (`SSO_JWKS_URI`)
- Issuer and audience validated (`SSO_ISSUER`, `SSO_AUDIENCE`)
- Custom claims mapped via `SSO_NAMESPACE`
- Local `/v1/login` endpoint is disabled when active

Provider resolution order in `auth.service.ts`:
```
Auth0 → SSO → Local JWT
```

---

## Security Features

| Feature | Implementation |
|---|---|
| Security headers | `helmet()` — CSP, HSTS, X-Frame-Options, X-Content-Type-Options |
| CORS | Per-environment allow-list (`DEV_ORIGIN`, `PROD_ORIGIN`) |
| HTTPS enforcement | HTTP → HTTPS redirect in production via `x-forwarded-proto` |
| Body size limit | 10 KB global limit on JSON + URL-encoded bodies |
| Global rate limiting | `express-rate-limit`, configurable via `RATE_LIMIT_MAX` |
| Per-email brute force | 5 failed logins → 15-min lockout (Redis counter) |
| Per-IP brute force | 20 failed logins → 15-min lockout (Redis counter) |
| Timing attack prevention | Dummy bcrypt compare when email not found, equalizing response time |
| JWT revocation | Redis blacklist keyed by `jwt:bl:<id>:<iat>`, TTL = remaining token life |
| Idempotency | Redis-backed idempotency key deduplication (24-hour TTL) |
| Injection detection | Structural-only pattern detection (SQL syntax, script tags, JS event handlers) |
| Request tracing | UUID `requestId` injected per request for correlation logging |
| Real client IP | `trust proxy 1` ensures `req.ip` reflects actual client behind load balancers |
| DB encryption | SSL enabled for PostgreSQL in production |
| RBAC | Module + action authorization on every protected endpoint |

---

## API Reference

Base path: `/api`

### Employee

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/employee/v1/login` | Public | Authenticate and receive a JWT. Disabled when Auth0 or SSO is active. |
| `POST` | `/api/employee/v1/validate-token` | Public | Verify a token and return the decoded payload. |
| `POST` | `/api/employee/v1/logout` | Bearer token | Blacklist the current JWT. |
| `POST` | `/api/employee/v1` | Admin | Create a new employee. |
| `GET` | `/api/employee/v1` | Authorized | List employees. |
| `GET` | `/api/employee/v1/all-users` | Super Admin | List all users. |
| `GET` | `/api/employee/v1/get-my-responsibilities` | Bearer token | Get own RBAC responsibilities. |
| `GET` | `/api/employee/v1/:id` | Authorized | Get employee by ID. |
| `PUT` | `/api/employee/v1/:id` | Authorized | Update employee. |
| `PUT` | `/api/employee/v1/:id/change-status` | Authorized | Activate / deactivate employee. |
| `PUT` | `/api/employee/v1/change-password` | Bearer token | Change own password. Blacklists current token on success. |
| `POST` | `/api/employee/v1/:id/assign-roles` | Admin | Assign roles to an employee. |

### Roles

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/roles/v1` | Super Admin | Create a role. |
| `GET` | `/api/roles/v1` | Super Admin | List all roles. |
| `GET` | `/api/roles/v1/:id` | Super Admin | Get role by ID. |
| `PUT` | `/api/roles/v1/:id` | Super Admin | Update role. |
| `POST` | `/api/roles/v1/:id/assign-responsibilities` | Super Admin | Assign responsibilities to a role. |

---

## Environment Variables

Create a `.env` file in the project root.

### Server

```env
PORT=5000
NODE_ENV=development          # development | production | test
```

### CORS

```env
DEV_ORIGIN=http://localhost:3000
PROD_ORIGIN=https://yourdomain.com
```

### PostgreSQL

```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=your_db_user
POSTGRES_PASSWORD=your_db_password
POSTGRES_DB=your_db_name
```

### Redis

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=               # optional
```

### Local JWT (default auth mode)

```env
use_auth0=FALSE
use_sso=FALSE
JWT_ACCESS_SECRET=your_long_random_secret
JWT_ACCESS_EXPIRES_IN=1hr
```

### Auth0 (optional)

```env
use_auth0=TRUE
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=https://your-api-audience
AUTH0_TOKEN_NAMESPACE=https://yourapp.com/
```

Add this Auth0 Action (post-login) to include custom claims in the access token:

```javascript
exports.onExecutePostLogin = async (event, api) => {
  const namespace = 'https://yourapp.com/';
  api.accessToken.setCustomClaim(`${namespace}user_id`, event.user.user_id);
  api.accessToken.setCustomClaim(`${namespace}user_type`, event.user.app_metadata?.user_type);
  api.accessToken.setCustomClaim(`${namespace}permissions`, event.authorization?.roles ?? []);
};
```

### Generic OIDC SSO (optional)

```env
use_sso=TRUE
SSO_JWKS_URI=https://your-provider.com/.well-known/jwks.json
SSO_ISSUER=https://your-provider.com/
SSO_AUDIENCE=your-client-id
SSO_NAMESPACE=                # optional claim prefix
```

Provider-specific examples:

```env
# Okta
SSO_JWKS_URI=https://dev-xxxx.okta.com/oauth2/default/v1/keys
SSO_ISSUER=https://dev-xxxx.okta.com/oauth2/default
SSO_AUDIENCE=api://default

# Azure AD
SSO_JWKS_URI=https://login.microsoftonline.com/{tenant}/discovery/v2.0/keys
SSO_ISSUER=https://login.microsoftonline.com/{tenant}/v2.0
SSO_AUDIENCE=your-app-client-id

# Google
SSO_JWKS_URI=https://www.googleapis.com/oauth2/v3/certs
SSO_ISSUER=https://accounts.google.com
SSO_AUDIENCE=your-google-client-id

# Keycloak
SSO_JWKS_URI=https://keycloak.example.com/realms/{realm}/protocol/openid-connect/certs
SSO_ISSUER=https://keycloak.example.com/realms/{realm}
SSO_AUDIENCE=your-client-id
```

### Rate Limiting

```env
RATE_LIMIT_MAX=100            # Max requests per window per IP (default: 100)
```

### Security Validation Middleware

```env
check_add_sec=FALSE           # Set to FALSE to disable injection detection (on by default)
```

### AWS S3 (optional, for file uploads)

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_BUCKET_NAME=
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy and configure environment variables
cp .env.example .env
# Edit .env with your database, Redis, and auth credentials

# 3. Start in development mode
npm run dev
```

### Production

```bash
npm run build
npm start
```

---

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start with ts-node (no build step) |
| `npm run watch` | Start with nodemon (auto-restart on changes) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled output from `dist/` |
| `npm run dev:start` | Build then start (production-like local run) |

---

## Reusing as a Template

This codebase is designed for per-application reuse:

1. **Clone** the repo for each new application
2. **Rename** the app in `package.json`
3. **Extend** `Responsibilities.ts` with application-specific modules and actions
4. **Add domain entities** following the existing `Employee` domain pattern (entity → domain service → repository interface → Sequelize repository → handler → route)
5. **Choose auth mode** by setting `use_auth0`, `use_sso`, or leaving both `FALSE` for local JWT
6. **Configure CORS origins** per environment in `.env`
7. **Register new routers** in `src/routes/index.ts`

The security hardening, RBAC, rate limiting, Redis infrastructure, and auth abstraction layer carry over automatically to every new module you add.
