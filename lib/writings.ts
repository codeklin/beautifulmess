export type Category = 'linkedin' | 'poem' | 'prose' | 'spoken_word'
export type WritingStatus = 'draft' | 'scheduled' | 'published'

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

export const categoryLabels: Record<Category, string> = {
  linkedin: 'LinkedIn',
  poem: 'Poem',
  prose: 'Prose',
  spoken_word: 'Spoken Word',
}

export const sampleWritings: Writing[] = [
  {
    id: 'sample-linkedin',
    title: 'The work between the work',
    slug: 'the-work-between-the-work',
    category: 'linkedin',
    content: 'Some of the most useful work happens before anyone calls it work.\n\nIt is the careful question, the note you keep, the small promise you remember to keep.\n\nI am trying to notice those moments more often, and give them the respect they deserve.',
    is_published: true,
    status: 'published',
    created_at: '2026-11-21T12:00:00.000Z',
  },
  {
    id: 'sample-poem',
    title: 'Kitchen light',
    slug: 'kitchen-light',
    category: 'poem',
    content: 'The kettle settles\ninto its small blue hour.\n\nOutside, rain makes a list\nof everything it has touched.\n\nI leave one lamp on\nfor the room to find me.',
    is_published: true,
    status: 'published',
    created_at: '2026-11-17T12:00:00.000Z',
  },
  {
    id: 'sample-prose',
    title: 'A walk without a reason',
    slug: 'a-walk-without-a-reason',
    category: 'prose',
    content: 'On Tuesday I took the long way home, though there was nothing waiting for me at the end of the short one. The light had gone soft around the corner shops, and a man was watering a row of pots that looked as if they had survived several winters.\n\nI walked slowly enough to notice the names on the doorbells. It felt like a good way to spend an ordinary evening.',
    is_published: true,
    status: 'published',
    created_at: '2026-11-12T12:00:00.000Z',
  },
  {
    id: 'sample-spoken',
    title: 'What the morning keeps',
    slug: 'what-the-morning-keeps',
    category: 'spoken_word',
    content: 'Before the street wakes,\nthere is the sound of a spoon\nmeeting the side of a cup.\n\nA small bright thing.\nA reason to begin again\nwithout calling it a beginning.',
    is_published: true,
    status: 'published',
    created_at: '2026-11-08T12:00:00.000Z',
  },
]

const STORAGE_KEY = 'beautifulmess_writings'

export function getStoredWritings(): Writing[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Writing[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveStoredWritings(items: Writing[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // Keep quiet if storage quota is full
  }
}

export function getAllWritings(): Writing[] {
  const stored = getStoredWritings()
  const storedIds = new Set(stored.map((item) => item.id))
  const initial = sampleWritings.filter((item) => !storedIds.has(item.id))
  return [...stored, ...initial]
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

export function getLiveWritings(now = Date.now()): Writing[] {
  return getAllWritings().filter((item) => isWritingLive(item, now))
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
