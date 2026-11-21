import { NextResponse } from 'next/server'
import { bookCoverRoute } from '@/lib/book-constants'
import {
  BookCoverNotFoundError,
  BookStoreError,
  BookStoreNotConfiguredError,
  getBookCoverImage,
  getPublicBookListing,
} from '@/lib/book-store'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const book = await getPublicBookListing()
    if (book?.cover_image_url !== bookCoverRoute) {
      return new NextResponse(null, { status: 404 })
    }

    const image = await getBookCoverImage()
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(image.type)) {
      throw new BookStoreError('The stored cover has an unsupported image type.')
    }
    return new NextResponse(image, {
      headers: {
        'Cache-Control': 'public, max-age=0, must-revalidate',
        'Content-Length': String(image.size),
        'Content-Type': image.type,
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    if (error instanceof BookCoverNotFoundError) {
      return new NextResponse(null, { status: 404 })
    }
    if (error instanceof BookStoreNotConfiguredError) {
      return NextResponse.json({ message: 'Book storage is not configured yet.' }, { status: 503 })
    }
    if (error instanceof BookStoreError) {
      console.error('Unable to load public book cover:', error.message)
      return NextResponse.json({ message: 'The book cover is unavailable.' }, { status: 500 })
    }
    throw error
  }
}
