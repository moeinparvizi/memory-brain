# Personal online deployment

## Intent
Publish the existing application for the owner’s personal use, with a working link on GitHub and authenticated access to saved data. This is not a shared public demo account.

## Proposed deployment
Keep the existing GitHub Pages frontend. Deploy the existing Express API on Render Free and PostgreSQL on Neon Free. Configure the frontend API origin during the Pages build; configure CORS for the actual Pages origin. Store credentials and connection strings only in hosting environment settings. Use a private login and remove the misleading public demo-credentials banner.

## Alternatives
Render Free PostgreSQL expires after 30 days, so it is unsuitable for persistent personal data. Vercel plus Neon would require adapting the existing listening API to serverless execution. Render plus Neon retains the existing backend architecture and avoids that adaptation. This is the implementer’s recommendation pending confirmation.

## Scope
Add repeatable deployment configuration, correct Pages subpath routing and service-worker paths, document the live link and deployment steps in English, then verify login, data reads, and a reversible test write against the deployed API. Preserve both interface languages and existing feature fixes. No paid resources. No destructive seeding. No personal data or secrets in the Git repository. Existing local data migration will require the owner’s explicit confirmation before copying it to the cloud.

## Dependencies and limits
The owner must sign in to Render and Neon and authorize any required account or repository connection. Render Free may take time to wake after inactivity. Google/SMS sign-in requires valid provider configuration; basic private username/password login must work independently.

## Acceptance
A public HTTPS frontend link is listed in the repository; the API and database work together; unauthenticated requests cannot read private records; login and a test save survive reload; no credentials are included in frontend artifacts.

## Approved execution notes
The owner approved the design and copying current local data. Neon is blocked in the current region. The owner delegated the account setup and provider choice; Supabase is also at its Free project quota. Use an independent Prisma Postgres Free database in Frankfurt instead, explicitly approved by the owner, without changing existing projects. Render requires email ownership verification by the owner before deployment.
