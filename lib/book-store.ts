import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { bookCoverRoute } from '@/lib/book-constants'

const bookCoverBucket = 'book-covers'
const bookCoverObject = 'cover'

export type BookListing = {
  id: number
  title: string
  description: string
  purchase_url: string | null
  cover_image_url: string | null
  updated_at: string
}

export type BookListingInput = Omit<BookListing, 'id' | 'updated_at'>

export class BookStoreNotConfiguredError extends Error {
  constructor() {
    super('Book storage is not configured.')
    this.name = 'BookStoreNotConfiguredError'
  }
}

export class BookStoreError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BookStoreError'
  }
}

export class BookCoverNotFoundError extends Error {
  constructor() {
    super('Book cover was not found.')
    this.name = 'BookCoverNotFoundError'
  }
}

function createSupabaseClient(key: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new BookStoreNotConfiguredError()

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  })
}

export async function getPublicBookListing(): Promise<BookListing | null> {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) throw new BookStoreNotConfiguredError()

  const { data, error } = await createSupabaseClient(key)
    .from('book_listing')
    .select('*')
    .eq('id', 1)
    .maybeSingle()

  if (error) throw new BookStoreError(error.message)
  return data as BookListing | null
}

export async function getAdminBookListing(): Promise<BookListing | null> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new BookStoreNotConfiguredError()

  const { data, error } = await createSupabaseClient(key)
    .from('book_listing')
    .select('*')
    .eq('id', 1)
    .maybeSingle()

  if (error) throw new BookStoreError(error.message)
  return data as BookListing | null
}

export async function saveBookListing(
  listing: BookListingInput,
): Promise<BookListing> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new BookStoreNotConfiguredError()

  const { data, error } = await createSupabaseClient(key)
    .from('book_listing')
    .upsert({ id: 1, ...listing, updated_at: new Date().toISOString() }, { onConflict: 'id' })
    .select('*')
    .single()

  if (error) throw new BookStoreError(error.message)
  return data as BookListing
}

export async function uploadBookCover(
  file: Uint8Array,
  contentType: string,
): Promise<void> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new BookStoreNotConfiguredError()

  const { error } = await createSupabaseClient(key)
    .storage
    .from(bookCoverBucket)
    .upload(bookCoverObject, file, {
      cacheControl: '0',
      contentType,
      upsert: true,
    })

  if (error) throw new BookStoreError(error.message)
}

export async function getBookCoverImage(): Promise<Blob> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new BookStoreNotConfiguredError()

  const { data, error } = await createSupabaseClient(key)
    .storage
    .from(bookCoverBucket)
    .download(bookCoverObject)

  if (error) {
    const statusCode = typeof error === 'object' && 'statusCode' in error
      ? error.statusCode
      : undefined
    if (statusCode === '404') {
      throw new BookCoverNotFoundError()
    }
    throw new BookStoreError(error.message)
  }
  if (!data) throw new BookCoverNotFoundError()
  return data
}
