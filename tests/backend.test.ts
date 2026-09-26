import fs from 'node:fs'
import { beforeAll, beforeEach, afterAll, afterEach, describe, it, expect, vi } from 'vitest'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'
import type { D1Database } from '@cloudflare/workers-types'
import { handle } from '../functions/api/admin/[[path]]'
import { passwordHash, type Env, digest, credentialVersion, type Session } from '../lib/admin/auth'
import { publishingConfig, GitHub, type TreeEntry } from '../lib/admin/github'
import { save } from '../lib/admin/publishing'
import { snapshotSchema } from '../lib/content-schema'
import content from '../data/content.json'
import gym from '../data/gym.json'
import media from '../data/media.json'

let mf: Miniflare, db: D1Database, env: Env
const fixture = () => snapshotSchema.parse(structuredClone({ content, gym, media }))
const origin = 'http://localhost:8788', password = 'Test-only password 2026!'
function req(route: string, body?: unknown, cookie?: string, csrf?: string, from = origin) {
  return new Request(`${origin}/api/admin/${route}`, { method: body === undefined ? 'GET' : 'POST', headers: { Origin: from, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...(csrf ? { 'X-CSRF-Token': csrf } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) })
}
beforeAll(async () => {
  mf = new Miniflare(convertV4MiniflareOptions({ modules: true, script: 'export default {fetch(){return new Response("ok")}}', d1Databases: ['ADMIN_DB'], compatibilityDate: '2026-09-26' }))
  db = await mf.getD1Database('ADMIN_DB') as unknown as D1Database
  const statements = fs.readFileSync('migrations/0001_admin.sql', 'utf8').split(';').map(s => s.trim()).filter(Boolean)
  for (const statement of statements) await db.prepare(statement).run()
  env = { ADMIN_DB: db, ADMIN_USERNAME: 'admin', ADMIN_PASSWORD_HASH: await passwordHash(password), ADMIN_ENV: 'local', ADMIN_ORIGIN: origin, CONTENT_BRANCH: 'admin-preview/test', GITHUB_REPOSITORY: 'owner/repo', GITHUB_APP_ID: '1', GITHUB_INSTALLATION_ID: '2', GITHUB_PRIVATE_KEY: 'test', CLOUDFLARE_API_TOKEN: '', CLOUDFLARE_ACCOUNT_ID: '', CLOUDFLARE_PROJECT_NAME: '' }
})
beforeEach(async () => { for (const table of ['sessions', 'login_limits', 'uploads', 'operations']) await db.prepare(`DELETE FROM ${table}`).run() })
afterEach(() => vi.restoreAllMocks())
afterAll(async () => { await mf?.dispose() })
async function login() {
  const response = await handle(req('login', { username: 'admin', password }), env)
  expect(response.status).toBe(200)
  return { cookie: response.headers.get('Set-Cookie')!.split(';')[0], ...(await response.json() as { csrf: string }) }
}
describe('authentication with real local D1', () => {
  it('issues HttpOnly session, authorizes it, and revokes it at logout', async () => {
    const { cookie, csrf } = await login()
    const response = await handle(req('session', undefined, cookie), env)
    expect(response.status).toBe(200)
    expect((await response.json() as { csrf: string }).csrf).toBe(csrf)
    expect((await db.prepare('SELECT * FROM sessions').all()).results).toHaveLength(1)
    expect((await handle(req('logout', {}, cookie, csrf), env)).status).toBe(200)
    expect((await handle(req('session', undefined, cookie), env)).status).toBe(401)
  })
  it('rejects invalid credentials, CSRF and cross-origin login', async () => {
    expect((await handle(req('login', { username: 'admin', password: 'wrong' }), env)).status).toBe(401)
    expect((await handle(req('login', { username: 'admin', password }, undefined, undefined, 'https://evil.example'), env)).status).toBe(403)
    const auth = await login()
    expect((await handle(req('logout', {}, auth.cookie, 'wrong'), env)).status).toBe(403)
  })
  it('expires sessions and invalidates them on credential rotation', async () => {
    const auth = await login()
    expect((await handle(req('session', undefined, auth.cookie), { ...env, ADMIN_PASSWORD_HASH: env.ADMIN_PASSWORD_HASH + 'rotated' })).status).toBe(401)
    await db.prepare('UPDATE sessions SET expires_at = 0').run()
    expect((await handle(req('session', undefined, auth.cookie), env)).status).toBe(401)
  })
  it('throttles parallel login attempts atomically', async () => {
    const responses = await Promise.all(Array.from({ length: 7 }, () => handle(req('login', { username: 'admin', password: 'wrong' }), env)))
    expect(responses.filter(x => x.status === 429).length).toBe(2)
  })
  it('fails closed for missing secrets, wrong hosts and unauthenticated endpoints', async () => {
    expect((await handle(req('session'), { ...env, ADMIN_PASSWORD_HASH: '' })).status).toBe(503)
    expect((await handle(req('session'), { ...env, ADMIN_ORIGIN: 'https://another.example' })).status).toBe(403)
    for (const route of ['content', 'history', 'media', 'deployment']) expect((await handle(req(route), env)).status).toBe(401)
    for (const route of ['save', 'restore', 'upload']) expect((await handle(req(route, {}), env)).status).toBe(401)
  })
  it('enforces preview branch isolation', () => {
    expect(() => publishingConfig({ ...env, CONTENT_BRANCH: 'main' })).toThrow()
    expect(() => publishingConfig({ ...env, ADMIN_ENV: 'production', CONTENT_BRANCH: 'main', CF_PAGES_BRANCH: 'feature/admin-portal' })).toThrow()
    expect(() => publishingConfig({ ...env, ADMIN_ENV: 'production', CONTENT_BRANCH: 'main', CF_PAGES_BRANCH: 'main' })).not.toThrow()
  })
})
describe('atomic publishing and retry reconciliation', () => {
  const base = 'a'.repeat(40), candidate = 'b'.repeat(40), other = 'c'.repeat(40)
  let head: string, updates: number, publishedTree: { path: string; sha?: string | null }[], current: Session
  beforeEach(() => {
    head = base; updates = 0; publishedTree = []
    current = { token_hash: 'session', csrf: 'csrf', expires_at: Date.now() + 100000, credential_version: credentialVersion(env) }
    const snap = fixture(), blobs = new Map<string, Uint8Array>()
    const tree: TreeEntry[] = Object.entries({ 'data/content.json': snap.content, 'data/gym.json': snap.gym, 'data/media.json': snap.media }).map(([path, value], i) => { const sha = String(i + 1).repeat(40); blobs.set(sha, new TextEncoder().encode(JSON.stringify(value))); return { path, sha, type: 'blob', mode: '100644' } })
    snap.media.forEach((m, i) => tree.push({ path: 'public' + m.path, sha: digest(String(i)).slice(0, 40), type: 'blob', mode: '100644' }))
    tree.push({ path: 'app/page.tsx', sha: 'd'.repeat(40), type: 'blob', mode: '100644' })
    vi.spyOn(GitHub.prototype, 'head').mockImplementation(async () => head)
    vi.spyOn(GitHub.prototype, 'tree').mockResolvedValue(tree)
    vi.spyOn(GitHub.prototype, 'blob').mockImplementation(async sha => new Uint8Array(blobs.get(sha)!))
    vi.spyOn(GitHub.prototype, 'request').mockImplementation(async (path, method, body) => {
      if (path === '/git/trees') { publishedTree = (body as { tree: typeof publishedTree }).tree; return { sha: 'e'.repeat(40) } }
      if (path === '/git/commits') return { sha: candidate }
      if (path === `/git/commits/${base}`) return { tree: { sha: 'f'.repeat(40) } }
      if (path.startsWith('/compare/')) return { status: head === candidate ? 'identical' : 'diverged' }
      throw new Error(`Unexpected GitHub call ${method} ${path}`)
    })
    vi.spyOn(GitHub.prototype, 'updateHead').mockImplementation(async sha => { updates++; head = sha; return {} })
  })
  it('commits approved paths together and makes repeated saves idempotent', async () => {
    const input = { baseRevision: base, operationId: crypto.randomUUID(), snapshot: fixture() }
    input.snapshot.gym.gym.name = 'Updated gym'
    const result = await save(env, current, input)
    expect(result.revision).toBe(candidate)
    expect(publishedTree.map(x => x.path)).toEqual(['data/content.json', 'data/gym.json', 'data/media.json'])
    await save(env, current, input); expect(updates).toBe(1)
    await expect(save(env, current, { ...input, snapshot: fixture() })).rejects.toThrow('identifier')
  })
  it('rejects stale edits before writing any commit', async () => {
    head = other
    await expect(save(env, current, { baseRevision: base, operationId: crypto.randomUUID(), snapshot: fixture() })).rejects.toThrow('changed')
    expect(updates).toBe(0); expect(publishedTree).toHaveLength(0)
  })
  it('reconciles publication when update succeeded but the response was interrupted', async () => {
    vi.spyOn(GitHub.prototype, 'updateHead').mockImplementation(async sha => { head = sha; updates++; throw new Error('connection lost') })
    const input = { baseRevision: base, operationId: crypto.randomUUID(), snapshot: fixture() }
    expect((await save(env, current, input)).revision).toBe(candidate)
    await save(env, current, input); expect(updates).toBe(1)
  })
  it('retries a prepared operation after an upstream outage', async () => {
    const update = vi.spyOn(GitHub.prototype, 'updateHead').mockRejectedValueOnce(new Error('offline')).mockImplementation(async sha => { updates++; head = sha; return {} })
    const input = { baseRevision: base, operationId: crypto.randomUUID(), snapshot: fixture() }
    await expect(save(env, current, input)).rejects.toThrow('offline')
    expect((await save(env, current, input)).revision).toBe(candidate)
    expect(update).toHaveBeenCalledTimes(2)
  })
  it('rejects invented media and removes only unused managed assets', async () => {
    const snapshot = fixture()
    snapshot.media.push({ ...snapshot.media[0], id: 'invented', path: '/media/invented.jpg' })
    await expect(save(env, current, { baseRevision: base, operationId: crypto.randomUUID(), snapshot })).rejects.toThrow('missing')
    const clean = fixture(); clean.media = clean.media.filter(x => x.path !== '/media/hero.mp4')
    await save(env, current, { baseRevision: base, operationId: crypto.randomUUID(), snapshot: clean })
    expect(publishedTree).toContainEqual({ path: 'public/media/hero.mp4', mode: '100644', type: 'blob', sha: null })
    expect(publishedTree.some(x => x.path === 'app/page.tsx')).toBe(false)
  })
})
