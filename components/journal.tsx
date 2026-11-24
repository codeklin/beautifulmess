'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Fragment, useEffect, useRef, useState } from 'react'
import { AdminDashboard } from '@/components/admin-dashboard'
import { PwaInstallButton, clearAppCacheAndReload } from '@/components/pwa-register'
import { bookCoverRoute } from '@/lib/book-constants'
import {
  categoryLabels,
  formatDate,
  type Category,
  type Writing,
} from '@/lib/writings'
import type { BookListing } from '@/lib/book-store'

const filters: Array<{ label: string; value: Category | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'LinkedIn', value: 'linkedin' },
  { label: 'Spoken Word', value: 'spoken_word' },
]

function splitTrailingPunctuation(value: string) {
  let url = value
  let trailing = ''

  while (/[.,!?;:)\]}]$/.test(url)) {
    const last = url[url.length - 1]
    if (
      (last === ')' && url.split(')').length <= url.split('(').length) ||
      (last === ']' && url.split(']').length <= url.split('[').length) ||
      (last === '}' && url.split('}').length <= url.split('{').length)
    ) {
      break
    }
    url = url.slice(0, -1)
    trailing = last + trailing
  }

  return { url, trailing }
}

function WritingText({ text }: { text: string }) {
  const parts: React.ReactNode[] = []
  const urlPattern = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|(?<![\w@])(?:https?:\/\/[^\s<>"']+|(?:www\.)?(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?::\d+)?(?:[/?#][^\s<>"']*)?)/gi
  let position = 0
  let match: RegExpExecArray | null

  while ((match = urlPattern.exec(text)) !== null) {
    if (match.index < position) continue
    parts.push(text.slice(position, match.index))

    if (match[1] !== undefined && match[2] !== undefined) {
      try {
        const parsedUrl = new URL(match[2])
        if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
          parts.push(
            <a
              key={`link-${match.index}`}
              className="external-writing-link"
              href={parsedUrl.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {match[1]}
            </a>,
          )
        } else {
          parts.push(match[0])
        }
      } catch {
        parts.push(match[0])
      }
      position = match.index + match[0].length
      continue
    }

    const { url, trailing } = splitTrailingPunctuation(match[0])
    if (!url) {
      parts.push(match[0])
      position = match.index + match[0].length
      continue
    }

    const href = /^https?:\/\//i.test(url) ? url : `https://${url}`
    let parsedUrl: URL | null = null
    try {
      parsedUrl = new URL(href)
    } catch {
      // Leave incomplete URLs as plain text.
    }

    if (parsedUrl && (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:')) {
      parts.push(
        <a
          key={`link-${match.index}`}
          className="external-writing-link"
          href={parsedUrl.href}
          target="_blank"
          rel="noopener noreferrer"
        >
          {url}
        </a>,
      )
    } else {
      parts.push(url)
    }
    parts.push(trailing)
    position = match.index + match[0].length
  }

  parts.push(text.slice(position))
  return <>{parts.map((part, index) => <Fragment key={index}>{part}</Fragment>)}</>
}

function ThemeToggle() {
  const [dark, setDark] = useState(false)
  useEffect(() => setDark(document.documentElement.dataset.theme === 'dark'), [])
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => {
        setDark((current) => {
          const next = !current
          document.documentElement.dataset.theme = next ? 'dark' : 'light'
          return next
        })
      }}
      aria-label={`Switch to ${dark ? 'light' : 'dark'} mode`}
    >
      {dark ? 'Light' : 'Dark'}
    </button>
  )
}

function Header({
  active,
  onSelect,
  showBackLink = true,
  showAdminLink = false,
}: {
  active?: string
  onSelect?: (value: Category | 'all') => void
  showBackLink?: boolean
  showAdminLink?: boolean
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!menuOpen) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  return (
    <header className="site-header">
      <Link href="/" className="wordmark">UniqueMe</Link>
      {onSelect ? (
        <nav className="filter-nav" aria-label="Filter writings">
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`filter-button ${active === item.value ? 'selected' : ''}`}
              onClick={() => onSelect(item.value)}
              aria-pressed={active === item.value}
            >
              {item.label}
            </button>
          ))}
        </nav>
      ) : showBackLink && (
        <Link href="/" className="back-link">Back to journal</Link>
      )}
      <Link href="/book" className="book-header-link">Book</Link>
      {showAdminLink && <Link href="/write" className="admin-header-link">Admin</Link>}
      <ThemeToggle />
      <span className="mobile-theme-toggle">
        <ThemeToggle />
      </span>
      <button
        className={`menu-toggle ${menuOpen ? 'is-open' : ''}`}
        type="button"
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={menuOpen}
        aria-controls="journal-menu"
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span className="hamburger-icon" aria-hidden="true">
          <span className="hamburger-line line-top" />
          <span className="hamburger-line line-mid" />
          <span className="hamburger-line line-bot" />
        </span>
        <span className="menu-word">{menuOpen ? 'Close' : 'Menu'}</span>
      </button>
      {menuOpen && (
        <nav className="mobile-menu" id="journal-menu" aria-label="Journal menu">
          <div className="mobile-menu-top">
            <Link href="/" className="wordmark mobile-menu-wordmark" onClick={() => setMenuOpen(false)}>
              UniqueMe
            </Link>
            <button
              type="button"
              className="mobile-close-btn"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
            >
              <span className="close-cross" aria-hidden="true">
                <span className="cross-line cross-1" />
                <span className="cross-line cross-2" />
              </span>
              <span className="close-label">Close</span>
            </button>
          </div>
          {onSelect ? (
            <div className="mobile-filters">
              {filters.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={`filter-button ${active === item.value ? 'selected' : ''}`}
                  onClick={() => {
                    onSelect(item.value)
                    setMenuOpen(false)
                  }}
                  aria-pressed={active === item.value}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : showBackLink && (
            <Link className="quiet-link" href="/" onClick={() => setMenuOpen(false)}>
              Back to journal
            </Link>
          )}
          <Link className="quiet-link" href="/book" onClick={() => setMenuOpen(false)}>
            Book
          </Link>
          {showAdminLink && (
            <Link className="quiet-link mobile-admin-link" href="/write" onClick={() => setMenuOpen(false)}>
              Admin
            </Link>
          )}
        </nav>
      )}
    </header>
  )
}

function Meta({ writing }: { writing: Writing }) {
  return (
    <div className="entry-meta">
      {categoryLabels[writing.category] && (
        <span className="entry-badge">{categoryLabels[writing.category]}</span>
      )}
      <time className="meta-time" dateTime={writing.created_at}>{formatDate(writing.created_at)}</time>
    </div>
  )
}

export function JournalHome({
  writings: allWritings,
  loadError = false,
  showAdminLink = false,
}: {
  writings: Writing[]
  loadError?: boolean
  showAdminLink?: boolean
}) {
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [query, setQuery] = useState('')
  const router = useRouter()

  useEffect(() => {
    const interval = window.setInterval(() => router.refresh(), 30000)
    return () => clearInterval(interval)
  }, [router])

  const normalizedQuery = query.trim().toLowerCase()
  const writings = allWritings.filter((item) => {
    const matchesCategory = category === 'all' || item.category === category
    const matchesSearch = !normalizedQuery
      || `${item.title}\n${item.content}`.toLowerCase().includes(normalizedQuery)
    return matchesCategory && matchesSearch
  })

  return (
    <main className="reading-shell">
      <Header active={category} onSelect={setCategory} showBackLink={false} showAdminLink={showAdminLink} />
      <section className="journal-intro">
        <h1>Raw thoughts. Real ones.</h1>
        <p className="intro-copy">This is where I think out loud. No polish, no performance. If you want the focused version, follow me on LinkedIn.</p>
      </section>
      <section className="journal-search" role="search">
        <label className="field-label" htmlFor="journal-search">Search writings</label>
        <input
          id="journal-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search titles and words"
        />
      </section>
      <section className="entries" aria-label="Journal entries" aria-live="polite">
        {loadError ? (
          <p className="empty-journal">The journal is unavailable right now. Please come back soon.</p>
        ) : writings.length === 0 ? (
          <p className="empty-journal">
            {normalizedQuery
              ? 'No writings match your search.'
              : category !== 'all'
                ? 'There are no writings in this filter yet.'
                : 'There is nothing here just yet.'}
          </p>
        ) : null}
        {writings.map((writing) => {
          const isSpokenWord = writing.category === 'spoken_word'
          return (
            <article key={writing.id} className={`entry ${isSpokenWord ? 'entry-spoken-word' : 'entry-writing'}`}>
              <Meta writing={writing} />
              {isSpokenWord ? (
                <>
                  <h2 className="spoken-word-title">
                    <Link href={`/post/${writing.slug}`}>{writing.title}</Link>
                  </h2>
                  <div className="spoken-word-excerpt">
                    <p><WritingText text={writing.content} /></p>
                  </div>
                  <div className="entry-actions">
                    <Link className="quiet-link entry-open" href={`/post/${writing.slug}`}>
                      Read piece
                    </Link>
                    <ShareLink slug={writing.slug} title={writing.title} />
                  </div>
                </>
              ) : (
                <>
                  <h2 className="entry-title">
                    <Link href={`/post/${writing.slug}`}>{writing.title}</Link>
                  </h2>
                  <p className="writing-excerpt">
                    <WritingText text={writing.content.split('\n\n')[0] || writing.content} />
                  </p>
                  <div className="entry-actions">
                    <Link className="quiet-link" href={`/post/${writing.slug}`}>
                      Continue reading
                    </Link>
                    <ShareLink slug={writing.slug} title={writing.title} />
                  </div>
                </>
              )}
            </article>
          )
        })}
      </section>
      <footer className="site-footer">
        <span>Kept with care.</span>
        <div className="site-footer-links">
          <PwaInstallButton />
        </div>
      </footer>
    </main>
  )
}

export function PiecePage({
  slug,
  writings: allPieces,
  loadError = false,
  showAdminLink = false,
}: {
  slug: string
  writings: Writing[]
  loadError?: boolean
  showAdminLink?: boolean
}) {
  const writing = allPieces.find((item) => item.slug === slug)

  if (loadError || !writing) {
    return (
      <main className="reading-shell">
        <Header showAdminLink={showAdminLink} />
        <section className="not-found">
          <span className="eyebrow-badge">{loadError ? 'Unavailable' : 'Not found'}</span>
          <h1>{loadError ? 'The journal is resting for a moment.' : 'This page is not here.'}</h1>
          <Link className="quiet-link" href="/">Return to the journal</Link>
        </section>
      </main>
    )
  }

  const index = allPieces.findIndex((item) => item.id === writing.id)
  const previous = allPieces[index - 1]
  const next = allPieces[index + 1]
  const isSpokenWord = writing.category === 'spoken_word'

  return (
    <main className="reading-shell piece-shell">
      <Header showAdminLink={showAdminLink} />
      <article className="full-piece">
        <Meta writing={writing} />
        <h1 className="piece-heading">{writing.title}</h1>
        {writing.category === 'spoken_word' && writing.audio_url && (
          <AudioPlayer src={writing.audio_url} />
        )}
        <div className={isSpokenWord ? 'full-spoken-word-content' : 'full-writing-content'}>
          <WritingText text={writing.content} />
        </div>
        <div className="piece-actions">
          <ShareLink slug={writing.slug} title={writing.title} />
        </div>
      </article>
      <nav className="piece-pagination" aria-label="Other writings">
        {previous ? (
          <Link href={`/post/${previous.slug}`} className="prev-piece">
            <span className="pagination-label">Previous piece</span>
            <span className="pagination-title">{previous.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/post/${next.slug}`} className="next-piece">
            <span className="pagination-label">Next piece</span>
            <span className="pagination-title">{next.title}</span>
          </Link>
        ) : (
          <span />
        )}
      </nav>
      <footer className="site-footer">
        <span>Kept with care.</span>
      </footer>
    </main>
  )
}

export function BookPage({
  book,
  loadError = false,
}: {
  book: BookListing | null
  loadError?: boolean
}) {
  return (
    <main className="reading-shell book-shell">
      <Header />
      {loadError ? (
        <section className="not-found">
          <span className="eyebrow-badge">Book</span>
          <h1>The book page is resting for a moment.</h1>
          <Link className="quiet-link" href="/">Return to the journal</Link>
        </section>
      ) : !book ? (
        <section className="book-empty">
          <span className="eyebrow-badge">Book</span>
          <h1>A book will be here soon.</h1>
          <p>Come back when there is something new to share.</p>
        </section>
      ) : (
        <article className="book-page">
          <span className="eyebrow-badge">Book</span>
          <h1>{book.title}</h1>
          <div className="book-details">
            {book.cover_image_url === bookCoverRoute && (
              <img
                className="book-cover"
                src={`${bookCoverRoute}?v=${encodeURIComponent(book.updated_at)}`}
                alt={`Cover of ${book.title}`}
                referrerPolicy="no-referrer"
              />
            )}
            <div className="book-copy">
              {book.description && <p>{book.description}</p>}
              {book.purchase_url ? (
                <a
                  className="book-purchase-link"
                  href={book.purchase_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Purchase the book
                </a>
              ) : (
                <p className="book-purchase-note">Purchase details will be added soon.</p>
              )}
            </div>
          </div>
        </article>
      )}
      <footer className="site-footer">
        <span>Kept with care.</span>
        <Link href="/">Back to journal</Link>
      </footer>
    </main>
  )
}

function ShareLink({ slug, title }: { slug: string; title: string }) {
  const [feedback, setFeedback] = useState<'idle' | 'copied' | 'failed'>('idle')
  async function copy() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/post/${slug}`)
      setFeedback('copied')
    } catch {
      setFeedback('failed')
    }
    window.setTimeout(() => setFeedback('idle'), 2000)
  }
  return (
    <button
      type="button"
      className="copy-button"
      aria-label={
        feedback === 'copied'
          ? `Link copied for ${title}`
          : feedback === 'failed'
            ? `Could not copy link for ${title}`
            : `Copy link to ${title}`
      }
      aria-live="polite"
      onClick={() => void copy()}
    >
      {feedback === 'copied' ? 'Link copied' : feedback === 'failed' ? 'Copy failed' : 'Copy link'}
    </button>
  )
}

function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const remaining = Math.max(0, duration - currentTime)
  const timeLabel = `${Math.floor(remaining / 60)}:${String(Math.floor(remaining % 60)).padStart(2, '0')}`

  return (
    <div className="audio-player">
      <audio
        ref={audioRef}
        src={src}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onEnded={() => setPlaying(false)}
        className="audio-native"
      />
      <button
        type="button"
        className="audio-control"
        onClick={() => {
          const audio = audioRef.current
          if (audio?.paused) void audio.play()
          else audio?.pause()
        }}
      >
        {playing ? 'Pause audio' : 'Listen'}
      </button>
      <span
        className="audio-line"
        role="progressbar"
        aria-label="Audio progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={duration ? Math.round((currentTime / duration) * 100) : 0}
      >
        <span
          className="audio-progress"
          style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
        />
      </span>
      <span className="audio-time">{timeLabel}</span>
    </div>
  )
}

function ClearCacheButton() {
  const [clearing, setClearing] = useState(false)
  async function handleClear() {
    setClearing(true)
    await clearAppCacheAndReload()
  }
  return (
    <button
      type="button"
      className="text-button desk-cache-button"
      onClick={handleClear}
      disabled={clearing}
      title="Purge cached app files and download the latest updates"
    >
      {clearing ? 'Updating app...' : 'Clear cache and update'}
    </button>
  )
}

export function WriterDesk() {
  return (
    <main className="reading-shell">
      <Header />
      <section className="desk-message">
        <span className="eyebrow-badge">Admin dashboard</span>
        <h1>Manage your journal.</h1>
        <p className="desk-note">
          Manage your posts and book listing in one place.
        </p>
        <AdminDashboard />
      </section>
      <footer className="site-footer">
        <div className="desk-footer-actions">
          <ClearCacheButton />
          <form action="/api/admin/logout" method="post">
            <button type="submit" className="text-button">Sign out</button>
          </form>
        </div>
        <Link href="/">Back to journal</Link>
      </footer>
    </main>
  )
}
