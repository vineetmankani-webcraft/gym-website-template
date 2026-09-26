import type { Metadata } from 'next'
import { Admin } from '@/components/admin/admin'
import './admin.css'
export const metadata: Metadata = { title: 'Website admin', robots: { index: false, follow: false } }
export default function AdminPage() {
  if (process.env.VERCEL === '1') {
    const url = process.env.NEXT_PUBLIC_ADMIN_URL
    return <main className="admin-login"><h1>Website admin</h1><p>Manage this website through the Cloudflare admin portal.</p>{url && /^https:\/\//.test(url) ? <a className="button" href={url}>Open admin portal</a> : <p>Set NEXT_PUBLIC_ADMIN_URL to the Cloudflare admin address.</p>}</main>
  }
  return <Admin />
}
