import { passwordHash } from '../lib/admin/auth'

async function readPassword() {
  if (!process.stdin.isTTY) {
    let input = ''; for await (const chunk of process.stdin) input += chunk
    return input.replace(/\r?\n$/, '')
  }
  process.stderr.write('New admin password (hidden, at least 14 characters): ')
  process.stdin.setRawMode(true); process.stdin.resume(); process.stdin.setEncoding('utf8')
  return new Promise<string>(resolve => {
    let value = ''
    const listener = (chunk: string) => {
      for (const c of chunk) {
        if (c === '\u0003') { process.stdin.setRawMode(false); process.exit(130) }
        if (c === '\r' || c === '\n') { process.stdin.off('data', listener); process.stdin.setRawMode(false); process.stdin.pause(); process.stderr.write('\n'); resolve(value); return }
        if (c === '\u007f' || c === '\b') value = value.slice(0, -1)
        else if (c >= ' ') value += c
      }
    }
    process.stdin.on('data', listener)
  })
}
async function main() { const password = await readPassword(); if (password.length < 14 || password.length > 1024) throw new Error('Use a password between 14 and 1024 characters'); process.stdout.write(await passwordHash(password) + '\n') }
main().catch(e => { console.error(e.message); process.exitCode = 1 })
