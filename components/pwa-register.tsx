'use client'

import { useEffect, useState } from 'react'

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

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

export function PwaInstallButton() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [installError, setInstallError] = useState('')

  useEffect(() => {
    setInstalled(window.matchMedia('(display-mode: standalone)').matches)

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault()
      setInstallPrompt(event as InstallPromptEvent)
    }

    function handleAppInstalled() {
      setInstalled(true)
      setInstallPrompt(null)
      setShowInstructions(false)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  if (installed) return null

  async function handleInstall() {
    if (!installPrompt) {
      setShowInstructions((visible) => !visible)
      return
    }

    setInstallError('')
    try {
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice
      setInstallPrompt(null)
      if (choice.outcome === 'accepted') setInstalled(true)
    } catch {
      setInstallError('The install prompt could not be opened. Use your browser menu to install the app.')
      setShowInstructions(true)
    }
  }

  return (
    <span className="pwa-install">
      <button
        type="button"
        className="text-button pwa-install-button"
        aria-expanded={showInstructions}
        onClick={() => void handleInstall()}
      >
        Install app
      </button>
      {showInstructions && (
        <span className="pwa-install-help" role="status">
          {installError || 'In Chrome on Android, open the menu and choose Install app or Add to Home screen.'}
        </span>
      )}
    </span>
  )
}
