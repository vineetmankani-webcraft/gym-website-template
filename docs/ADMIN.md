# Website admin

The website is still a Next.js static export. `/admin` calls Cloudflare Pages Functions at `/api/admin/*`; these verify a fixed account, issue a cookie, and publish content to GitHub. Secrets never belong in `NEXT_PUBLIC_*` variables. Vercel only serves the public site and a link to the Cloudflare admin.

## Local setup

Use Node 22. Install with `npm ci`. Copy `.env.example` to `.env`, run `npm run admin:password` and put the output in the quoted `ADMIN_PASSWORD_HASH` value. The password prompt is hidden. No default password is supplied.

Run `npm run db:local`, `npm run build`, then `npm run dev:admin`. Open http://localhost:8788/admin. Wrangler loads `.env` for Functions. `npm run dev` is the frontend development server only: it cannot serve the admin API. Rebuild after frontend changes when testing through Wrangler. Use a GitHub branch such as `admin-preview/local` created from the completed feature branch, never `main` for local testing.

Local sessions use an HttpOnly cookie without Secure on localhost only. Production and preview use HTTPS and a host-only Secure cookie. Sessions expire after eight hours. Database outages or missing configuration deny access.

## Cloudflare configuration

1. Create two D1 databases: `gym-admin-production` and `gym-admin-preview`. Replace the placeholder database IDs in `wrangler.jsonc` with their actual IDs. These identifiers are not secrets. Keep the two databases separate.
2. Apply `migrations/0001_admin.sql` using `wrangler d1 migrations apply ADMIN_DB --remote` for production and with `--env preview` for preview. Local testing uses `--local`.
3. Configure Pages Git integration, build command `npm run build`, output `out`, and production branch `main`. Include data and media paths in build watch rules. Allow preview builds for `admin-preview/*` branches.
4. Add encrypted secrets separately in production and preview: `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `GITHUB_APP_ID`, `GITHUB_INSTALLATION_ID`, `GITHUB_PRIVATE_KEY`, and `CLOUDFLARE_API_TOKEN`. Configure nonsecret runtime values `ADMIN_ENV`, `ADMIN_ORIGIN`, `CONTENT_BRANCH`, `GITHUB_REPOSITORY`, `CLOUDFLARE_ACCOUNT_ID`, and `CLOUDFLARE_PROJECT_NAME`.
5. Production uses `ADMIN_ENV=production`, `CONTENT_BRANCH=main`, and `ADMIN_ORIGIN=https://<canonical-site-host>` (no trailing slash or path). Preview uses `ADMIN_ENV=preview`, an isolated `admin-preview/<name>` branch, and that branch's stable preview origin. Pages supplies `CF_PAGES_BRANCH`; production writes require it to be `main`. Do not override it to bypass isolation.
6. Use a stable branch alias/custom preview hostname. The origin check deliberately denies other aliases. Cloudflare secrets are required at runtime; GitHub Secrets alone cannot supply them. If automation provisions them, pass GitHub Secrets to Cloudflare's secret configuration, never to the static frontend build.
7. Configure `NEXT_PUBLIC_SITE_URL` to the public site's absolute URL for sharing metadata, and `NEXT_PUBLIC_ADMIN_URL` to the Cloudflare `/admin` URL in both hosts' build environments. Vercel's built-in `VERCEL=1` selects the redirect-link page.

The password KDF uses maintained `@noble/hashes` PBKDF2-SHA256 with 600,000 iterations and a random salt. Budget sufficient Workers CPU for this deliberately expensive operation (configure a paid Workers plan where needed); measure login in the real preview environment before rollout. Never lower the work factor merely to fit a free CPU allowance.

## GitHub App and permissions

Create a GitHub App, with repository Contents read/write and Metadata read, installed only on this repository. No user OAuth or webhook is required. Generate its private key and convert it locally to unencrypted PKCS8 (`openssl pkcs8 -topk8 -nocrypt -in app-key.pem -out app-key-pkcs8.pem`); put the resulting PEM in the encrypted `GITHUB_PRIVATE_KEY` secret. Do not commit either file. The API exchanges signed short-lived JWTs for repository-scoped installation tokens. Prefer a separate preview installation/repository when stronger infrastructure isolation is required.

Review repository branch rules. Human code changes still require PR review. Direct admin publication needs a publishing-App exception; GitHub branch bypass itself is not path-scoped, so the server's strict content/media path allowlist is essential. Grant no unnecessary workflow/admin permissions. Do not broadly disable branch protection.

For deployment tracking use a Cloudflare API token with Pages read access on the relevant account. Without it, saves still work but the admin shows status as unknown, never falsely live.

## Editing and recovery

Every explicit Save changes commits all pending edits and starts a build. The previous deployed site stays available until the build succeeds. An idle form is not a saved/shared draft. Closing the page loses unsaved changes; warnings appear before navigation. Uploaded but unsaved assets expire after eight hours, and unreferenced Git blobs are never added to the branch.

If a save response is interrupted, keep the page open and choose Retry save. The same operation ID reconciles the candidate commit. Do not generate a new save manually: the first may already have published. Concurrent edits produce a conflict; review/copy needed edits before reloading. Application-level session expiry retains in-memory edits so you can sign in again.

History restores only managed content and media into a new commit. It does not roll back code. Revisions predating the admin schema cannot be restored through the UI. Restore removes current managed assets absent from the selected revision, and restores the older files atomically. Repository history retains removed photographs: use Git history removal separately if actual erasure is needed.

Media supports JPEG/PNG/WebP up to 8 MiB and MP4/WebM up to 20 MiB. Optional browser compression scales photographs down to 2400px. Uploaded SVGs/HTML are rejected; existing repository SVG branding is trusted. Use a supported raster image for a replacement favicon. Asset replacement updates all references, and deletion is blocked while references remain. Large video hosting/transcoding is not included.

On build failure, inspect Cloudflare build logs and correct the content or restore a known-good content revision. For an application deployment failure use Cloudflare's deployment rollback and revert the corresponding code change through a reviewed PR. Stop admin edits during an emergency application rollback until repository and deployed code agree.

To rotate the admin password, generate a new hash, update the Cloudflare secret, and redeploy. Sessions include a credential-version digest and are rejected by deployments using the new credential. Revoke/disable older preview deployments if they still retain old secrets. To revoke every session immediately, delete rows from that environment's `sessions` table. Rotate GitHub App keys and Cloudflare API tokens in encrypted settings, redeploy, then revoke the old credentials.

Operation records are retained for retry reconciliation; do not purge them during a publication incident. Expired sessions, login counters and staged uploads are cleaned during successful login. Monitor Function errors, deployment failures, D1 size and Git repository growth; each save consumes a Pages build.

## Release gate

Run `npm test`, `npm run build`, `npm run test:browser`, and `npx wrangler pages functions build --outdir .wrangler/functions-check`. Browser tests use a mocked admin API to exercise UI behavior; backend tests use local D1 and mocked GitHub responses. Neither proves real provider credentials or branch rules.

Before merge, run the live preview walkthrough using isolated bindings: sign in, change a phone number, replace a photo, add a trainer, hide a section, save, wait for the matching deployment, inspect it in another browser, restore the prior revision, then sign out. Verify a preview save cannot modify main. Review the feature PR only after these checks pass. After merge, repeat a small publication/restore in production. Never merge solely because local checks pass.
