import type { Metadata } from 'next'
import { BookPage } from '@/components/journal'
import {
  BookStoreError,
  BookStoreNotConfiguredError,
  getPublicBookListing,
} from '@/lib/book-store'

export const metadata: Metadata = {
  title: 'Book | UniqueMe',
  description: 'A book from UniqueMe.',
}

export const dynamic = 'force-dynamic'

export default async function Page() {
  try {
    return <BookPage book={await getPublicBookListing()} />
  } catch (error) {
    if (!(error instanceof BookStoreError) && !(error instanceof BookStoreNotConfiguredError)) {
      throw error
    }
    console.error('Unable to load public book details:', error.message)
    return <BookPage book={null} loadError />
  }
}
