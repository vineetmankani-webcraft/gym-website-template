import { Site } from '@/components/gym/site'
import { snapshotSchema } from '@/lib/content-schema'
import content from '@/data/content.json'
import gym from '@/data/gym.json'
import media from '@/data/media.json'

export default function Page() {
  return <Site snapshot={snapshotSchema.parse({ content, gym, media })} />
}
