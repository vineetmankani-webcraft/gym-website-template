import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import content from '@/data/content.json'
import './globals.css'

export const metadata: Metadata = {
  title: content.site.title,
  description: content.site.description,
  generator: content.site.generator,
}

export const viewport: Viewport = { colorScheme: 'dark', themeColor: content.site.themeColor, width: 'device-width', initialScale: 1 }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang={content.site.language} className="bg-background"><body className="antialiased">{children}{process.env.NODE_ENV === 'production' && <Analytics />}</body></html>
}
