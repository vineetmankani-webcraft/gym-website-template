'use client'
import { createContext, useContext, useMemo } from 'react'
import { displayData, type Snapshot } from '@/lib/content-schema'
const SiteContext = createContext<ReturnType<typeof displayData> | null>(null)
export function SiteProvider({ snapshot, children }: { snapshot: Snapshot; children: React.ReactNode }) {
  const value = useMemo(() => displayData(snapshot), [snapshot])
  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>
}
export function useSite() {
  const value = useContext(SiteContext)
  if (!value) throw new Error('SiteProvider is required')
  return { ...value, mapsLink: value.gym.maps.directionsLink, whatsappLink: value.gym.social.whatsapp }
}
