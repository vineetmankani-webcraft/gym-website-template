'use client'
import { useId } from 'react'
import type { Media } from '@/lib/content-schema'

export type Value = string | number | boolean | null | Value[] | { [key: string]: Value }
export const title = (value: string) => value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^[a-z]/, x => x.toUpperCase())
const choices: Record<string, string[]> = { icon: ['strength', 'cardio', 'classes', 'personal', 'zumba', 'recovery'], position: ['center', 'top', 'bottom', 'left', 'right'] }
const mediaKeys = ['src', 'video', 'poster', 'logo', 'favicon', 'sharingImage']
const itemTemplates: Record<string, Value> = {
  'navigation.links': { id: 'new', label: 'New link', href: '#about' },
  'marquee.items': { id: 'new', text: 'New item' },
  'services.items': { id: 'new', icon: 'strength', title: 'New service', description: '' },
  'gallery.images': { id: 'new', src: '', alt: 'Describe the photograph', position: 'center' },
  'trainers.people': { id: 'new', name: 'New coach', specialty: '', src: '', alt: 'Coach portrait', position: 'center' },
  'testimonials.items': { id: 'new', quote: 'Member testimonial', name: 'Member name' },
}
export function Fields({ value, template, path, onChange, media, uploadTokens, issues }: { value: Value; template?: Value; path: string; onChange: (v: Value) => void; media: Media[]; uploadTokens: Record<string, string>; issues: Record<string, string> }) {
  const inputId = useId(), key = path.split('.').at(-1)!, error = issues[path]
  if (Array.isArray(value)) {
    const items = value
    const fixed = key === 'headline'
    const example = itemTemplates[path.replace(/^content\./, '')] ?? (Array.isArray(template) ? template[0] : undefined)
    function add() { const item = structuredClone(example ?? ''); if (item && typeof item === 'object' && !Array.isArray(item)) { if ('id' in item) item.id = `item-${crypto.randomUUID()}`; if ('src' in item) item.src = media.find(m => m.type.startsWith('image/'))?.path ?? '' }; onChange([...items, item]) }
    return <fieldset className="admin-group"><legend>{title(key)}</legend>{value.map((item, i) => <div className="admin-repeat" key={item && typeof item === 'object' && !Array.isArray(item) && typeof item.id === 'string' ? item.id : i}>
      <div className="admin-row"><strong>{title(key)} {i + 1}</strong>{!fixed && <div className="admin-actions"><button type="button" disabled={!i} aria-label={`Move ${title(key)} ${i + 1} up`} onClick={() => { const items = [...value]; [items[i - 1], items[i]] = [items[i], items[i - 1]]; onChange(items) }}>↑</button><button type="button" disabled={i === value.length - 1} aria-label={`Move ${title(key)} ${i + 1} down`} onClick={() => { const items = [...value]; [items[i + 1], items[i]] = [items[i], items[i + 1]]; onChange(items) }}>↓</button><button type="button" onClick={() => { if (confirm('Remove this item? Save changes to publish the removal.')) onChange(value.filter((_, n) => n !== i)) }}>Remove</button></div>}</div>
      <Fields value={item} template={example} path={`${path}.${i}`} onChange={v => onChange(value.map((x, n) => n === i ? v : x))} media={media} uploadTokens={uploadTokens} issues={issues} />
    </div>)}{!fixed && <button type="button" onClick={add}>Add {title(key).toLowerCase()}</button>}{error && <p className="admin-error">{error}</p>}</fieldset>
  }
  if (value !== null && typeof value === 'object') return <div className="admin-fields">{Object.entries(value).filter(([k]) => k !== 'id' && k !== 'key').map(([k, v]) => <Fields key={k} value={v} template={template && typeof template === 'object' && !Array.isArray(template) ? template[k] : undefined} path={`${path}.${k}`} onChange={next => onChange({ ...value, [k]: next })} media={media} uploadTokens={uploadTokens} issues={issues} />)}</div>
  if (typeof value === 'boolean') return <label className="admin-check"><input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} />{title(key)}</label>
  if (typeof value !== 'string') return null
  const select = choices[key]
  const assets = media.filter(m => key === 'video' ? m.type.startsWith('video/') : m.type.startsWith('image/'))
  return <div className="admin-field"><label htmlFor={inputId}>{title(key)}</label>
    {mediaKeys.includes(key) ? <><select id={inputId} value={value} onChange={e => onChange(e.target.value)} aria-invalid={!!error}><option value="">None</option>{assets.map(m => <option key={m.id} value={m.path}>{m.name}</option>)}</select>{value && key !== 'video' && <img className="admin-field-image" alt="Selected media preview" src={uploadTokens[value] ? `/api/admin/media?upload=${encodeURIComponent(uploadTokens[value])}` : `/api/admin/media?path=${encodeURIComponent(value)}`} />}</> : select ? <select id={inputId} value={value} onChange={e => onChange(e.target.value)}>{select.map(x => <option key={x}>{x}</option>)}</select> : value.length > 100 || ['description', 'quote', 'message', 'intro', 'tagline'].includes(key) ? <textarea id={inputId} value={value} rows={3} onChange={e => onChange(e.target.value)} aria-invalid={!!error} aria-describedby={error ? `${inputId}-error` : undefined} /> : <input id={inputId} value={value} onChange={e => onChange(e.target.value)} aria-invalid={!!error} aria-describedby={error ? `${inputId}-error` : undefined} />}
    {key === 'formatted' && <small>Leave empty to use the address fields above.</small>}{key === 'action' && path.includes('form') && <small>Use your HTTPS form provider endpoint.</small>}
    {error && <p id={`${inputId}-error`} className="admin-error">{error}</p>}
  </div>
}
