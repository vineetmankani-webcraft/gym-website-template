import { pbkdf2Async } from '@noble/hashes/pbkdf2.js'
import { sha256 } from '@noble/hashes/sha2.js'
import type { D1Database } from '@cloudflare/workers-types'

export interface Env {
  ADMIN_DB: D1Database
  ADMIN_USERNAME: string
  ADMIN_PASSWORD_HASH: string
  ADMIN_ORIGIN: string
  ADMIN_ENV: 'production' | 'preview' | 'local'
  CONTENT_BRANCH: string
  CF_PAGES_BRANCH?: string
  GITHUB_REPOSITORY: string
  GITHUB_APP_ID: string
  GITHUB_INSTALLATION_ID: string
  GITHUB_PRIVATE_KEY: string
  CLOUDFLARE_ACCOUNT_ID: string
  CLOUDFLARE_PROJECT_NAME: string
  CLOUDFLARE_API_TOKEN: string
}
export class HttpError extends Error { constructor(public status: number, message: string) { super(message) } }
export const encoder = new TextEncoder()
export function hex(bytes: Uint8Array) { return Array.from(bytes, x => x.toString(16).padStart(2, '0')).join('') }
export function unhex(value: string) { return Uint8Array.from(value.match(/../g) ?? [], x => parseInt(x, 16)) }
export function digest(value: string) { return hex(sha256(encoder.encode(value))) }
export function randomToken() { return hex(crypto.getRandomValues(new Uint8Array(32))) }
export function equal(a: string, b: string) { const x = digest(a), y = digest(b); let diff = 0; for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i); return diff === 0 }
export async function passwordHash(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await pbkdf2Async(sha256, encoder.encode(password), salt, { c: 600000, dkLen: 32 })
  return `pbkdf2-sha256$600000$${hex(salt)}$${hex(key)}`
}
export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, iterations, salt, expected] = encoded.split('$')
  if (algorithm !== 'pbkdf2-sha256' || iterations !== '600000' || !/^[a-f0-9]{32}$/.test(salt ?? '') || !/^[a-f0-9]{64}$/.test(expected ?? '')) throw new HttpError(503, 'Admin authentication is not configured')
  const actual = await pbkdf2Async(sha256, encoder.encode(password), unhex(salt), { c: 600000, dkLen: 32 })
  return equal(hex(actual), expected)
}
export function configuration(env: Env, request: Request) {
  if (!env.ADMIN_DB || !env.ADMIN_USERNAME || !env.ADMIN_PASSWORD_HASH || !env.ADMIN_ORIGIN || !['local', 'preview', 'production'].includes(env.ADMIN_ENV)) throw new HttpError(503, 'Admin authentication is not configured')
  const origin = new URL(request.url).origin
  if (origin !== env.ADMIN_ORIGIN) throw new HttpError(403, 'This host is not an authorized admin host')
  if (env.ADMIN_ENV !== 'local' && !origin.startsWith('https://')) throw new HttpError(503, 'HTTPS is required')
  if (env.ADMIN_ENV === 'local' && !['localhost', '127.0.0.1'].includes(new URL(origin).hostname)) throw new HttpError(503, 'Local mode requires localhost')
}
export function checkOrigin(request: Request, env: Env) {
  if (request.headers.get('Origin') !== env.ADMIN_ORIGIN) throw new HttpError(403, 'Request origin rejected')
}
function cookieName(env: Env) { return env.ADMIN_ENV === 'local' ? 'gym_admin_local' : '__Host-gym_admin' }
export function sessionCookie(token: string, env: Env, maxAge = 28800) { return `${cookieName(env)}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${env.ADMIN_ENV === 'local' ? '' : '; Secure'}` }
export function credentialVersion(env: Env) { return digest(`${env.ADMIN_USERNAME}\n${env.ADMIN_PASSWORD_HASH}`) }
export interface Session { token_hash: string; csrf: string; expires_at: number; credential_version: string }
export async function session(request: Request, env: Env): Promise<Session> {
  const token = (request.headers.get('Cookie') ?? '').split(';').map(x => x.trim()).find(x => x.startsWith(cookieName(env) + '='))?.split('=')[1]
  if (!token || !/^[a-f0-9]{64}$/.test(token)) throw new HttpError(401, 'Sign in to continue')
  const row = await env.ADMIN_DB.prepare('SELECT * FROM sessions WHERE token_hash = ?').bind(digest(token)).first<Session>()
  if (!row || row.expires_at <= Date.now() || !equal(row.credential_version, credentialVersion(env))) throw new HttpError(401, 'Your session has expired. Sign in again')
  return row
}
export function csrf(request: Request, env: Env, current: Session) {
  checkOrigin(request, env)
  if (!equal(request.headers.get('X-CSRF-Token') ?? '', current.csrf)) throw new HttpError(403, 'Request verification failed')
}
export async function throttle(env: Env, ip: string, username: string) {
  const now = Date.now(), window = Math.floor(now / 900000)
  const keys = [`ip:${digest(ip)}:${window}`, `pair:${digest(ip + ':' + username)}:${window}`]
  const result = await env.ADMIN_DB.batch(keys.map(key => env.ADMIN_DB.prepare('INSERT INTO login_limits (key, attempts, expires_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET attempts = attempts + 1 RETURNING attempts').bind(key, now + 900000)))
  if (Number((result[0].results[0] as { attempts: number }).attempts) > 30 || Number((result[1].results[0] as { attempts: number }).attempts) > 5) throw new HttpError(429, 'Too many login attempts. Try again in 15 minutes')
  return keys[1]
}
export async function readJson(request: Request, max = 1024 * 1024): Promise<unknown> {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new HttpError(415, 'Expected JSON')
  const buffer = await boundedBody(request, max)
  try { return JSON.parse(new TextDecoder().decode(buffer)) } catch { throw new HttpError(400, 'Invalid JSON') }
}
export async function boundedBody(request: Request, max: number) {
  if (Number(request.headers.get('content-length')) > max) throw new HttpError(413, 'Request is too large')
  const reader = request.body?.getReader(); if (!reader) throw new HttpError(400, 'Missing request body')
  let size = 0; const chunks: Uint8Array[] = []
  for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > max) { await reader.cancel(); throw new HttpError(413, 'Request is too large') } chunks.push(value) }
  const all = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { all.set(chunk, offset); offset += chunk.length } return all
}
