import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'UniqueMe | A writer’s journal',
    short_name: 'UniqueMe',
    description: 'A journal of writing and spoken-word pieces.',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#FAF5EB',
    theme_color: '#1A1410',
    icons: [
      {
        src: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  }
}
