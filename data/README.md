# Editing website content

- Prefer `/admin` for editing. See `docs/ADMIN.md` for setup and publication behavior.
- Edit `gym.json` for gym details, social/map links, trial message, and copyright. WhatsApp destinations are derived from the contact number and message.
- `formatted` and `footerLines` are optional display overrides; leave them empty to derive them from the structured address. Map URLs remain explicit.
- Edit `content.json` for all other website copy: navigation, section headings and paragraphs, programs, gallery captions and image paths, trainers, testimonials, contact-form labels, footer labels, accessibility text, and page metadata (including the browser theme color).
- Headline arrays contain the two displayed lines. The hero headline uses `first`, `accent`, and `last` to keep the accent styling.
- Service `icon` values can be `strength`, `cardio`, `classes`, `personal`, `zumba`, or `recovery`.
- Keep navigation `href` values in sync with the corresponding section `id` values. Media paths point to files under `public/`.
- `sections` controls order and visibility. Stable item IDs must remain unique. `media.json` records managed asset paths, types and exact byte sizes; update it when manually replacing files. New image uploads support JPEG, PNG and WebP.
- Run `npm run validate:content` after manual edits. Runtime schemas in `lib/content-schema.ts` are shared by builds, forms and the publishing API.
- Replace `contact.form.action` with your real form endpoint before relying on form submissions; the current value is a placeholder retained from the existing site.
