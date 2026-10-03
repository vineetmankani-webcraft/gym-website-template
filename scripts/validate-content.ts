import fs from 'node:fs'
import path from 'node:path'
import { snapshotSchema } from '../lib/content-schema'
const read = (name: string) => JSON.parse(fs.readFileSync(`data/${name}.json`, 'utf8'))
const snapshot = snapshotSchema.parse({ content: read('content'), gym: read('gym'), media: read('media') })
for (const asset of snapshot.media) {
  const file = path.resolve('public', '.' + asset.path)
  if (!file.startsWith(path.resolve('public') + path.sep)) throw new Error('Invalid asset path')
  const bytes = fs.readFileSync(file)
  const size = asset.type === 'image/svg+xml' ? Buffer.byteLength(bytes.toString('utf8').replace(/\r\n/g, '\n')) : bytes.length
  if (size !== asset.size) throw new Error(`Missing or changed asset: ${asset.path}`)
}
console.log(`Validated website content and ${snapshot.media.length} media assets`)
