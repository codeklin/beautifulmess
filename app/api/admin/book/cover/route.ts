import { NextResponse, type NextRequest } from 'next/server'
import { authorizeAdminApi } from '@/lib/admin-api'
import { bookCoverRoute } from '@/lib/book-constants'
import {
  BookStoreError,
  BookStoreNotConfiguredError,
  uploadBookCover,
} from '@/lib/book-store'

const maximumCoverSize = 5 * 1024 * 1024

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  })
}

async function detectImageType(file: File): Promise<string | null> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png'
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg'
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  ) {
    return 'image/webp'
  }
  return null
}

export async function POST(request: NextRequest) {
  const authorizationError = await authorizeAdminApi(request)
  if (authorizationError) return authorizationError

  let formData: FormData
  try {
    formData = await request.formData()
  } catch (error) {
    if (error instanceof TypeError) {
      return jsonResponse({ message: 'Choose a cover image to upload.' }, 400)
    }
    throw error
  }

  const file = formData.get('cover')
  if (!(file instanceof File) || file.size === 0) {
    return jsonResponse({ message: 'Choose a cover image to upload.' }, 400)
  }
  if (file.size > maximumCoverSize) {
    return jsonResponse({ message: 'Choose an image smaller than 5 MB.' }, 400)
  }

  const contentType = await detectImageType(file)
  if (!contentType || (file.type && file.type !== contentType)) {
    return jsonResponse({ message: 'Choose a JPG, PNG, or WebP image.' }, 400)
  }

  try {
    await uploadBookCover(new Uint8Array(await file.arrayBuffer()), contentType)
    return jsonResponse({ cover_image_url: bookCoverRoute })
  } catch (error) {
    if (error instanceof BookStoreNotConfiguredError) {
      return jsonResponse({ message: 'Book storage is not configured yet.' }, 503)
    }
    if (error instanceof BookStoreError) {
      console.error('Book cover upload failed:', error.message)
      return jsonResponse({ message: 'The cover could not be uploaded. Please try again.' }, 500)
    }
    throw error
  }
}
