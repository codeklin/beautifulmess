import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { Category, Writing, WritingStatus } from '@/lib/writings'

export type WritingInput = {
  title: string
  slug: string
  category: Category
  content: string
  audio_url: string | null
  is_published: boolean
  status: WritingStatus
  scheduled_for: string | null
  created_at?: string
}

export class WritingStoreNotConfiguredError extends Error {
  constructor() {
    super('Writing storage is not configured.')
    this.name = 'WritingStoreNotConfiguredError'
  }
}

export class WritingStoreError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WritingStoreError'
  }
}

function createSupabaseClient(key: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new WritingStoreNotConfiguredError()

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  })
}

function createPublicClient() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) throw new WritingStoreNotConfiguredError()
  return createSupabaseClient(key)
}

function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new WritingStoreNotConfiguredError()
  return createSupabaseClient(key)
}

export async function getPublicWritings(): Promise<Writing[]> {
  const now = new Date().toISOString()
  const supabase = createPublicClient()
  const [published, scheduled] = await Promise.all([
    supabase
      .from('writings')
      .select('*')
      .eq('is_published', true)
      .eq('status', 'published')
      .or(`scheduled_for.is.null,scheduled_for.lte.${now}`)
      .order('created_at', { ascending: false }),
    supabase
      .from('writings')
      .select('*')
      .eq('is_published', true)
      .eq('status', 'scheduled')
      .not('scheduled_for', 'is', null)
      .lte('scheduled_for', now)
      .order('created_at', { ascending: false }),
  ])

  if (published.error) throw new WritingStoreError(published.error.message)
  if (scheduled.error) throw new WritingStoreError(scheduled.error.message)
  if (!published.data || !scheduled.data) {
    throw new WritingStoreError('The writing service returned no result.')
  }
  return [...published.data, ...scheduled.data]
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()) as Writing[]
}

export async function getAdminWritings(): Promise<Writing[]> {
  const { data, error } = await createAdminClient()
    .from('writings')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new WritingStoreError(error.message)
  return data as Writing[]
}

export async function insertWritings(items: WritingInput[]): Promise<Writing[]> {
  const { data, error } = await createAdminClient()
    .from('writings')
    .insert(items)
    .select('*')

  if (error) throw new WritingStoreError(error.message)
  return data as Writing[]
}

export async function updateWriting(id: string, item: WritingInput): Promise<Writing | null> {
  const { data, error } = await createAdminClient()
    .from('writings')
    .update(item)
    .eq('id', id)
    .select('*')
    .maybeSingle()

  if (error) throw new WritingStoreError(error.message)
  return data as Writing | null
}

export async function deleteWriting(id: string): Promise<boolean> {
  const { data, error } = await createAdminClient()
    .from('writings')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error) throw new WritingStoreError(error.message)
  return data !== null
}
