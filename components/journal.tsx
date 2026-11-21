'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { LinkedInImport } from '@/components/linkedin-import'
import { categoryLabels, formatDate, sampleWritings, type Category, type Writing } from '@/lib/writings'

const filters: Array<{ label: string; value: Category | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'LinkedIn', value: 'linkedin' },
  { label: 'Poems', value: 'poem' },
  { label: 'Prose', value: 'prose' },
  { label: 'Spoken Word', value: 'spoken_word' },
]

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

function Header({ active, onSelect }: { active?: string; onSelect?: (value: Category | 'all') => void }) {
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
      <Link href="/" className="wordmark">BeautifulMess</Link>
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
      ) : (
        <Link href="/" className="back-link">Back to journal</Link>
      )}
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
              BeautifulMess
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
          ) : (
            <Link className="quiet-link" href="/" onClick={() => setMenuOpen(false)}>
              Back to journal
            </Link>
          )}
          <Link className="quiet-link menu-desk-link" href="/write" onClick={() => setMenuOpen(false)}>
            Writer&apos;s desk
          </Link>
        </nav>
      )}
    </header>
  )
}

function Meta({ writing }: { writing: Writing }) {
  return (
    <div className="entry-meta">
      <span className="entry-badge">{categoryLabels[writing.category]}</span>
      <time className="meta-time" dateTime={writing.created_at}>{formatDate(writing.created_at)}</time>
    </div>
  )
}

export function JournalHome() {
  const [category, setCategory] = useState<Category | 'all'>('all')
  const writings = sampleWritings.filter(
    (item) => item.is_published && (category === 'all' || item.category === category)
  )

  return (
    <main className="reading-shell">
      <Header active={category} onSelect={setCategory} />
      <section className="journal-intro">
        <span className="eyebrow-badge">Notes, poems, and other things kept</span>
        <h1>A journal in progress.</h1>
        <p className="intro-copy">Words gathered along the way, written down and left here.</p>
      </section>
      <section className="entries" aria-label="Journal entries">
        {writings.map((writing) => {
          const isPoetry = writing.category === 'poem' || writing.category === 'spoken_word'
          return (
            <article key={writing.id} className={`entry ${isPoetry ? 'entry-poem' : 'entry-prose'}`}>
              <Meta writing={writing} />
              {isPoetry ? (
                <>
                  <h2 className="poem-title">
                    <Link href={`/post/${writing.slug}`}>{writing.title}</Link>
                  </h2>
                  <div className="piece-stanza">
                    <p className="piece-text">{writing.content}</p>
                  </div>
                  <Link className="quiet-link entry-open" href={`/post/${writing.slug}`}>
                    Read piece
                  </Link>
                </>
              ) : (
                <>
                  <h2 className="entry-title">
                    <Link href={`/post/${writing.slug}`}>{writing.title}</Link>
                  </h2>
                  <p className="prose-excerpt">
                    {writing.content.split('\n\n')[0] || writing.content}
                  </p>
                  <Link className="quiet-link" href={`/post/${writing.slug}`}>
                    Continue reading
                  </Link>
                </>
              )}
            </article>
          )
        })}
      </section>
      <footer className="site-footer">
        <span>Kept with care.</span>
        <Link href="/write">Writer&apos;s desk</Link>
      </footer>
    </main>
  )
}

export function PiecePage({ slug }: { slug: string }) {
  const writing = sampleWritings.find((item) => item.slug === slug)
  if (!writing) {
    return (
      <main className="reading-shell">
        <Header />
        <section className="not-found">
          <span className="eyebrow-badge">Not found</span>
          <h1>This page is not here.</h1>
          <Link className="quiet-link" href="/">Return to the journal</Link>
        </section>
      </main>
    )
  }

  const index = sampleWritings.findIndex((item) => item.id === writing.id)
  const previous = sampleWritings[index - 1]
  const next = sampleWritings[index + 1]
  const isPoetry = writing.category === 'poem' || writing.category === 'spoken_word'

  return (
    <main className="reading-shell piece-shell">
      <Header />
      <article className="full-piece">
        <Meta writing={writing} />
        <h1 className="piece-heading">{writing.title}</h1>
        {writing.category === 'spoken_word' && writing.audio_url && (
          <AudioPlayer src={writing.audio_url} />
        )}
        <div className={isPoetry ? 'full-poem-content' : 'full-prose-content'}>
          {writing.content}
        </div>
        <div className="piece-actions">
          <ShareLink slug={writing.slug} />
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
        <Link href="/write">Writer&apos;s desk</Link>
      </footer>
    </main>
  )
}

function ShareLink({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    await navigator.clipboard.writeText(`${window.location.origin}/post/${slug}`)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button type="button" className="copy-button" onClick={copy}>
      {copied ? 'Link copied' : 'Copy link'}
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

export function WriterDesk() {
  return (
    <main className="reading-shell">
      <Header />
      <section className="desk-message">
        <span className="eyebrow-badge">Writer&apos;s desk</span>
        <h1>A private room for writing.</h1>
        <LinkedInImport />
        <p className="desk-note">
          Writing and publishing are paused for now. Supabase is not connected, so imported posts can be previewed but not saved.
        </p>
        <Link className="quiet-link" href="/">Back to journal</Link>
      </section>
      <footer className="site-footer">
        <span>Kept with care.</span>
        <Link href="/">Back to journal</Link>
      </footer>
    </main>
  )
}
