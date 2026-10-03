# gym-website-trial

## Website admin

The `/admin` portal manages website content and media through Cloudflare Pages Functions. Use the [new client setup runbook](docs/CLIENT_SETUP.md) for every client launch. Admin implementation notes and the original template setup are documented in [docs/ADMIN.md](docs/ADMIN.md).

Use npm with `package-lock.json`: `npm ci`, `npm test`, and `npm run build`. Start the complete local website and local-writing admin with `npm run dev:admin`; no build is required first.

This is a [Next.js](https://nextjs.org) project bootstrapped with [v0](https://v0.app).

## Built with v0

This repository is linked to a [v0](https://v0.app) project. You can continue developing by visiting the link below -- start new chats to make changes, and v0 will push commits directly to this repo. Every merge to `main` will automatically deploy.

[Continue working on v0 →](https://v0.app/chat/projects/prj_6jF5XwWV41VR35mNyy1vWPkL1JlR)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [v0 Documentation](https://v0.app/docs) - learn about v0 and how to use it.
