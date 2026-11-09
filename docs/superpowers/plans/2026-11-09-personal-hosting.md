# Personal Hosting Implementation Plan

> Execute directly in this session, as requested by the owner.

**Goal:** Publish an authenticated personal application with persistent cloud data and a GitHub link.
**Architecture:** Existing Angular on GitHub Pages; existing Express on Render Free; PostgreSQL on Neon Free. Public runtime API configuration connects separate origins. Hosting secrets remain outside Git.
**Tech Stack:** Angular 19, Node.js, Express, Prisma 6, PostgreSQL.
**Spec:** ../specs/2026-11-09-personal-hosting-design.md (approved; local data migration approved).

## Constraints
No paid resources, no destructive seeding, no public credentials, preserve both languages and local data.

## Review Focus
Pages subpath reloads; missing API configuration fails the build; secrets never enter frontend assets; CORS allows only the frontend; cloud data survives restart.

## Tasks
- [x] Add failing tests for generated public runtime configuration and invalid/missing API URLs. Implement the generator and Angular runtime configuration; add Pages hash routing, relative manifest and service worker paths. Validate frontend tests/build.
- [x] Add Render Free configuration using backend root, pinned Node LTS, Prisma generation/schema initialization, health endpoint, private environment variables. Remove misleading demo banner; retain private login and bilingual UI. Document exact deployment steps and link.
- [x] Verify repository and host access; create only approved free resources with immediate browser confirmation. Set GitHub Pages build source and API variable, private host secrets, and Neon URL. Copy existing personal data only to the newly created database and verify table counts without printing records or secrets.
- [x] Run frontend/backend tests, production build, and fresh code review. Commit/push deployment changes, verify Actions and HTTPS health/CORS, then test deployed login and a reversible saved item. Confirm remote commit and report real links and free-tier limits.

## Validation and review
Frontend: 24 passing tests and production build passed. Backend: 11 passing tests. Fresh review identified optional authentication routes remaining public despite hidden UI; fixed with provider guards and production owner restrictions, verified with a failing-then-passing regression. GitHub Pages enabled with Actions as build source.

## Provider decision
Neon is region-blocked and Supabase Free project quota is full. The owner delegated provider choice and explicitly approved creating the independent Prisma Free project/database in Frankfurt. No existing Supabase projects are changed.

## Cloud data verification
Prisma Postgres Free project/database created in Frankfurt. Schema initialization succeeded. Copied and compared every record across 17 models: 1 user, 4 phases, 20 tasks, 18 schedule blocks, 3 workout sessions, 14 exercises, 5 time slots, 12 supplements, 6 habits, 2 habit logs, 1 finance entry, 1 debt, 11 resources, 12 checklist items, and 4 settings (workout/supplement logs empty). Local data remains unchanged. Hosting credentials are stored only in the ignored `.deployment/` directory and hosting form.

## Publication verification
API https://memory-brain-api.onrender.com/api/v1 is live on Render Free in Frankfurt. GitHub Pages and repository homepage point to https://moeinparvizi.github.io/memory-brain/. GitHub Actions run 42572921287 succeeded for 202a2a8 after setting the public API_BASE_URL variable. HTTPS page and runtime configuration return 200. Remote smoke tests verified health, unauthenticated 401, private login, correct CORS, disabled optional authentication, 16 authenticated feature/report reads, and checklist create/read/delete cleanup with the original count restored. The online login interface renders correctly; Chrome extension UI blocked automated form filling, so browser login was not claimed as verified.

## Operations
The Render service was created from the public repository URL without granting extra GitHub App permissions. The Render form states public repositories do not receive automatic deploys unless configured through Blueprints. Subsequent backend code changes require a manual Render deployment. The frontend continues to deploy automatically on main pushes. Private credentials are available only in the owner’s ignored .deployment/login.txt and hosting environment.
