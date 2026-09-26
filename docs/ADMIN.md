# Website admin

The public website is at `/` and the editor is at `/admin`. The site remains a static Next.js export. A small Cloudflare Pages Function checks one fixed username and password, then commits saved content and media to GitHub. Cloudflare's normal Git integration rebuilds the website after each save.

There is no database, user system, GitHub App, or Cloudflare API token.

## Required settings

Create a fine-grained GitHub personal access token that can access only this repository and has **Contents: Read and write** permission. Add these four server-side variables in **Cloudflare Pages → Settings → Variables and Secrets**:

```text
ADMIN_USERNAME=admin
ADMIN_PASSWORD=choose-a-password
GITHUB_REPOSITORY=owner/repository
GITHUB_TOKEN=github_pat_...
```

Mark `ADMIN_PASSWORD` and `GITHUB_TOKEN` as encrypted secrets. Do not prefix any of these with `NEXT_PUBLIC_`. Cloudflare automatically supplies `CF_PAGES_BRANCH`, so a deployed branch edits its own content. Production on `main` edits `main`.

Cloudflare Pages should use:

- Build command: `npm run build`
- Output directory: `out`
- Production branch: `main`

The GitHub token must be allowed to push to the chosen branch. If branch protection blocks it, either allow that token to push or use a separate content branch and set `CONTENT_BRANCH` explicitly.

## Local use

Copy `.env.example` to `.env` and fill in the same four values. Set `CONTENT_BRANCH` to a test branch so local saves do not change production.

```bash
npm ci
npm run build
npm run dev:admin
```

Open `http://localhost:8788/admin`. `npm run dev` serves only the static frontend and cannot run the admin API.

## How it works

Signing in creates an HttpOnly cookie valid for eight hours. The cookie is signed with `ADMIN_PASSWORD`; changing the username or password invalidates existing cookies. Signing out clears the cookie in that browser.

Uploads are sent directly to GitHub as temporary Git blobs. The browser receives a short-lived signed reference, so no upload database is needed. **Save changes** creates one Git commit containing the JSON and media changes. GitHub rejects a save if the branch changed after the editor loaded, preventing accidental overwrites. History restore creates a new commit.

Cloudflare starts rebuilding after the commit reaches GitHub. The admin confirms that the GitHub save succeeded, but it does not poll Cloudflare for build status. Check the Pages deployment screen if a change does not appear after the usual build time.

This deliberately small setup has no shared drafts, multiple administrators, server-side logout list, login throttling database, or deployment tracking. Use a strong password, keep the admin URL private, and optionally add a Cloudflare WAF rate-limit rule for `/api/admin/login` if the site attracts unwanted login traffic.

## Checks

Before merging the feature branch, run:

```bash
npm test
npm run build
npm run test:browser
npx wrangler pages functions build --outdir .wrangler/functions-check
```

Then test the preview deployment: sign in, change a detail, upload or replace a photo, save, wait for the Pages rebuild, verify the public site, restore the earlier revision, and sign out.
