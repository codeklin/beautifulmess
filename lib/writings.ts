export type Category = 'linkedin' | 'poem' | 'prose' | 'spoken_word'

export type Writing = {
  id: string
  title: string
  slug: string
  category: Category
  content: string
  audio_url?: string | null
  is_published: boolean
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
    id: 'sample-linkedin', title: 'The work between the work', slug: 'the-work-between-the-work', category: 'linkedin',
    content: 'Some of the most useful work happens before anyone calls it work.\n\nIt is the careful question, the note you keep, the small promise you remember to keep.\n\nI am trying to notice those moments more often, and give them the respect they deserve.',
    is_published: true, created_at: '2026-11-21T12:00:00.000Z',
  },
  {
    id: 'sample-poem', title: 'Kitchen light', slug: 'kitchen-light', category: 'poem',
    content: 'The kettle settles\ninto its small blue hour.\n\nOutside, rain makes a list\nof everything it has touched.\n\nI leave one lamp on\nfor the room to find me.',
    is_published: true, created_at: '2026-11-17T12:00:00.000Z',
  },
  {
    id: 'sample-prose', title: 'A walk without a reason', slug: 'a-walk-without-a-reason', category: 'prose',
    content: 'On Tuesday I took the long way home, though there was nothing waiting for me at the end of the short one. The light had gone soft around the corner shops, and a man was watering a row of pots that looked as if they had survived several winters.\n\nI walked slowly enough to notice the names on the doorbells. It felt like a good way to spend an ordinary evening.',
    is_published: true, created_at: '2026-11-12T12:00:00.000Z',
  },
  {
    id: 'sample-spoken', title: 'What the morning keeps', slug: 'what-the-morning-keeps', category: 'spoken_word',
    content: 'Before the street wakes,\nthere is the sound of a spoon\nmeeting the side of a cup.\n\nA small bright thing.\nA reason to begin again\nwithout calling it a beginning.',
    is_published: true, created_at: '2026-11-08T12:00:00.000Z',
  },
]

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(value))
}
