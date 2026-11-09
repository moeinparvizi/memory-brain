# Memory Brain — Online App

Frontend address: **https://moeinparvizi.github.io/memory-brain/**

This deployment is intended for the owner's personal use. It requires the private username/password configured on the hosted API. There is no public shared demo password, and private data is not included in the repository or static frontend.

The frontend is connected to the Render Free API at **https://memory-brain-api.onrender.com/api/v1** and Prisma Postgres in Frankfurt. The initial deployment, private login, saved-data reads, and temporary create/delete test were verified. See [README.md](README.md#online-deployment) for the exact deployment configuration and free-tier limits.

To run locally, follow [Local development](README.md#local-development). Create `backend/.env`, initialize the database, and sign in using your own `AUTH_USERNAME` and `AUTH_PASSWORD`. The optional seed script deletes existing data and is suitable only for a disposable local database.
