'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowUpRight, MapPin, Phone, MessageCircle, Dumbbell, HeartPulse, Users, Sparkles, Zap, ShieldCheck, ChevronRight, ChevronLeft, Mail, Menu, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import QRCode from 'qrcode.react'
import { useEffect, useRef, useState } from 'react'
import gymData from '@/data/gym.json'

const gym = gymData.gym
const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(gym.address.formatted)}`
const whatsappLink = `https://wa.me/${gym.contact.whatsapp.replace(/\D/g, '')}`
const navigation = ['About', 'Services', 'Gallery', 'Trainers', 'Contact']

// Start with a static layout, and respond if the system preference changes mid-visit.
function useReducedMotion() {
  const [reduced, setReduced] = useState(true)
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return reduced
}

function TrialLink({ children = 'Book Free Trial', className = '' }: { children?: React.ReactNode; className?: string }) {
  return <a className={`button ${className}`} href={gym.bookTrial.whatsappLink} target="_blank" rel="noopener noreferrer">{children}<ArrowUpRight size={18} aria-hidden="true" /></a>
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
    const desktop = window.matchMedia('(min-width: 1024px)')
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
      <div className="header-actions"><TrialLink className="button-small">Start Free Trial</TrialLink><button ref={menuButton} type="button" className="menu-toggle" aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button></div>
    </div>
    <nav id="mobile-navigation" className="mobile-nav" aria-label="Mobile navigation" hidden={!open} onBlur={event => { if (!headerRef.current?.contains(event.relatedTarget as Node)) setOpen(false) }}>
      {navigation.map(name => <a key={name} href={`#${name.toLowerCase()}`} aria-current={active === name ? 'location' : undefined} onClick={() => setOpen(false)}>{name}<ChevronRight size={20} aria-hidden="true" /></a>)}
      <p>{gym.location}</p>
    </nav>
  </header>
}

export function Hero() {
  return <section id="top" className="hero">
    <div className="hero-copy">
      <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="hero-location"><MapPin size={18} aria-hidden="true" />{gym.location}</a>
      <h1 className="hero-title" aria-label="Seriously fun fitness">{['Seriously', 'Fun', 'Fitness'].map((line, index) => <span className="headline-mask" key={line}><span className="headline-line" style={{ animationDelay: `${index * 90}ms` }}>{line}</span></span>)}</h1>
      <div className="hero-bottom"><p>{gym.tagline}</p><div className="hero-links"><TrialLink className="button-light" /><a href="#services" className="text-link">Explore Programs</a></div></div>
    </div>
    <div className="hero-photo"><img src="/media/about-powerlift.jpg" alt="Indian woman lifting a barbell in a gym" fetchPriority="high" /><div className="hero-photo-caption"><span>{gym.name}</span><span>{gym.location}</span></div></div>
    <a href="#about" className="hero-scroll" aria-label="Discover the Global way"><span>The Global way</span><span aria-hidden="true">↓</span></a>
  </section>
}

const tickerItems = ['Strength', 'Conditioning', 'Zumba', 'Recovery', 'Community', 'Results']
export function Marquee() {
  return <div className="training-strip" aria-label={tickerItems.join(', ')}>{tickerItems.map(item => <span key={item}>{item}</span>)}</div>
}

export function About() {
  return <section id="about" className="about-section section-space"><div className="shell about-layout">
    <div className="about-photo"><img loading="lazy" decoding="async" src="/media/gym-battle-ropes.jpg" alt="Indian athlete training with battle ropes in a gym" /><p className="about-caption">No excuses</p></div>
    <div className="about-copy"><p className="section-label">The Global way</p><h2 className="section-title">Train hard<br />Live loud</h2><p>Global Gym is more than a place to lift. We built a seriously fun training community where big energy meets smart programming, and every member has a reason to come back tomorrow.</p><p>No intimidation. No ego. Just good people, great coaching, and the kind of results you can feel.</p><a href="#services" className="text-link">What we do<ChevronRight size={18} aria-hidden="true" /></a></div>
  </div></section>
}

const services: [LucideIcon, string, string][] = [[Dumbbell,'Strength Training','Machines, free weights, and a plan that gets you stronger.'],[HeartPulse,'Cardio','Build your engine with treadmills, cycles, and high-intensity conditioning.'],[Users,'Group Classes','Big energy, loud music, zero judgement. Find your people.'],[ShieldCheck,'Personal Training','One-on-one coaching that makes every rep count.'],[Zap,'Zumba','Dance, sweat, and forget you are working out.'],[Sparkles,'Spa & Recovery','Reset hard with recovery zones built for your next session.']]
export function Services() {
  return <section id="services" className="services-section section-space"><div className="shell services-layout"><div className="services-heading"><p className="section-label">The playbook</p><h2 className="section-title">Every way<br />to move</h2></div><div className="service-list">{services.map(([Icon, title, desc]) => <article className="service-row" key={title}><Icon size={28} strokeWidth={1.5} aria-hidden="true" /><div><h3>{title}</h3><p>{desc}</p></div></article>)}</div></div></section>
}

const gallery = [
  { src: '/media/hero-gym.jpg', alt: 'Members training in a Chandigarh gym' },
  { src: '/media/gym-calisthenics.jpg', alt: 'Indian athlete doing a calisthenics hold' },
  { src: '/media/gym-battle-ropes.jpg', alt: 'Indian member training with battle ropes' },
  { src: '/media/gym-dumbbells-delhi.jpg', alt: 'Sikh member lifting dumbbells in a Delhi gym' },
  { src: '/media/gym-training-kochi.jpg', alt: 'Young athlete preparing to train in a Kochi gym' },
  { src: '/media/indian-gym-man.jpg', alt: 'Indian member working out with a dumbbell' },
]

export function Gallery() {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const windowRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()
  const [distance, setDistance] = useState(0)
  const [enabled, setEnabled] = useState(false)
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] })
  const x = useTransform(scrollYProgress, [0, 1], [0, -distance])

  useEffect(() => {
    const dialog = dialogRef.current
    if (selectedPhoto === null || !dialog) return
    if (!dialog.open) dialog.showModal()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [selectedPhoto])

  const changePhoto = (direction: number) => setSelectedPhoto(current => current === null ? null : (current + direction + gallery.length) % gallery.length)

  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px) and (min-height: 650px)')
    const update = () => {
      setEnabled(query.matches && reducedMotion === false)
      setDistance(Math.max(0, (trackRef.current?.scrollWidth ?? 0) - (windowRef.current?.clientWidth ?? 0)))
    }
    const observer = new ResizeObserver(update)
    if (windowRef.current) observer.observe(windowRef.current)
    if (trackRef.current) observer.observe(trackRef.current)
    query.addEventListener('change', update)
    update()
    return () => { observer.disconnect(); query.removeEventListener('change', update) }
  }, [reducedMotion])

  return <section ref={sectionRef} id="gallery" className={`gallery-section ${enabled ? 'gallery-scroll' : ''}`} style={enabled ? { height: `calc(100svh + ${distance}px)` } : undefined}>
    <div className="gallery-stage"><div className="shell gallery-heading"><div><p className="section-label">The floor</p><h2 className="section-title">See you inside</h2></div><p className="gallery-instruction">Scroll / Sweat / Repeat</p></div>
      <div ref={windowRef} className="gallery-window"><motion.div ref={trackRef} className="gallery-track" style={{ x: enabled ? x : 0 }}>{gallery.map(({ src, alt }, index) => <figure key={src} className={`gallery-frame gallery-frame-${index}`}><button type="button" className="gallery-open" aria-label={`View photo: ${alt}`} onClick={() => setSelectedPhoto(index)}><img loading="lazy" decoding="async" src={src} alt={alt} /><span className="gallery-view" aria-hidden="true">View photo<ArrowUpRight size={16} /></span></button></figure>)}</motion.div></div>
      {enabled && <div className="shell gallery-progress" aria-hidden="true"><motion.div style={{ scaleX: scrollYProgress }} /></div>}
    </div>
    <dialog ref={dialogRef} className="photo-dialog" aria-label="Training photo viewer" onClose={() => setSelectedPhoto(null)} onClick={event => { if (event.target === event.currentTarget) dialogRef.current?.close() }} onKeyDown={event => { if (event.key === 'ArrowLeft') { event.preventDefault(); changePhoto(-1) } if (event.key === 'ArrowRight') { event.preventDefault(); changePhoto(1) } }}>
      {selectedPhoto !== null && <div className="photo-viewer"><div className="photo-toolbar"><p aria-live="polite">Photo {selectedPhoto + 1} of {gallery.length}</p><button type="button" aria-label="Close photo viewer" onClick={() => dialogRef.current?.close()} autoFocus><X /></button></div><img key={selectedPhoto} className="photo-full" src={gallery[selectedPhoto].src} alt={gallery[selectedPhoto].alt} /><div className="photo-bottom"><button type="button" aria-label="Previous photo" onClick={() => changePhoto(-1)}><ChevronLeft /></button><p>{gallery[selectedPhoto].alt}</p><button type="button" aria-label="Next photo" onClick={() => changePhoto(1)}><ChevronRight /></button></div></div>}
    </dialog>
  </section>
}

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
  const scroll = (direction: number) => {
    const track = scrollRef.current
    if (track) track.scrollBy({ left: direction * ((track.firstElementChild?.getBoundingClientRect().width ?? 300) + 24), behavior: reducedMotion ? 'auto' : 'smooth' })
  }
  return <section id="trainers" className="trainers-section section-space"><div className="shell"><div className="section-heading-row"><div><p className="section-label">The crew</p><h2 className="section-title">Meet your<br />coaches</h2></div><div className="carousel-controls"><button type="button" onClick={() => scroll(-1)} aria-label="Previous coaches" aria-controls="coach-track"><ChevronLeft /></button><button type="button" onClick={() => scroll(1)} aria-label="Next coaches" aria-controls="coach-track"><ChevronRight /></button></div></div><div ref={scrollRef} id="coach-track" className="coach-track" tabIndex={0} role="region" aria-label="Coaches; scroll to see more">{trainers.map(([name, specialty, src]) => <article className="coach" key={name}><div className="coach-photo"><img loading="lazy" decoding="async" src={src} alt={`Stock portrait representing ${name}, ${specialty}`} /></div><h3>{name}</h3><p>{specialty}</p></article>)}</div></div></section>
}

const testimonials = [
  ['Finally, a gym where I actually look forward to showing up. The coaches remember your name and your goals.', 'PRIYA K.'],
  ['The group classes are absolute fire. I have more energy, more confidence, and my jeans fit better.', 'ARJUN R.'],
  ['Global feels like a community, not a membership. Best training decision I have made in Mumbai.', 'MEERA S.'],
]
export function Testimonials() {
  return <section className="testimonials-section section-space"><div className="shell"><div className="testimonial-heading"><p className="section-label">Member energy</p><h2 className="section-title">Good vibes<br />Real results</h2></div><div className="testimonials">{testimonials.map(([quote, name]) => <blockquote key={name}><p>“{quote}”</p><footer>{name}</footer></blockquote>)}</div></div></section>
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

export function Footer() {
  return <footer className="site-footer"><div className="shell"><div className="footer-top"><a href="#top" className="footer-wordmark">{gym.name}</a><p>{gym.tagline}</p></div><div className="footer-grid"><div><h2>Quick links</h2><nav aria-label="Footer navigation">{navigation.map(name => <a key={name} href={`#${name.toLowerCase()}`}>{name}</a>)}</nav></div><div><h2>Find us</h2><p>{gym.address.street},<br />{gym.address.area}, {gym.address.city} {gym.address.postcode}</p><a href={gym.maps.googleMapsShareLink} target="_blank" rel="noopener noreferrer" className="text-link">Get Directions<ArrowUpRight size={16} aria-hidden="true" /></a><a className="footer-phone" href={`tel:${gym.contact.phone}`}><Phone size={16} aria-hidden="true" />{gym.contact.phone}</a></div><iframe src={gym.maps.embedCode} title={`${gym.name} location: ${gym.location}`} loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade" /></div><div className="footer-bottom"><p>{gym.copyright}</p><div className="social-links"><a href={gym.social.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg></a><a href={gym.social.youtube} target="_blank" rel="noopener noreferrer" aria-label="YouTube"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M21.58 7.19a2.5 2.5 0 0 0-1.76-1.77C18.26 5 12 5 12 5s-6.26 0-7.82.42a2.5 2.5 0 0 0-1.76 1.77C2 8.75 2 12 2 12s0 3.25.42 4.81a2.5 2.5 0 0 0 1.76 1.77C5.74 19 12 19 12 19s6.26 0 7.82-.42a2.5 2.5 0 0 0 1.76-1.77C22 15.25 22 12 22 12s0-3.25-.42-4.81ZM10 15l5.2-3L10 9v6Z" clipRule="evenodd" /></svg></a><a href={gym.social.whatsapp} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><MessageCircle size={22} /></a></div></div></div></footer>
}

export function WhatsAppFloat() {
  return <a href={whatsappLink} target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp" className="whatsapp-float"><IconWhatsapp /><span>Let's talk</span></a>
}

function IconWhatsapp({ size = 26 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Zm0 18.2a8.1 8.1 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.2-.7.8-.8 1-.2.2-.3.2-.5.1-.2-.1-1-.4-2-1.2-.7-.6-1.2-1.4-1.4-1.6-.1-.2 0-.4.1-.5l.4-.5c.1-.2.2-.3.2-.5.1-.2 0-.4 0-.5-.1-.1-.6-1.5-.8-2-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.2-.9.9-.9 2.2s.9 2.5 1.1 2.7c.1.2 1.9 2.9 4.6 4 .6.3 1.1.4 1.5.6.6.2 1.2.2 1.6.1.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" /></svg>
}
