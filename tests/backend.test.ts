import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { handle } from '../functions/api/admin/[[path]]'
import { signData, type Env } from '../lib/admin/auth'
import { GitHub, type TreeEntry } from '../lib/admin/github'
import { createUploadProof, readUploadProof, save } from '../lib/admin/publishing'
import { snapshotSchema, type Media } from '../lib/content-schema'
import content from '../data/content.json'
import gym from '../data/gym.json'
import media from '../data/media.json'

const origin = 'http://localhost:8788', password = 'Test-only password 2026!'
const env: Env = { ADMIN_USERNAME: 'admin', ADMIN_PASSWORD: password, GITHUB_REPOSITORY: 'owner/repo', GITHUB_TOKEN: 'test-token', CONTENT_BRANCH: 'feature/admin-portal' }
const fixture = () => snapshotSchema.parse(structuredClone({ content, gym, media }))
function req(route: string, body?: unknown, cookie?: string, csrf?: string, from = origin) {
  return new Request(`${origin}/api/admin/${route}`, { method: body === undefined ? 'GET' : 'POST', headers: { Origin: from, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...(csrf ? { 'X-CSRF-Token': csrf } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) })
}
async function login(target = env) {
  const response = await handle(req('login', { username: 'admin', password }), target)
  expect(response.status).toBe(200)
  return { cookie: response.headers.get('Set-Cookie')!.split(';')[0], ...(await response.json() as { csrf: string }) }
}

afterEach(() => vi.restoreAllMocks())
describe('minimal stateless authentication', () => {
  it('issues an HttpOnly signed cookie and authorizes it', async () => {
    const auth = await login()
    expect(auth.cookie).toContain('gym_admin_local=')
    const response = await handle(req('session', undefined, auth.cookie), env)
    expect(response.status).toBe(200)
    expect((await response.json() as { csrf: string }).csrf).toBe(auth.csrf)
  })
  it('rejects invalid credentials, cross-origin login and invalid CSRF', async () => {
    expect((await handle(req('login', { username: 'admin', password: 'wrong' }), env)).status).toBe(401)
    expect((await handle(req('login', { username: 'admin', password }, undefined, undefined, 'https://evil.example'), env)).status).toBe(403)
    const auth = await login()
    expect((await handle(req('logout', {}, auth.cookie, 'wrong'), env)).status).toBe(403)
  })
  it('clears the browser cookie on logout and password rotation invalidates old cookies', async () => {
    const auth = await login()
    const logout = await handle(req('logout', {}, auth.cookie, auth.csrf), env)
    expect(logout.headers.get('Set-Cookie')).toContain('Max-Age=0')
    expect((await handle(req('session', undefined, auth.cookie), { ...env, ADMIN_PASSWORD: password + '-rotated' })).status).toBe(401)
  })
  it('rejects expired cookies and fails closed when login settings are absent', async () => {
    const expired = await signData({ username: 'admin', csrf: 'token', expiresAt: 0 }, env)
    expect((await handle(req('session', undefined, `gym_admin_local=${expired}`), env)).status).toBe(401)
    expect((await handle(req('session'), { ...env, ADMIN_PASSWORD: '' })).status).toBe(503)
  })
})

describe('signed upload references', () => {
  it('round-trips a valid upload and rejects it after password rotation', async () => {
    const asset: Media = { id: 'asset-test', path: '/media/asset-test.jpg', name: 'Photo', type: 'image/jpeg', size: 20 }
    const token = await createUploadProof(env, asset, 'a'.repeat(40))
    expect((await readUploadProof(env, token)).media).toEqual(asset)
    await expect(readUploadProof({ ...env, ADMIN_PASSWORD: 'different' }, token)).rejects.toThrow('invalid or expired')
  })
})

describe('GitHub publishing', () => {
  const base = 'a'.repeat(40), candidate = 'b'.repeat(40), other = 'c'.repeat(40)
  let head: string, updates: number, publishedTree: { path: string; sha?: string | null }[], operationMessage: string
  beforeEach(() => {
    head = base; updates = 0; publishedTree = []; operationMessage = ''
    const snap = fixture(), blobs = new Map<string, Uint8Array>()
    const tree: TreeEntry[] = Object.entries({ 'data/content.json': snap.content, 'data/gym.json': snap.gym, 'data/media.json': snap.media }).map(([path, value], i) => { const sha = String(i + 1).repeat(40); blobs.set(sha, new TextEncoder().encode(JSON.stringify(value))); return { path, sha, type: 'blob', mode: '100644' } })
    snap.media.forEach((m, i) => tree.push({ path: 'public' + m.path, sha: String((i % 8) + 1).repeat(40), type: 'blob', mode: '100644' }))
    vi.spyOn(GitHub.prototype, 'head').mockImplementation(async () => head)
    vi.spyOn(GitHub.prototype, 'tree').mockResolvedValue(tree)
    vi.spyOn(GitHub.prototype, 'blob').mockImplementation(async sha => new Uint8Array(blobs.get(sha)!))
    vi.spyOn(GitHub.prototype, 'commit').mockImplementation(async sha => ({ sha, tree: { sha: 'f'.repeat(40) }, message: sha === candidate ? operationMessage : '' }))
    vi.spyOn(GitHub.prototype, 'request').mockImplementation(async (path, _method, body) => {
      if (path === '/git/trees') { publishedTree = (body as { tree: typeof publishedTree }).tree; return { sha: 'e'.repeat(40) } }
      if (path === '/git/commits') { operationMessage = (body as { message: string }).message; return { sha: candidate } }
      if (path.startsWith('/compare/')) return { status: 'ahead' }
      throw new Error(`Unexpected GitHub call ${path}`)
    })
    vi.spyOn(GitHub.prototype, 'updateHead').mockImplementation(async sha => { updates++; head = sha; return {} })
  })
  it('commits only managed paths and reconciles a repeated save', async () => {
    const input = { baseRevision: base, operationId: crypto.randomUUID(), snapshot: fixture(), uploads: [] }
    input.snapshot.gym.gym.name = 'Updated gym'
    expect((await save(env, input)).revision).toBe(candidate)
    expect(publishedTree.map(x => x.path)).toEqual(['data/content.json', 'data/gym.json', 'data/media.json'])
    expect((await save(env, input)).revision).toBe(candidate)
    expect(updates).toBe(1)
  })
  it('rejects stale edits before creating a tree', async () => {
    head = other
    await expect(save(env, { baseRevision: base, operationId: crypto.randomUUID(), snapshot: fixture(), uploads: [] })).rejects.toThrow('changed')
    expect(publishedTree).toHaveLength(0)
  })
  it('reconciles when the branch update response is interrupted', async () => {
    vi.spyOn(GitHub.prototype, 'updateHead').mockImplementation(async sha => { head = sha; updates++; throw new Error('connection lost') })
    const input = { baseRevision: base, operationId: crypto.randomUUID(), snapshot: fixture(), uploads: [] }
    expect((await save(env, input)).revision).toBe(candidate)
    expect(updates).toBe(1)
  })
  it('requires signed uploads and removes unreferenced managed assets', async () => {
    const invented = fixture()
    invented.media.push({ ...invented.media[0], id: 'invented', path: '/media/invented.jpg' })
    await expect(save(env, { baseRevision: base, operationId: crypto.randomUUID(), snapshot: invented, uploads: [] })).rejects.toThrow('missing or expired')
    const clean = fixture(); clean.media = clean.media.filter(x => x.path !== '/media/hero.mp4')
    await save(env, { baseRevision: base, operationId: crypto.randomUUID(), snapshot: clean, uploads: [] })
    expect(publishedTree).toContainEqual({ path: 'public/media/hero.mp4', mode: '100644', type: 'blob', sha: null })
  })
})
