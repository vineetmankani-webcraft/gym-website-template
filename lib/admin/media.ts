import { HttpError } from './auth'

export function identifyMedia(bytes: Uint8Array) {
  const at = (start: number, length: number) => new TextDecoder().decode(bytes.slice(start, start + length))
  let type = '', extension = ''
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) { type = 'image/jpeg'; extension = 'jpg' }
  else if ([137,80,78,71,13,10,26,10].every((b, i) => bytes[i] === b)) { type = 'image/png'; extension = 'png' }
  else if (at(0, 4) === 'RIFF' && at(8, 4) === 'WEBP') { type = 'image/webp'; extension = 'webp' }
  else if (at(4, 4) === 'ftyp' && /^(isom|iso[2-9]|mp4[12]|avc1|M4V )$/.test(at(8, 4))) { type = 'video/mp4'; extension = 'mp4' }
  else if ([0x1a, 0x45, 0xdf, 0xa3].every((b, i) => bytes[i] === b) && at(0, 4096).includes('webm')) { type = 'video/webm'; extension = 'webm' }
  else throw new HttpError(415, 'Upload a JPEG, PNG, WebP, MP4 or WebM file')
  if (bytes.length > (type.startsWith('image/') ? 8 : 20) * 1024 * 1024) throw new HttpError(413, type.startsWith('image/') ? 'Images must be under 8 MiB' : 'Compress the video to under 20 MiB')
  return { type, extension }
}
