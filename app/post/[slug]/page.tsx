import type { Metadata } from 'next'
import { PiecePage } from '@/components/journal'
import { hasAdminSession } from '@/lib/admin-auth-state'
import {
  getPublicWritings,
  WritingStoreError,
  WritingStoreNotConfiguredError,
} from '@/lib/writing-store'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  try {
    const writing = (await getPublicWritings()).find((item) => item.slug === slug)
    return { title: writing ? `${writing.title} | BeautifulMess` : 'Not found | BeautifulMess' }
  } catch (error) {
    if (!(error instanceof WritingStoreError) && !(error instanceof WritingStoreNotConfiguredError)) {
      throw error
    }
    console.error('Unable to load public writing metadata:', error.message)
    return { title: 'BeautifulMess' }
  }
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const showAdminLink = await hasAdminSession()
  try {
    return <PiecePage slug={slug} writings={await getPublicWritings()} showAdminLink={showAdminLink} />
  } catch (error) {
    if (!(error instanceof WritingStoreError) && !(error instanceof WritingStoreNotConfiguredError)) {
      throw error
    }
    console.error('Unable to load public writings:', error.message)
    return <PiecePage slug={slug} writings={[]} loadError showAdminLink={showAdminLink} />
  }
}
