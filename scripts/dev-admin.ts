import { createHash, randomUUID } from 'node:crypto'
import { createServer, request as proxyRequest, type IncomingMessage, type ServerResponse } from 'node:http'
import { connect } from 'node:net'
import { spawn } from 'node:child_process'
import { readFile, rename, writeFile, mkdir } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { checkOrigin, configuration, createSession, csrf, equal, HttpError, session, sessionCookie, type Env } from '../lib/admin/auth'
import { identifyMedia } from '../lib/admin/media'
import { restoreSchema, saveSchema } from '../lib/admin/publishing'
import { snapshotSchema, type Media, type Snapshot } from '../lib/content-schema'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const files = {
  content: path.join(root, 'data', 'content.json'),
  gym: path.join(root, 'data', 'gym.json'),
  media: path.join(root, 'data', 'media.json'),
} as const
const nextPort = Number(process.env.LOCAL_NEXT_PORT ?? 3001)
const publicPort = Number(process.env.LOCAL_ADMIN_PORT ?? 8788)

function loadEnvironment(): Env {
  const values: Record<string, string> = { ...process.env } as Record<string, string>
  const envFile = path.join(root, '.env')
  if (existsSync(envFile)) {
    const source = readFileSync(envFile, 'utf8')
    for (const line of source.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
      if (!match || match[2].startsWith('#')) continue
      values[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2')
    }
  }
  const env = values as unknown as Env
  configuration(env)
  return env
}

const env = loadEnvironment()
const uploads = new Map<string, Media>()
const history = new Map<string, { snapshot: Snapshot; date: string; message: string }>()

async function readSnapshot(): Promise<Snapshot> {
  const [content, gym, media] = await Promise.all(Object.values(files).map(async file => JSON.parse(await readFile(file, 'utf8')) as unknown))
  return snapshotSchema.parse({ content, gym, media })
}

function revisionOf(snapshot: Snapshot) {
  return createHash('sha1').update(JSON.stringify(snapshot)).digest('hex')
}

async function remember(snapshot: Snapshot, message: string) {
  const revision = revisionOf(snapshot)
  if (!history.has(revision)) history.set(revision, { snapshot: structuredClone(snapshot), date: new Date().toISOString(), message })
  return revision
}

async function writeSnapshot(snapshot: Snapshot) {
  const parsed = snapshotSchema.parse(snapshot)
  for (const asset of parsed.media) {
    if (!existsSync(path.join(root, 'public', asset.path))) throw new HttpError(400, `Missing media file: ${asset.path}`)
  }
  await Promise.all(Object.entries(files).map(async ([key, file]) => {
    const temporary = `${file}.${randomUUID()}.tmp`
    await writeFile(temporary, `${JSON.stringify(parsed[key as keyof Snapshot], null, 2)}\n`, 'utf8')
    await rename(temporary, file)
  }))
  return remember(parsed, 'Local admin save')
}

function sendJson(response: ServerResponse, data: unknown, status = 200, headers: Record<string, string> = {}) {
  response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers })
  response.end(JSON.stringify(data))
}

async function body(request: IncomingMessage, max = 25 * 1024 * 1024) {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    const value = Buffer.from(chunk as Uint8Array)
    size += value.length
    if (size > max) throw new HttpError(413, 'Request is too large')
    chunks.push(value)
  }
  return Buffer.concat(chunks)
}

async function webRequest(request: IncomingMessage) {
  const url = `http://localhost:${publicPort}${request.url}`
  const data = ['GET', 'HEAD'].includes(request.method ?? 'GET') ? undefined : await body(request)
  const headers = new Headers()
  for (const [key, value] of Object.entries(request.headers)) if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(', ') : value)
  return new Request(url, { method: request.method, headers, body: data ? new Uint8Array(data) : undefined })
}

async function api(request: IncomingMessage, response: ServerResponse) {
  try {
    const req = await webRequest(request)
    const url = new URL(req.url)
    const route = url.pathname.replace(/^\/api\/admin\//, '')
    const method = req.method
    if (route === 'login' && method === 'POST') {
      checkOrigin(req)
      const input = z.object({ username: z.string(), password: z.string() }).parse(await req.json())
      if (!equal(input.username, env.ADMIN_USERNAME) || !equal(input.password, env.ADMIN_PASSWORD)) throw new HttpError(401, 'Invalid username or password')
      const created = await createSession(env)
      return sendJson(response, created.session, 200, { 'Set-Cookie': sessionCookie(created.token, req) })
    }
    const current = await session(req, env)
    if (!['GET', 'HEAD'].includes(method)) csrf(req, current)
    if (route === 'session' && method === 'GET') return sendJson(response, current)
    if (route === 'logout' && method === 'POST') return sendJson(response, { ok: true }, 200, { 'Set-Cookie': sessionCookie('', req, 0) })
    if (route === 'content' && method === 'GET') {
      const snapshot = await readSnapshot()
      return sendJson(response, { snapshot, revision: await remember(snapshot, 'Local starting content'), mode: 'local' })
    }
    if (route === 'save' && method === 'POST') {
      const input = saveSchema.parse(await req.json())
      const currentSnapshot = await readSnapshot()
      if (input.baseRevision !== revisionOf(currentSnapshot)) throw new HttpError(409, 'Local files changed. Reload the editor before saving')
      return sendJson(response, { revision: await writeSnapshot(input.snapshot), operationId: input.operationId, mode: 'local' })
    }
    if (route === 'history' && method === 'GET') {
      return sendJson(response, [...history].reverse().map(([revision, item]) => ({ revision, message: item.message, date: item.date })))
    }
    if (route === 'restore' && method === 'POST') {
      const input = restoreSchema.parse(await req.json())
      const saved = history.get(input.revision)
      if (!saved) throw new HttpError(404, 'That local revision is no longer available')
      return sendJson(response, { revision: await writeSnapshot(saved.snapshot), operationId: input.operationId, mode: 'local' })
    }
    if (route === 'upload' && method === 'POST') {
      const bytes = new Uint8Array(await req.arrayBuffer())
      const info = identifyMedia(bytes)
      const id = `asset-${randomUUID()}`
      const media: Media = { id, path: `/media/${id}.${info.extension}`, name: decodeURIComponent(req.headers.get('X-File-Name') ?? 'Uploaded media').slice(0, 200), type: info.type as Media['type'], size: bytes.length }
      await mkdir(path.join(root, 'public', 'media'), { recursive: true })
      await writeFile(path.join(root, 'public', media.path), bytes)
      const token = randomUUID()
      uploads.set(token, media)
      return sendJson(response, { media, uploadToken: token }, 201)
    }
    if (route === 'media' && method === 'GET') {
      const requested = url.searchParams.get('path') ?? uploads.get(url.searchParams.get('upload') ?? '')?.path
      if (!requested || !/^\/media\/[\w.-]+$/.test(requested)) throw new HttpError(404, 'Media not found')
      const asset = await readFile(path.join(root, 'public', requested))
      const listed = (await readSnapshot()).media.find(item => item.path === requested) ?? [...uploads.values()].find(item => item.path === requested)
      if (!listed) throw new HttpError(404, 'Media not found')
      response.writeHead(200, { 'Content-Type': listed.type, 'Cache-Control': 'no-store' })
      return response.end(asset)
    }
    throw new HttpError(404, 'Admin endpoint not found')
  } catch (error) {
    if (error instanceof z.ZodError) return sendJson(response, { error: 'Check the highlighted fields', issues: error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })) }, 400)
    if (error instanceof HttpError) return sendJson(response, { error: error.message }, error.status)
    console.error(error)
    return sendJson(response, { error: 'Local admin service failed. Your edits remain in the browser.' }, 500)
  }
}

function proxy(request: IncomingMessage, response: ServerResponse) {
  const forwarded = proxyRequest({ hostname: '127.0.0.1', port: nextPort, path: request.url, method: request.method, headers: { ...request.headers, host: `127.0.0.1:${nextPort}` } }, upstream => {
    response.writeHead(upstream.statusCode ?? 502, upstream.headers)
    upstream.pipe(response)
  })
  forwarded.on('error', () => sendJson(response, { error: 'Next.js is starting. Refresh in a moment.' }, 503))
  request.pipe(forwarded)
}

const next = spawn(process.execPath, [path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next'), 'dev', '--hostname', '127.0.0.1', '--port', String(nextPort)], { cwd: root, stdio: 'inherit', env: process.env })
const server = createServer((request, response) => request.url?.startsWith('/api/admin/') ? void api(request, response) : proxy(request, response))
server.on('error', error => { console.error(error); next.kill(); process.exit(1) })
server.on('upgrade', (request, socket, head) => {
  const upstream = connect(nextPort, '127.0.0.1', () => {
    upstream.write(`${request.method} ${request.url} HTTP/${request.httpVersion}\r\n${Object.entries(request.headers).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`).join('\r\n')}\r\n\r\n`)
    if (head.length) upstream.write(head)
    socket.pipe(upstream).pipe(socket)
  })
  upstream.on('error', () => socket.destroy())
})
server.listen(publicPort, '127.0.0.1', () => console.log(`\nLocal website and admin: http://localhost:${publicPort}\nSaves now update local files immediately.\n`))

function stop() { server.close(); next.kill(); process.exit() }
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
next.on('exit', code => { server.close(); process.exit(code ?? 0) })
