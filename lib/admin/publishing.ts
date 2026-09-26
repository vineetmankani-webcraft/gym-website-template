import { z } from 'zod'
import { snapshotSchema, type Snapshot, type Media } from '../content-schema'
import { HttpError, signData, verifyData, type Env } from './auth'
import { contentBranch, GitHub } from './github'

const files = { content: 'data/content.json', gym: 'data/gym.json', media: 'data/media.json' } as const
export const saveSchema = z.object({ baseRevision: z.string().regex(/^[a-f0-9]{40}$/), operationId: z.string().uuid(), snapshot: snapshotSchema, uploads: z.array(z.string().max(4096)).max(100).default([]) }).strict()
export const restoreSchema = z.object({ baseRevision: z.string().regex(/^[a-f0-9]{40}$/), operationId: z.string().uuid(), revision: z.string().regex(/^[a-f0-9]{40}$/) }).strict()
export interface UploadProof { media: Media; sha: string; expiresAt: number }

export async function createUploadProof(env: Env, media: Media, sha: string) { return signData({ media, sha, expiresAt: Date.now() + 8 * 60 * 60 * 1000 }, env) }
export async function readUploadProof(env: Env, token: string) {
  const proof = await verifyData<UploadProof>(token, env)
  if (!proof || proof.expiresAt <= Date.now() || !/^[a-f0-9]{40}$/.test(proof.sha) || !snapshotSchema.shape.media.element.safeParse(proof.media).success) throw new HttpError(400, 'An uploaded asset is invalid or expired. Upload it again')
  return proof
}

export async function loadSnapshot(git: GitHub, revision?: string) {
  const sha = revision ?? await git.head(), tree = await git.tree(sha)
  const values = await Promise.all(Object.values(files).map(async path => {
    const entry = tree.find(x => x.path === path && x.type === 'blob' && x.mode === '100644')
    if (!entry) throw new HttpError(409, 'This revision does not have the admin content format')
    return JSON.parse(new TextDecoder().decode(await git.blob(entry.sha))) as unknown
  }))
  const parsed = snapshotSchema.safeParse({ content: values[0], gym: values[1], media: values[2] })
  if (!parsed.success) throw new HttpError(409, 'This revision has incompatible content. Update the content branch before editing')
  return { revision: sha, snapshot: parsed.data, tree }
}

async function isAncestor(git: GitHub, old: string, head: string) {
  if (old === head) return true
  const result = await git.request<{ status: string }>(`/compare/${old}...${head}`)
  return result.status === 'ahead' || result.status === 'identical'
}
function hasOperation(message: string, id: string) { return message.includes(`Admin-Operation: ${id}`) }
function sameAsset(a: Media, b: Media) { return a.id === b.id && a.path === b.path && a.type === b.type && a.size === b.size && a.name === b.name }

export async function save(env: Env, input: z.infer<typeof saveSchema>, restoreRevision?: string) {
  const git = new GitHub(env)
  let head = await git.head()
  if (head !== input.baseRevision) {
    if (hasOperation((await git.commit(head)).message, input.operationId)) return { revision: head, operationId: input.operationId }
    throw new HttpError(409, 'Someone changed the website. Preserve your edits and reload before saving')
  }

  const base = await loadSnapshot(git, head)
  const restore = restoreRevision ? await loadSnapshot(git, restoreRevision) : undefined
  if (restore && !(await isAncestor(git, restore.revision, head))) throw new HttpError(400, 'Restore a revision from this branch history')
  const uploads = new Map<string, UploadProof>()
  for (const token of input.uploads) { const proof = await readUploadProof(env, token); uploads.set(proof.media.path, proof) }
  const tree: { path: string; mode: string; type: string; sha?: string | null; content?: string }[] = []
  for (const [key, path] of Object.entries(files)) tree.push({ path, mode: '100644', type: 'blob', content: JSON.stringify(input.snapshot[key as keyof Snapshot], null, 2) + '\n' })
  const original = new Map(base.snapshot.media.map(m => [m.path, m]))
  const source = restore ?? base
  for (const media of input.snapshot.media) {
    const existing = source.snapshot.media.find(m => m.path === media.path)
    let sha = existing && sameAsset(existing, media) ? source.tree.find(x => x.path === 'public' + media.path && x.mode === '100644')?.sha : undefined
    if (!sha && !restore) { const upload = uploads.get(media.path); if (upload && sameAsset(upload.media, media)) sha = upload.sha }
    if (!sha) throw new HttpError(400, 'A media asset is missing or expired. Upload it again')
    if (base.tree.find(x => x.path === 'public' + media.path)?.sha !== sha) tree.push({ path: 'public' + media.path, mode: '100644', type: 'blob', sha })
  }
  for (const path of original.keys()) if (!input.snapshot.media.some(m => m.path === path)) tree.push({ path: 'public' + path, mode: '100644', type: 'blob', sha: null })

  const baseCommit = await git.commit(head)
  const newTree = await git.request<{ sha: string }>('/git/trees', 'POST', { base_tree: baseCommit.tree.sha, tree })
  const identity = { name: 'Gym content admin', email: 'admin@users.noreply.github.com', date: new Date().toISOString() }
  const commit = await git.request<{ sha: string }>('/git/commits', 'POST', { message: `${restore ? 'Restore' : 'Update'} website content\n\nAdmin-Operation: ${input.operationId}`, tree: newTree.sha, parents: [head], author: identity, committer: identity })
  try { await git.updateHead(commit.sha) } catch (error) {
    head = await git.head()
    if (!hasOperation((await git.commit(head)).message, input.operationId)) throw error
    return { revision: head, operationId: input.operationId }
  }
  return { revision: commit.sha, operationId: input.operationId }
}

export async function history(env: Env) {
  const git = new GitHub(env)
  const commits = await git.request<{ sha: string; commit: { message: string; author: { date: string } } }[]>(`/commits?sha=${encodeURIComponent(contentBranch(env))}&per_page=30`)
  return commits.map(c => ({ revision: c.sha, message: c.commit.message.split('\n')[0], date: c.commit.author.date }))
}
