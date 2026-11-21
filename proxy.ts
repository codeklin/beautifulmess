import { NextResponse, type NextRequest } from 'next/server'
import { getAdminConfig } from '@/lib/admin-config'
import { ADMIN_SESSION_COOKIE, isValidAdminSession } from '@/lib/admin-session'

export async function proxy(request: NextRequest) {
  const adminConfig = getAdminConfig()
  if (!adminConfig) {
    return new NextResponse('Writer desk authentication is not configured.', { status: 503 })
  }

  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value
  if (!(await isValidAdminSession(token, adminConfig.adminPassword))) {
    const redirect = NextResponse.redirect(new URL('/admin/login', adminConfig.siteUrl))
    redirect.headers.set('Cache-Control', 'private, no-store, max-age=0')
    return redirect
  }

  const response = NextResponse.next({ request })
  response.headers.set('Cache-Control', 'private, no-store, max-age=0')
  return response
}

export const config = {
  matcher: ['/write/:path*'],
}
