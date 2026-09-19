'use client'

import { motion, useReducedMotion, useScroll } from 'framer-motion'
import { ArrowUpRight, MapPin, Phone, MessageCircle, Dumbbell, HeartPulse, Users, Sparkles, Zap, ShieldCheck, ChevronRight, ChevronLeft, Mail, Menu, X } from 'lucide-react'
import QRCode from 'qrcode.react'
import type { LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import content from '@/data/content.json'
import gymData from '@/data/gym.json'

const gym = gymData.gym
const navigation = content.navigation.links

function Reveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <motion.div className={className} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: .6 }}>{children}</motion.div>
}

function ArtReveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const reducedMotion = useReducedMotion()
  return <motion.div className={className} initial={false} whileInView={reducedMotion ? { opacity: 1, y: 0 } : { opacity: [0.65, 1], y: [12, 0] }} viewport={{ once: true, amount: 0.1 }} transition={{ duration: .45 }}>{children}</motion.div>
}

const mapsLink = gym.maps.directionsLink
const whatsappLink = gym.social.whatsapp

function IconWhatsapp({ size = 26 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Zm0 18.2a8.1 8.1 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.2-.7.8-.8 1-.2.2-.3.2-.5.1-.2-.1-1-.4-2-1.2-.7-.6-1.2-1.4-1.4-1.6-.1-.2 0-.4.1-.5l.4-.5c.1-.2.2-.3.2-.5.1-.2 0-.4 0-.5-.1-.1-.6-1.5-.8-2-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.2-.9.9-.9 2.2s.9 2.5 1.1 2.7c.1.2 1.9 2.9 4.6 4 .6.3 1.1.4 1.5.6.6.2 1.2.2 1.6.1.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" /></svg>
}

export function Nav() {
  const { scrollYProgress } = useScroll()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [active, setActive] = useState('')
  const [hovered, setHovered] = useState<string | null>(null)
  const reducedMotion = useReducedMotion()
  const menuButton = useRef<HTMLButtonElement>(null)
  const headerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const update = () => {
      setScrolled(window.scrollY > 32)
      let current = ''
      for (const link of navigation) {
        const section = document.getElementById(link.href.slice(1))
        if (section && section.getBoundingClientRect().top <= 160) current = link.href
      }
      setActive(current)
    }
    let frame = 0
    const onScroll = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame) }
  }, [])

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); menuButton.current?.focus() }
    }
    const desktop = window.matchMedia('(min-width: 1280px)')
    const onResize = () => { if (desktop.matches) setOpen(false) }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', closeOutside)
    desktop.addEventListener('change', onResize)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', closeOutside)
      desktop.removeEventListener('change', onResize)
    }
  }, [open])

  return <header ref={headerRef} className={`site-header ${scrolled ? 'is-scrolled' : ''}`}>
    <motion.div className="reading-progress" style={{ scaleX: scrollYProgress }} aria-hidden="true" />
    <a href={`#${content.navigation.mainId}`} className="skip-link">{content.navigation.skipLabel}</a>
    <div className="header-inner shell">
      <a href={`#${content.hero.id}`} className="wordmark" aria-label={`${gym.name}, ${content.navigation.homeLabelSuffix}`} onClick={() => setOpen(false)}><Dumbbell aria-hidden="true" /><span>{gym.name}</span></a>
      <nav className="desktop-nav" aria-label={content.navigation.desktopLabel} onMouseLeave={() => setHovered(null)}>
        {navigation.map(link => <a key={link.href} href={link.href} aria-current={active === link.href ? 'location' : undefined} onMouseEnter={() => setHovered(link.href)} onFocus={() => setHovered(link.href)} onBlur={() => setHovered(null)}>
          {(hovered ?? active) === link.href && <motion.span className="nav-indicator" layoutId="navigation-indicator" transition={{ duration: reducedMotion ? 0 : .2, ease: 'easeOut' }} />}
          <span>{link.label}</span>
        </a>)}
      </nav>
      <div className="header-actions"><a className="nav-location" href={mapsLink} target="_blank" rel="noopener noreferrer" aria-label={`${content.navigation.directionsLabel} ${gym.location}`}><span>{gym.location}</span><MapPin size={20} aria-hidden="true" /></a><a className="button button-small" href={content.navigation.reachOut.href}>{content.navigation.reachOut.label}<ArrowUpRight size={18} aria-hidden="true" /></a><button ref={menuButton} type="button" className="menu-toggle" aria-label={open ? content.navigation.closeLabel : content.navigation.openLabel} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button></div>
    </div>
    <nav id="mobile-navigation" className="mobile-nav" aria-label={content.navigation.mobileLabel} hidden={!open} onBlur={event => { if (!headerRef.current?.contains(event.relatedTarget as Node)) setOpen(false) }}>
      {navigation.map(link => <a key={link.href} href={link.href} aria-current={active === link.href ? 'location' : undefined} onClick={() => setOpen(false)}>{link.label}<ChevronRight size={20} aria-hidden="true" /></a>)}
      <a className="mobile-location" href={mapsLink} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}><span>{gym.location}</span><MapPin size={20} aria-hidden="true" /></a>
    </nav>
  </header>
}

export function Hero() {
  return <section id={content.hero.id} className="relative flex min-h-screen items-end overflow-hidden">
    <video className="hero-video absolute inset-0 h-full w-full object-cover object-center opacity-60" autoPlay muted loop playsInline preload="metadata" aria-hidden="true">
      <source src={content.hero.video} type="video/mp4" />
    </video>
    <div className="absolute inset-0 bg-linear-to-t from-background via-background/70 to-background/20" />
    <div className="relative mx-auto w-full max-w-7xl px-5 pb-20 pt-36 lg:px-8 lg:pb-28">
      <Reveal>
        <h1 className="max-w-4xl font-heading text-[clamp(4.5rem,13vw,10.5rem)] leading-[.83] tracking-[.015em] text-foreground">{content.hero.headline.first}<br /><span className="text-primary">{content.hero.headline.accent}</span> {content.hero.headline.last}</h1>
        <p className="single-line-tagline mt-8 text-base leading-7 text-muted-foreground" tabIndex={0}>{gym.tagline}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href={gym.bookTrial.whatsappLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-primary px-6 py-4 text-sm font-black uppercase tracking-wider text-primary-foreground transition-transform hover:-translate-y-1">{content.hero.primaryAction.label}<ArrowUpRight size={17} /></a>
          <a href={content.hero.secondaryAction.href} className="inline-flex items-center gap-2 border border-foreground/40 px-6 py-4 text-sm font-black uppercase tracking-wider text-foreground hover:border-primary hover:text-primary">{content.hero.secondaryAction.label}</a>
        </div>
      </Reveal>
    </div>
    <div className="absolute bottom-0 right-0 hidden h-20 w-2/5 skew-x-[-25deg] translate-x-1/4 bg-primary lg:block" />
  </section>
}

export function Marquee() {
  const items = [...content.marquee.items, ...content.marquee.items, ...content.marquee.items]
  return <div className="overflow-hidden border-y border-border bg-surface py-3" aria-label={content.marquee.items.join(', ')}><div className="flex w-max animate-marquee gap-10 whitespace-nowrap" aria-hidden="true">{items.map((item, index) => <span key={index} className="flex items-center gap-10 font-mono text-xs font-bold uppercase tracking-[.3em] text-muted-foreground">{item}<span className="text-primary">{content.marquee.separator}</span></span>)}</div></div>
}

export function About() {
  return <section id={content.about.id} className="about-section section-space"><div className="shell about-layout">
    <div className="about-photo"><img loading="lazy" decoding="async" src={content.about.image.src} alt={content.about.image.alt} /><p className="about-caption">{content.about.imageCaption}</p></div>
    <div className="about-copy"><p className="section-label">{content.about.eyebrow}</p><h2 className="section-title">{content.about.headline[0]}<br />{content.about.headline[1]}</h2>{content.about.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}<a href={content.about.action.href} className="text-link">{content.about.action.label}<ChevronRight size={18} aria-hidden="true" /></a></div>
  </div></section>
}

const serviceIcons: Record<string, LucideIcon> = { strength: Dumbbell, cardio: HeartPulse, classes: Users, personal: ShieldCheck, zumba: Zap, recovery: Sparkles }
export function Services() { return <section id={content.services.id} className="py-24 lg:py-32"><div className="mx-auto max-w-7xl px-5 lg:px-8"><Reveal><p className="eyebrow">{content.services.eyebrow}</p><h2 className="section-title mt-4">{content.services.headline[0]}<br /><span className="text-primary">{content.services.headline[1]}</span></h2></Reveal><div className="mt-14 grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">{content.services.items.map((service,i) => { const Icon = serviceIcons[service.icon] ?? Dumbbell; return <Reveal key={service.title}><article className="group min-h-60 bg-background p-7 transition-colors hover:bg-surface"><div className="mb-12 flex items-start justify-between"><Icon className="text-primary" size={29} strokeWidth={1.5} /><span className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, '0')}</span></div><h3 className="font-heading text-3xl tracking-wide text-foreground">{service.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{service.description}</p></article></Reveal> })}</div></div></section> }

export function Gallery() { return <section id={content.gallery.id} className="gallery-section bg-surface py-24 lg:py-32"><div className="mx-auto max-w-7xl px-5 lg:px-8"><ArtReveal><div className="flex items-end justify-between"><div><p className="eyebrow">{content.gallery.eyebrow}</p><h2 className="section-title mt-4">{content.gallery.headline[0]}<br /><span className="text-primary">{content.gallery.headline[1]}</span></h2></div><span className="hidden font-mono text-xs uppercase tracking-widest text-muted-foreground sm:block">{content.gallery.hint}</span></div></ArtReveal><div className="gallery-layout">{content.gallery.images.map(({src,alt},i) => <ArtReveal key={src} className={`gallery-frame gallery-frame-${i}`}><img loading="lazy" decoding="async" src={src} alt={alt} /><span className="gallery-number" aria-hidden="true">{String(i + 1).padStart(2, '0')}{content.gallery.imageCounterSuffix}</span></ArtReveal>)}</div></div></section> }

export function Trainers() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()
  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: direction === 'left' ? -300 : 300, behavior: reducedMotion ? 'auto' : 'smooth' })
    }
  }
  return <section id={content.trainers.id} className="trainers-section py-24 lg:py-32"><div className="mx-auto max-w-7xl px-5 lg:px-8"><ArtReveal><div className="flex items-end justify-between"><div><p className="eyebrow">{content.trainers.eyebrow}</p><h2 className="section-title mt-4">{content.trainers.headline[0]}<br /><span className="text-primary">{content.trainers.headline[1]}</span></h2></div><div className="hidden gap-2 lg:flex"><button onClick={() => scroll('left')} className="border border-border p-3 transition-all hover:border-primary hover:bg-primary hover:text-primary-foreground" aria-label={content.trainers.scrollLeftLabel}><ChevronLeft size={20} /></button><button onClick={() => scroll('right')} className="border border-border p-3 transition-all hover:border-primary hover:bg-primary hover:text-primary-foreground" aria-label={content.trainers.scrollRightLabel}><ChevronRight size={20} /></button></div></div></ArtReveal><div className="mt-14 overflow-hidden"><div ref={scrollRef} className="coach-track flex gap-6 overflow-x-auto pb-4 md:gap-8" tabIndex={0} aria-label={content.trainers.trackLabel}>{content.trainers.people.map(({name,specialty,src}) => <ArtReveal key={name} className="shrink-0 w-72"><article><img loading="lazy" decoding="async" className="aspect-4/5 w-full object-cover grayscale transition-all hover:grayscale-0" src={src} alt={content.trainers.portraitAltTemplate.replace('{name}', name).replace('{specialty}', specialty)} /><h3 className="mt-5 font-heading text-2xl tracking-wide">{name}</h3><p className="mt-1 font-mono text-xs font-bold uppercase tracking-widest text-primary">{specialty}</p></article></ArtReveal>)}</div></div></div></section>
}

export function ContactUs() {
  return <section id={content.contact.id} className="contact-section section-space"><div className="shell">
    <div className="contact-heading"><div><p className="section-label">{content.contact.eyebrow}</p><h2 className="section-title">{content.contact.headline[0]}<br />{content.contact.headline[1]}</h2></div><p>{content.contact.intro}</p></div>
    <div className="contact-layout"><div className="contact-options">
      <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="contact-option"><MessageCircle aria-hidden="true" /><div><h3>{content.contact.options.whatsapp}</h3><p>{gym.contact.whatsapp}</p></div><ArrowUpRight aria-hidden="true" /></a>
      <a href={`tel:${gym.contact.phone}`} className="contact-option"><Phone aria-hidden="true" /><div><h3>{content.contact.options.phone}</h3><p>{gym.contact.phone}</p></div><ArrowUpRight aria-hidden="true" /></a>
      <a href={`mailto:${gym.contact.email}`} className="contact-option"><Mail aria-hidden="true" /><div><h3>{content.contact.options.email}</h3><p>{gym.contact.email}</p></div><ArrowUpRight aria-hidden="true" /></a>
      <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="contact-option"><MapPin aria-hidden="true" /><div><h3>{content.contact.options.visit}</h3><p>{content.contact.options.directions}</p></div><ArrowUpRight aria-hidden="true" /></a>
      <div className="contact-qr"><div className="qr-paper"><QRCode value={gym.bookTrial.whatsappLink} size={88} level="H" includeMargin={false} /></div><div><h3>{content.contact.options.quickChat}</h3><p>{content.contact.options.scan}</p></div></div>
    </div><div className="message-panel"><h3>{content.contact.form.title}</h3><form action={content.contact.form.action} method="POST"><div className="form-pair"><div><label htmlFor="name">{content.contact.form.fields.name.label}</label><input type="text" id="name" name="name" autoComplete="name" required placeholder={content.contact.form.fields.name.placeholder} /></div><div><label htmlFor="phone">{content.contact.form.fields.phone.label}</label><input type="tel" id="phone" name="phone" autoComplete="tel" required placeholder={content.contact.form.fields.phone.placeholder} /></div></div><div><label htmlFor="message">{content.contact.form.fields.message.label}</label><textarea id="message" name="message" required rows={5} placeholder={content.contact.form.fields.message.placeholder} /></div><button type="submit" className="button button-light">{content.contact.form.submitLabel}<ArrowUpRight size={18} aria-hidden="true" /></button></form><p>{content.contact.form.responseNote}</p></div></div>
  </div></section>
}

export function Testimonials() {
  return <section className="py-24 lg:py-32"><div className="mx-auto max-w-7xl px-5 lg:px-8">
    <Reveal><p className="eyebrow">{content.testimonials.eyebrow}</p><h2 className="section-title mt-4">{content.testimonials.headline[0]}<br /><span className="text-primary">{content.testimonials.headline[1]}</span></h2></Reveal>
    <div className="mt-14 grid gap-4 md:grid-cols-3">{content.testimonials.items.map(({quote,name}) => <Reveal key={name}><blockquote className="border-l-2 border-primary bg-surface p-7"><p className="text-lg leading-8 text-foreground">{quote}</p><footer className="mt-8 font-mono text-sm font-bold tracking-widest text-primary">{content.testimonials.attributionPrefix}{name}</footer></blockquote></Reveal>)}</div>
  </div></section>
}

export function Footer() {
  return <footer className="site-footer"><div className="shell">
    <div className="footer-top"><a href={`#${content.hero.id}`} className="footer-wordmark">{gym.name}</a><p className="single-line-tagline" tabIndex={0}>{gym.tagline}</p></div>
    <div className="footer-grid">
      <div><h2>{content.footer.quickLinksHeading}</h2><nav aria-label={content.footer.navigationLabel}>{navigation.map(link => <a key={link.href} href={link.href}>{link.label}</a>)}</nav></div>
      <div><h2>{content.footer.findUsHeading}</h2><p>{gym.address.footerLines.map((line, index) => <span key={index}>{line}{index < gym.address.footerLines.length - 1 && <br />}</span>)}</p><a href={gym.maps.googleMapsShareLink} target="_blank" rel="noopener noreferrer" className="text-link">{content.footer.directionsLabel}<ArrowUpRight size={16} aria-hidden="true" /></a><a className="footer-phone" href={`tel:${gym.contact.phone}`}><Phone size={16} aria-hidden="true" />{gym.contact.phone}</a></div>
      <iframe src={gym.maps.embedCode} title={content.footer.mapTitleTemplate.replace('{name}', gym.name).replace('{location}', gym.location)} loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade" />
    </div>
    <div className="footer-bottom"><p>{gym.copyright}</p><div className="social-links">
      <a href={gym.social.instagram} target="_blank" rel="noopener noreferrer" aria-label={content.footer.socialLabels.instagram}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg></a>
      <a href={gym.social.youtube} target="_blank" rel="noopener noreferrer" aria-label={content.footer.socialLabels.youtube}><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M21.58 7.19a2.5 2.5 0 0 0-1.76-1.77C18.26 5 12 5 12 5s-6.26 0-7.82.42a2.5 2.5 0 0 0-1.76 1.77C2 8.75 2 12 2 12s0 3.25.42 4.81a2.5 2.5 0 0 0 1.76 1.77C5.74 19 12 19 12 19s6.26 0 7.82-.42a2.5 2.5 0 0 0 1.76-1.77C22 15.25 22 12 22 12s0-3.25-.42-4.81ZM10 15l5.2-3L10 9v6Z" clipRule="evenodd" /></svg></a>
      <a href={gym.social.whatsapp} target="_blank" rel="noopener noreferrer" aria-label={content.footer.socialLabels.whatsapp}><MessageCircle size={22} /></a>
    </div></div>
  </div></footer>
}

export function WhatsAppFloat() {
  return <a href={whatsappLink} target="_blank" rel="noopener noreferrer" aria-label={content.whatsappFloat.label} className="whatsapp-float"><IconWhatsapp /><span>{content.whatsappFloat.text}</span></a>
}
