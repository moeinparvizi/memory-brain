# Public authentication

The user approved Firebase Authentication and a demo account separated from their private data, and delegated implementation details. Preserve the existing private username/password login and all existing owner data.

## Approaches

Firebase Authentication (selected) supplies Google authentication, email/password registration and verification email delivery. Extending the existing JWT login with passwords and a separate email delivery service would require operating password recovery and mail infrastructure. Firebase verifies identities; the existing API continues to issue application JWTs and store application data in Prisma Postgres.

## Behavior

- Login displays the public credentials `demo` / `demo1234`, a demo entry button, email sign-in, registration, Google sign-in, and the existing private login. Persian and English remain supported.
- A dedicated demo user receives sample data on first creation. Demo data is shared public sample data; it never uses the private owner's identity. Clearly tell visitors that demo edits are public.
- Email/password users must verify their email before the API issues an application session. Registration shows the verification destination, resend with cooldown, and an explicit verification check. Include password recovery through Firebase.
- Google users must have a verified email. The API validates Firebase ID tokens against the configured Firebase project. Identity is keyed by Firebase UID, never by untrusted request fields. Do not automatically merge new identities into the legacy private owner.
- Account data is isolated across all API reads, mutations, nested relationships, bulk reorder, import and export. Missing/foreign records return 404 without modification. Imports cannot reuse another user's IDs.
- Public demo login is configurable and rate limited. Authentication failures return safe messages. Keep provider credentials and private hosting values out of Git.
- Runtime Firebase web configuration is public and supplied through GitHub Actions variables. Backend receives only the Firebase project ID. Unconfigured Firebase controls show an honest unavailable state and cannot authenticate.

## Deployment and verification

Use a separate Firebase project on the free plan without enabling billing or changing existing projects. Enable Google and email/password providers and authorize moeinparvizi.github.io and localhost. Retain Render and Prisma hosting. Browser submission/security changes require the applicable final confirmation; prepare concrete settings first.

Verify two-user isolation, real API demo persistence, rejected malformed/unverified/wrong-project identities, authentication component flows, bilingual text, production and Pages builds. Push reviewed code as requested. Report deployment/configuration or email/Google verification limits honestly rather than displaying non-working controls as complete.
