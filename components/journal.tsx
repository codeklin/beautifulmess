'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { LinkedInImport } from '@/components/linkedin-import'
import { categoryLabels, formatDate, sampleWritings, type Category, type Writing } from '@/lib/writings'

const filters: Array<{ label: string; value: Category | 'all' }> = [
  { label: 'All', value: 'all' }, { label: 'LinkedIn', value: 'linkedin' }, { label: 'Poems', value: 'poem' }, { label: 'Prose', value: 'prose' }, { label: 'Spoken Word', value: 'spoken_word' },
]

function ThemeToggle() {
  const [dark, setDark] = useState(false)
  useEffect(() => setDark(document.documentElement.dataset.theme === 'dark'), [])
  return <button className="text-button theme-toggle" onClick={() => { setDark((current) => { document.documentElement.dataset.theme = current ? 'light' : 'dark'; return !current }) }} aria-label={`Switch to ${dark ? 'light' : 'dark'} mode`}>{dark ? 'Light' : 'Dark'}</button>
}

function Header({ active, onSelect }: { active?: string; onSelect?: (value: Category | 'all') => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  return <header className="site-header">
    <Link href="/" className="wordmark">A quiet place</Link>
    {onSelect ? <nav className="filter-nav" aria-label="Filter writings">{filters.map((item) => <button key={item.value} className={`filter-button ${active === item.value ? 'selected' : ''}`} onClick={() => onSelect(item.value)} aria-pressed={active === item.value}>{item.label}</button>)}</nav> : <Link href="/" className="back-link">Back to journal</Link>}
    <ThemeToggle />
    <button className={`menu-toggle ${menuOpen ? 'is-open' : ''}`} type="button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} aria-controls="journal-menu" onClick={() => setMenuOpen((open) => !open)}><span/><span/><span/><span className="menu-word">{menuOpen ? 'Close' : 'Menu'}</span></button>
    {menuOpen && <nav className="mobile-menu" id="journal-menu" aria-label="Journal menu">{onSelect ? <div className="mobile-filters">{filters.map((item) => <button key={item.value} className={`filter-button ${active === item.value ? 'selected' : ''}`} onClick={() => { onSelect(item.value); setMenuOpen(false) }} aria-pressed={active === item.value}>{item.label}</button>)}</div> : <Link className="quiet-link" href="/">Back to journal</Link>}<Link className="quiet-link menu-desk-link" href="/write">Writer&apos;s desk</Link><div className="menu-theme"><span>Appearance</span><ThemeToggle /></div></nav>}
  </header>
}

function Meta({ writing }: { writing: Writing }) {
  return <div className="entry-meta"><time dateTime={writing.created_at}>{formatDate(writing.created_at)}</time><span>{categoryLabels[writing.category]}</span></div>
}

export function JournalHome() {
  const [category, setCategory] = useState<Category | 'all'>('all')
  const writings = sampleWritings.filter((item) => item.is_published && (category === 'all' || item.category === category))
  return <main className="reading-shell">
    <Header active={category} onSelect={setCategory} />
    <section className="journal-intro"><p className="eyebrow">Notes, poems, and other things kept</p><h1>A journal in progress.</h1><p className="intro-copy">Words gathered along the way, written down and left here.</p></section>
    <section className="entries" aria-label="Journal entries">{writings.map((writing) => <article className={`entry ${writing.category === 'poem' || writing.category === 'spoken_word' ? 'entry-poem' : ''}`} key={writing.id}>
      <Meta writing={writing} />
      {(writing.category === 'poem' || writing.category === 'spoken_word') ? <><h2 className="poem-title">{writing.title}</h2><p className="piece-text">{writing.content}</p><Link className="quiet-link entry-open" href={`/post/${writing.slug}`}>Read piece</Link></> : <><h2 className="entry-title"><Link href={`/post/${writing.slug}`}>{writing.title}</Link></h2><p className="excerpt">{writing.content.split('\n').slice(0, 3).join(' ')}</p><Link className="quiet-link" href={`/post/${writing.slug}`}>Read more</Link></>}
    </article>)}</section>
    <footer className="site-footer"><span>Kept with care.</span><Link href="/write">Writer&apos;s desk</Link></footer>
  </main>
}

export function PiecePage({ slug }: { slug: string }) {
  const writing = sampleWritings.find((item) => item.slug === slug)
  if (!writing) return <main className="reading-shell"><Header /><section className="not-found"><p className="eyebrow">Not found</p><h1>This page is not here.</h1><Link className="quiet-link" href="/">Return to the journal</Link></section></main>
  const index = sampleWritings.findIndex((item) => item.id === writing.id)
  const previous = sampleWritings[index - 1]
  const next = sampleWritings[index + 1]
  return <main className="reading-shell piece-shell"><Header /><article className="full-piece"><Meta writing={writing}/>{writing.category === 'spoken_word' && writing.audio_url && <AudioPlayer src={writing.audio_url} />}<h1>{writing.title}</h1><div className="full-copy">{writing.content}</div><ShareLink slug={writing.slug}/></article><nav className="piece-pagination" aria-label="Other writings">{previous ? <Link href={`/post/${previous.slug}`}><span>Previous</span>{previous.title}</Link> : <span/>}{next ? <Link href={`/post/${next.slug}`} className="next-piece"><span>Next</span>{next.title}</Link> : <span/>}</nav></main>
}

function ShareLink({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    await navigator.clipboard.writeText(`${window.location.origin}/post/${slug}`)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }
  return <button className="text-button copy-button" onClick={copy}>{copied ? 'Copied' : 'Copy link'}</button>
}

function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const remaining = Math.max(0, duration - currentTime)
  const timeLabel = `${Math.floor(remaining / 60)}:${String(Math.floor(remaining % 60)).padStart(2, '0')}`
  return <div className="audio-player"><audio ref={audioRef} src={src} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)} onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)} onEnded={() => setPlaying(false)} className="audio-native"/><button className="text-button" onClick={() => { const audio = audioRef.current; if (audio?.paused) void audio.play(); else audio?.pause() }}>{playing ? 'Pause' : 'Play'}</button><span className="audio-line" role="progressbar" aria-label="Audio progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={duration ? Math.round((currentTime / duration) * 100) : 0}><span className="audio-progress" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}/></span><span className="audio-time">{timeLabel}</span></div>
}

export function WriterDesk() {
  return <main className="reading-shell"><Header/><section className="desk-message"><p className="eyebrow">Writer&apos;s desk</p><h1>A private room for writing.</h1><LinkedInImport/><p>Writing and publishing are paused for now. Supabase is not connected, so imported posts can be previewed but not saved.</p><Link className="quiet-link" href="/">Back to journal</Link></section></main>
}
