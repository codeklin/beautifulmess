import type { Metadata } from 'next'
import Link from 'next/link'
import { AdminLoginForm } from '@/components/admin-login-form'

export const metadata: Metadata = {
  title: 'Write | UniqueMe',
  robots: { index: false, follow: false },
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const notice = error ? 'Please sign in again to continue.' : ''

  return (
    <main className="reading-shell">
      <header className="site-header">
        <Link href="/" className="wordmark">UniqueMe</Link>
      </header>
      <section className="desk-message">
        <span className="eyebrow-badge">Write</span>
        <h1>Sign in to write.</h1>
        <p className="desk-note">Enter your password to continue.</p>
        <AdminLoginForm initialMessage={notice} />
      </section>
    </main>
  )
}
