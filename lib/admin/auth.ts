export interface Env {
  ADMIN_USERNAME: string
  ADMIN_PASSWORD: string
  GITHUB_REPOSITORY: string
  GITHUB_TOKEN: string
  CONTENT_BRANCH?: string
  CF_PAGES_BRANCH?: string
}

export class HttpError extends Error { constructor(public status: number, message: string) { super(message) } }
const encoder = new TextEncoder()
const decoder = new TextDecoder()
const encode64 = (bytes: Uint8Array) => { let text = ''; for (let i = 0; i < bytes.length; i += 8192) text += String.fromCharCode(...bytes.subarray(i, i + 8192)); return btoa(text).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_') }
const decode64 = (value: string) => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))

export function equal(a: string, b: string) { const length = Math.max(a.length, b.length); let diff = a.length ^ b.length; for (let i = 0; i < length; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0); return diff === 0 }
export function randomToken() { return encode64(crypto.getRandomValues(new Uint8Array(24))) }
async function signature(value: string, secret: string) { const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); return encode64(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)))) }
export async function signData(value: unknown, env: Env) { const payload = encode64(encoder.encode(JSON.stringify(value))); return `${payload}.${await signature(payload, env.ADMIN_PASSWORD)}` }
export async function verifyData<T>(token: string, env: Env): Promise<T | null> { const [payload, supplied, extra] = token.split('.'); if (!payload || !supplied || extra || !equal(supplied, await signature(payload, env.ADMIN_PASSWORD))) return null; try { return JSON.parse(decoder.decode(decode64(payload))) as T } catch { return null } }

export function configuration(env: Env) { if (!env.ADMIN_USERNAME || !env.ADMIN_PASSWORD) throw new HttpError(503, 'Admin login is not configured') }
export function checkOrigin(request: Request) { if (request.headers.get('Origin') !== new URL(request.url).origin) throw new HttpError(403, 'Request origin rejected') }
function cookieName(request: Request) { return new URL(request.url).protocol === 'https:' ? '__Host-gym_admin' : 'gym_admin_local' }
export function sessionCookie(token: string, request: Request, maxAge = 28800) { return `${cookieName(request)}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}` }

export interface Session { username: string; csrf: string; expiresAt: number }
export async function createSession(env: Env): Promise<{ token: string; session: Session }> { const session = { username: env.ADMIN_USERNAME, csrf: randomToken(), expiresAt: Date.now() + 8 * 60 * 60 * 1000 }; return { token: await signData(session, env), session } }
export async function session(request: Request, env: Env): Promise<Session> { const prefix = cookieName(request) + '='; const token = (request.headers.get('Cookie') ?? '').split(';').map(x => x.trim()).find(x => x.startsWith(prefix))?.slice(prefix.length); const current = token ? await verifyData<Session>(token, env) : null; if (!current || current.expiresAt <= Date.now() || !equal(current.username, env.ADMIN_USERNAME)) throw new HttpError(401, 'Your session has expired. Sign in again'); return current }
export function csrf(request: Request, current: Session) { checkOrigin(request); if (!equal(request.headers.get('X-CSRF-Token') ?? '', current.csrf)) throw new HttpError(403, 'Request verification failed') }

export async function readJson(request: Request, max = 1024 * 1024): Promise<unknown> { if (!request.headers.get('content-type')?.startsWith('application/json')) throw new HttpError(415, 'Expected JSON'); const buffer = await boundedBody(request, max); try { return JSON.parse(decoder.decode(buffer)) } catch { throw new HttpError(400, 'Invalid JSON') } }
export async function boundedBody(request: Request, max: number) {
  if (Number(request.headers.get('content-length')) > max) throw new HttpError(413, 'Request is too large')
  const reader = request.body?.getReader(); if (!reader) throw new HttpError(400, 'Missing request body')
  let size = 0; const chunks: Uint8Array[] = []
  for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > max) { await reader.cancel(); throw new HttpError(413, 'Request is too large') } chunks.push(value) }
  const all = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { all.set(chunk, offset); offset += chunk.length } return all
}
