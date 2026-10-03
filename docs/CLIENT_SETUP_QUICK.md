# Client website: quick setup

Replace every value in `<ANGLE_BRACKETS>`.

## 1. Create the repository

GitHub:

1. Open `vineetmankani-webcraft/gym-website-template`.
2. Select **Use this template → Create a new repository**.
3. Owner: `vineetmankani-webcraft`.
4. Repository name: `<CLIENT_SLUG>`.
5. Select **Create repository**.

## 2. Clone and install

```powershell
cd <CLIENT_PROJECTS_FOLDER>
git clone https://github.com/vineetmankani-webcraft/<CLIENT_SLUG>.git
cd <CLIENT_SLUG>
npm ci
```

Edit `wrangler.jsonc`:

```json
"name": "<CLIENT_SLUG>"
```

Edit `package.json`:

```json
"name": "<CLIENT_SLUG>"
```

## 3. Create the local environment

```powershell
Copy-Item .env.example .env
```

Set `.env`:

```ini
ADMIN_USERNAME=<CLIENT_ADMIN_USERNAME>
ADMIN_PASSWORD=<CLIENT_ADMIN_PASSWORD>
GITHUB_REPOSITORY=vineetmankani-webcraft/<CLIENT_SLUG>
GITHUB_TOKEN=
CONTENT_BRANCH=main
NEXT_PUBLIC_SITE_URL=http://localhost:8788
NEXT_PUBLIC_ADMIN_URL=http://localhost:8788/admin
```

## 4. Customize locally

```powershell
npm run dev:admin
```

Open:

```text
http://localhost:8788
http://localhost:8788/admin
```

In `/admin`:

1. Update all gym details.
2. Update navigation and section content.
3. Replace photographs, logo and favicon.
4. Update trainers, testimonials and services.
5. Update SEO and contact-form settings.
6. Select **Save changes**.
7. Refresh the website and verify it.
8. Stop the server with `Ctrl+C`.

## 5. Validate and push

```powershell
git restore next-env.d.ts
git status --short
npm test
npm run build
git add .
git commit -m "Configure website for <CLIENT_NAME>"
git push origin main
```

Confirm `.env` was not committed.

## 6. Give the GitHub token repository access

GitHub:

1. Open **Settings → Developer settings → Personal access tokens → Fine-grained tokens**.
2. Open the agency website-admin token.
3. Add `vineetmankani-webcraft/<CLIENT_SLUG>` under **Repository access**.
4. Set **Repository permissions → Contents → Read and write**.
5. Save.

## 7. Create the Cloudflare Pages project

Cloudflare:

1. Open **Workers & Pages**.
2. Select **Create application → Pages → Import an existing Git repository**.
3. Select `vineetmankani-webcraft/<CLIENT_SLUG>`.
4. Enter:

```text
Project name: <CLIENT_SLUG>
Production branch: main
Framework preset: Next.js (Static HTML Export)
Build command: pnpm run build
Build output directory: out
Root directory: leave empty
Build system: Version 3
Automatic production deployments: enabled
```

5. Select **Save and Deploy**.
6. Wait for **Success**.

## 8. Add Production variables

Open **Settings → Variables and secrets → Production**.

Add as **Text**:

```ini
ADMIN_USERNAME=<CLIENT_ADMIN_USERNAME>
GITHUB_REPOSITORY=vineetmankani-webcraft/<CLIENT_SLUG>
NEXT_PUBLIC_SITE_URL=https://<CLIENT_SLUG>.pages.dev
NEXT_PUBLIC_ADMIN_URL=https://<CLIENT_SLUG>.pages.dev/admin
```

Add as **Secret**:

```ini
ADMIN_PASSWORD=<CLIENT_ADMIN_PASSWORD>
GITHUB_TOKEN=<ACTUAL_GITHUB_TOKEN>
```

Do not add `CONTENT_BRANCH`.

Select **Save**.

## 9. Redeploy

Cloudflare:

1. Open **Deployments**.
2. Open the latest Production deployment.
3. Select **Retry deployment** or **⋯ → Retry deployment**.
4. Wait for **Success**.

Terminal fallback:

```powershell
git commit --allow-empty -m "Redeploy with production environment"
git push origin main
```

## 10. Test Pages and admin

Open:

```text
https://<CLIENT_SLUG>.pages.dev/api/admin/session
https://<CLIENT_SLUG>.pages.dev
https://<CLIENT_SLUG>.pages.dev/admin
```

In `/admin`:

1. Sign in.
2. Change a small text value.
3. Select **Save changes**.
4. Confirm GitHub received an `Update website content` commit on `main`.
5. Wait for the matching Cloudflare deployment to show **Success**.
6. Verify the change in a private browser window.
7. Restore the earlier version from **History** if required.

## 11. Connect the domain

Cloudflare:

1. Open **Custom domains**.
2. Select **Set up a domain**.
3. Add `<CLIENT_DOMAIN>`.
4. Add `www.<CLIENT_DOMAIN>` if required.
5. Complete the displayed DNS or nameserver steps.
6. Wait for **Active**.

Open:

```text
https://<CLIENT_DOMAIN>
https://<CLIENT_DOMAIN>/admin
```

## 12. Update the canonical URLs

Open **Settings → Variables and secrets → Production**.

Change:

```ini
NEXT_PUBLIC_SITE_URL=https://<CLIENT_DOMAIN>
NEXT_PUBLIC_ADMIN_URL=https://<CLIENT_DOMAIN>/admin
```

Save and retry the latest Production deployment.

## 13. Final test

```text
[ ] https://<CLIENT_DOMAIN> works
[ ] https://<CLIENT_DOMAIN>/admin works
[ ] Client credentials work
[ ] Incorrect password is rejected
[ ] Admin save creates a commit on main
[ ] Cloudflare deployment succeeds
[ ] Saved content appears publicly
[ ] History restore works
[ ] Mobile and desktop layouts work
[ ] Phone, email, WhatsApp, map and contact form work
[ ] .env and secret values are absent from GitHub
```

Send the client:

```text
Website: https://<CLIENT_DOMAIN>
Admin: https://<CLIENT_DOMAIN>/admin
Username: <CLIENT_ADMIN_USERNAME>
Password: <SEND_SEPARATELY>
```
