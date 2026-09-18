'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight, MapPin, Phone, MessageCircle, Dumbbell, HeartPulse, Users, Sparkles, Zap, ShieldCheck, ChevronRight, ChevronLeft, Share2, Mail } from 'lucide-react'
import QRCode from 'qrcode.react'
import type { LucideIcon } from 'lucide-react'
import { useRef } from 'react'
import gymData from '@/data/gym.json'

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
  return <header className="fixed inset-x-0 top-0 z-50 border-b border-border/50 bg-background/85 backdrop-blur-md"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8"><a href="#top" className="font-heading text-2xl tracking-wide text-foreground">{gymData.gym.name}<span className="text-primary">.</span></a><nav className="hidden items-center gap-6 lg:flex">{['About','Services','Gallery','Trainers','Contact'].map(x => <a key={x} href={`#${x.toLowerCase()}`} className="text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary">{x}</a>)}<a href={gymData.gym.bookTrial.whatsappLink} target="_blank" rel="noopener noreferrer" className="bg-primary px-5 py-3 text-xs font-black uppercase tracking-widest text-primary-foreground transition-transform hover:-translate-y-0.5">Start Free Trial</a></nav><a href={gymData.gym.bookTrial.whatsappLink} target="_blank" rel="noopener noreferrer" aria-label="Start free trial" className="bg-primary px-3 py-2 text-xs font-black uppercase text-primary-foreground lg:hidden">Trial</a></div></header>
}

export function Hero() { 
  return <section id="top" className="relative flex min-h-screen items-end overflow-hidden">
    <img className="absolute inset-0 h-full w-full object-cover object-center opacity-60" src="/media/about-powerlift.jpg" alt="Indian woman lifting a barbell in a gym" />
    <div className="absolute inset-0 bg-linear-to-t from-background via-background/70 to-background/20" />
    <div className="relative mx-auto w-full max-w-7xl px-5 pb-20 pt-36 lg:px-8 lg:pb-28">
      <Reveal>
        <div className="mb-8 flex items-center gap-4">
          <motion.div className="flex items-center gap-2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <MapPin size={20} className="text-primary" />
            <span className="font-heading text-lg font-bold uppercase tracking-wide text-primary">{gymData.gym.location}</span>
          </motion.div>
        </div>
        <h1 className="max-w-4xl font-heading text-[clamp(4.5rem,13vw,10.5rem)] leading-[.83] tracking-[.015em] text-foreground">SERIOUSLY<br /><span className="text-primary">FUN</span> FITNESS</h1>
        <p className="mt-8 max-w-md text-base leading-7 text-muted-foreground">{gymData.gym.tagline}</p>
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

export function About() { return <section id="about" className="relative overflow-hidden bg-surface py-24 lg:py-32"><div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-2 lg:items-center lg:px-8"><Reveal><div className="relative"><img className="h-[430px] w-full object-cover object-[center_65%]" src="/media/gym-battle-ropes.jpg" alt="Indian athlete training with battle ropes in a gym" /><div className="absolute -bottom-4 -right-4 bg-primary p-5 font-heading text-4xl leading-none tracking-[.025em] text-primary-foreground">NO<br />EXCUSES</div></div></Reveal><Reveal><p className="eyebrow text-lg">THE GLOBAL WAY</p><h2 className="section-title mt-4">TRAIN HARD<br /><span className="text-primary">LIVE LOUD</span></h2><p className="mt-7 max-w-lg text-muted-foreground leading-7">Global Gym is more than a place to lift. We built a seriously fun training community where big energy meets smart programming, and every member has a reason to come back tomorrow.</p><p className="mt-4 max-w-lg text-muted-foreground leading-7">No intimidation. No ego. Just good people, great coaching, and the kind of results you can feel.</p><a href="#services" className="mt-8 inline-flex items-center gap-2 font-bold uppercase tracking-widest text-primary">What we do <ChevronRight size={17} /></a></Reveal></div></section> }

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
  return <section id="trainers" className="trainers-section py-24 lg:py-32"><div className="mx-auto max-w-7xl px-5 lg:px-8"><ArtReveal><div className="flex items-end justify-between"><div><p className="eyebrow">THE CREW</p><h2 className="section-title mt-4">MEET YOUR<br /><span className="text-primary">COACHES</span></h2></div><div className="hidden gap-2 lg:flex"><button onClick={() => scroll('left')} className="border border-border p-3 transition-all hover:border-primary hover:bg-primary hover:text-primary-foreground" aria-label="Scroll left"><ChevronLeft size={20} /></button><button onClick={() => scroll('right')} className="border border-border p-3 transition-all hover:border-primary hover:bg-primary hover:text-primary-foreground" aria-label="Scroll right"><ChevronRight size={20} /></button></div></div></ArtReveal><div className="mt-14 overflow-hidden"><div ref={scrollRef} className="coach-track flex gap-6 overflow-x-auto pb-4 md:gap-8" tabIndex={0} aria-label="Coaches; scroll to see more">{trainers.map(([name,specialty,src]) => <ArtReveal key={name} className="shrink-0 w-72"><article><img loading="lazy" decoding="async" className="aspect-4/5 w-full object-cover grayscale transition-all hover:grayscale-0" src={src} alt={`Stock portrait representing ${name}, ${specialty}`} /><h3 className="mt-5 font-heading text-2xl tracking-wide">{name}</h3><p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-widest text-primary">{specialty}</p></article></ArtReveal>)}</div></div></div></section>
}

export function ContactUs() { 
  return <section id="contact" className="bg-surface py-24 lg:py-32">
    <div className="mx-auto max-w-7xl px-5 lg:px-8">
      <Reveal>
        <p className="eyebrow">GET IN TOUCH</p>
        <h2 className="section-title mt-4">LET'S TALK<br /><span className="text-primary">WE'RE HERE</span></h2>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">Reach out in whatever way works best for you. We'll get back to you faster than you can say "personal record."</p>
      </Reveal>
      <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        <Reveal>
          <a href={`https://wa.me/${gymData.gym.contact.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="group flex flex-col items-center justify-center gap-4 border border-border bg-background p-8 transition-all hover:border-primary hover:bg-primary hover:text-primary-foreground">
            <MessageCircle size={32} className="text-primary group-hover:text-primary-foreground" />
            <h3 className="text-center font-heading text-lg">WhatsApp</h3>
            <p className="text-center text-sm text-muted-foreground group-hover:text-primary-foreground/80">{gymData.gym.contact.whatsapp}</p>
          </a>
        </Reveal>
        <Reveal>
          <a href={`tel:${gymData.gym.contact.phone}`} className="group flex flex-col items-center justify-center gap-4 border border-border bg-background p-8 transition-all hover:border-primary hover:bg-primary hover:text-primary-foreground">
            <Phone size={32} className="text-primary group-hover:text-primary-foreground" />
            <h3 className="text-center font-heading text-lg">Call Us</h3>
            <p className="text-center text-sm text-muted-foreground group-hover:text-primary-foreground/80">{gymData.gym.contact.phone}</p>
          </a>
        </Reveal>
        <Reveal>
          <a href={`mailto:${gymData.gym.contact.email}`} className="group flex flex-col items-center justify-center gap-4 border border-border bg-background p-8 transition-all hover:border-primary hover:bg-primary hover:text-primary-foreground">
            <Mail size={32} className="text-primary group-hover:text-primary-foreground" />
            <h3 className="text-center font-heading text-lg">Email</h3>
            <p className="text-center text-sm text-muted-foreground group-hover:text-primary-foreground/80 break-all">{gymData.gym.contact.email}</p>
          </a>
        </Reveal>
        <Reveal>
          <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="group flex h-full flex-col items-center justify-center gap-4 border border-border bg-background p-8 transition-all hover:border-primary hover:bg-primary hover:text-primary-foreground">
            <MapPin size={32} className="text-primary group-hover:text-primary-foreground" />
            <h3 className="text-center font-heading text-lg">Visit Us</h3>
            <p className="text-center text-sm text-muted-foreground group-hover:text-primary-foreground/80">Get directions</p>
          </a>
        </Reveal>
        <Reveal>
          <div className="flex flex-col items-center justify-center gap-4 border border-border bg-background p-8">
            <QRCode value={gymData.gym.bookTrial.whatsappLink} size={120} level="H" includeMargin={false} />
            <h3 className="text-center font-heading text-lg">Quick Chat</h3>
            <p className="text-center text-xs text-muted-foreground">Scan to start</p>
          </div>
        </Reveal>
      </div>
      <ArtReveal className="mt-14">
        <div className="message-panel">
          <h3 className="font-heading text-2xl">Send us a message</h3>
          <form action="https://formspree.io/f/YOUR_FORM_ID" method="POST" className="mt-6 space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-foreground">Your Name</label>
              <input type="text" id="name" name="name" required className="mt-2 w-full border border-border bg-background px-4 py-3 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none" placeholder="Your full name" />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-foreground">Phone Number</label>
              <input type="tel" id="phone" name="phone" required className="mt-2 w-full border border-border bg-background px-4 py-3 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none" placeholder="Your phone number" />
            </div>
            <div>
              <label htmlFor="message" className="block text-sm font-semibold text-foreground">Message</label>
              <textarea id="message" name="message" required rows={5} className="mt-2 w-full border border-border bg-background px-4 py-3 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none" placeholder="Tell us what you're interested in..." />
            </div>
            <button type="submit" className="w-full bg-primary px-6 py-4 text-sm font-black uppercase tracking-wider text-primary-foreground transition-transform hover:-translate-y-0.5">Send Message</button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">We typically respond within 2 hours during business hours.</p>
        </div>
      </ArtReveal>
    </div>
  </section> 
}

export function Testimonials() { return <section className="py-24 lg:py-32"><div className="mx-auto max-w-7xl px-5 lg:px-8"><Reveal><p className="eyebrow">MEMBER ENERGY</p><h2 className="section-title mt-4">GOOD VIBES<br /><span className="text-primary">REAL RESULTS</span></h2></Reveal><div className="mt-14 grid gap-4 md:grid-cols-3">{[['“Finally, a gym where I actually look forward to showing up. The coaches remember your name and your goals.”','PRIYA K.'],['“The group classes are absolute fire. I have more energy, more confidence, and my jeans fit better.”','ARJUN R.'],['“Global feels like a community, not a membership. Best training decision I have made in Mumbai.”','MEERA S.']].map(([quote,name])=><Reveal key={name}><blockquote className="border-l-2 border-primary bg-surface p-7"><p className="text-lg leading-8 text-foreground">{quote}</p><footer className="mt-8 font-mono text-[10px] font-bold tracking-widest text-primary">— {name}</footer></blockquote></Reveal>)}</div></div></section> }

export function Footer() { 
  return <footer className="bg-background py-14">
    <div className="mx-auto grid max-w-7xl gap-12 px-5 md:grid-cols-3 lg:px-8">
      <div>
        <a href="#top" className="font-heading text-3xl">{gymData.gym.name}<span className="text-primary">.</span></a>
        <p className="mt-4 max-w-xs text-sm leading-6 text-muted-foreground">{gymData.gym.tagline}</p>
        <div className="mt-6 flex gap-4">
          <a href={gymData.gym.social.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-muted-foreground transition-colors hover:text-primary"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg></a>
          <a href={gymData.gym.social.youtube} target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="text-muted-foreground transition-colors hover:text-primary"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M21.58 7.19a2.5 2.5 0 0 0-1.76-1.77C18.26 5 12 5 12 5s-6.26 0-7.82.42a2.5 2.5 0 0 0-1.76 1.77C2 8.75 2 12 2 12s0 3.25.42 4.81a2.5 2.5 0 0 0 1.76 1.77C5.74 19 12 19 12 19s6.26 0 7.82-.42a2.5 2.5 0 0 0 1.76-1.77C22 15.25 22 12 22 12s0-3.25-.42-4.81ZM10 15l5.2-3L10 9v6Z" clipRule="evenodd" /></svg></a>
          <a href={gymData.gym.social.whatsapp} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="text-muted-foreground transition-colors hover:text-primary"><MessageCircle size={20} /></a>
        </div>
      </div>
      <div>
        <p className="eyebrow">FIND US</p>
        <p className="mt-4 flex gap-3 text-sm leading-6 text-muted-foreground">
          <MapPin size={18} className="shrink-0 text-primary" /> 
          {gymData.gym.address.street},<br />{gymData.gym.address.area}, {gymData.gym.address.city} {gymData.gym.address.postcode}
        </p>
        <a href={gymData.gym.maps.googleMapsShareLink} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:gap-3 transition-all">
          Get Directions <ArrowUpRight size={16} />
        </a>
        <p className="mt-6 flex gap-3 text-sm text-muted-foreground">
          <Phone size={16} className="text-primary" /> 
          <a href={`tel:${gymData.gym.contact.phone}`} className="hover:text-primary">{gymData.gym.contact.phone}</a>
        </p>
      </div>
      <div>
        <p className="eyebrow">QUICK LINKS</p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-muted-foreground">
          {['About','Services','Gallery','Trainers','Contact'].map(x=><a key={x} href={`#${x.toLowerCase()}`} className="hover:text-primary">{x}</a>)}
        </div>
      </div>
    </div>
    <div className="mx-auto mt-10 max-w-7xl px-5 lg:px-8">
      <iframe
        src={gymData.gym.maps.embedCode}
        title={`${gymData.gym.name} location: ${gymData.gym.location}`}
        className="h-64 w-full border border-border sm:h-80"
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
    <div className="mx-auto mt-14 max-w-7xl border-t border-border px-5 pt-5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground lg:px-8">{gymData.gym.copyright}</div>
  </footer> 
}

export function WhatsAppFloat() {
  return <a href={whatsappLink} target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp" className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
    <IconWhatsapp />
  </a>
}
