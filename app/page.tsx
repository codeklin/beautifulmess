import { JournalHome } from '@/components/journal'
import { hasAdminSession } from '@/lib/admin-auth-state'
import { getPublicWritings, WritingStoreError, WritingStoreNotConfiguredError } from '@/lib/writing-store'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const showAdminLink = await hasAdminSession()
  try {
    return <JournalHome writings={await getPublicWritings()} showAdminLink={showAdminLink} />
  } catch (error) {
    if (!(error instanceof WritingStoreError) && !(error instanceof WritingStoreNotConfiguredError)) {
      throw error
    }
    console.error('Unable to load public writings:', error.message)
    return <JournalHome writings={[]} loadError showAdminLink={showAdminLink} />
  }
}
