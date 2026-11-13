export type GalleryMedia = {
  id: string | number
  url: string
  alt: string
  width: number
  height: number
  caption?: string | null
  sizes?: { card?: { url: string; width: number; height: number }; hero?: { url: string; width: number; height: number } }
}

export type GalleryJob = {
  id: string | number
  slug: string
  title: string
  vehicle: { year: number; make: string; model: string }
  services: string[]
  date: string
  summary: string
  processNotes: string[]
  before: GalleryMedia
  after: GalleryMedia
  photos: GalleryMedia[]
  quoteURL: string
  serviceURLs: string[]
  updatedAt: string
}

export function serviceLabel(value: string) {
  const names: Record<string, string> = {
    bedliner: 'Bedliners', tonneau: 'Bed covers', hitches: 'Hitches',
    'stealth-hitches': 'Stealth hitches', undercoating: 'Undercoating',
    'ceramic-coating': 'Ceramic coating', 'commercial-wraps': 'Fleet branding',
    'industrial-coatings': 'Industrial coatings',
  }
  return names[value] || value.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}
