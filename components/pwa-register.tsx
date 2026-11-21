'use client'

import { useEffect } from 'react'

export async function clearAppCacheAndReload(): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    // Clear all CacheStorage
    if ('caches' in window) {
      const keys = await window.caches.keys()
      await Promise.all(keys.map((key) => window.caches.delete(key)))
    }

    // Message service worker if active
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' })
    }

    // Unregister service workers to guarantee clean state
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map((reg) => reg.unregister()))
    }
  } catch {
    // Proceed to reload
  }

  window.location.reload()
}

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    let intervalId: NodeJS.Timeout | null = null

    async function registerServiceWorker() {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        })

        // Check for updates in the background on load
        void registration.update()

        // Check for updates when the user returns to the tab
        function handleVisibilityChange() {
          if (document.visibilityState === 'visible') {
            void registration.update()
          }
        }
        document.addEventListener('visibilitychange', handleVisibilityChange)

        // Check for updates periodically in the background every 15 minutes
        intervalId = setInterval(() => {
          void registration.update()
        }, 15 * 60 * 1000)

        // When a new service worker is found, auto-activate it in the background
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Auto-activate immediately so changes apply in the background
              newWorker.postMessage({ type: 'SKIP_WAITING' })
            }
          })
        })
      } catch {
        // Service worker registration skipped in unsupported environments
      }
    }

    void registerServiceWorker()

    // When the new worker takes control, refresh the page smoothly if needed
    let refreshing = false
    function handleControllerChange() {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [])

  return null
}
