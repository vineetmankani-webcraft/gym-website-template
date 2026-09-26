import fs from 'node:fs'
import path from 'node:path'
const forbiddenNames = ['ADMIN_PASSWORD_HASH', 'GITHUB_PRIVATE_KEY', 'CLOUDFLARE_API_TOKEN']
const secrets = ['ADMIN_PASSWORD_HASH', 'GITHUB_PRIVATE_KEY', 'CLOUDFLARE_API_TOKEN'].map(k => process.env[k]).filter((v): v is string => !!v && v.length > 8)
function check(dir: string) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) check(file)
    else if (/\.(?:html|js|json|txt)$/.test(file)) {
      const text = fs.readFileSync(file, 'utf8')
      if ([...forbiddenNames, ...secrets].some(secret => text.includes(secret))) throw new Error(`Secret or server-only credential name in static export: ${file}`)
    }
  }
}
check('out'); console.log('Static export contains no configured secret values or server credential identifiers')
