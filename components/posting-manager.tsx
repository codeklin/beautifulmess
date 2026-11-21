'use client'

import { useEffect, useState, useId } from 'react'
import { LinkedInImport } from '@/components/linkedin-import'
import {
  categoryLabels,
  formatDateTime,
  getAllWritings,
  getStoredWritings,
  isWritingLive,
  saveStoredWritings,
  type Category,
  type Writing,
  type WritingStatus,
} from '@/lib/writings'

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
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60 * 1000)
  return local.toISOString().slice(0, 16)
}

export function PostingManager() {
  const [activeTab, setActiveTab] = useState<'compose' | 'ledger' | 'import'>('compose')
  const [writings, setWritings] = useState<Writing[]>([])

  // Composer fields
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<Category>('poem')
  const [content, setContent] = useState('')
  const [audioUrl, setAudioUrl] = useState('')
  const [publishMode, setPublishMode] = useState<'now' | 'schedule' | 'draft'>('schedule')
  const [scheduledFor, setScheduledFor] = useState(getDefaultScheduleTime)
  const [message, setMessage] = useState('')
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'scheduled' | 'published' | 'draft'>('all')

  const titleInputId = useId()
  const contentInputId = useId()
  const audioInputId = useId()
  const scheduleInputId = useId()

  useEffect(() => {
    setWritings(getAllWritings())
  }, [])

  function refreshWritings() {
    setWritings(getAllWritings())
  }

  function resetForm() {
    setEditingId(null)
    setTitle('')
    setCategory('poem')
    setContent('')
    setAudioUrl('')
    setPublishMode('schedule')
    setScheduledFor(getDefaultScheduleTime())
  }

  function handleSave(event: React.FormEvent) {
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
        status = 'published'
        isPublished = true
        scheduleIso = new Date(parsedTime).toISOString()
      } else {
        status = 'scheduled'
        isPublished = false
        scheduleIso = new Date(parsedTime).toISOString()
      }
    }

    const stored = getStoredWritings()
    const nowIso = new Date().toISOString()

    if (editingId) {
      const existing = stored.find((item) => item.id === editingId)
      const updatedList = stored.map((item) => {
        if (item.id !== editingId) return item
        return {
          ...item,
          title: cleanTitle,
          category,
          content: cleanContent,
          audio_url: category === 'spoken_word' ? audioUrl.trim() || null : null,
          status,
          is_published: isPublished,
          scheduled_for: scheduleIso,
        }
      })
      saveStoredWritings(updatedList)
      setMessage(
        status === 'scheduled'
          ? `Updated and scheduled for ${formatDateTime(scheduleIso || nowIso)}.`
          : status === 'draft'
          ? 'Draft updated in your private desk.'
          : 'Piece updated and published to your journal.'
      )
    } else {
      const id = crypto.randomUUID()
      const newPiece: Writing = {
        id,
        title: cleanTitle,
        slug: makeSlug(cleanTitle, id.slice(0, 8)),
        category,
        content: cleanContent,
        audio_url: category === 'spoken_word' ? audioUrl.trim() || null : null,
        is_published: isPublished,
        status,
        scheduled_for: scheduleIso,
        created_at: nowIso,
      }
      saveStoredWritings([newPiece, ...stored])
      setMessage(
        status === 'scheduled'
          ? `Scheduled to appear in your journal on ${formatDateTime(scheduleIso || nowIso)}.`
          : status === 'draft'
          ? 'Saved as a private draft in your desk.'
          : 'Published live to your journal.'
      )
    }

    resetForm()
    refreshWritings()
  }

  function handleEdit(item: Writing) {
    setEditingId(item.id)
    setTitle(item.title)
    setCategory(item.category)
    setContent(item.content)
    setAudioUrl(item.audio_url || '')
    if (item.status === 'draft') {
      setPublishMode('draft')
    } else if (item.status === 'scheduled' || item.scheduled_for) {
      setPublishMode('schedule')
      if (item.scheduled_for) {
        const d = new Date(item.scheduled_for)
        const offset = d.getTimezoneOffset()
        const local = new Date(d.getTime() - offset * 60 * 1000)
        setScheduledFor(local.toISOString().slice(0, 16))
      }
    } else {
      setPublishMode('now')
    }
    setActiveTab('compose')
    setMessage('')
  }

  function handlePublishNow(id: string) {
    const stored = getStoredWritings()
    const updated = stored.map((item) => {
      if (item.id !== id) return item
      return {
        ...item,
        status: 'published' as const,
        is_published: true,
        scheduled_for: null,
      }
    })
    saveStoredWritings(updated)
    refreshWritings()
    setMessage('Piece has been published to your journal.')
  }

  function handleDelete(id: string) {
    const stored = getStoredWritings()
    const updated = stored.filter((item) => item.id !== id)
    saveStoredWritings(updated)
    refreshWritings()
    setMessage('Piece removed from your desk.')
  }

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 200))

  const filteredLedger = writings.filter((item) => {
    if (ledgerFilter === 'all') return true
    if (ledgerFilter === 'draft') return item.status === 'draft'
    if (ledgerFilter === 'scheduled') {
      return item.status === 'scheduled' || (item.scheduled_for && !isWritingLive(item))
    }
    if (ledgerFilter === 'published') {
      return isWritingLive(item)
    }
    return true
  })

  const scheduledCount = writings.filter(
    (item) => item.status === 'scheduled' || (item.scheduled_for && !isWritingLive(item))
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
            refreshWritings()
          }}
        >
          Schedule ledger
          {scheduledCount > 0 && <span className="tab-pill">{scheduledCount}</span>}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'import'}
          className={`manager-tab ${activeTab === 'import' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('import')
            setMessage('')
          }}
        >
          LinkedIn import
        </button>
      </div>

      {message && (
        <div className="manager-feedback" role="status">
          {message}
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
            <span className="field-label">Category</span>
            <div className="category-picker" role="radiogroup" aria-label="Category">
              {(['poem', 'prose', 'spoken_word', 'linkedin'] as Category[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  role="radio"
                  aria-checked={category === cat}
                  className={`category-chip ${category === cat ? 'selected' : ''}`}
                  onClick={() => setCategory(cat)}
                >
                  {categoryLabels[cat]}
                </button>
              ))}
            </div>
          </div>

          {category === 'spoken_word' && (
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
                Words & Stanzas
              </label>
              {wordCount > 0 && (
                <span className="words-counter">
                  {wordCount} {wordCount === 1 ? 'word' : 'words'} · {readingMinutes} min read
                </span>
              )}
            </div>
            <textarea
              id={contentInputId}
              className={`composer-textarea ${category === 'poem' || category === 'spoken_word' ? 'textarea-poem' : ''}`}
              rows={10}
              placeholder={
                category === 'poem' || category === 'spoken_word'
                  ? 'Write your lines here...\nLeave a space between stanzas.'
                  : 'Let the thoughts take shape here without rushing...'
              }
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
          </div>

          {/* Publishing & Scheduler Section */}
          <div className="scheduler-section">
            <span className="field-label">Publication time</span>
            <div className="schedule-options">
              <button
                type="button"
                className={`schedule-mode-pill ${publishMode === 'schedule' ? 'selected' : ''}`}
                onClick={() => setPublishMode('schedule')}
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
            <button type="submit" className="composer-submit-btn">
              {publishMode === 'schedule'
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

      {/* Tab 2: Schedule Ledger */}
      {activeTab === 'ledger' && (
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
            {filteredLedger.length === 0 ? (
              <div className="ledger-empty">
                <p>No pieces found in this category.</p>
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
                        <span className="entry-badge">{categoryLabels[item.category]}</span>
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
                          onClick={() => handlePublishNow(item.id)}
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
                        onClick={() => handleDelete(item.id)}
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
      )}

      {/* Tab 3: LinkedIn CSV Importer */}
      {activeTab === 'import' && (
        <div className="import-wrapper">
          <LinkedInImport />
        </div>
      )}
    </div>
  )
}
