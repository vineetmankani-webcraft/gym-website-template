import { Nav, Hero, Marquee, About, Services, Gallery, Trainers, ContactUs, Testimonials, Footer, WhatsAppFloat } from '@/components/gym/sections'
import content from '@/data/content.json'

export default function Page() {
  return <><Nav /><main id={content.navigation.mainId}><Hero /><Marquee /><About /><Services /><Gallery /><Trainers /><Testimonials /><ContactUs /></main><Footer /><WhatsAppFloat /></>
}
