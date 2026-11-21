import 'server-only'
import { cookies } from 'next/headers'
import { getAdminConfig } from '@/lib/admin-config'
import { ADMIN_SESSION_COOKIE, isValidAdminSession } from '@/lib/admin-session'

export async function hasAdminSession(): Promise<boolean> {
  const adminConfig = getAdminConfig()
  if (!adminConfig) return false

  const cookieStore = await cookies()
  return isValidAdminSession(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
    adminConfig.adminPassword,
  )
}
