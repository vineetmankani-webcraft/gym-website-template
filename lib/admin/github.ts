import { HttpError, type Env } from './auth'

export function base64(bytes: Uint8Array) { let text = ''; for (let i = 0; i < bytes.length; i += 8192) text += String.fromCharCode(...bytes.subarray(i, i + 8192)); return btoa(text) }
export function fromBase64(value: string) { return Uint8Array.from(atob(value.replace(/\s/g, '')), c => c.charCodeAt(0)) }
export function contentBranch(env: Env) { return env.CONTENT_BRANCH || env.CF_PAGES_BRANCH || 'main' }
export function publishingConfig(env: Env) { if (!/^[\w.-]+\/[\w.-]+$/.test(env.GITHUB_REPOSITORY ?? '') || !env.GITHUB_TOKEN) throw new HttpError(503, 'GitHub publishing is not configured') }

export class GitHub {
  constructor(private env: Env) { publishingConfig(env) }
  async request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    const response = await fetch(`https://api.github.com/repos/${this.env.GITHUB_REPOSITORY}${path}`, { method, headers: { Authorization: `Bearer ${this.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'gym-admin', 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
    if (!response.ok) { const conflict = response.status === 409 || response.status === 422; throw new HttpError(conflict ? 409 : 502, conflict ? 'The repository changed. Reload before saving' : `GitHub request failed (${response.status}). Check the token and retry`) }
    return response.json() as Promise<T>
  }
  async head() { return (await this.request<{ object: { sha: string } }>(`/git/ref/heads/${encodeURIComponent(contentBranch(this.env))}`)).object.sha }
  async tree(sha: string) { const result = await this.request<{ tree: TreeEntry[]; truncated: boolean }>(`/git/trees/${sha}?recursive=1`); if (result.truncated) throw new HttpError(413, 'Repository is too large to edit safely'); return result.tree }
  async blob(sha: string) { return fromBase64((await this.request<{ content: string }>(`/git/blobs/${sha}`)).content) }
  async putBlob(bytes: Uint8Array) { return (await this.request<{ sha: string }>('/git/blobs', 'POST', { content: base64(bytes), encoding: 'base64' })).sha }
  async updateHead(sha: string) { return this.request(`/git/refs/heads/${encodeURIComponent(contentBranch(this.env))}`, 'PATCH', { sha, force: false }) }
  async commit(sha: string) { return this.request<{ sha: string; tree: { sha: string }; message: string }>(`/git/commits/${sha}`) }
}
export interface TreeEntry { path: string; sha: string; type: string; mode: string }
