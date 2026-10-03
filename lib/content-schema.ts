import { z } from 'zod'
// Cloudflare Workers disallow runtime code generation; use Zod's interpreter.
z.config({ jitless: true })

const text = z.string().max(10000).refine(v => !/<\/?[a-z][^>]*>/i.test(v), 'Use plain text, not HTML')
const required = text.refine(v => v.trim().length > 0, 'Required')
const id = z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/)
const https = z.string().url().refine(v => v.startsWith('https://'), 'Use an HTTPS URL')
const link = z.union([https, z.string().regex(/^#[a-zA-Z][\w-]*$/)])
const mediaPath = z.string().regex(/^\/(?:media\/[a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp|mp4|webm)|(?:icon(?:-light-32x32|-dark-32x32)?|apple-icon)\.(?:svg|png))$/)
const optionalMedia = z.union([mediaPath, z.literal('')])
const position = z.enum(['center', 'top', 'bottom', 'left', 'right'])
const image = z.object({ src: mediaPath, alt: required, position }).strict()
const action = z.object({ label: required, href: link }).strict()
const headline = z.tuple([required, required])
const list = <T extends z.ZodType>(item: T) => z.array(item).max(100)
const heading = { eyebrow: text, headline }
export const sectionNames = ['hero', 'marquee', 'about', 'services', 'gallery', 'trainers', 'testimonials', 'contact'] as const
export const contentSchema = z.object({
  site: z.object({ language: z.string().regex(/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/), title: required, description: required, generator: text, themeColor: z.string().regex(/^#[a-fA-F0-9]{6}$/), sharingImage: optionalMedia, logo: optionalMedia, favicon: mediaPath }).strict(),
  sections: z.array(z.object({ key: z.enum(sectionNames), visible: z.boolean() }).strict()).length(8).refine(v => new Set(v.map(x => x.key)).size === 8, 'Each section must appear once'),
  navigation: z.object({ mainId: id, links: list(action.extend({ id })), skipLabel: required, homeLabelSuffix: text, desktopLabel: required, mobileLabel: required, openLabel: required, closeLabel: required, directionsLabel: text, reachOut: action }).strict(),
  hero: z.object({ id, video: optionalMedia, poster: optionalMedia, headline: z.object({ first: required, accent: required, last: required }).strict(), primaryAction: z.object({ label: required }).strict(), secondaryAction: action }).strict(),
  marquee: z.object({ items: list(z.object({ id, text: required }).strict()), separator: text }).strict(),
  about: z.object({ id, image, imageCaption: text, ...heading, paragraphs: list(required), action }).strict(),
  services: z.object({ id, ...heading, items: list(z.object({ id, icon: z.enum(['strength', 'cardio', 'classes', 'personal', 'zumba', 'recovery']), title: required, description: text }).strict()) }).strict(),
  gallery: z.object({ id, ...heading, hint: text, imageCounterSuffix: text, images: list(image.extend({ id })) }).strict(),
  trainers: z.object({ id, ...heading, scrollLeftLabel: required, scrollRightLabel: required, trackLabel: required, portraitAltTemplate: text, people: list(z.object({ id, name: required, specialty: text, src: mediaPath, alt: required, position }).strict()) }).strict(),
  testimonials: z.object({ id, ...heading, attributionPrefix: text, items: list(z.object({ id, quote: required, name: required }).strict()) }).strict(),
  contact: z.object({ id, ...heading, intro: text, options: z.object({ whatsapp: required, phone: required, email: required, visit: required, directions: required, quickChat: required, scan: required }).strict(), form: z.object({ title: required, action: https, fields: z.object({ name: z.object({ label: required, placeholder: text }).strict(), phone: z.object({ label: required, placeholder: text }).strict(), message: z.object({ label: required, placeholder: text }).strict() }).strict(), submitLabel: required, responseNote: text }).strict() }).strict(),
  footer: z.object({ quickLinksHeading: required, navigationLabel: required, findUsHeading: required, directionsLabel: required, mapTitleTemplate: text, socialLabels: z.object({ instagram: required, youtube: required, whatsapp: required }).strict() }).strict(),
  whatsappFloat: z.object({ label: required, text }).strict(),
}).strict()
export const gymSchema = z.object({ gym: z.object({
  name: required, tagline: text, location: required,
  address: z.object({ street: required, area: text, city: required, postcode: required, formatted: text, footerLines: list(text) }).strict(),
  contact: z.object({ whatsapp: z.string().regex(/^\+?[1-9]\d{7,14}$/), phone: z.string().regex(/^\+?[1-9][\d ()-]{7,24}$/), email: z.string().email() }).strict(),
  social: z.object({ instagram: https, youtube: https }).strict(),
  maps: z.object({ directionsLink: https, googleMapsShareLink: https, embedCode: https.refine(v => URL.canParse(v) && ['www.google.com', 'maps.google.com'].includes(new URL(v).hostname), 'Use a Google Maps embed URL') }).strict(),
  bookTrial: z.object({ message: required }).strict(), copyright: text,
}).strict() }).strict()
export const mediaSchema = list(z.object({ id, path: mediaPath, name: required, type: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'video/mp4', 'video/webm']), size: z.number().int().nonnegative().max(20 * 1024 * 1024) }).strict()).max(500)
export const snapshotSchema = z.object({ content: contentSchema, gym: gymSchema, media: mediaSchema }).strict().superRefine((value, ctx) => {
  const fail = (message: string, path: (string | number)[] = []) => ctx.addIssue({ code: 'custom', message, path })
  const paths = value.media.map(m => m.path)
  if (new Set(paths).size !== paths.length) fail('Media paths must be unique', ['media'])
  const ids = [value.content.navigation.mainId, ...sectionNames.filter(k => k !== 'marquee').map(k => (value.content[k] as { id: string }).id)]
  if (new Set(ids).size !== ids.length) fail('Section anchors must be unique', ['content'])
  const walk = (v: unknown, path: (string | number)[] = []) => {
    if (typeof v === 'string') {
      if (v.startsWith('/media/') || /^\/(?:icon|apple-icon)/.test(v)) {
        if (!paths.includes(v)) fail('Select an existing media asset', path)
      }
      if (path.at(-1) === 'href' && v.startsWith('#') && !ids.includes(v.slice(1))) fail('Choose an existing section anchor', path)
    } else if (Array.isArray(v)) {
      const itemIds = v.filter(x => x && typeof x === 'object' && 'id' in x).map(x => x.id)
      if (new Set(itemIds).size !== itemIds.length) fail('Item IDs must be unique', path)
      v.forEach((x, i) => walk(x, [...path, i]))
    } else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => walk(x, [...path, k]))
  }
  walk(value.content, ['content']); walk(value.gym, ['gym'])
  const byPath = new Map(value.media.map(m => [m.path, m]))
  const checkKind = (path: string, kind: string) => { if (path && !byPath.get(path)?.type.startsWith(kind)) fail(`Expected ${kind} asset: ${path}`) }
  checkKind(value.content.hero.video, 'video/'); checkKind(value.content.hero.poster, 'image/')
  for (const p of [value.content.site.logo, value.content.site.favicon, value.content.site.sharingImage, value.content.about.image.src, ...value.content.gallery.images.map(x => x.src), ...value.content.trainers.people.map(x => x.src)]) checkKind(p, 'image/')
})
export type Content = z.infer<typeof contentSchema>
export type GymData = z.infer<typeof gymSchema>
export type Media = z.infer<typeof mediaSchema>[number]
export type Snapshot = z.infer<typeof snapshotSchema>
export function mediaUsage(snapshot: Snapshot, path: string): string[] {
  const found: string[] = []
  const visit = (v: unknown, key: string) => { if (v === path) found.push(key); else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => visit(x, `${key}.${k}`)) }
  visit(snapshot.content, 'content'); visit(snapshot.gym, 'gym')
  return found
}
export function displayData(snapshot: Snapshot) {
  const gym = structuredClone(snapshot.gym.gym)
  const number = gym.contact.whatsapp.replace(/\D/g, '')
  const address = gym.address
  address.formatted ||= [address.street, address.area, `${address.city} ${address.postcode}`].filter(Boolean).join(', ')
  if (!address.footerLines.length) address.footerLines = [address.street, [address.area, `${address.city} ${address.postcode}`].filter(Boolean).join(', ')]
  const content = snapshot.content
  const hidden = new Set(content.sections.filter(s => !s.visible && s.key !== 'marquee').map(s => (content[s.key] as { id: string }).id))
  return { content, gym: { ...gym, social: { ...gym.social, whatsapp: `https://wa.me/${number}` }, bookTrial: { ...gym.bookTrial, whatsappLink: `https://wa.me/${number}?text=${encodeURIComponent(gym.bookTrial.message)}` } }, navigation: content.navigation.links.filter(l => !hidden.has(l.href.slice(1))) }
}
