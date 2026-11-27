'use client'

import { useEffect, useState, useId, useRef } from 'react'
import {
  categoryLabels,
  formatDateTime,
  isWritingLive,
  type Category,
  type Writing,
  type WritingStatus,
} from '@/lib/writings'
import type { WritingInput } from '@/lib/writing-store'

type AdminApiResponse = {
  writings?: Writing[]
  message?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function requestAdminWritings(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  body?: unknown,
): Promise<AdminApiResponse> {
  const response = await fetch('/api/admin/writings', {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  })

  let result: unknown
  try {
    result = await response.json()
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error
    throw new Error('The writing service returned an unreadable response.')
  }

  if (!response.ok) {
    const message = typeof result === 'object' && result !== null && 'message' in result
      && typeof result.message === 'string'
      ? result.message
      : 'The writing could not be saved. Please try again.'
    throw new Error(message)
  }

  if (typeof result !== 'object' || result === null || Array.isArray(result)) {
    throw new Error('The writing service returned an invalid response.')
  }
  return result as AdminApiResponse
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function makeSlug(title: string, suffix = crypto.randomUUID().slice(0, 8)) {
  const base = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'writing'
  return `${base}-${suffix}`
}

function getDefaultScheduleTime(): string {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000)
  date.setMinutes(0, 0, 0)
  return toLocalDateTime(date)
}

function toLocalDateTime(date: Date): string {
  // Format the date as a local datetime string (YYYY-MM-DDTHH:mm) without
  // adjusting the value — just zero-pad each component in local time.
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    date.getFullYear() +
    '-' + pad(date.getMonth() + 1) +
    '-' + pad(date.getDate()) +
    'T' + pad(date.getHours()) +
    ':' + pad(date.getMinutes())
  )
}

export function PostingManager() {
  const [activeTab, setActiveTab] = useState<'compose' | 'ledger'>('ledger')
  const [writings, setWritings] = useState<Writing[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)

  // Composer fields
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [isSpokenWord, setIsSpokenWord] = useState(false)
  const [content, setContent] = useState('')
  const [linkRange, setLinkRange] = useState<{ start: number; end: number } | null>(null)
  const [linkText, setLinkText] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkError, setLinkError] = useState('')
  const [audioUrl, setAudioUrl] = useState('')
  const [publishMode, setPublishMode] = useState<'now' | 'schedule' | 'draft'>('schedule')
  const [scheduledFor, setScheduledFor] = useState('')
  const [minimumScheduleTime, setMinimumScheduleTime] = useState('')
  const [message, setMessage] = useState('')
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'scheduled' | 'published' | 'draft'>('all')

  const titleInputId = useId()
  const contentInputId = useId()
  const linkTextInputId = useId()
  const linkUrlInputId = useId()
  const audioInputId = useId()
  const scheduleInputId = useId()
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setScheduledFor(getDefaultScheduleTime())
    setMinimumScheduleTime(toLocalDateTime(new Date()))
  }, [])

  useEffect(() => {
    let active = true
    requestAdminWritings('GET')
      .then((result) => {
        if (!Array.isArray(result.writings)) {
          throw new Error('The writing service returned an invalid list.')
        }
        if (active) {
          setWritings(result.writings)
          setLoadError('')
        }
      })
      .catch((error: unknown) => {
        if (active) setLoadError(getErrorMessage(error, 'Unable to load your writings.'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  async function refreshWritings() {
    const result = await requestAdminWritings('GET')
    if (!Array.isArray(result.writings)) {
      throw new Error('The writing service returned an invalid list.')
    }
    setWritings(result.writings)
    setLoadError('')
  }

  function resetForm() {
    setEditingId(null)
    setTitle('')
    setIsSpokenWord(false)
    setContent('')
    setLinkRange(null)
    setLinkError('')
    setAudioUrl('')
    setPublishMode('schedule')
    setScheduledFor(getDefaultScheduleTime())
    setMinimumScheduleTime(toLocalDateTime(new Date()))
  }

  function openLinkEditor() {
    const textarea = contentTextareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.slice(start, end)
    if (!selectedText.trim() || selectedText.includes('\n')) {
      setLinkRange(null)
      setLinkError('Select one or more words on a single line first.')
      return
    }

    setLinkRange({ start, end })
    setLinkText(selectedText.trim())
    setLinkUrl('')
    setLinkError('')
  }

  function insertSelectedLink() {
    if (!linkRange) return

    const destination = linkUrl.trim()
    const normalizedDestination = /^https?:\/\//i.test(destination)
      ? destination
      : `https://${destination}`
    let parsedDestination: URL
    try {
      parsedDestination = new URL(normalizedDestination)
    } catch {
      setLinkError('Enter a valid website address.')
      return
    }
    if (parsedDestination.protocol !== 'http:' && parsedDestination.protocol !== 'https:') {
      setLinkError('Use a website address that begins with http:// or https://.')
      return
    }
    if (!linkText.trim() || /[\r\n]/.test(linkText)) {
      setLinkError('Enter link text on a single line.')
      return
    }

    const markup = `[${linkText.trim()}](${parsedDestination.href})`
    const updatedContent =
      content.slice(0, linkRange.start) + markup + content.slice(linkRange.end)
    setContent(updatedContent)
    setLinkRange(null)
    setLinkError('')
    window.requestAnimationFrame(() => {
      const textarea = contentTextareaRef.current
      if (!textarea) return
      const cursor = linkRange.start + markup.length
      textarea.focus()
      textarea.setSelectionRange(cursor, cursor)
    })
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    setMessage('')

    const cleanTitle = title.trim()
    const cleanContent = content.trim()

    if (!cleanTitle) {
      setMessage('Please enter a title for your piece.')
      return
    }

    if (!cleanContent) {
      setMessage('Please write some content before saving.')
      return
    }

    let status: WritingStatus = 'published'
    let isPublished = true
    let scheduleIso: string | null = null

    if (publishMode === 'draft') {
      status = 'draft'
      isPublished = false
    } else if (publishMode === 'schedule') {
      if (!scheduledFor) {
        setMessage('Please select a date and time to schedule this piece.')
        return
      }
      const parsedTime = new Date(scheduledFor).getTime()
      if (Number.isNaN(parsedTime)) {
        setMessage('The scheduled date and time is not valid.')
        return
      }
      if (parsedTime <= Date.now()) {
        setMessage('Choose a future date and time, or select Publish immediately.')
        return
      }
      status = 'scheduled'
      isPublished = true
      scheduleIso = new Date(parsedTime).toISOString()
    }

    const existing = editingId ? writings.find((item) => item.id === editingId) : undefined
    const category: Category = isSpokenWord ? 'spoken_word' : 'prose'
    const payload: WritingInput = {
      title: cleanTitle,
      slug: existing?.slug ?? makeSlug(cleanTitle),
      category,
      content: cleanContent,
      audio_url: isSpokenWord ? audioUrl.trim() || null : null,
      is_published: isPublished,
      status,
      scheduled_for: scheduleIso,
    }

    setSaving(true)
    try {
      await requestAdminWritings(editingId ? 'PATCH' : 'POST', editingId ? { id: editingId, ...payload } : payload)
      await refreshWritings()
      resetForm()
      setMessage(
        status === 'scheduled'
          ? `${editingId ? 'Updated and scheduled' : 'Scheduled to appear'} for ${formatDateTime(scheduleIso || new Date().toISOString())}.`
          : status === 'draft'
          ? editingId ? 'Draft updated in your private desk.' : 'Saved as a private draft in your desk.'
          : editingId ? 'Piece updated and published to your journal.' : 'Published live to your journal.'
      )
    } catch (error) {
      setMessage(getErrorMessage(error, 'The writing could not be saved. Please try again.'))
    } finally {
      setSaving(false)
    }
  }

  function handleEdit(item: Writing) {
    setEditingId(item.id)
    setTitle(item.title)
    setIsSpokenWord(item.category === 'spoken_word')
    setContent(item.content)
    setLinkRange(null)
    setLinkError('')
    setAudioUrl(item.audio_url || '')
    if (item.status === 'draft') {
      setPublishMode('draft')
    } else if (item.status === 'scheduled' || item.scheduled_for) {
      setPublishMode('schedule')
      if (item.scheduled_for) {
        setScheduledFor(toLocalDateTime(new Date(item.scheduled_for)))
      }
    } else {
      setPublishMode('now')
    }
    setActiveTab('compose')
    setMessage('')
  }

  async function handlePublishNow(item: Writing) {
    setMessage('')
    try {
      await requestAdminWritings('PATCH', {
        id: item.id,
        title: item.title,
        slug: item.slug,
        category: item.category,
        content: item.content,
        audio_url: item.audio_url ?? null,
        status: 'published',
        is_published: true,
        scheduled_for: null,
      })
      await refreshWritings()
      setMessage('Piece has been published to your journal.')
    } catch (error) {
      setMessage(getErrorMessage(error, 'The writing could not be published. Please try again.'))
    }
  }

  async function handleDelete(id: string) {
    setMessage('')
    try {
      await requestAdminWritings('DELETE', { id })
      await refreshWritings()
      setMessage('Piece removed from your desk.')
    } catch (error) {
      setMessage(getErrorMessage(error, 'The writing could not be removed. Please try again.'))
    }
  }

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 200))

  const filteredLedger = writings.filter((item) => {
    if (ledgerFilter === 'all') return true
    if (ledgerFilter === 'draft') return item.status === 'draft'
    if (ledgerFilter === 'scheduled') {
      return (item.status === 'scheduled' || item.scheduled_for != null) && !isWritingLive(item)
    }
    if (ledgerFilter === 'published') {
      return isWritingLive(item)
    }
    return true
  })

  const scheduledCount = writings.filter(
    (item) => (item.status === 'scheduled' || item.scheduled_for != null) && !isWritingLive(item)
  ).length
  const draftsCount = writings.filter((item) => item.status === 'draft').length
  const publishedCount = writings.filter((item) => isWritingLive(item)).length

  return (
    <div className="posting-manager">
      {/* View Switcher Tabs */}
      <div className="manager-tabs" role="tablist" aria-label="Writer tools">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'compose'}
          className={`manager-tab ${activeTab === 'compose' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('compose')
            setMessage('')
          }}
        >
          {editingId ? 'Edit piece' : 'Compose'}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'ledger'}
          className={`manager-tab ${activeTab === 'ledger' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('ledger')
            setMessage('')
            void refreshWritings().catch((error: unknown) => {
              setLoadError(getErrorMessage(error, 'Unable to refresh your writings.'))
            })
          }}
        >
          All writings
        </button>
      </div>

      {(message || loadError) && (
        <div className="manager-feedback" role={loadError ? 'alert' : 'status'}>
          {message || loadError}
        </div>
      )}
      {/* Tab 1: Compose / Edit Form */}
      {activeTab === 'compose' && (
        <form className="composer-card" onSubmit={handleSave}>
          <div className="form-row">
            <label className="field-label" htmlFor={titleInputId}>
              Title
            </label>
            <input
              id={titleInputId}
              type="text"
              className="composer-title-input"
              placeholder="Give your piece a name"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <label className="spoken-word-option">
              <input
                type="checkbox"
                checked={isSpokenWord}
                onChange={(event) => setIsSpokenWord(event.target.checked)}
              />
              <span>Spoken word</span>
            </label>
          </div>

          {isSpokenWord && (
            <div className="form-row">
              <label className="field-label" htmlFor={audioInputId}>
                Audio recording URL (optional)
              </label>
              <input
                id={audioInputId}
                type="url"
                className="composer-text-input"
                placeholder="https://example.com/audio.mp3"
                value={audioUrl}
                onChange={(e) => setAudioUrl(e.target.value)}
              />
            </div>
          )}

          <div className="form-row">
            <div className="content-label-bar">
              <label className="field-label" htmlFor={contentInputId}>
                Your writing
              </label>
              {wordCount > 0 && (
                <span className="words-counter">
                  {wordCount} {wordCount === 1 ? 'word' : 'words'} · {readingMinutes} min read
                </span>
              )}
            </div>
            <textarea
              ref={contentTextareaRef}
              id={contentInputId}
              className={`composer-textarea ${isSpokenWord ? 'textarea-spoken-word' : ''}`}
              rows={10}
              placeholder={
                isSpokenWord
                  ? 'Write your spoken-word piece here...'
                  : 'Write your words here...'
              }
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
            <div className="composer-link-tools">
              <button type="button" className="ledger-action-btn" onClick={openLinkEditor}>
                Add link to selected words
              </button>
              <span>Select words above, then add a website address.</span>
            </div>
            {linkRange && (
              <div className="composer-link-editor">
                <div className="form-row">
                  <label className="field-label" htmlFor={linkTextInputId}>Words to link</label>
                  <input
                    id={linkTextInputId}
                    className="composer-text-input"
                    value={linkText}
                    onChange={(event) => setLinkText(event.target.value)}
                    required
                  />
                </div>
                <div className="form-row">
                  <label className="field-label" htmlFor={linkUrlInputId}>Website address</label>
                  <input
                    id={linkUrlInputId}
                    type="text"
                    inputMode="url"
                    autoComplete="url"
                    className="composer-text-input"
                    placeholder="https://example.com"
                    value={linkUrl}
                    onChange={(event) => setLinkUrl(event.target.value)}
                    required
                  />
                </div>
                {linkError && <p className="link-editor-error" role="alert">{linkError}</p>}
                <div className="composer-actions">
                  <button
                    type="button"
                    className="ledger-action-btn primary"
                    onClick={insertSelectedLink}
                  >
                    Insert link
                  </button>
                  <button
                    type="button"
                    className="composer-cancel-btn"
                    onClick={() => {
                      setLinkRange(null)
                      setLinkError('')
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {linkError && !linkRange && <p className="link-editor-error" role="alert">{linkError}</p>}
          </div>

          {/* Publishing & Scheduler Section */}
          <div className="scheduler-section">
            <span className="field-label">Publication time</span>
            <div className="schedule-options">
              <button
                type="button"
                className={`schedule-mode-pill ${publishMode === 'schedule' ? 'selected' : ''}`}
                onClick={() => {
                  if (!scheduledFor || new Date(scheduledFor).getTime() <= Date.now()) {
                    setScheduledFor(getDefaultScheduleTime())
                  }
                  setMinimumScheduleTime(toLocalDateTime(new Date()))
                  setPublishMode('schedule')
                }}
              >
                Schedule for later
              </button>
              <button
                type="button"
                className={`schedule-mode-pill ${publishMode === 'now' ? 'selected' : ''}`}
                onClick={() => setPublishMode('now')}
              >
                Publish immediately
              </button>
              <button
                type="button"
                className={`schedule-mode-pill ${publishMode === 'draft' ? 'selected' : ''}`}
                onClick={() => setPublishMode('draft')}
              >
                Keep as draft
              </button>
            </div>

            {publishMode === 'schedule' && (
              <div className="schedule-time-box">
                <label className="field-sublabel" htmlFor={scheduleInputId}>
                  Choose date and time to post:
                </label>
                <input
                  id={scheduleInputId}
                  type="datetime-local"
                  className="schedule-datetime-input"
                  value={scheduledFor}
                  min={minimumScheduleTime}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  required
                />
                <p className="schedule-hint">
                  Your piece stays safely private in your desk until this exact time, when it automatically goes live for readers.
                </p>
              </div>
            )}

            {publishMode === 'draft' && (
              <p className="schedule-hint">
                Drafts are kept only in your private room. You can review, polish, and publish them anytime.
              </p>
            )}

            {publishMode === 'now' && (
              <p className="schedule-hint">
                Your writing will immediately be visible on the public journal front page.
              </p>
            )}
          </div>

          <div className="composer-actions">
            <button type="submit" className="composer-submit-btn" disabled={saving}>
              {saving
                ? 'Saving...'
                : publishMode === 'schedule'
                ? editingId
                  ? 'Update schedule'
                  : 'Schedule piece'
                : publishMode === 'now'
                ? editingId
                  ? 'Update & publish'
                  : 'Publish now'
                : editingId
                ? 'Update draft'
                : 'Save draft'}
            </button>
            {editingId && (
              <button type="button" className="composer-cancel-btn" onClick={resetForm}>
                Cancel edit
              </button>
            )}
          </div>
        </form>
      )}

      <div className="ledger-view">
          <div className="ledger-filter-bar">
            <button
              type="button"
              className={`ledger-filter-pill ${ledgerFilter === 'all' ? 'selected' : ''}`}
              onClick={() => setLedgerFilter('all')}
            >
              All ({writings.length})
            </button>
            <button
              type="button"
              className={`ledger-filter-pill ${ledgerFilter === 'scheduled' ? 'selected' : ''}`}
              onClick={() => setLedgerFilter('scheduled')}
            >
              Scheduled ({scheduledCount})
            </button>
            <button
              type="button"
              className={`ledger-filter-pill ${ledgerFilter === 'published' ? 'selected' : ''}`}
              onClick={() => setLedgerFilter('published')}
            >
              Live ({publishedCount})
            </button>
            <button
              type="button"
              className={`ledger-filter-pill ${ledgerFilter === 'draft' ? 'selected' : ''}`}
              onClick={() => setLedgerFilter('draft')}
            >
              Drafts ({draftsCount})
            </button>
          </div>

          <div className="ledger-list">
            {loading ? (
              <div className="ledger-empty">
                <p>Loading your writings...</p>
              </div>
            ) : filteredLedger.length === 0 ? (
              <div className="ledger-empty">
                <p>No writings in this view.</p>
              </div>
            ) : (
              filteredLedger.map((item) => {
                const live = isWritingLive(item)
                const isScheduled = item.status === 'scheduled' || (item.scheduled_for && !live)
                const isDraft = item.status === 'draft'

                return (
                  <div key={item.id} className="ledger-card">
                    <div className="ledger-card-header">
                      <div className="ledger-card-badges">
                        {categoryLabels[item.category] && (
                          <span className="entry-badge">{categoryLabels[item.category]}</span>
                        )}
                        {isScheduled && item.scheduled_for && (
                          <span className="status-pill status-scheduled">
                            Scheduled: {formatDateTime(item.scheduled_for)}
                          </span>
                        )}
                        {isDraft && <span className="status-pill status-draft">Draft</span>}
                        {live && <span className="status-pill status-live">Live</span>}
                      </div>
                      <time className="ledger-created-time">Created {formatDateTime(item.created_at)}</time>
                    </div>

                    <h3 className="ledger-card-title">{item.title}</h3>
                    <p className="ledger-card-excerpt">
                      {item.content.split('\n')[0].slice(0, 140)}
                      {item.content.length > 140 ? '...' : ''}
                    </p>

                    <div className="ledger-card-actions">
                      {(!live || isScheduled) && (
                        <button
                          type="button"
                          className="ledger-action-btn primary"
                          onClick={() => void handlePublishNow(item)}
                        >
                          Post now
                        </button>
                      )}
                      <button
                        type="button"
                        className="ledger-action-btn"
                        onClick={() => handleEdit(item)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="ledger-action-btn delete"
                        onClick={() => void handleDelete(item.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
      </div>
    </div>
  )
}
