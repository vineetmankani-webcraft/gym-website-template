# Admin setup guide

The website is served at `https://globalgym.com` and its editor is served by the same Cloudflare Pages project at `https://globalgym.com/admin`.

The editor has one username and password. Saving creates a commit in the website's GitHub repository, and Cloudflare rebuilds the website. There is no database, GitHub App, or separate admin server.

## Part 1: test this template locally

### 1. Create a GitHub token

In GitHub, open **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.

Configure it as follows:

- Token name: `Global Gym website admin`
- Repository access: **Only select repositories**
- Repository: `VineetMankani/gym-website-template`
- Repository permission: **Contents → Read and write**

Generate the token and copy it. GitHub only shows it once.

### 2. Create the local environment file

From the repository root, run:

```powershell
Copy-Item .env.example .env
```

Open `.env` and enter:

```text
ADMIN_USERNAME=admin
ADMIN_PASSWORD=choose-a-password-for-this-gym
GITHUB_REPOSITORY=VineetMankani/gym-website-template
GITHUB_TOKEN=github_pat_your_token
CONTENT_BRANCH=feature/admin-portal
NEXT_PUBLIC_SITE_URL=http://localhost:8788
NEXT_PUBLIC_ADMIN_URL=http://localhost:8788/admin
```

Do not commit `.env`. It is already ignored by Git.

### 3. Push the test branch

The branch must exist on GitHub because the editor writes through the GitHub API.

```powershell
git switch feature/admin-portal
git push -u origin feature/admin-portal
```

### 4. Start the complete local website

```powershell
npm ci
npm run build
npm run dev:admin
```

Open:

```text
http://localhost:8788
http://localhost:8788/admin
```

Use the username and password from `.env`.

`npm run dev` is not sufficient for admin testing because it does not run the Cloudflare Pages Function.

### 5. Test a save

1. Change the phone number.
2. Upload or replace one photograph.
3. Add a trainer.
4. Hide one section.
5. Select **Preview** and check the result.
6. Select **Save changes**.
7. Open GitHub and confirm that `feature/admin-portal` received an `Update website content` commit.
8. Open **History** in the admin and restore the previous revision.
9. Confirm that GitHub received the restore commit.

The local public page does not rebuild automatically after an admin save. The admin commits through GitHub, so your local branch is now behind the remote branch. Stop the local server, synchronize, rebuild, and start it again:

```powershell
git pull --ff-only
npm run build
npm run dev:admin
```

Refresh `http://localhost:8788` and verify the restored website. The Cloudflare preview in Part 2 will perform this rebuild automatically after every save.

## Part 2: create the Cloudflare preview

### 6. Create the Pages project

In Cloudflare, open **Workers & Pages → Create application → Pages → Import an existing Git repository**.

Select `VineetMankani/gym-website-template` and configure:

- Production branch: `main`
- Framework preset: **Next.js (Static HTML Export)**
- Build command: `npm run build`
- Build output directory: `out`
- Root directory: leave empty

Finish the initial deployment.

### 7. Add Preview variables

Open **Workers & Pages → the project → Settings → Variables and Secrets** and select the **Preview** environment.

Add:

```text
ADMIN_USERNAME=admin
ADMIN_PASSWORD=choose-a-preview-password
GITHUB_REPOSITORY=VineetMankani/gym-website-template
GITHUB_TOKEN=github_pat_your_token
```

Set `ADMIN_PASSWORD` and `GITHUB_TOKEN` as encrypted secrets. The other two can be regular variables.

Do not add `CONTENT_BRANCH` in Cloudflare. Cloudflare supplies the deployed branch automatically, so this preview edits `feature/admin-portal`.

Optionally add these regular Preview variables using the preview URL Cloudflare gives you:

```text
NEXT_PUBLIC_SITE_URL=https://preview-url.pages.dev
NEXT_PUBLIC_ADMIN_URL=https://preview-url.pages.dev/admin
```

### 8. Deploy and test the preview

1. Find the `feature/admin-portal` deployment under **Deployments**.
2. Retry it if it was built before the variables were added.
3. Open its URL and add `/admin`.
4. Sign in with the Preview credentials.
5. Make and save a small change.
6. Confirm that the commit went to `feature/admin-portal`, not `main`.
7. Wait for the next preview deployment and inspect the result in a private browser window.

## Part 3: publish at globalgym.com/admin

### 9. Add Production variables

In the same **Variables and Secrets** screen, select **Production** and add this gym's production credentials:

```text
ADMIN_USERNAME=admin
ADMIN_PASSWORD=choose-a-production-password
GITHUB_REPOSITORY=VineetMankani/gym-website-template
GITHUB_TOKEN=github_pat_your_token
NEXT_PUBLIC_SITE_URL=https://globalgym.com
NEXT_PUBLIC_ADMIN_URL=https://globalgym.com/admin
```

Encrypt `ADMIN_PASSWORD` and `GITHUB_TOKEN`.

The GitHub account that owns the token must be allowed to push to `main`. If `main` requires pull requests for every commit, allow that account to bypass the rule or remove that restriction. Otherwise production saves will fail.

### 10. Merge the tested branch

Create a pull request from `feature/admin-portal` to `main`. Review the preview and automated checks, then merge it. Cloudflare will deploy `main` automatically.

Do not test production editing until the production deployment succeeds.

### 11. Connect globalgym.com

First confirm that the production `pages.dev` address and its `/admin` page work.

Then open **Workers & Pages → the project → Custom domains → Set up a domain** and add:

```text
globalgym.com
```

Follow Cloudflare's DNS instructions and wait until the domain shows **Active**. If the domain currently points to Vercel, move it only after the Cloudflare production address works. The domain must reach Cloudflare Pages for `/admin` and `/api/admin/*` to work.

Finally verify:

```text
https://globalgym.com
https://globalgym.com/admin
```

### 12. Test production once

1. Sign in at `https://globalgym.com/admin`.
2. Change a small piece of text.
3. Save it.
4. Confirm that GitHub received the commit on `main`.
5. Check **Cloudflare Pages → Deployments** and wait for the build to succeed.
6. Verify the change in a private browser window.
7. Restore the earlier revision if the change was only a test.

The admin confirms the GitHub save but does not track the Cloudflare build. If a saved change is not visible, check the latest Pages deployment and its build log.

## Repeat this for a new gym/client

For each client, use a separate repository and separate `ADMIN_USERNAME` and `ADMIN_PASSWORD`. The GitHub publishing token is infrastructure rather than the client's login. To minimize setup, one agency-owned fine-grained token may be reused if it has Contents access to every client repository. You can instead issue one token per repository if you later want stronger separation.

1. Create the client's repository from this template.
2. Give the agency GitHub token access to the new repository with **Contents: Read and write**, or create a separate token if preferred.
3. Create its Cloudflare Pages project with build command `npm run build` and output directory `out`.
4. Add that client's `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `GITHUB_REPOSITORY`, and `GITHUB_TOKEN` to Preview and Production.
5. Test the preview branch.
6. Merge to `main`.
7. Add the client's domain to the Pages project.
8. Verify `https://client-domain.com` and `https://client-domain.com/admin`.

Each client's repository, website, username, password, and Cloudflare project remains independent. Only the agency publishing token may be shared to reduce setup.

## Routine maintenance

- To change a password, update `ADMIN_PASSWORD` in Cloudflare and redeploy. Existing login cookies stop working.
- When a GitHub token expires, create a replacement, update `GITHUB_TOKEN`, and redeploy.
- A `401` response means the login is missing or expired.
- A `409` response means the GitHub branch changed after the editor loaded; reload the editor before saving again.
- A GitHub publishing error usually means the token expired, lacks Contents permission, or cannot push to the branch.
- Images can be JPEG, PNG, or WebP up to 8 MiB. Videos can be MP4 or WebM up to 20 MiB.
