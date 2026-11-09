# Memory Brain

A personal life dashboard for planning your day and tracking habits, workouts, supplements, finances, learning resources, and long-term goals.

Built with Angular 19, Express, Prisma, and PostgreSQL. The interface supports **Persian (RTL)** and **English (LTR)**.

## Features

- Dashboard with daily summaries, weekly reports, habit charts, and a contribution heatmap.
- Roadmap phases and tasks with progress calculated from completed tasks.
- Daily schedule with workday and day-off timelines.
- Workout sessions, exercises, daily logs, and a configurable goal of 1–7 exercise days per week.
- Supplement time slots and intake tracking.
- Habit tracking, streaks, and weekly progress.
- Monthly income, expenses, allocation charts, and debt tracking. Monetary amounts retain their existing toman units when switching languages.
- Resources, categorized checklists, global search, and JSON backup import/export.
- Browser reminders and an application service worker with offline asset fallback.

## Language settings

Choose **فارسی** or **English** on the login page or under **Settings → App language**. The interface updates immediately and remembers your choice in the current browser. Dates, numbers, navigation, forms, and generated reports follow the selected language. User-entered names, notes, categories, and other saved content are preserved exactly as entered.

Weeks continue to run from Saturday through Friday in either language. Dates use the existing Gregorian calendar.

## Requirements

- Node.js 20.19+ (or a compatible newer LTS release) and npm.
- PostgreSQL 16, or Docker Compose to run the included database service.

## Local development

### 1. Start PostgreSQL

Create a PostgreSQL database, or start the included service from the repository root:

```bash
cp .env.example .env
# Edit .env and set DB_PASSWORD before starting the database.
docker compose up -d db
```

The included database service uses the username `moein`, database `moein_dashboard`, and port `5432`.

### 2. Configure the API

Create `backend/.env` with your own values:

```dotenv
DATABASE_URL=postgresql://moein:YOUR_DATABASE_PASSWORD@localhost:5432/moein_dashboard
JWT_SECRET=YOUR_LONG_RANDOM_SECRET
PORT=3001
CORS_ORIGIN=http://localhost:4201
AUTH_USERNAME=YOUR_USERNAME
AUTH_PASSWORD=YOUR_PASSWORD
SMS_PROVIDER=console
```

If a database password contains reserved URL characters, URL-encode it in `DATABASE_URL`. The root `.env` supplies Docker Compose variables; the local API reads `backend/.env`.

Install dependencies and initialize the database:

```bash
cd backend
npm ci
npx prisma generate
npm run db:push
npm run dev
```

The API is available at `http://localhost:3001/api/v1`. Check `GET /api/v1/health` to verify that it is running.

Sign in with the private `AUTH_USERNAME` and `AUTH_PASSWORD` configured above. Credentials are never included in the frontend.

**Optional sample data:** `npm run db:seed` populates a Persian sample dataset. **This script deletes existing application data first. Run it only against a disposable database.** A new account works without seeding.

### 3. Start the frontend

In a separate terminal:

```bash
cd frontend
npm ci
npm start
```

Open `http://localhost:4201`. The Angular development proxy forwards `/api` requests to `http://localhost:3001`.

### Optional authentication providers

For Google sign-in, configure `GOOGLE_CLIENT_ID` (and, if applicable, `GOOGLE_CLIENT_SECRET`) in the backend environment and update `googleClientId` in the frontend environment configuration. Register your frontend origin with Google.

Phone sign-in uses the configured SMS provider. Supported providers are `kavenegar`, `smsir`, and `console`. The console provider prints development verification messages to the API terminal. Provider-specific configuration names are listed in `.env.example`.

## Docker

Set `DB_PASSWORD`, `JWT_SECRET`, and `AUTH_PASSWORD` in the root `.env`, then run:

```bash
docker compose up --build -d
# Initialize the schema after PostgreSQL is ready:
docker compose exec backend npx prisma db push
```

- Frontend: `http://localhost:4200`
- API: `http://localhost:3000/api/v1`

The Compose configuration sets the username to `moein`. The frontend's Nginx server forwards API requests to the backend container. Database data is stored in the `pgdata` volume.

## Tests and production build

From the repository root:

```bash
npm --prefix frontend test
npm --prefix backend test
npm --prefix frontend run build
```

Frontend tests cover component behavior, localization, and service-worker caching. Backend integration tests require a reachable database and `backend/.env`; they create a separate temporary user and delete only that user's fixture data afterward.

The frontend production build is written to `frontend/dist/moein-dashboard/browser`. Serve it with SPA fallback routing and a reverse proxy for `/api`, as demonstrated by `frontend/nginx.conf`.

## Online deployment

**Live personal app: https://moeinparvizi.github.io/memory-brain/**

API: **https://memory-brain-api.onrender.com/api/v1**. The hosted API uses Prisma Postgres in Frankfurt. Sign in with the private hosting credentials; there is no shared demo account.

1. Create a **Free** PostgreSQL database with a managed provider (the personal deployment uses Prisma Postgres in Frankfurt). Keep the connection string private. Use TLS (`sslmode=require`) and an appropriate pooled endpoint where the provider recommends it.
2. Create a **Free** Render Node web service using `render.yaml`, or select root directory `backend`, build command `npm ci --include=dev && npx prisma generate`, start command `node scripts/prepare-auth-schema.cjs && npx prisma db push --skip-generate && npm start`, Node 22, and health path `/api/v1/health`.
3. Set `DATABASE_URL`, a random `JWT_SECRET`, and a private `AUTH_USERNAME` / strong `AUTH_PASSWORD` in Render. Set `CORS_ORIGIN=https://moeinparvizi.github.io`. Never commit these values. Do not run the sample-data seed against personal data.
4. Enable **Settings → Pages → GitHub Actions** in the repository. Set the Actions repository variable `API_BASE_URL` to the actual Render HTTPS address ending in `/api/v1`. This is a public API address, not a secret. The build intentionally fails if the address is missing or invalid.
5. Push to `main` or run the Pages workflow. The published app uses hash routes under `/memory-brain/`, so refreshing a screen works on static hosting. Runtime API configuration is generated into the build artifact; local development keeps its existing proxy.

Public authentication requires a separate Firebase project: enable Email/Password and Google in Authentication, authorize `moeinparvizi.github.io` and `localhost`, and register a web app. Set Render's `FIREBASE_PROJECT_ID` to that project ID and `DEMO_LOGIN_ENABLED=true` to enable the separate shared demo (`demo` / `demo1234`). Demo edits are visible to all demo visitors. Set the GitHub Actions variables `PUBLIC_FIREBASE_API_KEY`, `PUBLIC_FIREBASE_AUTH_DOMAIN`, `PUBLIC_FIREBASE_PROJECT_ID`, and `PUBLIC_FIREBASE_APP_ID` to the web app configuration. These values are public; do not add service-account credentials to the frontend or repository. All four values are required to enable Firebase controls. Email/password users must verify their address before signing in. The existing private login remains available.

For the Render service, set `TRUST_PROXY=1` so the authentication rate limit uses the client address behind its proxy. Only use this setting behind one trusted proxy. The older Google and phone endpoints remain disabled unless their separate backend settings are configured.

The current Render service uses the public repository URL. For later backend changes, use **Render → memory-brain-api → Manual Deploy → Deploy latest commit**; automatic Render deploys for public URL repositories require a Blueprint or an authorized Git provider connection. Frontend changes deploy automatically through GitHub Actions.

Render Free services sleep after inactivity, so the first API call can take longer. Database providers have their own storage/activity quotas. The Render Free database expires after 30 days and is not used by this configuration. No paid plan is required by `render.yaml`.

`GET /api/v1/health` checks API availability; successful authenticated reads and writes must also be tested to verify the database. GitHub Pages hosts only the frontend, not Express or PostgreSQL.

## Project structure

```text
backend/
  prisma/schema.prisma      Database schema
  src/routes/               Authenticated API endpoints
  seed/seed.js              Destructive sample-data initializer
  tests/                    API integration tests
frontend/
  src/app/core/i18n/         English interface catalog
  src/app/core/services/     API, locale, auth, and notification services
  src/app/features/          Dashboard and feature screens
  src/app/shared/            Reusable components, models, and pipes
  src/sw.js                 Service worker
  tests/                    Frontend regression tests
```

To add or revise an interface translation, update `frontend/src/app/core/i18n/en.ts` and use `LocaleService.t()` for interface messages. Keep stored user content outside the translation catalog.
