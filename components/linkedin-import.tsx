'use client'

import { useState, type ChangeEvent } from 'react'

type PreviewPost = {
  id: string
  title: string
  slug: string
  content: string
  created_at: string
  category: 'linkedin'
  is_published: true
  selected: boolean
}

type ParsedCsv = { headers: string[]; rows: string[][] }

function parseCsv(source: string): ParsedCsv {
  const text = source.replace(/^\uFEFF/, '')
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"'
        index += 1
      } else if (character === '"') {
        quoted = false
      } else {
        field += character === '\r' && text[index + 1] === '\n' ? (index += 1, '\n') : character
      }
    } else if (character === '"' && field.length === 0) {
      quoted = true
    } else if (character === ',') {
      row.push(field)
      field = ''
    } else if (character === '\n' || character === '\r') {
      row.push(field)
      if (row.some((value) => value.trim())) rows.push(row)
      row = []
      field = ''
      if (character === '\r' && text[index + 1] === '\n') index += 1
    } else {
      field += character
    }
  }

  if (quoted) throw new Error('This CSV has a quote that was not closed.')
  row.push(field)
  if (row.some((value) => value.trim())) rows.push(row)
  if (!rows.length) throw new Error('This file has no rows to read.')
  return { headers: rows[0].map((header) => header.trim()), rows: rows.slice(1) }
}

function makeSlug(title: string, suffix = crypto.randomUUID().slice(0, 8)) {
  const base = title.toLowerCase().normalize('NFKD').replace(/[\\u0300-\\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'linkedin-post'
  return `${base}-${suffix}`
}

function toIsoDate(value: string) {
  const trimmed = value.trim()
  const normalized = trimmed
    .replace(/\s+UTC$/i, 'Z')
    .replace(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})$/, '$1T$2Z')
  const parsed = new Date(normalized)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

export function LinkedInImport({ onImported }: { onImported: () => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [posts, setPosts] = useState<PreviewPost[]>([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [dateFallbacks, setDateFallbacks] = useState(0)

  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return
    setError('')
    setMessage('')
    setPosts([])
    setDateFallbacks(0)
    if (file.size > 25 * 1024 * 1024) {
      setError('Choose a CSV file smaller than 25 MB.')
      input.value = ''
      return
    }

    try {
      const { headers, rows } = parseCsv(await file.text())
      const commentaryColumn = headers.indexOf('ShareCommentary')
      const dateColumn = headers.indexOf('Date')
      if (commentaryColumn < 0 || dateColumn < 0) {
        throw new Error('This file needs ShareCommentary and Date columns from the LinkedIn Shares.csv export.')
      }

      let missingDates = 0
      const now = new Date().toISOString()
      const imported = rows.flatMap((values): PreviewPost[] => {
        const content = (values[commentaryColumn] ?? '').trim()
        if (!content) return []
        const cleanTitle = content.replace(/\s+/g, ' ').trim()
        const words = cleanTitle.split(' ')
        const title = `${words.slice(0, 6).join(' ')}${words.length > 6 ? '...' : ''}`
        const createdAt = toIsoDate(values[dateColumn] ?? '')
        if (!createdAt) missingDates += 1
        const id = crypto.randomUUID()
        return [{ id, title, slug: makeSlug(title, id.slice(0, 8)), content, created_at: createdAt ?? now, category: 'linkedin', is_published: true, selected: true }]
      })

      if (!imported.length) throw new Error('No posts with ShareCommentary were found in this file.')
      setPosts(imported)
      setDateFallbacks(missingDates)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'This CSV could not be read.')
    }
    input.value = ''
  }

  function updatePost(id: string, update: Partial<Pick<PreviewPost, 'title' | 'selected'>>) {
    setPosts((current) => current.map((post) => {
      if (post.id !== id) return post
      const updated = { ...post, ...update }
      if (update.title !== undefined) updated.slug = makeSlug(update.title, post.id.slice(0, 8))
      return updated
    }))
  }

  async function saveSelectedPosts() {
    const selected = posts.filter((post) => post.selected)
    if (!selected.length) {
      setError('Choose at least one post to save.')
      return
    }

    setSaving(true)
    setError('')
    setMessage('')
    let saved = false
    try {
      const response = await fetch('/api/admin/writings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify(selected.map((post) => ({
          id: post.id,
          title: post.title.trim(),
          slug: post.slug,
          category: post.category,
          content: post.content,
          audio_url: null,
          is_published: true,
          status: 'published',
          scheduled_for: null,
          created_at: post.created_at,
        }))),
      })
      let result: unknown
      try {
        result = await response.json()
      } catch (caught) {
        if (!(caught instanceof SyntaxError)) throw caught
        throw new Error('The writing service returned an unreadable response.')
      }
      if (!response.ok) {
        const detail = typeof result === 'object' && result !== null && 'message' in result
          && typeof result.message === 'string'
          ? result.message
          : 'The posts could not be saved. Please try again.'
        throw new Error(detail)
      }

      saved = true
      await onImported()
      setPosts([])
      setMessage(`${selected.length} ${selected.length === 1 ? 'post' : 'posts'} saved to your journal.`)
    } catch (caught) {
      const detail = caught instanceof Error ? caught.message : 'Please try again.'
      setError(saved ? `The posts were saved, but the list could not refresh. ${detail}` : detail)
    } finally {
      setSaving(false)
    }
  }

  return <section className="linkedin-import">
    <button className="import-toggle" type="button" aria-expanded={open} aria-controls="linkedin-import-panel" onClick={() => setOpen((current) => !current)}>{open ? 'Close LinkedIn CSV import' : 'Import LinkedIn CSV'}</button>
    {open && <div className="import-panel" id="linkedin-import-panel">
      <p className="import-intro">Choose the Shares.csv file from your LinkedIn export. Review each post before saving it to your journal.</p>
      <label className="file-label" htmlFor="shares-csv">Shares.csv file</label>
      <input id="shares-csv" className="file-input" type="file" accept=".csv,text/csv" onChange={readFile}/>
      {error && <p className="import-message" role="alert">{error}</p>}
      {message && <p className="import-message" role="status">{message}</p>}
      {posts.length > 0 && <>
        <p className="import-count" aria-live="polite">{posts.length} {posts.length === 1 ? 'post' : 'posts'} found. {posts.filter((post) => post.selected).length} selected.</p>
        {dateFallbacks > 0 && <p className="import-note">{dateFallbacks} {dateFallbacks === 1 ? 'post had' : 'posts had'} an unreadable date and will use today&apos;s date.</p>}
        <div className="import-table-wrap"><table className="import-table"><thead><tr><th scope="col">Keep</th><th scope="col">Date</th><th scope="col">Title</th><th scope="col">Post</th></tr></thead><tbody>{posts.map((post) => <tr key={post.id}>
          <td><input type="checkbox" aria-label={`Include ${post.title}`} checked={post.selected} onChange={(event) => updatePost(post.id, { selected: event.target.checked })}/></td>
          <td><time dateTime={post.created_at}>{new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(post.created_at))}</time></td>
          <td><label className="sr-only" htmlFor={`title-${post.id}`}>Title for post</label><input id={`title-${post.id}`} className="title-edit" value={post.title} onChange={(event) => updatePost(post.id, { title: event.target.value })}/></td>
          <td className="preview-copy">{post.content}</td>
        </tr>)}</tbody></table></div>
        <button className="import-submit" type="button" disabled={saving} onClick={() => void saveSelectedPosts()}>
          {saving ? 'Saving posts...' : 'Save selected posts'}
        </button>
      </>}
    </div>}
  </section>
}
