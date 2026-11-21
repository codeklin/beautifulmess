import { NextResponse, type NextRequest } from 'next/server'
import { authorizeAdminApi } from '@/lib/admin-api'
import { bookCoverRoute } from '@/lib/book-constants'
import {
  BookStoreError,
  BookStoreNotConfiguredError,
  getAdminBookListing,
  saveBookListing,
  type BookListingInput,
} from '@/lib/book-store'

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  })
}

function storeErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof BookStoreNotConfiguredError) {
    return jsonResponse({ message: 'Book storage is not configured yet.' }, 503)
  }
  if (error instanceof BookStoreError) {
    console.error('Book storage request failed:', error.message)
    return jsonResponse({ message: 'Book details are unavailable right now. Please try again.' }, 500)
  }
  return null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isWebUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

function parseBookListing(value: unknown): BookListingInput | null {
  if (!isRecord(value)) return null
  const { title, description, purchase_url, cover_image_url } = value
  if (
    typeof title !== 'string' ||
    !title.trim() ||
    title.trim().length > 200 ||
    typeof description !== 'string' ||
    description.length > 3000 ||
    (purchase_url !== null && !isWebUrl(purchase_url)) ||
    (cover_image_url !== null && cover_image_url !== bookCoverRoute)
  ) {
    return null
  }

  return {
    title: title.trim(),
    description: description.trim(),
    purchase_url,
    cover_image_url,
  }
}

async function readJson(request: NextRequest): Promise<unknown | NextResponse> {
  try {
    return await request.json()
  } catch (error) {
    if (error instanceof SyntaxError) {
      return jsonResponse({ message: 'The request could not be read.' }, 400)
    }
    throw error
  }
}

export async function GET(request: NextRequest) {
  const authorizationError = await authorizeAdminApi(request)
  if (authorizationError) return authorizationError

  try {
    return jsonResponse({ book: await getAdminBookListing() })
  } catch (error) {
    const response = storeErrorResponse(error)
    if (response) return response
    throw error
  }
}

export async function PUT(request: NextRequest) {
  const authorizationError = await authorizeAdminApi(request)
  if (authorizationError) return authorizationError

  const body = await readJson(request)
  if (body instanceof NextResponse) return body
  const listing = parseBookListing(body)
  if (!listing) {
    return jsonResponse({ message: 'Enter a title and valid book details.' }, 400)
  }

  try {
    return jsonResponse({ book: await saveBookListing(listing) })
  } catch (error) {
    const response = storeErrorResponse(error)
    if (response) return response
    throw error
  }
}
