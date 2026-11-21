export type Category = 'linkedin' | 'poem' | 'prose' | 'spoken_word'
export type WritingStatus = 'draft' | 'scheduled' | 'published'

export const categoryLabels: Partial<Record<Category, string>> = {
  linkedin: 'LinkedIn',
  spoken_word: 'Spoken Word',
}

export type Writing = {
  id: string
  title: string
  slug: string
  category: Category
  content: string
  audio_url?: string | null
  is_published: boolean
  status?: WritingStatus
  scheduled_for?: string | null
  created_at: string
}

export function isWritingLive(writing: Writing, now = Date.now()): boolean {
  if (writing.status === 'draft') return false
  if (writing.status === 'scheduled') {
    if (!writing.scheduled_for) return false
    return new Date(writing.scheduled_for).getTime() <= now
  }
  if (writing.is_published) {
    if (writing.scheduled_for && new Date(writing.scheduled_for).getTime() > now) {
      return false
    }
    return true
  }
  return false
}

export function getLiveWritings(writings: Writing[], now = Date.now()): Writing[] {
  return writings.filter((item) => isWritingLive(item, now))
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(value))
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}
