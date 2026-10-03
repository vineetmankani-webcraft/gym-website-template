'use client'
import { useEffect, useState } from 'react'
import { Site } from '@/components/gym/site'
import { snapshotSchema, type Snapshot } from '@/lib/content-schema'
export default function Preview() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.origin !== location.origin || event.source !== window.parent || event.data?.type !== 'gym-preview') return
      const result = snapshotSchema.safeParse(event.data.snapshot)
      if (!result.success) return
      const uploadTokens = event.data.uploadTokens && typeof event.data.uploadTokens === 'object' ? event.data.uploadTokens as Record<string, unknown> : {}
      const paths = new Set(result.data.media.map(m => m.path))
      const map = (v: unknown): unknown => typeof v === 'string' && paths.has(v) ? typeof uploadTokens[v] === 'string' ? `/api/admin/media?upload=${encodeURIComponent(uploadTokens[v])}` : `/api/admin/media?path=${encodeURIComponent(v)}` : Array.isArray(v) ? v.map(map) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, map(x)])) : v
      setSnapshot({ ...result.data, content: map(result.data.content) as Snapshot['content'] })
    }
    const stopSubmit = (e: Event) => e.preventDefault()
    window.addEventListener('message', listener); document.addEventListener('submit', stopSubmit, true)
    window.parent.postMessage({ type: 'gym-preview-ready' }, location.origin)
    return () => { window.removeEventListener('message', listener); document.removeEventListener('submit', stopSubmit, true) }
  }, [])
  return snapshot ? <Site snapshot={snapshot} /> : <p style={{ padding: 32 }}>Preparing preview…</p>
}
