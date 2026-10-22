# DevCerto Portfolio

Portfolio management app with a React/Vite frontend, Express API and PostgreSQL database.

## Local development

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
```

The API runs at `http://localhost:8080` and the frontend at `http://localhost:5173`. Local development uses an in-memory PostgreSQL-compatible database seeded with example systems, infrastructure and clients. No example passwords are included. The local admin password is `local-dev-password-change-me`.

## Railway API and PostgreSQL

Create a PostgreSQL service and an application service from this repository. The app uses `railway.json` for build, start and health check. Add these variables to the API service:

- `DATABASE_URL`: reference the PostgreSQL service's `DATABASE_URL` variable.
- `FRONTEND_ORIGIN`: `https://portifolio.devcerto.com`.
- `ADMIN_PASSWORD`: a unique random password of at least 16 characters.
- `CREDENTIALS_ENCRYPTION_KEY`: a base64-encoded random 32-byte key.
- `NODE_ENV`: `production`.

Generate the encryption key locally with `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"`, then paste it directly into Railway Variables. Back it up securely; losing this key makes stored platform passwords unreadable. Never commit it or send it in chat.

Add the API service custom domain `api.portifolio.devcerto.com` and use the DNS target/verification records Railway displays.

## Netlify frontend and DNS

Create a Netlify site connected to this repository. `netlify.toml` builds and publishes `dist`; `/api/*` requests are proxied to the Railway API. Add `portifolio.devcerto.com` as the Netlify custom domain and apply the DNS records Netlify displays. Both the frontend domain and API domain must use HTTPS for secure session cookies.

The API creates its PostgreSQL schema on startup. Production starts empty; enter real portfolio data after deployment. Local example records are not migrated.
