'use client'
import { useEffect, useRef, useState } from 'react'
import { snapshotSchema, type Snapshot } from '@/lib/content-schema'
import defaultContent from '@/data/content.json'
import defaultGym from '@/data/gym.json'
import defaultMedia from '@/data/media.json'
import { Fields, title, type Value } from './fields'
import { MediaLibrary } from './media-library'

const defaults = snapshotSchema.parse({ content: defaultContent, gym: defaultGym, media: defaultMedia })
type Login = { csrf: string; expiresAt: number }
type Revision = { revision: string; message: string; date: string }
type Status = { state: string; message: string }
class ApiError extends Error { constructor(message: string, public status: number, public issues?: { path: string; message: string }[]) { super(message) } }
const tabs = ['Overview', 'Gym details', 'Page structure', 'Navigation', 'Hero', 'Marquee', 'About', 'Services', 'Gallery', 'Trainers', 'Testimonials', 'Contact', 'Footer', 'WhatsApp button', 'SEO and branding', 'Media library', 'History']
const keys: Record<string, keyof Snapshot['content']> = { Navigation: 'navigation', Hero: 'hero', Marquee: 'marquee', About: 'about', Services: 'services', Gallery: 'gallery', Trainers: 'trainers', Testimonials: 'testimonials', Contact: 'contact', Footer: 'footer', 'WhatsApp button': 'whatsappFloat', 'SEO and branding': 'site' }

export function Admin() {
  const [auth, setAuth] = useState<Login | null>(null), [checking, setChecking] = useState(true)
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null), [baseline, setBaseline] = useState(''), [revision, setRevision] = useState('')
  const [tab, setTab] = useState('Overview'), [error, setError] = useState(''), [issues, setIssues] = useState<Record<string, string>>({}), [busy, setBusy] = useState(false), [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState<Status | null>(null), [records, setRecords] = useState<Revision[]>([]), [preview, setPreview] = useState(false), [mobile, setMobile] = useState(false)
  const [localMode, setLocalMode] = useState(false)
  const [uploadTokens, setUploadTokens] = useState<Record<string, string>>({})
  const [uncertain, setUncertain] = useState(false)
  const pending = useRef<{ route: string; body: Record<string, unknown> } | null>(null), frame = useRef<HTMLIFrameElement>(null), previewDialog = useRef<HTMLDialogElement>(null)
  const dirty = snapshot !== null && JSON.stringify(snapshot) !== baseline
  async function api<T>(route: string, body?: unknown, token = auth?.csrf): Promise<T> {
    const response = await fetch(`/api/admin/${route}`, { method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store', headers: body === undefined ? {} : { 'Content-Type': 'application/json', 'X-CSRF-Token': token ?? '' }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(90000) })
    const data = await response.json().catch(() => ({ error: 'Admin service unavailable. Start the Cloudflare local server or check deployment configuration.' }))
    if (!response.ok) { if (response.status === 401) setAuth(null); throw new ApiError(data.error || 'Request failed', response.status, data.issues) }
    return data as T
  }
  function showError(e: unknown) {
    setError(e instanceof Error ? e.message : 'Request failed. Retry without leaving this page.')
    if (e instanceof ApiError && e.issues) setIssues(Object.fromEntries(e.issues.map(x => [x.path.replace(/^snapshot\./, ''), x.message])))
  }
  async function load() {
    const data = await api<{ snapshot: Snapshot; revision: string; mode?: string }>('content')
    setLocalMode(data.mode === 'local')
    setSnapshot(data.snapshot); setBaseline(JSON.stringify(data.snapshot)); setRevision(data.revision); setIssues({})
    setUploadTokens({}); setStatus({ state: 'saved', message: data.mode === 'local' ? 'Local website content loaded' : 'Content loaded from GitHub' })
  }
  useEffect(() => { void api<Login>('session').then(setAuth).catch(e => { if (!(e instanceof ApiError) || e.status !== 401) showError(e) }).finally(() => setChecking(false)) }, [])
  useEffect(() => { if (auth && !snapshot) void load().catch(showError) }, [auth])
  useEffect(() => {
    const protect = (e: BeforeUnloadEvent) => { if (dirty || uncertain || uploading) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', protect); return () => window.removeEventListener('beforeunload', protect)
  }, [dirty, uncertain, uploading])
  function sendPreview() { if (snapshot) frame.current?.contentWindow?.postMessage({ type: 'gym-preview', snapshot, uploadTokens }, location.origin) }
  useEffect(() => { if (preview && previewDialog.current && !previewDialog.current.open) previewDialog.current.showModal() }, [preview])
  useEffect(() => { const ready = (e: MessageEvent) => { if (e.origin === location.origin && e.source === frame.current?.contentWindow && e.data?.type === 'gym-preview-ready') sendPreview() }; window.addEventListener('message', ready); sendPreview(); return () => window.removeEventListener('message', ready) }, [snapshot, uploadTokens, preview])
  async function publish(restoreRevision?: string) {
    if (!snapshot) return
    setError(''); setIssues({})
    if (!pending.current) {
      const checked = snapshotSchema.safeParse(snapshot)
      if (!restoreRevision && !checked.success) { const errors = Object.fromEntries(checked.error.issues.map(x => [x.path.join('.'), x.message])); setIssues(errors); setError('Check the fields listed below before saving.'); return }
      pending.current = { route: restoreRevision ? 'restore' : 'save', body: { operationId: crypto.randomUUID(), baseRevision: revision, ...(restoreRevision ? { revision: restoreRevision } : { snapshot, uploads: Object.values(uploadTokens) }) } }
    }
    setBusy(true); setUncertain(true)
    try {
      const result = await api<{ revision: string }>(pending.current.route, pending.current.body)
      const restored = pending.current.route === 'restore'
      pending.current = null; setUncertain(false); setRevision(result.revision); setStatus({ state: 'saved', message: localMode ? 'Saved locally. Refresh the website to see it.' : 'Saved. Cloudflare is rebuilding the website' })
      if (restored) await load(); else { setBaseline(JSON.stringify(snapshot)); setUploadTokens({}) }
    } catch (e) {
      if (e instanceof ApiError && [400, 409, 413, 415].includes(e.status)) { pending.current = null; setUncertain(false) }
      showError(e)
    } finally { setBusy(false) }
  }
  async function selectTab(next: string) {
    setTab(next)
    if (next === 'History') try { setRecords(await api<Revision[]>('history')) } catch (e) { showError(e) }
  }
  async function login(form: HTMLFormElement) {
    setError(''); setBusy(true)
    try { const data = new FormData(form); const user = await api<Login>('login', { username: data.get('username'), password: data.get('password') }); form.reset(); setAuth(user) } catch (e) { showError(e) } finally { setBusy(false) }
  }
  if (checking) return <main className="admin-login"><p>Checking your session…</p></main>
  if (!auth) return <main className="admin-login"><a href="/">← Back to website</a><p className="admin-brand">Global Gym / Website admin</p><h1>Your website.<br />Your updates.</h1><p>Sign in to manage content, photographs and gym details.</p>{dirty && <p>Your unsaved edits are still here. Sign in again to continue.</p>}<form onSubmit={e => { e.preventDefault(); void login(e.currentTarget) }}><label htmlFor="username">Username</label><input id="username" name="username" autoComplete="username" required maxLength={200} /><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required maxLength={1024} /><button className="admin-primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button></form>{error && <p role="alert" className="admin-error">{error}</p>}</main>
  const contentKey = keys[tab]
  const lock = busy || uploading || uncertain
  return <div className="admin-shell"><aside className="admin-sidebar"><a href="/" className="admin-brand">{snapshot?.gym.gym.name ?? 'Gym'}<span>Website admin</span></a><nav aria-label="Admin sections">{tabs.map(t => <button key={t} aria-current={tab === t ? 'page' : undefined} onClick={() => void selectTab(t)}>{t}</button>)}</nav><button disabled={lock} onClick={async () => { if (dirty && !confirm('Discard unsaved changes and sign out?')) return; try { await api('logout', {}); setAuth(null); setSnapshot(null); setBaseline(''); setUploadTokens({}) } catch (e) { showError(e) } }}>Sign out</button></aside>
    <main className="admin-main"><header className="admin-heading"><div><p>Content management</p><h1>{tab}</h1></div><a href="/" target="_blank" rel="noopener noreferrer">View website ↗</a></header>
      {error && <div role="alert" className="admin-error"><p>{error}</p>{Object.keys(issues).length > 0 && <ul>{Object.entries(issues).map(([path, message]) => <li key={path}>{path}: {message}</li>)}</ul>}{!uncertain && <button disabled={busy} onClick={() => { if (!dirty || confirm('Reload and discard unsaved changes?')) void load().then(() => setError('')).catch(showError) }}>Reload saved content</button>}</div>}
      {uncertain && !busy && <p className="admin-notice">The last save has not been confirmed. Use “Retry save” to check the same operation before making more edits.</p>}
      {!snapshot ? <p>Loading website content…</p> : <>
        {tab === 'Overview' && <section className="admin-overview"><h2>Keep your gym up to date.</h2><p>Update the details members see, introduce a coach, or give the gallery a fresh look. Save changes when you are ready to put them on the website.</p><div className="admin-overview-links"><button onClick={() => setTab('Gym details')}>Edit gym details</button><button onClick={() => setTab('Media library')}>Manage photographs</button><button onClick={() => setTab('Trainers')}>Update the coaches</button></div><h3>Publication</h3><p role="status">{status?.message}</p><p className="admin-muted">Revision {revision.slice(0, 10)}</p><p>{localMode ? 'Local saves update this checkout immediately. Refresh the website tab after saving.' : 'Each save commits the changes to GitHub. Cloudflare then rebuilds the website.'}</p></section>}
        <fieldset className="admin-editor" disabled={lock}>
          {tab === 'Gym details' && <Fields value={snapshot.gym.gym as unknown as Value} template={defaults.gym.gym as unknown as Value} path="gym.gym" media={snapshot.media} uploadTokens={uploadTokens} issues={issues} onChange={v => setSnapshot({ ...snapshot, gym: { gym: v as Snapshot['gym']['gym'] } })} />}
          {contentKey && <Fields value={snapshot.content[contentKey] as unknown as Value} template={defaults.content[contentKey] as unknown as Value} path={`content.${contentKey}`} media={snapshot.media} uploadTokens={uploadTokens} issues={issues} onChange={v => setSnapshot({ ...snapshot, content: { ...snapshot.content, [contentKey]: v } })} />}
          {tab === 'Page structure' && <section><p>Reorder the main sections. Hidden sections keep their content and are removed from navigation.</p>{snapshot.content.sections.map((s, i) => <div key={s.key} className="admin-structure"><label><input type="checkbox" checked={s.visible} onChange={e => setSnapshot({ ...snapshot, content: { ...snapshot.content, sections: snapshot.content.sections.map(x => x.key === s.key ? { ...x, visible: e.target.checked } : x) } })} /> {title(s.key)}</label><div className="admin-actions">{[-1, 1].map(d => <button key={d} aria-label={`Move ${s.key} ${d === -1 ? 'up' : 'down'}`} disabled={i + d < 0 || i + d >= 8} onClick={() => { const sections = [...snapshot.content.sections]; [sections[i], sections[i + d]] = [sections[i + d], sections[i]]; setSnapshot({ ...snapshot, content: { ...snapshot.content, sections } }) }}>{d === -1 ? '↑' : '↓'}</button>)}</div></div>)}</section>}
          {tab === 'History' && <section><p>Restore content and photographs without changing application code. Older revisions from before the admin portal may not be compatible.</p>{records.map(r => <article key={r.revision} className="admin-history"><div><h3>{r.message}</h3><p>{new Date(r.date).toLocaleString()} · {r.revision.slice(0, 10)}</p></div><button disabled={r.revision === revision} onClick={() => { if (confirm('Restore this revision and publish it? Unsaved edits will be replaced.')) void publish(r.revision) }}>Restore</button></article>)}</section>}
        </fieldset>
        {tab === 'Media library' && <fieldset className="admin-editor" disabled={busy || uncertain}><MediaLibrary snapshot={snapshot} csrf={auth.csrf} uploadTokens={uploadTokens} onUpload={(path, token) => setUploadTokens(current => ({ ...current, [path]: token }))} onChange={setSnapshot} onUnauthorized={() => setAuth(null)} onBusy={setUploading} /></fieldset>}
      </>}
    </main>
    <footer className="admin-savebar"><div role="status"><strong>{busy ? 'Working…' : dirty ? 'Unsaved changes' : 'All changes saved'}</strong><span>{status?.message}</span></div><div className="admin-actions"><button disabled={!snapshot || busy || uploading} onClick={() => { const parsed = snapshotSchema.safeParse(snapshot); if (!parsed.success) { setError('Fix validation errors before previewing.'); setIssues(Object.fromEntries(parsed.error.issues.map(x => [x.path.join('.'), x.message]))); return }; setPreview(true) }}>Preview</button><button disabled={!dirty || lock} onClick={() => { if (confirm('Discard unsaved changes?')) { setSnapshot(JSON.parse(baseline)); setUploadTokens({}); setIssues({}); setError('') } }}>Discard</button><button className="admin-primary" disabled={!snapshot || busy || uploading || (!dirty && !uncertain)} onClick={() => void publish()}>{busy ? 'Saving…' : uncertain ? 'Retry save' : 'Save changes'}</button></div></footer>
    {preview && <dialog ref={previewDialog} className="admin-preview" aria-label="Website preview" onCancel={() => setPreview(false)}><header><h2>Website preview</h2><div className="admin-actions"><button onClick={() => setMobile(!mobile)}>{mobile ? 'Desktop width' : 'Mobile width'}</button><button autoFocus onClick={() => setPreview(false)}>Close preview</button></div></header><iframe ref={frame} title="Website preview" src="/admin/preview" style={{ width: mobile ? '390px' : '100%' }} onLoad={sendPreview} /></dialog>}
  </div>
}
