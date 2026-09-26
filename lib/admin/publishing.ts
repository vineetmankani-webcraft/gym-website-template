import { z } from 'zod'
import { snapshotSchema, type Snapshot, type Media } from '../content-schema'
import { digest, HttpError, type Env, type Session } from './auth'
import { GitHub, type TreeEntry } from './github'

const files = { content: 'data/content.json', gym: 'data/gym.json', media: 'data/media.json' } as const
export const saveSchema = z.object({ baseRevision: z.string().regex(/^[a-f0-9]{40}$/), operationId: z.string().uuid(), snapshot: snapshotSchema }).strict()
export const restoreSchema = z.object({ baseRevision: z.string().regex(/^[a-f0-9]{40}$/), operationId: z.string().uuid(), revision: z.string().regex(/^[a-f0-9]{40}$/) }).strict()
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
interface Operation { id: string; request_hash: string; base_sha: string; commit_sha: string | null; state: string; created_at: number }
interface Upload { path: string; blob_sha: string; metadata: string }
async function isAncestor(git: GitHub, old: string, head: string) {
  if (old === head) return true
  const result = await git.request<{ status: string }>(`/compare/${old}...${head}`)
  return result.status === 'ahead' || result.status === 'identical'
}
export async function save(env: Env, currentSession: Session, input: z.infer<typeof saveSchema>, restoreRevision?: string) {
  const git = new GitHub(env)
  const requestHash = digest(JSON.stringify({ ...input, restoreRevision }))
  await env.ADMIN_DB.prepare("INSERT OR IGNORE INTO operations (id, request_hash, base_sha, state, created_at) VALUES (?, ?, ?, 'pending', ?)").bind(input.operationId, requestHash, input.baseRevision, Date.now()).run()
  const op = await env.ADMIN_DB.prepare('SELECT * FROM operations WHERE id = ?').bind(input.operationId).first<Operation>()
  if (!op || op.request_hash !== requestHash) throw new HttpError(409, 'This save identifier was used for different changes')
  if (op.state === 'done') return { revision: op.commit_sha, operationId: op.id }
  if (op.state === 'conflict') throw new HttpError(409, 'The repository changed. Reload before saving')
  let head = await git.head()
  if (!op.commit_sha) {
    if (head !== input.baseRevision) throw new HttpError(409, 'Someone changed the website. Preserve your edits and reload before saving')
    const base = await loadSnapshot(git, head)
    const restore = restoreRevision ? await loadSnapshot(git, restoreRevision) : undefined
    if (restore && !(await isAncestor(git, restore.revision, head))) throw new HttpError(400, 'Restore a revision from this branch history')
    const uploads = await env.ADMIN_DB.prepare('SELECT path, blob_sha, metadata FROM uploads WHERE session_hash = ? AND expires_at > ?').bind(currentSession.token_hash, Date.now()).all<Upload>()
    const tree: { path: string; mode: string; type: string; sha?: string | null; content?: string }[] = []
    for (const [key, path] of Object.entries(files)) tree.push({ path, mode: '100644', type: 'blob', content: JSON.stringify(input.snapshot[key as keyof Snapshot], null, 2) + '\n' })
    const original = new Map(base.snapshot.media.map(m => [m.path, m]))
    const source = restore ?? base
    for (const media of input.snapshot.media) {
      const existing = source.snapshot.media.find(m => m.path === media.path)
      let sha: string | undefined
      if (existing && sameAsset(existing, media)) sha = source.tree.find(x => x.path === 'public' + media.path && x.mode === '100644')?.sha
      if (!sha && !restore) {
        const upload = uploads.results.find(x => x.path === media.path && sameAsset(JSON.parse(x.metadata), media))
        sha = upload?.blob_sha
      }
      if (!sha) throw new HttpError(400, 'A media asset is missing or expired. Upload it again')
      if (base.tree.find(x => x.path === 'public' + media.path)?.sha !== sha) tree.push({ path: 'public' + media.path, mode: '100644', type: 'blob', sha })
    }
    for (const path of original.keys()) if (!input.snapshot.media.some(m => m.path === path)) tree.push({ path: 'public' + path, mode: '100644', type: 'blob', sha: null })
    const baseCommit = await git.request<{ tree: { sha: string } }>(`/git/commits/${head}`)
    const newTree = await git.request<{ sha: string }>('/git/trees', 'POST', { base_tree: baseCommit.tree.sha, tree })
    const identity = { name: 'Gym content admin', email: 'admin@users.noreply.github.com', date: new Date(op.created_at).toISOString() }
    const commit = await git.request<{ sha: string }>('/git/commits', 'POST', { message: `${restore ? 'Restore' : 'Update'} website content\n\nAdmin-Operation: ${op.id}`, tree: newTree.sha, parents: [head], author: identity, committer: identity })
    await env.ADMIN_DB.prepare("UPDATE operations SET commit_sha = ?, state = 'prepared' WHERE id = ? AND commit_sha IS NULL").bind(commit.sha, op.id).run()
    // Concurrent retries of the same operation must use the stored candidate.
    op.commit_sha = (await env.ADMIN_DB.prepare('SELECT commit_sha FROM operations WHERE id = ?').bind(op.id).first<{ commit_sha: string }>())!.commit_sha
  }
  head = await git.head()
  if (head === op.base_sha) {
    try { await git.updateHead(op.commit_sha!) } catch (error) {
      if (!(await isAncestor(git, op.commit_sha!, await git.head()))) throw error
    }
  } else if (!(await isAncestor(git, op.commit_sha!, head))) {
    await env.ADMIN_DB.prepare("UPDATE operations SET state = 'conflict' WHERE id = ?").bind(op.id).run()
    throw new HttpError(409, 'The repository changed. Your save was not published; reload before saving')
  }
  await env.ADMIN_DB.prepare("UPDATE operations SET state = 'done' WHERE id = ?").bind(op.id).run()
  return { revision: op.commit_sha, operationId: op.id }
}
function sameAsset(a: Media, b: Media) { return a.id === b.id && a.path === b.path && a.type === b.type && a.size === b.size && a.name === b.name }
export async function history(env: Env) {
  const git = new GitHub(env)
  const commits = await git.request<{ sha: string; commit: { message: string; author: { date: string } } }[]>(`/commits?sha=${encodeURIComponent(env.CONTENT_BRANCH)}&per_page=30`)
  return commits.map(c => ({ revision: c.sha, message: c.commit.message.split('\n')[0], date: c.commit.author.date }))
}
export async function deployment(env: Env, revision: string) {
  if (!env.CLOUDFLARE_API_TOKEN || !env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_PROJECT_NAME) return { state: 'unknown', message: 'Saved. Deployment tracking is not configured' }
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(env.CLOUDFLARE_ACCOUNT_ID)}/pages/projects/${encodeURIComponent(env.CLOUDFLARE_PROJECT_NAME)}/deployments?per_page=25`, { headers: { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}` } })
  if (!response.ok) return { state: 'unknown', message: 'Saved. Could not read deployment status' }
  const data = await response.json() as { result: { url: string; environment: string; is_skipped: boolean; deployment_trigger: { metadata: { commit_hash: string; branch: string } }; latest_stage: { name: string; status: string } }[] }
  const branchDeployments = data.result.filter(x => x.deployment_trigger?.metadata?.branch === env.CONTENT_BRANCH && (env.ADMIN_ENV !== 'production' || x.environment === 'production'))
  const match = branchDeployments.find(x => x.deployment_trigger.metadata.commit_hash === revision)
  if (!match) return { state: 'pending', message: 'Saved, waiting for deployment' }
  if (match.is_skipped || ['failure', 'canceled'].includes(match.latest_stage.status)) return { state: 'failed', message: 'Deployment did not succeed. The previous website remains live' }
  if (match.latest_stage.name === 'deploy' && match.latest_stage.status === 'success') {
    const latestSuccess = branchDeployments.find(x => !x.is_skipped && x.latest_stage.name === 'deploy' && x.latest_stage.status === 'success')
    if (latestSuccess !== match) return { state: 'superseded', message: 'A newer revision has been deployed. Reload saved content' }
    return { state: 'live', message: env.ADMIN_ENV === 'production' ? 'Live' : 'Preview deployed', url: match.url }
  }
  return { state: 'building', message: 'Saved, deploying' }
}
