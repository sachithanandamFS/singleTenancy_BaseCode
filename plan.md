## Plan — Day 1
## Date: 2026-02-28

---

### Carried Over From Previous Day
None — this is Day 1.

---

### Today's Goal

Stand up the monorepo so both developers have a working local environment
by end of day. You (the Product Owner) initialise the repository and
infrastructure first. Once the scaffold is pushed, Aira and Aadhini clone
and begin their respective work in parallel. By end of day: the NestJS API
starts, the React web app loads in a browser, the Money value object has
passing tests, and the base frontend layout is navigable.

---

### ⚙️ Product Owner Setup — Do This Before Starting the Developers

**Do all of these steps yourself, in order, before opening RooCode.**

---

#### 1. Initialise the Nx monorepo

This step creates the entire project from scratch and pushes it to GitHub.
Run each command one at a time. Wait for each one to finish before running the next.

---

**1a. Create the base workspace**

This downloads the Nx tool and creates a new empty project folder called
`servu-erp` on your machine. The `--packageManager=npm` flag is important —
without it Nx tries to use pnpm which is not installed.

```bash
npx create-nx-workspace@latest servu-erp --preset=empty --packageManager=npm
```
> When prompted "Connect to Nx Cloud?" → select **Never**.
> Expected: a new folder `servu-erp/` appears in your current directory.

---

**1b. Move into the project folder**

All remaining commands must be run from inside this folder.

```bash
cd servu-erp
```

---

**1c. Install the NestJS plugin and generate the backend app**

The first command installs Nx's NestJS support. The second uses it to
scaffold the backend API into `apps/api/` — this creates the folder
structure, config files, and entry point for the NestJS server.

```bash
npm install -D @nx/nest
npx nx generate @nx/nest:application --name=api --directory=apps/api --linter=eslint --unitTestRunner=none
```
> Expected: `apps/api/` folder appears with NestJS files inside.

---

**1d. Install the React plugin and generate the frontend app**

Same pattern — installs Nx's React support, then scaffolds the React web
app into `apps/web/` using Vite as the build tool and plain CSS for styling.

```bash
npm install -D @nx/react
npx nx generate @nx/react:application --name=web --directory=apps/web --bundler=vite --style=css --linter=eslint --unitTestRunner=none
```
> Expected: `apps/web/` folder appears with React + Vite files inside.

---

**1e. Create the remaining folder structure**

These two commands create empty folders for the mobile app scaffold and
the three shared code packages the team will fill in over the coming days.
`mkdir -p` means "create this folder and any missing parent folders".

```bash
mkdir -p apps/mobile/src/notifications
mkdir -p packages/shared-types/src packages/money/src packages/gst-rules/src
```
> Expected: no output — silence means success.

---

**1f. Push to GitHub using GitHub Desktop**

Open GitHub Desktop. Add the `servu-erp` folder as a local repository
(File → Add Local Repository). Create your first commit with the message:
`feat: initialise Nx monorepo with api, web, mobile apps`
Then publish the repository to GitHub.

> Expected: the repository appears on GitHub at `github.com/spearfox/servu-erp`.
> Make sure the repo is set to private before publishing if you don't want
> it publicly visible.

---

#### 2. Verify PostgreSQL 15 and Redis 7 are running

**What:** These are the two local services the backend depends on —
PostgreSQL is the database, Redis is the job queue store. Both must be
running before Aira can start the API server.

**Why:** If either is not running, `npx nx serve api` will crash
immediately and Aira will be blocked from the very first step.

```bash
pg_isready -h localhost -p 5432
redis-cli ping
```
Expected output: `localhost:5432 - accepting connections` and `PONG`.
If PostgreSQL is not running: `brew services start postgresql@15`
If Redis is not running: `brew services start redis`
Then re-run the checks above before proceeding.

---

#### 3. Create .env.example files and run the first Sequelize migration

**What:** This step does two things. First, you create template environment
variable files so Aira and Aadhini know what values to fill in when they
clone. Second, you install Sequelize, create the first migration file that
defines the platform database tables, and run it to actually create those
tables in your local PostgreSQL.

**Why:** Aira's API connects to PostgreSQL on startup and expects the
`companies` table to already exist. If the migration hasn't been run, the
table doesn't exist and the API crashes immediately. The `.env.example`
files are also needed so Aira and Aadhini can configure their local
environments after cloning.

First, create `apps/api/.env.example` with this content:
```
DATABASE_URL=postgresql://servu:servu_dev@localhost:5432/servu_platform
REDIS_URL=redis://localhost:6379
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=FILL_ME
AUTH0_CLIENT_SECRET=FILL_ME
AUTH0_AUDIENCE=https://api.servu.in
GST_SERVICE_URL=http://localhost:3000
TDS_SERVICE_URL=http://localhost:3000
LEDGER_SERVICE_URL=http://localhost:3000
NOTIFICATION_SERVICE_URL=http://localhost:3000
INVOICE_SERVICE_URL=http://localhost:3000
SPEARFOX_ADMIN_URL=http://localhost:8000
SPEARFOX_INTERNAL_KEY=dev-internal-key-change-in-production
AWS_S3_BUCKET=servu-erp-dev
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=FILL_ME
AWS_SECRET_ACCESS_KEY=FILL_ME
FIELD_ENCRYPTION_KEY=0000000000000000000000000000000000000000000000000000000000000000
PORT=3000
NODE_ENV=development
```

Create `apps/web/.env.example` with this content:
```
VITE_API_URL=http://localhost:3000
VITE_AUTH0_DOMAIN=your-tenant.auth0.com
VITE_AUTH0_CLIENT_ID=FILL_ME
VITE_AUTH0_AUDIENCE=https://api.servu.in
```

Then install Sequelize and its CLI tools:
```bash
cd apps/api
npm install sequelize pg pg-hstore
npm install -D sequelize-cli @types/sequelize
```
> Expected output: packages added with no errors.

Then create the Sequelize config file at `apps/api/src/database/config.js`:
```javascript
module.exports = {
  development: {
    url: process.env.DATABASE_URL,
    dialect: 'postgres',
    dialectOptions: { ssl: false }
  },
  production: {
    url: process.env.DATABASE_URL,
    dialect: 'postgres',
    dialectOptions: { ssl: true }
  }
};
```

Then create a `.sequelizerc` file at the root of `apps/api/` so the CLI
knows where to find migrations and seeders:
```javascript
const path = require('path');
module.exports = {
  'config': path.resolve('src/database', 'config.js'),
  'migrations-path': path.resolve('src/database', 'migrations'),
  'seeders-path': path.resolve('src/database', 'seeders'),
  'models-path': path.resolve('src/database', 'models')
};
```

Then generate the first migration file:
```bash
npx sequelize-cli migration:generate --name init-platform-schema
```
> This creates a timestamped file in `src/database/migrations/` e.g.
> `20260228000000-init-platform-schema.js`. Open it and replace the
> entire contents with this:

```javascript
'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    // ServuERP database contains tenant schemas only.
    // Platform tables belong to SpearFox Admin (separate repo/DB).
    // Suspension check: GET {SPEARFOX_ADMIN_URL}/internal/companies/{id}/status
    // Tenant schema tables created by provision-tenant.sql per new client.
    // This migration confirms the DB connection is working.
    await queryInterface.sequelize.query('SELECT 1+1 AS result');
  },
  async down(queryInterface) {
    // Nothing to undo
  }
};
```

Then run the migration:
```bash
npx sequelize-cli db:migrate
```
> Expected output: `== init-platform-schema: migrating =======`
> followed by `== init-platform-schema: migrated (0.XXXs)`
> If you see a connection error: make sure PostgreSQL is running and the
> `servu_platform` database exists:
> `psql postgres -c "CREATE DATABASE servu_platform OWNER servu;"`

---

#### 4. Create shared-types scaffold and push everything

**What:** `packages/shared-types` is a small TypeScript package that
defines the `ApiResponse<T>` and `PaginatedResponse<T>` shapes that both
Aira and Aadhini import. It needs to exist before either of them can compile.

**Why:** Both Aira and Aadhini import from this package on Day 1. If it
doesn't exist, TypeScript compilation fails immediately for both of them.

Create `packages/shared-types/src/index.ts`:
```typescript
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  message: string;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

Then go back to the repo root (`cd ../..`) so you are in `servu-erp/`.

Open GitHub Desktop, commit all changes with the message:
`feat: env templates, Sequelize DB connection, shared-types scaffold`
Then push to GitHub.

> **After this push: ping Aira and Aadhini — they can now clone and start.**

---

#### 5. Verify the full stack starts

**What:** Before handing off to the developers, confirm the API actually
starts on your machine. This catches any configuration problem before
Aira and Aadhini hit it.

**Why:** If there's a setup error, better to find it now while you can fix
it, rather than after Aira spends time debugging what she thinks is her code.

```bash
# Make sure you are in the servu-erp folder
cp apps/api/.env.example apps/api/.env
npx nx serve api
```
Expected output: `NestJS application is running on: http://localhost:3000`
Then in a second terminal:
```bash
curl http://localhost:3000
```
Expected output: any response (even a 404 is fine — it means the server is up).
If the server crashes: paste the error in chat before starting the developers.

---

### Aira — Backend Tasks

**Wait for the Product Owner's ping that the repo is ready before cloning.**

1. **Clone and set up:**

   Clone the repository using your preferred git tool, then:
   ```bash
   cd servu-erp
   npm install
   cp apps/api/.env.example apps/api/.env
   ```
   > PostgreSQL and Redis are already running — the Product Owner started
   > them in setup step 2. You do not need to start them yourself.

2. **Read all architecture documents — mandatory before writing any code:**
   - `tasks/00_objective.md` — all requirements and all 9 ADRs in full
   - `tasks/project_structure.md` — confirm which folders you own
   - `tasks/05_cycle_log.md` — understand your full Sprint 1–8 deliverables
   - `tasks/01_environment.md` — know how to start and stop the stack

3. **Write `docs/CODING_STANDARDS.md`** — Financial Engine Rules section.
   Document all 8 rules from ADR-006 clearly enough that a developer who
   has never read the spec knows exactly what is allowed and forbidden.
   Include a concrete code example: wrong way (using `number` for money)
   vs correct way (using the `Money` value object).

4. **Install Decimal.js:**
   ```bash
   npm install decimal.js
   ```

5. **Write `packages/money/src/money.ts`** — the `Money` value object:
   - Wraps `Decimal.js` with `precision: 20, rounding: ROUND_HALF_UP`
   - Methods: `add(other)`, `subtract(other)`, `multiply(factor)`,
     `equals(other)`, `isZero()`, `toDecimalString()` (always 4 decimal
     places), `toNumber()` (display only — never for further calculation)
   - Static: `Money.ZERO`
   - Constructor accepts `string | number | Decimal`

6. **Write `packages/money/src/money.spec.ts`** — unit tests. Must all pass:
   - `new Money(100).add(new Money(18)).toDecimalString()` → `"118.0000"`
   - `new Money(100).multiply(0.18).toDecimalString()` → `"18.0000"`
   - `new Money(0.1).add(new Money(0.2)).toDecimalString()` → `"0.3000"`
   - `new Money(100.5555).toDecimalString()` → `"100.5555"`
   - `Money.ZERO.isZero()` → `true`
   - Run: `npx nx test money`

7. **Commit:**

   In GitHub Desktop, stage `packages/money/` and `docs/CODING_STANDARDS.md`,
   commit with message:
   `feat(money): Money value object with Decimal.js and unit tests | docs: financial engine coding standards`
   Then push.

8. **Verify before sign-off:**
   - [ ] All Money unit tests pass (`npx nx test money`)
   - [ ] You can explain ADR-001 (ServiceRegistry pattern) from memory
   - [ ] You can explain why `DECIMAL(19,4)` is mandatory and `FLOAT` is forbidden

---

### Aadhini — Frontend Tasks

**Wait for the Product Owner's ping that the repo is ready before cloning.**

1. **Clone and set up:**

   Clone the repository using your preferred git tool, then:
   ```bash
   cd servu-erp
   npm install
   cp apps/web/.env.example apps/web/.env
   ```

2. **Read architecture documents:** `tasks/00_objective.md` (focus on
   Modules 1, 5, 6, 7, 8, 11, 12, 13), `tasks/project_structure.md`,
   `tasks/05_cycle_log.md` (your Sprint 1–8 deliverables).

3. **Install frontend dependencies** in `apps/web/`:
   ```bash
   cd apps/web
   npm install react-router-dom @tanstack/react-query axios zod @hookform/resolvers react-hook-form @auth0/auth0-react lucide-react
   npm install -D tailwindcss postcss autoprefixer && npx tailwindcss init -p
   ```

4. **Configure Tailwind CSS** in `tailwind.config.js`:
   - Content: `./src/**/*.{js,ts,jsx,tsx}`
   - Extend colours: `primary: '#1E40AF'`, `success: '#15803D'`,
     `warning: '#B45309'`, `danger: '#B91C1C'`, `surface: '#F8FAFC'`
   - Add `@tailwind base/components/utilities` to `src/index.css`

5. **Set up React Router with placeholder routes** for all 10 sections:
   `/` (Dashboard), `/invoices`, `/invoices/new`, `/payments`, `/accounts`,
   `/parties`, `/items`, `/reports`, `/settings/users`, `/settings/roles`,
   `/migration`.
   Each placeholder page: a `<div>` with the page name and "Coming in
   Sprint N" text. No data, no API calls.

6. **Build base layout component** `apps/web/src/shared/components/Layout.tsx`:
   - Left sidebar with all navigation links (icon + label per item)
   - Collapsible Settings sub-menu (Users, Roles, Migration)
   - Top bar: company name (hardcoded for now), notification bell icon
     (placeholder, badge showing 0), user avatar with dropdown (Logout
     option — no API yet)
   - Main content area that renders child routes via `<Outlet />`

7. **Create the API client** `apps/web/src/shared/api/client.ts`:
   - Axios instance with `baseURL: import.meta.env.VITE_API_URL`
   - Request interceptor: attach `Authorization: Bearer {token}` from
     sessionStorage
   - Response interceptor: unwrap `{ success, data, message }` envelope,
     return `data` directly

8. **Commit:**

   In GitHub Desktop, stage all changes in `apps/web/`, commit with message:
   `feat(web): React Router routes, base layout with sidebar, API client, Tailwind setup`
   Then push.

9. **Verify before sign-off:**
   - [ ] `npx nx serve web` starts without errors
   - [ ] `http://localhost:4200` loads in browser
   - [ ] Sidebar navigation renders with all menu items
   - [ ] Clicking each nav item renders the correct placeholder page
   - [ ] No TypeScript or console errors

---

### Work Mode Today
**[SEQUENTIAL then PARALLEL]**
Product Owner sets up the monorepo and pushes first. Aira and Aadhini
then clone and work in parallel for the rest of the day. Aira and Aadhini
have no dependency on each other today.

---

### Dependencies
- Aira and Aadhini both depend on the Product Owner's push before cloning
- Aira needs the Sequelize migration to have run before starting `npx nx serve api`
- No dependencies between Aira and Aadhini today

---

### Definition of Done for Today
- [ ] Monorepo scaffold committed and pushed — Aira and Aadhini can clone
- [ ] `pg_isready -h localhost -p 5432` returns `accepting connections`
- [ ] `redis-cli ping` returns `PONG`
- [ ] Sequelize DB connection confirmed (`npx sequelize-cli db:migrate` runs successfully)
- [ ] `npx nx serve api` starts NestJS on port 3000
- [ ] `npx nx serve web` starts React app at `http://localhost:4200`
- [ ] All placeholder routes navigable in the browser
- [ ] All Money unit tests passing (`npx nx test money`)
- [ ] `docs/CODING_STANDARDS.md` written with financial engine rules
- [ ] Base layout renders with sidebar, topbar, and all nav items
