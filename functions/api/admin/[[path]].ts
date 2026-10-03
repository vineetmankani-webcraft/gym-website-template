import type { PagesFunction } from '@cloudflare/workers-types'
import { z } from 'zod'
import { boundedBody, checkOrigin, configuration, createSession, csrf, equal, HttpError, readJson, session, sessionCookie, type Env } from '../../../lib/admin/auth'
import { GitHub } from '../../../lib/admin/github'
import { identifyMedia } from '../../../lib/admin/media'
import { createUploadProof, history, loadSnapshot, readUploadProof, restoreSchema, save, saveSchema } from '../../../lib/admin/publishing'
import type { Media } from '../../../lib/content-schema'

const json = (data: unknown, status = 200, headers: Record<string, string> = {}) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex, nofollow', ...headers } })
export async function handle(request: Request, env: Env): Promise<Response> {
  try {
    configuration(env)
    const url = new URL(request.url), route = url.pathname.replace(/^\/api\/admin\//, ''), method = request.method
    if (route === 'login' && method === 'POST') {
      checkOrigin(request)
      const input = z.object({ username: z.string().min(1).max(200), password: z.string().min(1).max(1024) }).strict().parse(await readJson(request, 4096))
      if (!equal(input.username, env.ADMIN_USERNAME) || !equal(input.password, env.ADMIN_PASSWORD)) throw new HttpError(401, 'Invalid username or password')
      const created = await createSession(env)
      return json({ csrf: created.session.csrf, expiresAt: created.session.expiresAt }, 200, { 'Set-Cookie': sessionCookie(created.token, request) })
    }
    const current = await session(request, env)
    if (!['GET', 'HEAD'].includes(method)) csrf(request, current)
    if (route === 'session' && method === 'GET') return json({ csrf: current.csrf, expiresAt: current.expiresAt })
    if (route === 'logout' && method === 'POST') return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie('', request, 0) })
    if (route === 'content' && method === 'GET') { const result = await loadSnapshot(new GitHub(env)); return json({ revision: result.revision, snapshot: result.snapshot }) }
    if (route === 'save' && method === 'POST') return json(await save(env, saveSchema.parse(await readJson(request))))
    if (route === 'restore' && method === 'POST') {
      const input = restoreSchema.parse(await readJson(request)), source = await loadSnapshot(new GitHub(env), input.revision)
      return json(await save(env, { baseRevision: input.baseRevision, operationId: input.operationId, snapshot: source.snapshot, uploads: [] }, input.revision))
    }
    if (route === 'history' && method === 'GET') return json(await history(env))
    if (route === 'upload' && method === 'POST') {
      const bytes = await boundedBody(request, 20 * 1024 * 1024), info = identifyMedia(bytes)
      const id = `asset-${crypto.randomUUID()}`, path = `/media/${id}.${info.extension}`
      const name = decodeURIComponent(request.headers.get('X-File-Name') ?? 'Uploaded media').replace(/[<>\x00-\x1f]/g, '').slice(0, 200) || 'Uploaded media'
      const media: Media = { id, path, name, type: info.type as Media['type'], size: bytes.length }
      const sha = await new GitHub(env).putBlob(bytes)
      return json({ media, uploadToken: await createUploadProof(env, media, sha) }, 201)
    }
    if (route === 'media' && method === 'GET') {
      const git = new GitHub(env), uploadToken = url.searchParams.get('upload')
      let sha: string | undefined, type: string | undefined
      if (uploadToken) { const proof = await readUploadProof(env, uploadToken); sha = proof.sha; type = proof.media.type }
      else {
        const path = url.searchParams.get('path') ?? '', data = await loadSnapshot(git), media = data.snapshot.media.find(m => m.path === path)
        if (media) { type = media.type; sha = data.tree.find(t => t.path === 'public' + path)?.sha }
      }
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
