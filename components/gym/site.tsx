'use client'
import { Nav, Hero, Marquee, About, Services, Gallery, Trainers, ContactUs, Testimonials, Footer, WhatsAppFloat } from './sections'
import { SiteProvider } from './site-context'
import type { Snapshot } from '@/lib/content-schema'
const sections = { hero: Hero, marquee: Marquee, about: About, services: Services, gallery: Gallery, trainers: Trainers, testimonials: Testimonials, contact: ContactUs }
export function Site({ snapshot }: { snapshot: Snapshot }) {
  return <SiteProvider snapshot={snapshot}><Nav /><main id={snapshot.content.navigation.mainId}>{snapshot.content.sections.filter(s => s.visible).map(s => { const Section = sections[s.key]; return <Section key={s.key} /> })}</main><Footer /><WhatsAppFloat /></SiteProvider>
}
