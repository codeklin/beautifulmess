'use client'

import { useState } from 'react'
import { BookManager } from '@/components/book-manager'
import { PostingManager } from '@/components/posting-manager'

type DashboardSection = 'posts' | 'book'

export function AdminDashboard() {
  const [section, setSection] = useState<DashboardSection>('posts')

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard-nav" role="tablist" aria-label="Dashboard sections">
        <button
          id="dashboard-posts-tab"
          type="button"
          role="tab"
          aria-selected={section === 'posts'}
          aria-controls="dashboard-posts-panel"
          className={`admin-dashboard-tab ${section === 'posts' ? 'selected' : ''}`}
          onClick={() => setSection('posts')}
        >
          Posts
        </button>
        <button
          id="dashboard-book-tab"
          type="button"
          role="tab"
          aria-selected={section === 'book'}
          aria-controls="dashboard-book-panel"
          className={`admin-dashboard-tab ${section === 'book' ? 'selected' : ''}`}
          onClick={() => setSection('book')}
        >
          Book
        </button>
      </div>
      {section === 'posts' ? (
        <div
          id="dashboard-posts-panel"
          className="admin-dashboard-panel"
          role="tabpanel"
          aria-labelledby="dashboard-posts-tab"
        >
          <PostingManager />
        </div>
      ) : (
        <div
          id="dashboard-book-panel"
          className="admin-dashboard-panel"
          role="tabpanel"
          aria-labelledby="dashboard-book-tab"
        >
          <BookManager />
        </div>
      )}
    </div>
  )
}
