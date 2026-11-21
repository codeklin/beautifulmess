import { WriterDesk } from '@/components/journal'
import { getAdminConfig } from '@/lib/admin-config'

export const metadata = {
  title: 'Write | BeautifulMess',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

export default function WritePage() {
  if (!getAdminConfig()) {
    throw new Error('Writer desk authentication is not configured.')
  }
  return <WriterDesk />
}
