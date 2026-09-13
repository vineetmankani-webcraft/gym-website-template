'use client'

import { motion } from 'framer-motion'
import { ArrowUpRight, MapPin, Phone, MessageCircle, Dumbbell, HeartPulse, Users, Sparkles, Zap, ShieldCheck, ChevronRight, ChevronLeft, Share2, Mail } from 'lucide-react'
import QRCode from 'qrcode.react'
import { useRef } from 'react'
import gymData from '@/data/gym.json'

const img = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1400&q=85`

function Reveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <motion.div className={className} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: .6 }}>{children}</motion.div>
}

export function Nav() {
  return <header className="fixed inset-x-0 top-0 z-50 border-b border-border/50 bg-background/85 backdrop-blur-md"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8"><a href="#top" className="font-heading text-2xl tracking-wide text-foreground">{gymData.gym.name}<span className="text-primary">.</span></a><nav className="hidden items-center gap-6 lg:flex">{['About','Services','Gallery','Trainers','Contact'].map(x => <a key={x} href={`#${x.toLowerCase()}`} className="text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary">{x}</a>)}<a href={gymData.gym.bookTrial.whatsappLink} target="_blank" rel="noopener noreferrer" className="bg-primary px-5 py-3 text-xs font-black uppercase tracking-widest text-primary-foreground transition-transform hover:-translate-y-0.5">Start Free Trial</a></nav><a href={gymData.gym.bookTrial.whatsappLink} target="_blank" rel="noopener noreferrer" aria-label="Start free trial" className="bg-primary px-3 py-2 text-xs font-black uppercase text-primary-foreground lg:hidden">Trial</a></div></header>
}

export function Hero() { 
  return <section id="top" className="relative flex min-h-screen items-end overflow-hidden">
    <video className="absolute inset-0 h-full w-full object-cover opacity-40" autoPlay muted loop playsInline><source src="https://videos.unsplash.com/video-1618899523262-e82e5eed3eb1?w=1400&q=85" type="video/mp4" /></video>
    <img className="absolute inset-0 h-full w-full object-cover opacity-30" src={img('photo-1534438327276-14e5300c3a48')} alt="Moody gym interior with weight racks" />
    <div className="absolute inset-0 bg-linear-to-t from-background via-background/70 to-background/20" />
    <div className="relative mx-auto w-full max-w-7xl px-5 pb-20 pt-36 lg:px-8 lg:pb-28">
      <Reveal>
        <div className="mb-8 flex items-center gap-4">
          <motion.div className="flex items-center gap-2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <MapPin size={20} className="text-primary" />
            <span className="font-heading text-lg font-bold uppercase tracking-wide text-primary">{gymData.gym.location}</span>
          </motion.div>
        </div>
        <h1 className="max-w-4xl font-heading text-[clamp(4.5rem,13vw,10.5rem)] leading-[.8] tracking-[.025em] text-foreground">SERIOUSLY<br /><span className="text-primary">FUN</span> FITNESS</h1>
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

export function About() { return <section id="about" className="relative overflow-hidden bg-surface py-24 lg:py-32"><div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-2 lg:items-center lg:px-8"><Reveal><div className="relative"><img className="h-[430px] w-full object-cover grayscale" src={img('photo-1581009146145-b5ef050c2e1e')} alt="Athlete training with a barbell" /><div className="absolute -bottom-4 -right-4 bg-primary p-5 font-heading text-4xl leading-none tracking-[.025em] text-primary-foreground">NO<br />EXCUSES</div></div></Reveal><Reveal><p className="eyebrow text-lg">THE GLOBAL WAY</p><h2 className="section-title mt-4">TRAIN HARD<br /><span className="text-primary">LIVE LOUD</span></h2><p className="mt-7 max-w-lg text-muted-foreground leading-7">Global Gym is more than a place to lift. We built a seriously fun training community where big energy meets smart programming, and every member has a reason to come back tomorrow.</p><p className="mt-4 max-w-lg text-muted-foreground leading-7">No intimidation. No ego. Just good people, great coaching, and the kind of results you can feel.</p><a href="#services" className="mt-8 inline-flex items-center gap-2 font-bold uppercase tracking-widest text-primary">What we do <ChevronRight size={17} /></a></Reveal></div></section> }

const services = [[Dumbbell,'Strength Training','Machines, free weights, and a plan that gets you stronger.'],[HeartPulse,'Cardio','Build your engine with treadmills, cycles, and high-intensity conditioning.'],[Users,'Group Classes','Big energy, loud music, zero judgement. Find your people.'],[ShieldCheck,'Personal Training','One-on-one coaching that makes every rep count.'],[Zap,'Zumba','Dance, sweat, and forget you are working out.'],[Sparkles,'Spa & Recovery','Reset hard with recovery zones built for your next session.']]
export function Services() { return <section id="services" className="py-24 lg:py-32"><div className="mx-auto max-w-7xl px-5 lg:px-8"><Reveal><p className="eyebrow">THE PLAYBOOK</p><h2 className="section-title mt-4">EVERY WAY<br /><span className="text-primary">TO MOVE</span></h2></Reveal><div className="mt-14 grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">{services.map(([Icon,title,desc],i) => <Reveal key={title}><article className="group min-h-60 bg-background p-7 transition-colors hover:bg-surface"><div className="mb-12 flex items-start justify-between"><Icon className="text-primary" size={29} strokeWidth={1.5} /><span className="font-mono text-xs text-muted-foreground">0{i+1}</span></div><h3 className="font-heading text-3xl tracking-wide text-foreground">{title as string}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{desc as string}</p></article></Reveal>)}</div></div></section> }

const gallery = ['photo-1534438327276-14e5300c3a48','photo-1571019613454-1cb2f99b2d8b','photo-1583454110551-21f2fa2afe61','photo-1517836357463-d25dfeac3438','photo-1581009146145-b5ef050c2e1e','photo-1546483875-ad9014c88eba']
export function Gallery() { return <section id="gallery" className="bg-surface py-24 lg:py-32"><div className="mx-auto max-w-7xl px-5 lg:px-8"><Reveal><div className="flex items-end justify-between"><div><p className="eyebrow">THE FLOOR</p><h2 className="section-title mt-4">SEE YOU<br /><span className="text-primary">INSIDE</span></h2></div><span className="hidden font-mono text-xs uppercase tracking-widest text-muted-foreground sm:block">Scroll / Sweat / Repeat</span></div></Reveal><div className="mt-14 grid grid-cols-2 gap-3 md:grid-cols-3">{gallery.map((id,i) => <Reveal key={id} className={i===0 || i===5 ? 'col-span-2' : ''}><motion.img className={`w-full object-cover grayscale transition-all duration-500 hover:grayscale-0 ${i===0 || i===5 ? 'h-72 md:h-96' : 'h-56 md:h-72'}`} src={img(id)} alt={`Global Gym training space ${i+1}`} whileHover={{ scale: 1.02 }} /></Reveal>)}</div></div></section> }

const trainers = [['Vineet Mankani','Strength & Conditioning','photo-1567013127542-490d757e51fc'],['Anaya Shah','Functional Training','photo-1594381898411-846e7d193883'],['Vikram Singh','Performance Coach','photo-1534438327276-14e5300c3a48'],['Nisha Patil','Zumba & Mobility','photo-1549476464-37392f717541']]
export function Trainers() { 
  const scrollRef = useRef<HTMLDivElement>(null)
  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: direction === 'left' ? -300 : 300, behavior: 'smooth' })
    }
  }
  return <section id="trainers" className="py-24 lg:py-32"><div className="mx-auto max-w-7xl px-5 lg:px-8"><Reveal><div className="flex items-end justify-between"><div><p className="eyebrow">THE CREW</p><h2 className="section-title mt-4">MEET YOUR<br /><span className="text-primary">COACHES</span></h2></div><div className="hidden gap-2 lg:flex"><button onClick={() => scroll('left')} className="border border-border p-3 transition-all hover:border-primary hover:bg-primary hover:text-primary-foreground" aria-label="Scroll left"><ChevronLeft size={20} /></button><button onClick={() => scroll('right')} className="border border-border p-3 transition-all hover:border-primary hover:bg-primary hover:text-primary-foreground" aria-label="Scroll right"><ChevronRight size={20} /></button></div></div></Reveal><div className="mt-14 overflow-hidden"><div ref={scrollRef} className="flex gap-6 overflow-x-auto scroll-smooth pb-4 md:gap-8">{trainers.map(([name,specialty,id]) => <Reveal key={name} className="shrink-0 w-72"><article><img className="aspect-4/5 w-full object-cover grayscale transition-all hover:grayscale-0" src={img(id)} alt={`${name}, ${specialty}`} /><h3 className="mt-5 font-heading text-2xl tracking-wide">{name}</h3><p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-widest text-primary">{specialty}</p></article></Reveal>)}</div></div></div></section> 
}

export function ContactUs() { 
  return <section id="contact" className="bg-surface py-24 lg:py-32">
    <div className="mx-auto max-w-7xl px-5 lg:px-8">
      <Reveal>
        <p className="eyebrow">GET IN TOUCH</p>
        <h2 className="section-title mt-4">LET'S TALK<br /><span className="text-primary">WE'RE HERE</span></h2>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">Reach out in whatever way works best for you. We'll get back to you faster than you can say "personal record."</p>
      </Reveal>
      <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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
          <div className="flex flex-col items-center justify-center gap-4 border border-border bg-background p-8">
            <QRCode value={gymData.gym.bookTrial.whatsappLink} size={120} level="H" includeMargin={false} />
            <h3 className="text-center font-heading text-lg">Quick Chat</h3>
            <p className="text-center text-xs text-muted-foreground">Scan to start</p>
          </div>
        </Reveal>
      </div>
      <Reveal className="mt-14">
        <div className="rounded-lg border border-border bg-background p-8 md:p-12">
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
      </Reveal>
    </div>
  </section> 
}

export function Testimonials() { return <section className="py-24 lg:py-32"><div className="mx-auto max-w-7xl px-5 lg:px-8"><Reveal><p className="eyebrow">MEMBER ENERGY</p><h2 className="section-title mt-4">GOOD VIBES<br /><span className="text-primary">REAL RESULTS</span></h2></Reveal><div className="mt-14 grid gap-4 md:grid-cols-3">{[['“Finally, a gym where I actually look forward to showing up. The coaches remember your name and your goals.”','PRIYA K.'],['“The group classes are absolute fire. I have more energy, more confidence, and my jeans fit better.”','ARJUN R.'],['“Global feels like a community, not a membership. Best training decision I have made in Mumbai.”','MEERA S.']].map(([quote,name])=><Reveal key={name}><blockquote className="border-l-2 border-primary bg-surface p-7"><p className="text-lg leading-8 text-foreground">{quote}</p><footer className="mt-8 font-mono text-[10px] font-bold tracking-widest text-primary">— {name}</footer></blockquote></Reveal>)}</div></div></section> }

export function CTA() { 
  return <section className="relative overflow-hidden bg-primary py-20 text-primary-foreground lg:py-28">
    <div className="absolute inset-0 opacity-10">
      <div className="absolute h-40 w-40 rounded-full bg-primary-foreground blur-3xl"></div>
      <div className="absolute bottom-0 right-0 h-60 w-60 rounded-full bg-primary-foreground blur-3xl"></div>
    </div>
    <div className="relative mx-auto flex max-w-7xl flex-col gap-8 px-5 lg:flex-row lg:items-end lg:justify-between lg:px-8"><Reveal><p className="font-mono text-xs font-bold uppercase tracking-[.3em] opacity-75">YOUR NEXT REP STARTS HERE</p><h2 className="mt-4 max-w-3xl font-heading text-6xl leading-[.85] tracking-[.025em] lg:text-8xl">READY TO<br />HAVE SOME FUN?</h2></Reveal><a href={gymData.gym.bookTrial.whatsappLink} target="_blank" rel="noopener noreferrer" className="inline-flex w-fit items-center gap-3 border border-primary-foreground/50 px-6 py-4 text-sm font-black uppercase tracking-wider transition-all hover:bg-primary-foreground hover:text-primary"><MessageCircle size={18} /> Book a free trial</a></div>
  </section> 
}

export function Footer() { 
  return <footer className="bg-background py-14">
    <div className="mx-auto grid max-w-7xl gap-12 px-5 md:grid-cols-3 lg:px-8">
      <div>
        <a href="#top" className="font-heading text-3xl">{gymData.gym.name}<span className="text-primary">.</span></a>
        <p className="mt-4 max-w-xs text-sm leading-6 text-muted-foreground">{gymData.gym.tagline}</p>
        <div className="mt-6 flex gap-4">
          <a href={gymData.gym.social.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-sm font-semibold text-muted-foreground transition-colors hover:text-primary">Instagram</a>
          <a href={gymData.gym.social.youtube} target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="text-sm font-semibold text-muted-foreground transition-colors hover:text-primary">YouTube</a>
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
    <div className="mx-auto mt-14 max-w-7xl border-t border-border px-5 pt-5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground lg:px-8">{gymData.gym.copyright}</div>
  </footer> 
}
