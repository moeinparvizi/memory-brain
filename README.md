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

Sign in with the `AUTH_USERNAME` and `AUTH_PASSWORD` configured above. The login page's demo banner does not configure server credentials.

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

The included GitHub Pages workflow publishes the frontend on pushes to `main`. GitHub Pages does not host the Express API; a functioning deployment also requires a separately hosted backend and appropriate API routing.

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
