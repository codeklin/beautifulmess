import { NextResponse, type NextRequest } from 'next/server'
import { authorizeAdminApi } from '@/lib/admin-api'
import {
  deleteWriting,
  getAdminWritings,
  insertWritings,
  updateWriting,
  WritingStoreError,
  WritingStoreNotConfiguredError,
  type WritingInput,
} from '@/lib/writing-store'
import type { Category, WritingStatus } from '@/lib/writings'

const categories: Category[] = ['linkedin', 'poem', 'prose', 'spoken_word']
const statuses: WritingStatus[] = ['draft', 'scheduled', 'published']
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function isCategory(value: unknown): value is Category {
  return typeof value === 'string' && categories.some((category) => category === value)
}

function isWritingStatus(value: unknown): value is WritingStatus {
  return typeof value === 'string' && statuses.some((status) => status === value)
}

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  })
}

function storeErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof WritingStoreNotConfiguredError) {
    return jsonResponse({ message: 'Writing storage is not configured yet.' }, 503)
  }
  if (error instanceof WritingStoreError) {
    console.error('Writing storage request failed:', error.message)
    return jsonResponse({ message: 'The writing could not be saved. Please try again.' }, 500)
  }
  return null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseWriting(value: unknown): WritingInput | null {
  if (!isRecord(value)) return null
  const { title, slug, category, content, audio_url, is_published, status, scheduled_for, created_at } = value
  if (
    typeof title !== 'string' ||
    !title.trim() ||
    title.trim().length > 300 ||
    typeof slug !== 'string' ||
    !slugPattern.test(slug) ||
    slug.length > 300 ||
    !isCategory(category) ||
    typeof content !== 'string' ||
    !content.trim() ||
    content.length > 100_000 ||
    typeof is_published !== 'boolean' ||
    !isWritingStatus(status) ||
    (audio_url !== null && typeof audio_url !== 'string') ||
    (scheduled_for !== null && typeof scheduled_for !== 'string') ||
    (created_at !== undefined && typeof created_at !== 'string')
  ) {
    return null
  }

  if (
    status === 'scheduled' &&
    (!scheduled_for || Date.parse(scheduled_for) <= Date.now())
  ) {
    return null
  }
  if ((status === 'draft' && is_published) || (status !== 'draft' && !is_published)) return null
  if (scheduled_for && Number.isNaN(Date.parse(scheduled_for))) return null
  if (created_at && Number.isNaN(Date.parse(created_at))) return null
  if (audio_url) {
    try {
      const parsedAudioUrl = new URL(audio_url)
      if (parsedAudioUrl.protocol !== 'https:' && parsedAudioUrl.protocol !== 'http:') return null
    } catch {
      return null
    }
  }

  return {
    title: title.trim(),
    slug,
    category,
    content: content.trim(),
    audio_url,
    is_published,
    status,
    scheduled_for,
    ...(created_at ? { created_at } : {}),
  }
}

function hasPastSchedule(value: unknown): boolean {
  return isRecord(value) &&
    value.status === 'scheduled' &&
    typeof value.scheduled_for === 'string' &&
    !Number.isNaN(Date.parse(value.scheduled_for)) &&
    Date.parse(value.scheduled_for) <= Date.now()
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
    return jsonResponse({ writings: await getAdminWritings() })
  } catch (error) {
    const response = storeErrorResponse(error)
    if (response) return response
    throw error
  }
}

export async function POST(request: NextRequest) {
  const authorizationError = await authorizeAdminApi(request)
  if (authorizationError) return authorizationError

  const body = await readJson(request)
  if (body instanceof NextResponse) return body
  const entries = Array.isArray(body) ? body : [body]
  if (!entries.length || entries.length > 500) {
    return jsonResponse({ message: 'Choose between 1 and 500 writings to save.' }, 400)
  }
  if (entries.some(hasPastSchedule)) {
    return jsonResponse({ message: 'Choose a future date and time, or publish immediately.' }, 400)
  }
  const writings: WritingInput[] = []
  for (const entry of entries) {
    const writing = parseWriting(entry)
    if (!writing) return jsonResponse({ message: 'One or more writings have invalid details.' }, 400)
    writings.push(writing)
  }

  try {
    return jsonResponse({ writings: await insertWritings(writings) }, 201)
  } catch (error) {
    const response = storeErrorResponse(error)
    if (response) return response
    throw error
  }
}

export async function PATCH(request: NextRequest) {
  const authorizationError = await authorizeAdminApi(request)
  if (authorizationError) return authorizationError

  const body = await readJson(request)
  if (!isRecord(body) || typeof body.id !== 'string' || !uuidPattern.test(body.id)) {
    return body instanceof NextResponse
      ? body
      : jsonResponse({ message: 'Choose a writing to update.' }, 400)
  }
  if (hasPastSchedule(body)) {
    return jsonResponse({ message: 'Choose a future date and time, or publish immediately.' }, 400)
  }
  const writing = parseWriting(body)
  if (!writing) return jsonResponse({ message: 'The writing has invalid details.' }, 400)

  try {
    const updated = await updateWriting(body.id, writing)
    return updated
      ? jsonResponse({ writing: updated })
      : jsonResponse({ message: 'That writing could not be found.' }, 404)
  } catch (error) {
    const response = storeErrorResponse(error)
    if (response) return response
    throw error
  }
}

export async function DELETE(request: NextRequest) {
  const authorizationError = await authorizeAdminApi(request)
  if (authorizationError) return authorizationError

  const body = await readJson(request)
  if (!isRecord(body) || typeof body.id !== 'string' || !uuidPattern.test(body.id)) {
    return body instanceof NextResponse
      ? body
      : jsonResponse({ message: 'Choose a writing to remove.' }, 400)
  }

  try {
    return (await deleteWriting(body.id))
      ? jsonResponse({ message: 'Writing removed.' })
      : jsonResponse({ message: 'That writing could not be found.' }, 404)
  } catch (error) {
    const response = storeErrorResponse(error)
    if (response) return response
    throw error
  }
}
