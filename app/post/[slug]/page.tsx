import type { Metadata } from 'next'
import { PiecePage } from '@/components/journal'
import { sampleWritings } from '@/lib/writings'

export function generateStaticParams() {
  return sampleWritings.map((writing) => ({ slug: writing.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const writing = sampleWritings.find((item) => item.slug === slug)
  return { title: writing ? `${writing.title} | A quiet place` : 'Not found | A quiet place' }
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <PiecePage slug={slug} />
}
