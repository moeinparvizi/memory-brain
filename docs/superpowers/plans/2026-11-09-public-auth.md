# Public Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Working isolated demo, Google login, and email registration with verification, pushed and deployed.

**Architecture:** Firebase handles external identity and verification delivery; Express validates Firebase identity and issues existing application JWTs. Prisma owns isolated application data and a separate shared demo workspace.

**Tech Stack:** Angular 19, Firebase JS/Admin SDKs, Express, Prisma 6, PostgreSQL, Node tests.

**Spec:** docs/superpowers/specs/2026-11-09-public-auth-design.md

## Global Constraints

- Preserve existing owner data and private login; never publish private credentials.
- Firebase users require verified email; identities use Firebase UID, never email-based automatic owner linking.
- Every application record and relationship is scoped to the authenticated user.
- Demo credentials are demo / demo1234 and only access public sample data.
- Support Persian and English; keep existing hosting on free plans.

## Review Focus

- Malformed or wrong-project Firebase tokens cannot create application sessions.
- Unverified users cannot bypass verification by calling the API directly.
- Child IDs, reorder arrays and imports cannot modify another user's data.
- Verification resend and popup cancellation leave a usable form.
- Existing private login and exported backups continue to work.

### Task 1: Close cross-account data access

**Files:** backend/src/routes/*, backend/tests/ownership.integration.test.js

**Interfaces:** Routes consume req.userId. Produce owner-scoped reads/writes and safe backup roundtrip.

- [ ] Write and run failing two-user integration tests for direct IDs, foreign parents, reorder, workout edits and backup import/export.
- [ ] Scope queries and relations, fix export model names and remap imported IDs safely.
- [ ] Run backend tests; review all routes for remaining unscoped access.

### Task 2: Verified identities and separate demo

**Files:** backend/src/routes/auth.routes.js, backend/src/services/*, backend/prisma/schema.prisma, backend/tests/public-auth.test.js, backend/package*.json

**Interfaces:** POST /auth/firebase accepts {idToken}; POST /auth/login accepts legacy or public demo credentials; both return existing {token,user} shape.

- [ ] Add failing tests for absent/malformed/unverified identities, Firebase UID mapping and demo separation.
- [ ] Install SDK, add unique Firebase UID, validate ID tokens, seed a distinct demo user transactionally, and rate limit authentication.
- [ ] Run schema generation/push locally and backend tests.

### Task 3: Bilingual signup and login UI

**Files:** frontend/src/app/features/login/*, frontend/src/app/core/services/*auth*, frontend/src/app/core/i18n/en.ts, frontend/src/environments/*, frontend/scripts/configure-pages.cjs, .github/workflows/deploy.yml, frontend/tests/*

**Interfaces:** Firebase client methods register/signIn/Google/resend/check/reset; verified Firebase identity exchanges through AuthService into the existing application session.

- [ ] Add failing behavioral tests for registration verification gate, resend/check, Google cancellation and demo login.
- [ ] Implement accessible forms, public demo credentials, explicit verification state, Firebase runtime configuration and English copy.
- [ ] Run frontend tests and production/Pages builds.

### Task 4: Configure, review, push and verify deployment

**Files:** README.md, .env.example, render.yaml, docs deployment instructions

- [ ] Prepare Firebase free project/provider/domain configuration; request only required browser confirmation at final submission.
- [ ] Configure public GitHub variables and Render project ID/demo settings without leaking secrets.
- [ ] Obtain fresh whole-change review, fix material issues, run full suites and builds.
- [ ] Inspect diff, commit and push; deploy API and Pages; smoke test demo CRUD and owner access.
- [ ] Report live links and actual verification results, including any remaining external account action.
