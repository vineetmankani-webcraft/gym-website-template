import type { PagesFunction } from '@cloudflare/workers-types'
import { z } from 'zod'
import { boundedBody, checkOrigin, configuration, credentialVersion, csrf, digest, equal, HttpError, randomToken, readJson, session, sessionCookie, throttle, verifyPassword, type Env } from '../../../lib/admin/auth'
import { GitHub } from '../../../lib/admin/github'
import { identifyMedia } from '../../../lib/admin/media'
import { deployment, history, loadSnapshot, restoreSchema, save, saveSchema } from '../../../lib/admin/publishing'

const json = (data: unknown, status = 200, headers: Record<string, string> = {}) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex, nofollow', ...headers } })
export async function handle(request: Request, env: Env): Promise<Response> {
  try {
    configuration(env, request)
    const url = new URL(request.url), route = url.pathname.replace(/^\/api\/admin\//, '')
    const method = request.method
    if (route === 'login' && method === 'POST') {
      checkOrigin(request, env)
      const input = z.object({ username: z.string().min(1).max(200), password: z.string().min(1).max(1024) }).strict().parse(await readJson(request, 4096))
      const pair = await throttle(env, request.headers.get('CF-Connecting-IP') ?? 'local', input.username)
      const valid = await verifyPassword(input.password, env.ADMIN_PASSWORD_HASH)
      if (!valid || !equal(input.username, env.ADMIN_USERNAME)) throw new HttpError(401, 'Invalid username or password')
      const token = randomToken(), csrfToken = randomToken(), expires = Date.now() + 28800000
      await env.ADMIN_DB.batch([
        env.ADMIN_DB.prepare('INSERT INTO sessions (token_hash, csrf, expires_at, credential_version) VALUES (?, ?, ?, ?)').bind(digest(token), csrfToken, expires, credentialVersion(env)),
        env.ADMIN_DB.prepare('DELETE FROM login_limits WHERE key = ? OR expires_at < ?').bind(pair, Date.now()),
        env.ADMIN_DB.prepare('DELETE FROM sessions WHERE expires_at < ? OR credential_version != ?').bind(Date.now(), credentialVersion(env)),
        env.ADMIN_DB.prepare('DELETE FROM uploads WHERE expires_at < ?').bind(Date.now()),
      ])
      return json({ csrf: csrfToken, expiresAt: expires }, 200, { 'Set-Cookie': sessionCookie(token, env) })
    }
    const current = await session(request, env)
    if (!['GET', 'HEAD'].includes(method)) csrf(request, env, current)
    if (route === 'session' && method === 'GET') return json({ csrf: current.csrf, expiresAt: current.expires_at, environment: env.ADMIN_ENV })
    if (route === 'logout' && method === 'POST') {
      await env.ADMIN_DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(current.token_hash).run()
      return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie('', env, 0) })
    }
    if (route === 'content' && method === 'GET') { const result = await loadSnapshot(new GitHub(env)); return json({ revision: result.revision, snapshot: result.snapshot }) }
    if (route === 'save' && method === 'POST') return json(await save(env, current, saveSchema.parse(await readJson(request))))
    if (route === 'restore' && method === 'POST') {
      const input = restoreSchema.parse(await readJson(request))
      const source = await loadSnapshot(new GitHub(env), input.revision)
      return json(await save(env, current, { baseRevision: input.baseRevision, operationId: input.operationId, snapshot: source.snapshot }, input.revision))
    }
    if (route === 'history' && method === 'GET') return json(await history(env))
    if (route === 'deployment' && method === 'GET') return json(await deployment(env, z.string().regex(/^[a-f0-9]{40}$/).parse(url.searchParams.get('revision'))))
    if (route === 'upload' && method === 'POST') {
      const bytes = await boundedBody(request, 20 * 1024 * 1024), info = identifyMedia(bytes)
      const id = `asset-${crypto.randomUUID()}`, path = `/media/${id}.${info.extension}`
      const name = decodeURIComponent(request.headers.get('X-File-Name') ?? 'Uploaded media').replace(/[<>\x00-\x1f]/g, '').slice(0, 200) || 'Uploaded media'
      const media = { id, path, name, type: info.type, size: bytes.length }
      const sha = await new GitHub(env).putBlob(bytes)
      await env.ADMIN_DB.prepare('INSERT INTO uploads (id, session_hash, path, blob_sha, metadata, expires_at) VALUES (?, ?, ?, ?, ?, ?)').bind(id, current.token_hash, path, sha, JSON.stringify(media), Date.now() + 28800000).run()
      return json(media, 201)
    }
    if (route === 'media' && method === 'GET') {
      const path = url.searchParams.get('path') ?? '', git = new GitHub(env)
      const upload = await env.ADMIN_DB.prepare('SELECT blob_sha, metadata FROM uploads WHERE path = ? AND session_hash = ? AND expires_at > ?').bind(path, current.token_hash, Date.now()).first<{ blob_sha: string; metadata: string }>()
      let sha: string | undefined, type: string | undefined
      if (upload) { sha = upload.blob_sha; type = JSON.parse(upload.metadata).type }
      else { const data = await loadSnapshot(git); const media = data.snapshot.media.find(m => m.path === path); if (media) { type = media.type; sha = data.tree.find(t => t.path === 'public' + path)?.sha } }
      if (!sha || !type) throw new HttpError(404, 'Media not found')
      return new Response(await git.blob(sha), { headers: { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox" } })
    }
    throw new HttpError(404, 'Admin endpoint not found')
  } catch (error) {
    if (error instanceof z.ZodError) return json({ error: 'Check the highlighted fields', issues: error.issues.map(i => ({ path: i.path.join('.'), message: i.message })) }, 400)
    if (error instanceof HttpError) return json({ error: error.message }, error.status)
    return json({ error: 'Admin service is unavailable. Check configuration or retry; your edits have not been discarded' }, 503)
  }
}
export const onRequest: PagesFunction<Env> = async context => handle(context.request as unknown as Request, context.env) as unknown as ReturnType<PagesFunction<Env>>
