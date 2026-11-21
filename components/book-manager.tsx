'use client'

import { useEffect, useId, useState } from 'react'
import { bookCoverRoute } from '@/lib/book-constants'
import type { BookListing } from '@/lib/book-store'

type BookResponse = {
  book?: BookListing | null
  message?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

async function requestBook(
  method: 'GET' | 'PUT',
  body?: Record<string, string | null>,
): Promise<BookResponse> {
  const response = await fetch('/api/admin/book', {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })

  let result: unknown
  try {
    result = await response.json()
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error
    throw new Error('The book service returned an unreadable response.')
  }

  if (!response.ok) {
    const message = isRecord(result) && typeof result.message === 'string'
      ? result.message
      : 'The book details could not be saved. Please try again.'
    throw new Error(message)
  }
  if (!isRecord(result) || !('book' in result)) {
    throw new Error('The book service returned an invalid response.')
  }
  return result as BookResponse
}

function normalizeOptionalUrl(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  const parsed = new URL(candidate)
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Use a website address that begins with http:// or https://.')
  }
  return parsed.href
}

async function uploadCover(file: File): Promise<void> {
  const formData = new FormData()
  formData.append('cover', file)
  const response = await fetch('/api/admin/book/cover', {
    method: 'POST',
    body: formData,
    cache: 'no-store',
  })

  let result: unknown
  try {
    result = await response.json()
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error
    throw new Error('The cover upload returned an unreadable response.')
  }
  if (!response.ok) {
    const message = isRecord(result) && typeof result.message === 'string'
      ? result.message
      : 'The cover could not be uploaded. Please try again.'
    throw new Error(message)
  }
  if (!isRecord(result) || result.cover_image_url !== bookCoverRoute) {
    throw new Error('The cover upload returned an invalid response.')
  }
}

export function BookManager() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [purchaseUrl, setPurchaseUrl] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null)
  const [coverPreview, setCoverPreview] = useState('')
  const [coverVersion, setCoverVersion] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const titleId = useId()
  const descriptionId = useId()
  const purchaseUrlId = useId()
  const coverInputId = useId()

  useEffect(() => {
    let active = true
    requestBook('GET')
      .then(({ book }) => {
        if (!active || !book) return
        setTitle(book.title)
        setDescription(book.description)
        setPurchaseUrl(book.purchase_url ?? '')
        setCoverImageUrl(book.cover_image_url === bookCoverRoute ? bookCoverRoute : null)
        setCoverVersion(book.updated_at)
      })
      .catch((cause: unknown) => {
        if (active) setError(getErrorMessage(cause, 'Unable to load the book details.'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!coverPreview) return
    return () => URL.revokeObjectURL(coverPreview)
  }, [coverPreview])

  async function handleCoverChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setError('')
    setMessage('')
    setUploading(true)
    try {
      await uploadCover(file)
      setCoverImageUrl(bookCoverRoute)
      setCoverVersion(String(Date.now()))
      setCoverPreview(URL.createObjectURL(file))
      setMessage('Cover uploaded. Save book details to show it on the Book page.')
    } catch (cause) {
      setError(getErrorMessage(cause, 'The cover could not be uploaded.'))
    } finally {
      setUploading(false)
    }
  }

  async function saveBook(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setMessage('')

    let normalizedPurchaseUrl: string | null
    try {
      normalizedPurchaseUrl = normalizeOptionalUrl(purchaseUrl)
    } catch (cause) {
      setError(getErrorMessage(cause, 'Enter a valid purchase link.'))
      return
    }

    setSaving(true)
    try {
      const { book } = await requestBook('PUT', {
        title: title.trim(),
        description: description.trim(),
        purchase_url: normalizedPurchaseUrl,
        cover_image_url: coverImageUrl,
      })
      if (!book) throw new Error('The book service did not return the saved details.')
      setTitle(book.title)
      setDescription(book.description)
      setPurchaseUrl(book.purchase_url ?? '')
      setCoverImageUrl(book.cover_image_url === bookCoverRoute ? bookCoverRoute : null)
      setCoverVersion(book.updated_at)
      setCoverPreview('')
      setMessage('Book details saved. The public Book page now reflects your changes.')
    } catch (cause) {
      setError(getErrorMessage(cause, 'The book details could not be saved.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="book-manager-section" aria-labelledby="book-manager-title">
      <div className="book-manager-heading">
        <span className="eyebrow-badge">Shop</span>
        <h2 id="book-manager-title">Book manager</h2>
        <p>Manage the book details and purchase link shown on your public Book page.</p>
      </div>
      {(error || message) && (
        <div className="manager-feedback" role={error ? 'alert' : 'status'}>
          {error || message}
        </div>
      )}
      {loading ? (
        <p className="book-manager-loading">Loading book details...</p>
      ) : (
        <form className="book-manager-card" onSubmit={saveBook}>
          <div className="form-row">
            <label className="field-label" htmlFor={titleId}>Book title</label>
            <input
              id={titleId}
              className="composer-title-input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={200}
              required
            />
          </div>
          <div className="form-row">
            <label className="field-label" htmlFor={descriptionId}>Short description</label>
            <textarea
              id={descriptionId}
              className="composer-textarea"
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={3000}
            />
          </div>
          <div className="form-row">
            <label className="field-label" htmlFor={purchaseUrlId}>Purchase link</label>
            <input
              id={purchaseUrlId}
              className="composer-text-input"
              inputMode="url"
              autoComplete="url"
              placeholder="https://example.com/book"
              value={purchaseUrl}
              onChange={(event) => setPurchaseUrl(event.target.value)}
            />
          </div>
          <div className="book-cover-manager">
            <div className="book-cover-manager-copy">
              <span className="field-label">Book cover</span>
              <p>Upload a JPG, PNG, or WebP image up to 5 MB.</p>
              <input
                id={coverInputId}
                className="book-cover-file-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => void handleCoverChange(event)}
                disabled={uploading || saving}
              />
              <label className="ledger-action-btn book-cover-upload" htmlFor={coverInputId}>
                {uploading ? 'Uploading cover...' : 'Choose cover image'}
              </label>
              {coverImageUrl && (
                <button
                  type="button"
                  className="text-button book-cover-remove"
                  onClick={() => {
                    setCoverImageUrl(null)
                    setCoverPreview('')
                    setMessage('Cover removed from the listing. Save book details to confirm.')
                  }}
                  disabled={uploading || saving}
                >
                  Remove cover
                </button>
              )}
            </div>
            {coverImageUrl && (
              <img
                className="book-manager-cover-preview"
                src={coverPreview || `${bookCoverRoute}?v=${encodeURIComponent(coverVersion)}`}
                alt={title ? `Cover of ${title}` : 'Book cover preview'}
              />
            )}
          </div>
          <div className="composer-actions">
            <button type="submit" className="composer-submit-btn" disabled={saving || uploading}>
              {saving ? 'Saving...' : 'Save book details'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
