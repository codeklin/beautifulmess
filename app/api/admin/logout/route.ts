import { NextResponse, type NextRequest } from 'next/server'
import { getAdminConfig } from '@/lib/admin-config'
import { ADMIN_SESSION_COOKIE } from '@/lib/admin-session'

export async function POST(request: NextRequest) {
  const adminConfig = getAdminConfig()
  if (!adminConfig) {
    return new NextResponse('Writer desk authentication is not configured.', { status: 503 })
  }

  const response = NextResponse.redirect(new URL('/admin/login', adminConfig.siteUrl), 303)
  response.headers.set('Cache-Control', 'no-store')
  response.cookies.delete(ADMIN_SESSION_COOKIE)
  return response
}
