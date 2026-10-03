# New client website setup

Use this runbook for every gym website created from `vineetmankani-webcraft/gym-website-template`. Each client receives an independent GitHub repository, Cloudflare Pages project, domain, admin username, and admin password.

The finished website is available at `https://CLIENT_DOMAIN`, and its editor is available at `https://CLIENT_DOMAIN/admin`. Local admin saves write directly to the local checkout. Deployed admin saves commit content to the client's `main` branch, after which Cloudflare rebuilds the website.

## Client worksheet

Decide these values before starting:

```text
CLIENT_NAME=
CLIENT_SLUG=lowercase-name-with-dashes
GITHUB_OWNER=vineetmankani-webcraft
GITHUB_REPOSITORY=vineetmankani-webcraft/CLIENT_SLUG
CLOUDFLARE_PROJECT=CLIENT_SLUG
PAGES_URL=https://CLIENT_SLUG.pages.dev
CLIENT_DOMAIN=https://example.com
ADMIN_USERNAME=
ADMIN_PASSWORD=
```

Use a different `ADMIN_USERNAME` and `ADMIN_PASSWORD` for every client. Store the credentials in your password manager and send them to the client separately from the website link.

## 1. Create the client's GitHub repository

1. Open `https://github.com/vineetmankani-webcraft/gym-website-template`.
2. Select **Use this template → Create a new repository**. GitHub documents this workflow in [Creating a repository from a template](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-repository-from-a-template).
3. Set **Owner** to `vineetmankani-webcraft`.
4. Set the repository name to `CLIENT_SLUG`, for example `global-gym`.
5. Choose Public or Private according to the client agreement.
6. Do not include every branch. The new repository only needs the template's default `main` branch.
7. Select **Create repository**.

Do not create a fork. A repository created from the template has its own history and can be managed independently.

## 2. Clone the new repository

From the parent folder where client projects are stored, run:

```powershell
git clone https://github.com/vineetmankani-webcraft/CLIENT_SLUG.git
cd CLIENT_SLUG
git branch --show-current
```

The branch should be `main`.

Install the dependencies:

```powershell
npm ci
```

## 3. Make the repository client-specific

Change the following before launch:

1. In `wrangler.jsonc`, change `name` from `gym-website-template` to `CLIENT_SLUG`.
2. In `package.json`, change the package `name` to `CLIENT_SLUG`.
3. Update the README title and remove template-only project links that the client should not use.
4. Keep `.env.example` limited to placeholders. Never put a real password or GitHub token in it.

The Cloudflare project name and `wrangler.jsonc` name should use lowercase letters, numbers, and dashes.

## 4. Create the local credentials

Create the ignored local environment file:

```powershell
Copy-Item .env.example .env
```

Enter the local values in `.env`:

```ini
ADMIN_USERNAME=client-admin-name
ADMIN_PASSWORD=client-admin-password
GITHUB_REPOSITORY=vineetmankani-webcraft/CLIENT_SLUG
GITHUB_TOKEN=
CONTENT_BRANCH=main
NEXT_PUBLIC_SITE_URL=http://localhost:8788
NEXT_PUBLIC_ADMIN_URL=http://localhost:8788/admin
```

`GITHUB_TOKEN` is not needed for local editing. Local saves update the checked-out files directly. The `.env` file is ignored by Git and must never be committed.

## 5. Customize and test the client website locally

Start the website and local admin:

```powershell
npm run dev:admin
```

Wait for the first Next.js compilation, then open:

```text
Website: http://localhost:8788
Admin:   http://localhost:8788/admin
```

Sign in using the credentials from `.env`. Use `/admin` to configure:

- Gym name, tagline, address, phone, email, WhatsApp number, social links, maps and copyright.
- Navigation, hero content, headings, paragraphs, services, trainers, testimonials and contact form.
- Gallery images, trainer photographs, logo, favicon, sharing image, hero media and alt text.
- Section order and visibility.
- Page title, description, language and theme color.

Select **Save changes**, refresh the website tab, and verify the result. Local saves modify the files under `data/` and uploaded assets under `public/media/`.

Before stopping local testing, complete this walkthrough:

1. Change the phone number.
2. Replace a gallery photograph.
3. Add a trainer.
4. Hide and show a section.
5. Check the desktop and mobile preview.
6. Restore or manually reverse any temporary test changes.

Stop the server with `Ctrl+C`.

## 6. Validate and commit the client version

Next.js may update its generated development reference file. Restore that generated file before committing:

```powershell
git restore next-env.d.ts
```

Review the files:

```powershell
git status --short
git diff
```

Run the checks:

```powershell
npm test
npm run build
```

Commit and push the client version:

```powershell
git add .
git commit -m "Configure website for CLIENT_NAME"
git push origin main
```

Confirm that `.env` is not listed in the commit.

## 7. Give the publishing token access to the repository

The deployed admin requires a GitHub fine-grained personal access token so it can commit content changes.

To reuse the agency publishing token:

1. Open GitHub **Settings → Developer settings → Personal access tokens → Fine-grained tokens**.
2. Open the agency website-admin token.
3. Under **Repository access**, add the new `CLIENT_SLUG` repository. If the token is configured for all organization repositories, confirm that the new repository is included automatically.
4. Under **Repository permissions**, set **Contents** to **Read and write**.
5. Save the token changes and complete organization approval if GitHub requests it.

You may instead create a separate fine-grained token for the client repository. Keep the token in your password manager. Never place it in committed files.

The admin commits directly to `main`. Do not add a branch rule that blocks this token from pushing, or give the publishing identity the required bypass.

## 8. Create the Cloudflare Pages project

Cloudflare Pages can connect to GitHub and automatically deploy every push to `main`. See [Cloudflare Pages Git integration](https://developers.cloudflare.com/pages/configuration/git-integration/).

1. Open the Cloudflare dashboard.
2. Open **Workers & Pages**.
3. Select **Create application → Pages → Import an existing Git repository**.
4. Choose `vineetmankani-webcraft/CLIENT_SLUG`. If it is missing, update the Cloudflare GitHub App's repository access.
5. Set the project name to `CLIENT_SLUG`.
6. Configure the build:

```text
Production branch: main
Framework preset: Next.js (Static HTML Export)
Build command: pnpm run build
Build output directory: out
Root directory: leave empty
Automatic production deployments: enabled
Build system: Version 3
```

7. Select **Save and Deploy**.
8. Wait for the first deployment to succeed.
9. Record the assigned address, normally `https://CLIENT_SLUG.pages.dev`.

The first deployment can finish before admin credentials are configured. The public website should work, while `/admin` may report that its configuration is missing.

## 9. Add the Cloudflare production variables

Open the Pages project and select **Settings → Variables and secrets**. Make sure the environment selector is set to **Production**.

Add these as **Text** variables:

```ini
ADMIN_USERNAME=client-admin-name
GITHUB_REPOSITORY=vineetmankani-webcraft/CLIENT_SLUG
NEXT_PUBLIC_SITE_URL=https://CLIENT_SLUG.pages.dev
NEXT_PUBLIC_ADMIN_URL=https://CLIENT_SLUG.pages.dev/admin
```

Add these as **Secret** variables:

```ini
ADMIN_PASSWORD=client-admin-password
GITHUB_TOKEN=github_pat_actual_token_value
```

Cloudflare hides secret values after they are saved. Seeing the secret name and “Value encrypted” is correct.

Do not add `CONTENT_BRANCH` to Cloudflare. Pages supplies `CF_PAGES_BRANCH`; for the production deployment it resolves to `main`.

No D1 database, KV binding, R2 bucket, GitHub App or Cloudflare API token is required.

## 10. Redeploy after adding the variables

Environment changes require a new deployment.

Preferred dashboard method:

1. Open **Deployments**.
2. Open the latest Production deployment.
3. Select **Retry deployment**, **Redeploy**, or **⋯ → Retry deployment**, depending on the dashboard wording.
4. Wait for **Success**.

Terminal fallback from a clean client checkout:

```powershell
git commit --allow-empty -m "Redeploy with production environment"
git push origin main
```

The Git integration starts a new production build after the push.

## 11. Verify the Pages address and admin

First open:

```text
https://CLIENT_SLUG.pages.dev/api/admin/session
```

A `401` JSON response asking you to sign in means the Function is running. A `404` means the Function was not deployed. A `503` or configuration error means a required Production variable is missing.

Then open:

```text
https://CLIENT_SLUG.pages.dev
https://CLIENT_SLUG.pages.dev/admin
```

Sign in with the client's Cloudflare `ADMIN_USERNAME` and `ADMIN_PASSWORD`.

Test a deployed save:

1. Change a small piece of text or the phone number.
2. Select **Save changes**.
3. Confirm that GitHub receives an **Update website content** commit on `main`.
4. Open Cloudflare **Deployments** and wait for the automatically triggered deployment to succeed.
5. Open the website in a private browser window and confirm the change.
6. Use **History** to restore the prior revision if the change was only a test.

A deployed save is not instant. GitHub must receive the commit and Cloudflare must rebuild the static site; allow roughly one or two minutes.

## 12. Connect the client's custom domain

Verify the `pages.dev` website and admin before changing the client's DNS.

1. In the Pages project, open **Custom domains**.
2. Select **Set up a domain**.
3. Enter the canonical client domain, such as `example.com`, and follow Cloudflare's activation steps.
4. Add `www.example.com` as another custom domain if the client needs it.

For an apex domain such as `example.com`, Cloudflare requires the domain to be a zone in the same Cloudflare account with its nameservers pointed to Cloudflare. For a subdomain, Cloudflare can provide a CNAME target. Always add the domain through the Pages project's **Custom domains** screen before manually creating a DNS record. See [Cloudflare Pages custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/).

Wait until the domain shows **Active**, then verify:

```text
https://example.com
https://example.com/admin
```

## 13. Change the canonical URLs to the client domain

After the custom domain is active, return to **Settings → Variables and secrets → Production** and change the two Text variables:

```ini
NEXT_PUBLIC_SITE_URL=https://example.com
NEXT_PUBLIC_ADMIN_URL=https://example.com/admin
```

Save, redeploy, and verify both URLs again. These values control canonical site metadata and the admin address used by any secondary hosting deployment.

## 14. Final acceptance checklist

Complete these checks before handing the website to the client:

- The main website and `/admin` load over HTTPS on the client domain.
- Incorrect credentials are rejected and the client credentials work.
- The public page is usable on desktop and mobile.
- Address, phone, email, WhatsApp, map, social links and contact form are correct.
- Logo, favicon, sharing image, gallery and trainer photographs are correct.
- A saved admin change creates a GitHub commit on `main`.
- The commit triggers a successful Cloudflare production deployment.
- The changed content appears in a private browser window.
- History restoration creates another commit and restores the earlier content.
- `.env`, passwords and tokens are absent from GitHub.

Give the client only:

```text
Website: https://example.com
Admin:   https://example.com/admin
Username: client-admin-name
Password: send separately
```

Tell the client that after selecting **Save changes**, the public website normally takes one or two minutes to update.

## 15. Routine operation and troubleshooting

For normal content updates, the client signs into `/admin`, makes changes and selects **Save changes**. You do not need to run local commands.

If a saved update does not appear:

1. Confirm that GitHub received the content commit on `main`.
2. Check Cloudflare **Deployments** for the matching commit.
3. Open **View details → Build log** if the deployment failed.
4. Wait for **Success**, then use a private browser window or hard refresh.

Common errors:

- `401`: the login cookie is missing/expired, or the credentials are wrong.
- `409`: the branch changed after the editor loaded; reload the editor before saving again.
- `502` during save: the GitHub token is invalid, expired, lacks repository access or lacks **Contents: Read and write**.
- `503`: a required Cloudflare Production variable is missing.
- `404` under `/api/admin/`: Pages Functions were not included in the deployment.
- GitHub commit succeeds but the website stays unchanged: wait for the corresponding Cloudflare deployment and inspect its build log.

To rotate a client's password, replace `ADMIN_PASSWORD` under Cloudflare Production secrets and redeploy. To rotate the publishing token, replace `GITHUB_TOKEN` and redeploy.

## Per-client completion record

Keep this record in your internal project tracker, not in the public repository:

```text
[ ] Client repository created from the current template main branch
[ ] Client content and media customized locally
[ ] npm test and npm run build passed
[ ] Initial client content committed and pushed to main
[ ] Publishing token granted Contents: Read and write
[ ] Cloudflare Pages project connected to the client repository
[ ] Production build succeeded
[ ] Four Text variables and two Secrets configured
[ ] Admin login and content save tested on pages.dev
[ ] Custom domain active
[ ] NEXT_PUBLIC URLs changed to the custom domain
[ ] Admin login and content save tested on the custom domain
[ ] Client credentials recorded and delivered separately
```
