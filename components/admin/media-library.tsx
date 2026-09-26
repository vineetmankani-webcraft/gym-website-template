'use client'
import { useRef, useState } from 'react'
import { mediaUsage, type Media, type Snapshot } from '@/lib/content-schema'

async function resize(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file
  const bitmap = await createImageBitmap(file), scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas'); canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close()
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', .86))
  return blob && blob.size < file.size ? new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' }) : file
}
function replacePaths(value: unknown, oldPath: string, newPath: string): unknown {
  if (value === oldPath) return newPath
  if (Array.isArray(value)) return value.map(v => replacePaths(v, oldPath, newPath))
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, replacePaths(v, oldPath, newPath)]))
  return value
}
export function MediaLibrary({ snapshot, csrf, onChange, onUnauthorized, onBusy }: { snapshot: Snapshot; csrf: string; onChange: (s: Snapshot) => void; onUnauthorized: () => void; onBusy: (v: boolean) => void }) {
  const [compress, setCompress] = useState(true), [progress, setProgress] = useState<number | null>(null), [error, setError] = useState(''), [retry, setRetry] = useState<File | null>(null), [replace, setReplace] = useState<string>('')
  const input = useRef<HTMLInputElement>(null)
  async function upload(original: File) {
    setError(''); setRetry(original); setProgress(0); onBusy(true)
    try {
      const file = compress ? await resize(original) : original
      if (file.size > (file.type.startsWith('video/') ? 20 : 8) * 1024 * 1024) throw new Error('Compress the file first: maximum 8 MiB per image or 20 MiB per video.')
      const asset = await new Promise<Media>((resolve, reject) => {
        const xhr = new XMLHttpRequest(); xhr.open('POST', '/api/admin/upload'); xhr.timeout = 180000
        xhr.setRequestHeader('X-CSRF-Token', csrf); xhr.setRequestHeader('X-File-Name', encodeURIComponent(file.name)); xhr.setRequestHeader('Content-Type', 'application/octet-stream')
        xhr.upload.onprogress = e => { if (e.lengthComputable) setProgress(Math.round(e.loaded / e.total * 100)) }
        xhr.onerror = () => reject(new Error('Upload interrupted. Retry the file.')); xhr.ontimeout = () => reject(new Error('Upload timed out. Retry the file.'))
        xhr.onload = () => { try { const data = JSON.parse(xhr.responseText); if (xhr.status === 401) onUnauthorized(); if (xhr.status >= 200 && xhr.status < 300) resolve(data); else reject(new Error(data.error || 'Upload failed')) } catch { reject(new Error('Upload service unavailable')) } }
        xhr.send(file)
      })
      let next = structuredClone(snapshot)
      if (replace) {
        const old = next.media.find(m => m.path === replace)
        if (old && old.type.split('/')[0] !== asset.type.split('/')[0]) throw new Error('Choose the same kind of file as the asset being replaced.')
        next.content = replacePaths(next.content, replace, asset.path) as Snapshot['content']
        next.media = next.media.filter(m => m.path !== replace)
      }
      next.media.push(asset); onChange(next); setRetry(null); setReplace('')
    } catch (e) { setError(e instanceof Error ? e.message : 'Upload failed') } finally { setProgress(null); onBusy(false); if (input.current) input.current.value = '' }
  }
  return <section><p>Add photographs here, then choose them in a website section. Replacing an asset updates every place it is used. Changes go live when you save.</p>
    <div className="admin-upload"><label className="admin-check"><input type="checkbox" checked={compress} onChange={e => setCompress(e.target.checked)} />Resize images to 2400px and compress when smaller</label><input ref={input} aria-label="Upload media" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" disabled={progress !== null} onChange={e => { if (e.target.files?.[0]) void upload(e.target.files[0]) }} />{replace && <p>Replacing {snapshot.media.find(m => m.path === replace)?.name}. <button onClick={() => setReplace('')}>Cancel replacement</button></p>}{progress !== null && <label>Uploading {progress}%<progress value={progress} max={100} /></label>}{error && <p role="alert" className="admin-error">{error} {retry && <button onClick={() => void upload(retry)}>Retry upload</button>}</p>}</div>
    <div className="admin-media-grid">{snapshot.media.map(m => { const usage = mediaUsage(snapshot, m.path); return <article key={m.id} className="admin-media-item">{m.type.startsWith('video/') ? <video controls preload="none" src={`/api/admin/media?path=${encodeURIComponent(m.path)}`} /> : <img loading="lazy" src={`/api/admin/media?path=${encodeURIComponent(m.path)}`} alt={m.name} />}<h3>{m.name}</h3><p>{(m.size / 1024 / 1024).toFixed(2)} MiB · {usage.length ? `Used in ${usage.length} places` : 'Not used'}</p>{usage.length > 0 && <details><summary>Show usage</summary><ul>{usage.map(u => <li key={u}>{u.replace(/^content\./, '')}</li>)}</ul></details>}<div className="admin-actions"><button disabled={progress !== null} onClick={() => { setReplace(m.path); input.current?.focus(); input.current?.scrollIntoView({ block: 'center' }) }}>Replace</button><button disabled={usage.length > 0 || progress !== null} title={usage.length ? 'Remove references before deleting' : 'Remove from this website'} onClick={() => { if (confirm('Remove this asset from the website? It remains in Git history.')) onChange({ ...snapshot, media: snapshot.media.filter(x => x.id !== m.id) }) }}>Remove</button></div></article> })}</div>
  </section>
}
