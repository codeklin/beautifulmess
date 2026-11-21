import { NextResponse, type NextRequest } from 'next/server'
import { getAdminConfig } from '@/lib/admin-config'
import { ADMIN_SESSION_COOKIE, isValidAdminSession } from '@/lib/admin-session'

export async function authorizeAdminApi(request: NextRequest): Promise<NextResponse | null> {
  const adminConfig = getAdminConfig()
  if (!adminConfig) {
    return NextResponse.json(
      { message: 'Writing access is not configured yet.' },
      { status: 503, headers: { 'Cache-Control': 'private, no-store' } },
    )
  }

  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value
  if (!(await isValidAdminSession(token, adminConfig.adminPassword))) {
    return NextResponse.json(
      { message: 'Please sign in to manage writings.' },
      { status: 401, headers: { 'Cache-Control': 'private, no-store' } },
    )
  }

  return null
}
