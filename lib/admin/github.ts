import { HttpError, type Env } from './auth'

function base64url(bytes: Uint8Array) { return base64(bytes).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_') }
export function base64(bytes: Uint8Array) { let str = ''; for (let i = 0; i < bytes.length; i += 8192) str += String.fromCharCode(...bytes.subarray(i, i + 8192)); return btoa(str) }
export function fromBase64(value: string) { return Uint8Array.from(atob(value.replace(/\s/g, '')), c => c.charCodeAt(0)) }
const encode = (value: unknown) => base64url(new TextEncoder().encode(JSON.stringify(value)))
export function publishingConfig(env: Env) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(env.GITHUB_REPOSITORY ?? '') || !env.GITHUB_APP_ID || !env.GITHUB_INSTALLATION_ID || !env.GITHUB_PRIVATE_KEY || !env.CONTENT_BRANCH) throw new HttpError(503, 'GitHub publishing is not configured')
  if (env.ADMIN_ENV === 'production' && (env.CONTENT_BRANCH !== 'main' || env.CF_PAGES_BRANCH !== 'main')) throw new HttpError(403, 'Production publishing requires the main deployment')
  if (env.ADMIN_ENV !== 'production' && (!env.CONTENT_BRANCH.startsWith('admin-preview/') || env.CF_PAGES_BRANCH === 'main')) throw new HttpError(403, 'Preview publishing requires an isolated admin-preview branch')
}
export class GitHub {
  private token?: string
  constructor(private env: Env) { publishingConfig(env) }
  private async auth() {
    if (this.token) return this.token
    const now = Math.floor(Date.now() / 1000)
    const unsigned = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({ iat: now - 60, exp: now + 540, iss: this.env.GITHUB_APP_ID })}`
    const pem = this.env.GITHUB_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/-----[^-]+-----|\s/g, '')
    const key = await crypto.subtle.importKey('pkcs8', fromBase64(pem), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'])
    const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned))
    const response = await fetch(`https://api.github.com/app/installations/${this.env.GITHUB_INSTALLATION_ID}/access_tokens`, { method: 'POST', headers: this.headers(`${unsigned}.${base64url(new Uint8Array(signature))}`), body: JSON.stringify({ repositories: [this.env.GITHUB_REPOSITORY.split('/')[1]], permissions: { contents: 'write' } }) })
    if (!response.ok) throw new HttpError(502, 'GitHub authentication failed. Check the App configuration')
    this.token = (await response.json() as { token: string }).token
    return this.token
  }
  private headers(token: string) { return { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'gym-admin', 'Content-Type': 'application/json' } }
  async request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    const response = await fetch(`https://api.github.com/repos/${this.env.GITHUB_REPOSITORY}${path}`, { method, headers: this.headers(await this.auth()), body: body === undefined ? undefined : JSON.stringify(body) })
    if (!response.ok) throw new HttpError(response.status === 409 || response.status === 422 ? 409 : 502, response.status === 409 || response.status === 422 ? 'The repository changed. Reload before saving' : `GitHub request failed (${response.status}). Retry or check the App permissions`)
    return response.json() as Promise<T>
  }
  async head() { return (await this.request<{ object: { sha: string } }>(`/git/ref/heads/${encodeURIComponent(this.env.CONTENT_BRANCH)}`)).object.sha }
  async tree(sha: string) {
    const tree = await this.request<{ tree: TreeEntry[]; truncated: boolean }>(`/git/trees/${sha}?recursive=1`)
    if (tree.truncated) throw new HttpError(413, 'Repository is too large to edit safely')
    return tree.tree
  }
  async blob(sha: string) { return fromBase64((await this.request<{ content: string }>(`/git/blobs/${sha}`)).content) }
  async putBlob(bytes: Uint8Array) { return (await this.request<{ sha: string }>('/git/blobs', 'POST', { content: base64(bytes), encoding: 'base64' })).sha }
  async updateHead(sha: string) { return this.request(`/git/refs/heads/${encodeURIComponent(this.env.CONTENT_BRANCH)}`, 'PATCH', { sha, force: false }) }
}
export interface TreeEntry { path: string; sha: string; type: string; mode: string }
