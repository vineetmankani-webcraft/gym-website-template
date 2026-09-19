'use client'

import { motion, useReducedMotion, useScroll } from 'framer-motion'
import { ArrowUpRight, MapPin, Phone, MessageCircle, Dumbbell, HeartPulse, Users, Sparkles, Zap, ShieldCheck, ChevronRight, ChevronLeft, Mail, Menu, X } from 'lucide-react'
import QRCode from 'qrcode.react'
import type { LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import gymData from '@/data/gym.json'

const gym = gymData.gym
const navigation = ['About', 'Services', 'Gallery', 'Trainers', 'Contact']

function Reveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <motion.div className={className} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: .6 }}>{children}</motion.div>
}

function ArtReveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const reducedMotion = useReducedMotion()
  return <motion.div className={className} initial={false} whileInView={reducedMotion ? { opacity: 1, y: 0 } : { opacity: [0.65, 1], y: [12, 0] }} viewport={{ once: true, amount: 0.1 }} transition={{ duration: .45 }}>{children}</motion.div>
}

const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(gymData.gym.address.formatted)}`
const whatsappLink = `https://wa.me/${gymData.gym.contact.whatsapp.replace(/\D/g, '')}`

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
      for (const name of navigation) {
        const section = document.getElementById(name.toLowerCase())
        if (section && section.getBoundingClientRect().top <= 160) current = name
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
    <a href="#main" className="skip-link">Skip to content</a>
    <div className="header-inner shell">
      <a href="#top" className="wordmark" aria-label={`${gym.name}, home`} onClick={() => setOpen(false)}><Dumbbell aria-hidden="true" /><span>{gym.name}</span></a>
      <nav className="desktop-nav" aria-label="Main navigation" onMouseLeave={() => setHovered(null)}>
        {navigation.map(name => <a key={name} href={`#${name.toLowerCase()}`} aria-current={active === name ? 'location' : undefined} onMouseEnter={() => setHovered(name)} onFocus={() => setHovered(name)} onBlur={() => setHovered(null)}>
          {(hovered ?? active) === name && <motion.span className="nav-indicator" layoutId="navigation-indicator" transition={{ duration: reducedMotion ? 0 : .2, ease: 'easeOut' }} />}
          <span>{name}</span>
        </a>)}
      </nav>
      <div className="header-actions"><a className="nav-location" href={mapsLink} target="_blank" rel="noopener noreferrer" aria-label={`Get directions to ${gym.location}`}><span>{gym.location}</span><MapPin size={20} aria-hidden="true" /></a><a className="button button-small" href="#contact">Reach Out<ArrowUpRight size={18} aria-hidden="true" /></a><button ref={menuButton} type="button" className="menu-toggle" aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button></div>
    </div>
    <nav id="mobile-navigation" className="mobile-nav" aria-label="Mobile navigation" hidden={!open} onBlur={event => { if (!headerRef.current?.contains(event.relatedTarget as Node)) setOpen(false) }}>
      {navigation.map(name => <a key={name} href={`#${name.toLowerCase()}`} aria-current={active === name ? 'location' : undefined} onClick={() => setOpen(false)}>{name}<ChevronRight size={20} aria-hidden="true" /></a>)}
      <a className="mobile-location" href={mapsLink} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}><span>{gym.location}</span><MapPin size={20} aria-hidden="true" /></a>
    </nav>
  </header>
}

export function Hero() {
  return <section id="top" className="relative flex min-h-screen items-end overflow-hidden">
    <video className="hero-video absolute inset-0 h-full w-full object-cover object-center opacity-60" autoPlay muted loop playsInline preload="metadata" aria-hidden="true">
      <source src="/media/hero-training.mp4" type="video/mp4" />
    </video>
    <div className="absolute inset-0 bg-linear-to-t from-background via-background/70 to-background/20" />
    <div className="relative mx-auto w-full max-w-7xl px-5 pb-20 pt-36 lg:px-8 lg:pb-28">
      <Reveal>
        <h1 className="max-w-4xl font-heading text-[clamp(4.5rem,13vw,10.5rem)] leading-[.83] tracking-[.015em] text-foreground">SERIOUSLY<br /><span className="text-primary">FUN</span> FITNESS</h1>
        <p className="single-line-tagline mt-8 text-base leading-7 text-muted-foreground" tabIndex={0}>{gymData.gym.tagline}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href={gymData.gym.bookTrial.whatsappLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-primary px-6 py-4 text-sm font-black uppercase tracking-wider text-primary-foreground transition-transform hover:-translate-y-1">Book Free Trial <ArrowUpRight size={17} /></a>
          <a href="#services" className="inline-flex items-center gap-2 border border-foreground/40 px-6 py-4 text-sm font-black uppercase tracking-wider text-foreground hover:border-primary hover:text-primary">Explore Programs</a>
        </div>
      </Reveal>
    </div>
    <div className="absolute bottom-0 right-0 hidden h-20 w-2/5 skew-x-[-25deg] translate-x-1/4 bg-primary lg:block" />
  </section>
}

const tickerItems = ['STRENGTH', 'CONDITIONING', 'ZUMBA', 'RECOVERY', 'COMMUNITY', 'RESULTS']
export function Marquee() {
  const items = [...tickerItems, ...tickerItems, ...tickerItems]
  return <div className="overflow-hidden border-y border-border bg-surface py-3" aria-label={tickerItems.join(', ')}><div className="flex w-max animate-marquee gap-10 whitespace-nowrap" aria-hidden="true">{items.map((item, index) => <span key={index} className="flex items-center gap-10 font-mono text-xs font-bold uppercase tracking-[.3em] text-muted-foreground">{item}<span className="text-primary">◆</span></span>)}</div></div>
}

export function About() {
  return <section id="about" className="about-section section-space"><div className="shell about-layout">
    <div className="about-photo"><img loading="lazy" decoding="async" src="/media/gym-battle-ropes.jpg" alt="Indian athlete training with battle ropes in a gym" /><p className="about-caption">No excuses</p></div>
    <div className="about-copy"><p className="section-label">THE GLOBAL WAY</p><h2 className="section-title">Train hard<br />Live loud</h2><p>Global Gym is more than a place to lift. We built a seriously fun training community where big energy meets smart programming, and every member has a reason to come back tomorrow.</p><p>No intimidation. No ego. Just good people, great coaching, and the kind of results you can feel.</p><a href="#services" className="text-link">What we do<ChevronRight size={18} aria-hidden="true" /></a></div>
  </div></section>
}

const services: [LucideIcon, string, string][] = [[Dumbbell,'Strength Training','Machines, free weights, and a plan that gets you stronger.'],[HeartPulse,'Cardio','Build your engine with treadmills, cycles, and high-intensity conditioning.'],[Users,'Group Classes','Big energy, loud music, zero judgement. Find your people.'],[ShieldCheck,'Personal Training','One-on-one coaching that makes every rep count.'],[Zap,'Zumba','Dance, sweat, and forget you are working out.'],[Sparkles,'Spa & Recovery','Reset hard with recovery zones built for your next session.']]
export function Services() { return <section id="services" className="py-24 lg:py-32"><div className="mx-auto max-w-7xl px-5 lg:px-8"><Reveal><p className="eyebrow">THE PLAYBOOK</p><h2 className="section-title mt-4">EVERY WAY<br /><span className="text-primary">TO MOVE</span></h2></Reveal><div className="mt-14 grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">{services.map(([Icon,title,desc],i) => <Reveal key={title}><article className="group min-h-60 bg-background p-7 transition-colors hover:bg-surface"><div className="mb-12 flex items-start justify-between"><Icon className="text-primary" size={29} strokeWidth={1.5} /><span className="font-mono text-xs text-muted-foreground">0{i+1}</span></div><h3 className="font-heading text-3xl tracking-wide text-foreground">{title as string}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{desc as string}</p></article></Reveal>)}</div></div></section> }

const gallery = [
  { src: '/media/hero-gym.jpg', alt: 'Members training in a Chandigarh gym' },
  { src: '/media/gym-calisthenics.jpg', alt: 'Indian athlete doing a calisthenics hold' },
  { src: '/media/gym-battle-ropes.jpg', alt: 'Indian member training with battle ropes' },
  { src: '/media/gym-dumbbells-delhi.jpg', alt: 'Sikh member lifting dumbbells in a Delhi gym' },
  { src: '/media/gym-training-kochi.jpg', alt: 'Young athlete preparing to train in a Kochi gym' },
  { src: '/media/indian-gym-man.jpg', alt: 'Indian member working out with a dumbbell' },
]
export function Gallery() { return <section id="gallery" className="gallery-section bg-surface py-24 lg:py-32"><div className="mx-auto max-w-7xl px-5 lg:px-8"><ArtReveal><div className="flex items-end justify-between"><div><p className="eyebrow">THE FLOOR</p><h2 className="section-title mt-4">SEE YOU<br /><span className="text-primary">INSIDE</span></h2></div><span className="hidden font-mono text-xs uppercase tracking-widest text-muted-foreground sm:block">Scroll / Sweat / Repeat</span></div></ArtReveal><div className="gallery-layout">{gallery.map(({src,alt},i) => <ArtReveal key={src} className={`gallery-frame gallery-frame-${i}`}><img loading="lazy" decoding="async" src={src} alt={alt} /><span className="gallery-number" aria-hidden="true">0{i+1} / THE FLOOR</span></ArtReveal>)}</div></div></section> }

const trainers = [
  ['Vineet Mankani','Strength & Conditioning','/media/gym-training-kochi.jpg'],
  ['Anaya Shah','Functional Training','/media/about-powerlift.jpg'],
  ['Vikram Singh','Performance Coach','/media/indian-gym-man.jpg'],
  ['Nisha Patil','Zumba & Mobility','/media/coach-woman-barbell-goa.jpg'],
  ['Arjun Mehta','Personal Training','/media/gym-dumbbells-delhi.jpg'],
  ['Rohan Desai','Calisthenics & Conditioning','/media/gym-calisthenics.jpg'],
]
export function Trainers() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()
  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: direction === 'left' ? -300 : 300, behavior: reducedMotion ? 'auto' : 'smooth' })
    }
  }
  return <section id="trainers" className="trainers-section py-24 lg:py-32"><div className="mx-auto max-w-7xl px-5 lg:px-8"><ArtReveal><div className="flex items-end justify-between"><div><p className="eyebrow">THE CREW</p><h2 className="section-title mt-4">MEET YOUR<br /><span className="text-primary">COACHES</span></h2></div><div className="hidden gap-2 lg:flex"><button onClick={() => scroll('left')} className="border border-border p-3 transition-all hover:border-primary hover:bg-primary hover:text-primary-foreground" aria-label="Scroll left"><ChevronLeft size={20} /></button><button onClick={() => scroll('right')} className="border border-border p-3 transition-all hover:border-primary hover:bg-primary hover:text-primary-foreground" aria-label="Scroll right"><ChevronRight size={20} /></button></div></div></ArtReveal><div className="mt-14 overflow-hidden"><div ref={scrollRef} className="coach-track flex gap-6 overflow-x-auto pb-4 md:gap-8" tabIndex={0} aria-label="Coaches; scroll to see more">{trainers.map(([name,specialty,src]) => <ArtReveal key={name} className="shrink-0 w-72"><article><img loading="lazy" decoding="async" className="aspect-4/5 w-full object-cover grayscale transition-all hover:grayscale-0" src={src} alt={`Stock portrait representing ${name}, ${specialty}`} /><h3 className="mt-5 font-heading text-2xl tracking-wide">{name}</h3><p className="mt-1 font-mono text-xs font-bold uppercase tracking-widest text-primary">{specialty}</p></article></ArtReveal>)}</div></div></div></section>
}

export function ContactUs() {
  return <section id="contact" className="contact-section section-space"><div className="shell">
    <div className="contact-heading"><div><p className="section-label">Get in touch</p><h2 className="section-title">Let's talk<br />We're here</h2></div><p>Reach out in whatever way works best for you. We'll get back to you faster than you can say "personal record."</p></div>
    <div className="contact-layout"><div className="contact-options">
      <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="contact-option"><MessageCircle aria-hidden="true" /><div><h3>WhatsApp</h3><p>{gym.contact.whatsapp}</p></div><ArrowUpRight aria-hidden="true" /></a>
      <a href={`tel:${gym.contact.phone}`} className="contact-option"><Phone aria-hidden="true" /><div><h3>Call Us</h3><p>{gym.contact.phone}</p></div><ArrowUpRight aria-hidden="true" /></a>
      <a href={`mailto:${gym.contact.email}`} className="contact-option"><Mail aria-hidden="true" /><div><h3>Email</h3><p>{gym.contact.email}</p></div><ArrowUpRight aria-hidden="true" /></a>
      <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="contact-option"><MapPin aria-hidden="true" /><div><h3>Visit Us</h3><p>Get directions</p></div><ArrowUpRight aria-hidden="true" /></a>
      <div className="contact-qr"><div className="qr-paper"><QRCode value={gym.bookTrial.whatsappLink} size={88} level="H" includeMargin={false} /></div><div><h3>Quick Chat</h3><p>Scan to start</p></div></div>
    </div><div className="message-panel"><h3>Send us a message</h3><form action="https://formspree.io/f/YOUR_FORM_ID" method="POST"><div className="form-pair"><div><label htmlFor="name">Your Name</label><input type="text" id="name" name="name" autoComplete="name" required placeholder="Your full name" /></div><div><label htmlFor="phone">Phone Number</label><input type="tel" id="phone" name="phone" autoComplete="tel" required placeholder="Your phone number" /></div></div><div><label htmlFor="message">Message</label><textarea id="message" name="message" required rows={5} placeholder="Tell us what you're interested in..." /></div><button type="submit" className="button button-light">Send Message<ArrowUpRight size={18} aria-hidden="true" /></button></form><p>We typically respond within 2 hours during business hours.</p></div></div>
  </div></section>
}

export function Testimonials() { return <section className="py-24 lg:py-32"><div className="mx-auto max-w-7xl px-5 lg:px-8"><Reveal><p className="eyebrow">MEMBER ENERGY</p><h2 className="section-title mt-4">GOOD VIBES<br /><span className="text-primary">REAL RESULTS</span></h2></Reveal><div className="mt-14 grid gap-4 md:grid-cols-3">{[['“Finally, a gym where I actually look forward to showing up. The coaches remember your name and your goals.”','PRIYA K.'],['“The group classes are absolute fire. I have more energy, more confidence, and my jeans fit better.”','ARJUN R.'],['“Global feels like a community, not a membership. Best training decision I have made in Mumbai.”','MEERA S.']].map(([quote,name])=><Reveal key={name}><blockquote className="border-l-2 border-primary bg-surface p-7"><p className="text-lg leading-8 text-foreground">{quote}</p><footer className="mt-8 font-mono text-sm font-bold tracking-widest text-primary">— {name}</footer></blockquote></Reveal>)}</div></div></section> }

export function Footer() {
  return <footer className="site-footer"><div className="shell"><div className="footer-top"><a href="#top" className="footer-wordmark">{gym.name}</a><p className="single-line-tagline" tabIndex={0}>{gym.tagline}</p></div><div className="footer-grid"><div><h2>Quick links</h2><nav aria-label="Footer navigation">{navigation.map(name => <a key={name} href={`#${name.toLowerCase()}`}>{name}</a>)}</nav></div><div><h2>Find us</h2><p>{gym.address.street},<br />{gym.address.area}, {gym.address.city} {gym.address.postcode}</p><a href={gym.maps.googleMapsShareLink} target="_blank" rel="noopener noreferrer" className="text-link">Get Directions<ArrowUpRight size={16} aria-hidden="true" /></a><a className="footer-phone" href={`tel:${gym.contact.phone}`}><Phone size={16} aria-hidden="true" />{gym.contact.phone}</a></div><iframe src={gym.maps.embedCode} title={`${gym.name} location: ${gym.location}`} loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade" /></div><div className="footer-bottom"><p>{gym.copyright}</p><div className="social-links"><a href={gym.social.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg></a><a href={gym.social.youtube} target="_blank" rel="noopener noreferrer" aria-label="YouTube"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M21.58 7.19a2.5 2.5 0 0 0-1.76-1.77C18.26 5 12 5 12 5s-6.26 0-7.82.42a2.5 2.5 0 0 0-1.76 1.77C2 8.75 2 12 2 12s0 3.25.42 4.81a2.5 2.5 0 0 0 1.76 1.77C5.74 19 12 19 12 19s6.26 0 7.82-.42a2.5 2.5 0 0 0 1.76-1.77C22 15.25 22 12 22 12s0-3.25-.42-4.81ZM10 15l5.2-3L10 9v6Z" clipRule="evenodd" /></svg></a><a href={gym.social.whatsapp} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><MessageCircle size={22} /></a></div></div></div></footer>
}

export function WhatsAppFloat() {
  return <a href={whatsappLink} target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp" className="whatsapp-float"><IconWhatsapp /><span>Let's talk</span></a>
}
