import { describe, expect, it } from 'vitest'
import { displayData, mediaUsage, snapshotSchema } from '../lib/content-schema'
import content from '../data/content.json'
import gym from '../data/gym.json'
import media from '../data/media.json'
import { identifyMedia } from '../lib/admin/media'

export const fixture = () => snapshotSchema.parse(structuredClone({ content, gym, media }))
describe('content contract', () => {
  it('preserves existing content and derives consistent WhatsApp destinations', () => {
    const s = fixture(); s.gym.gym.contact.whatsapp = '+919999999999'
    const data = displayData(s)
    expect(data.gym.social.whatsapp).toBe('https://wa.me/919999999999')
    expect(data.gym.bookTrial.whatsappLink).toContain('9999999999?text=')
  })
  it('removes hidden sections from navigation and derives address defaults', () => {
    const s = fixture(); s.content.sections.find(x => x.key === 'trainers')!.visible = false
    s.gym.gym.address.formatted = ''; s.gym.gym.address.footerLines = []
    const d = displayData(s)
    expect(d.navigation.some(x => x.href === '#trainers')).toBe(false)
    expect(d.gym.address.formatted).toContain(s.gym.gym.address.street)
    expect(d.gym.address.footerLines.length).toBe(2)
  })
  it('rejects XSS URLs, HTML, duplicate anchors, invalid icons and unknown fields', () => {
    const changes = [
      (s: ReturnType<typeof fixture>) => { s.content.navigation.links[0].href = 'javascript:alert(1)' },
      (s: ReturnType<typeof fixture>) => { s.content.about.paragraphs[0] = '<script>alert(1)</script>' },
      (s: ReturnType<typeof fixture>) => { s.content.hero.id = s.content.about.id },
      (s: ReturnType<typeof fixture>) => { (s.content.services.items[0] as { icon: string }).icon = 'unknown' },
      (s: ReturnType<typeof fixture>) => { Object.assign(s, { arbitraryPath: '../.github/workflows/ci.yml' }) },
    ]
    for (const change of changes) { const s = fixture(); change(s); expect(snapshotSchema.safeParse(s).success).toBe(false) }
  })
  it('blocks deletion of referenced assets and wrong media kinds', () => {
    const s = fixture(), path = s.content.about.image.src
    expect(mediaUsage(s, path).length).toBeGreaterThan(0)
    s.media = s.media.filter(m => m.path !== path)
    expect(snapshotSchema.safeParse(s).success).toBe(false)
    const other = fixture(); other.content.hero.video = other.content.about.image.src
    expect(snapshotSchema.safeParse(other).success).toBe(false)
  })
  it('allows empty collections, reordered sections and new stable IDs', () => {
    const s = fixture(); s.content.gallery.images = []; s.content.trainers.people = []; s.content.testimonials.items = []; s.content.services.items = []
    s.content.sections.reverse()
    expect(snapshotSchema.safeParse(s).success).toBe(true)
  })
})
describe('uploads', () => {
  it('detects formats using bytes instead of client MIME', () => {
    expect(identifyMedia(Uint8Array.from([255,216,255,0])).type).toBe('image/jpeg')
    expect(identifyMedia(Uint8Array.from([137,80,78,71,13,10,26,10])).type).toBe('image/png')
    expect(identifyMedia(new TextEncoder().encode('RIFFxxxxWEBPxxxx')).type).toBe('image/webp')
    expect(identifyMedia(new TextEncoder().encode('xxxxftypisomxxxx')).type).toBe('video/mp4')
  })
  it('rejects SVG/HTML, unsupported bytes and oversized images', () => {
    for (const value of ['<svg onload="alert(1)">', '<html>hello</html>', 'not a video']) expect(() => identifyMedia(new TextEncoder().encode(value))).toThrow()
    const huge = new Uint8Array(8 * 1024 * 1024 + 1); huge.set([255,216,255]); expect(() => identifyMedia(huge)).toThrow('8 MiB')
  })
})
