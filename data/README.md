# Editing website content

- Edit `gym.json` for the gym name, tagline, address, contact details, social and map links, trial link, and copyright.
- The address has separate `formatted` and `footerLines` values, plus `maps.directionsLink`; update all three when the gym moves.
- Edit `content.json` for all other website copy: navigation, section headings and paragraphs, programs, gallery captions and image paths, trainers, testimonials, contact-form labels, footer labels, accessibility text, and page metadata (including the browser theme color).
- Headline arrays contain the two displayed lines. The hero headline uses `first`, `accent`, and `last` to keep the accent styling.
- Service `icon` values can be `strength`, `cardio`, `classes`, `personal`, `zumba`, or `recovery`.
- Keep navigation `href` values in sync with the corresponding section `id` values. Media paths point to files under `public/`.
- Replace `contact.form.action` with your real form endpoint before relying on form submissions; the current value is a placeholder retained from the existing site.
